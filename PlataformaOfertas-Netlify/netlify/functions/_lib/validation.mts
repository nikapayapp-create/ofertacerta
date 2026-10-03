import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { HttpError } from './http.mts';

export function cleanText(value: unknown, max = 500, required = false) {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim() : '';
  if (required && !text) throw new HttpError(400, 'Preencha os campos obrigatórios.');
  if (text.length > max) throw new HttpError(400, `Campo excede ${max} caracteres.`);
  return text;
}

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150) || 'oferta';
}

export function parseMoney(value: unknown, required = false) {
  if (value === '' || value === null || value === undefined) { if (required) throw new HttpError(400, 'Preço atual é obrigatório.'); return null; }
  const normalized = typeof value === 'string' ? value.replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.') : value;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 999_999_999) throw new HttpError(400, 'Preço inválido.');
  if (required && n <= 0) throw new HttpError(400, 'O preço atual deve ser maior que zero.');
  return Math.round(n * 100) / 100;
}

export function discount(oldPrice: number | null, currentPrice: number) {
  if (oldPrice === null || oldPrice <= currentPrice || oldPrice <= 0) return null;
  return Math.round((((oldPrice - currentPrice) / oldPrice) * 100) * 100) / 100;
}

export function normalizeDomain(value: unknown) {
  let domain = cleanText(value, 255).toLowerCase();
  if (!domain) return null;
  domain = domain.replace(/^https?:\/\//, '').split('/')[0]?.replace(/^www\./,'') || '';
  if (!domain || domain.includes(' ') || domain.includes('@')) throw new HttpError(400, 'Domínio inválido.');
  return domain;
}

export function assertHttpUrl(value: unknown, required = true) {
  const raw = cleanText(value, 2048, required);
  if (!raw && !required) return null;
  let url: URL;
  try { url = new URL(raw); } catch { throw new HttpError(400, 'URL inválida.'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new HttpError(400, 'A URL deve usar http:// ou https://.');
  return url;
}

export function hostnameMatches(hostname: string, domain: string) {
  const h = hostname.toLowerCase().replace(/^www\./,''); const d = domain.toLowerCase().replace(/^www\./,'');
  return h === d || h.endsWith(`.${d}`);
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0 || a >= 224;
  }
  const v = address.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.') || v.startsWith('::ffff:169.254.') || /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./.test(v);
}

export async function assertPublicUrl(value: string | URL) {
  const url = value instanceof URL ? value : assertHttpUrl(value)!;
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) throw new HttpError(400, 'Endereço local não é permitido.');
  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) throw new HttpError(400, 'Endereço privado não é permitido.');
  if (!isIP(url.hostname)) {
    let addresses: { address: string }[];
    try { addresses = await lookup(url.hostname, { all: true }); } catch { throw new HttpError(400, 'Não foi possível resolver o domínio informado.'); }
    if (!addresses.length || addresses.some((x) => isPrivateAddress(x.address))) throw new HttpError(400, 'O domínio informado não é público.');
  }
  return url;
}

export async function safeFetchExternal(input: string, maxRedirects = 3) {
  let current = await assertPublicUrl(input);
  for (let i=0;i<=maxRedirects;i++) {
    const res = await fetch(current, { redirect:'manual', headers:{ 'User-Agent':'Mozilla/5.0 (compatible; OfertaCerta/1.0; +https://netlify.app)', 'Accept':'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(8000) });
    if ([301,302,303,307,308].includes(res.status)) {
      const loc=res.headers.get('location'); if(!loc) throw new HttpError(502,'Redirecionamento inválido no site externo.');
      current=await assertPublicUrl(new URL(loc,current).toString()); continue;
    }
    return { response: res, finalUrl: current.toString() };
  }
  throw new HttpError(502,'Muitos redirecionamentos no site externo.');
}

export async function readTextLimited(response: Response, limit = 2_000_000) {
  if (!response.body) return '';
  const reader=response.body.getReader(); const decoder=new TextDecoder(); let total=0; let out='';
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){reader.cancel();throw new HttpError(502,'A página externa é grande demais para importação automática.');}out+=decoder.decode(value,{stream:true});}
  return out+decoder.decode();
}

export function assertCatalogContentAllowed(...values: unknown[]) {
  const text = values.filter((v) => typeof v === 'string' || Array.isArray(v)).flatMap((v) => Array.isArray(v) ? v : [v]).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const blocked = [
    /\b(arma de fogo|municao|fuzil|espingarda|revolver|rifle)\b/,
    /\b(faca|canivete|facao|taser|spray de pimenta)\b/,
    /\b(vape|cigarro|nicotina|tabaco)\b/,
    /\b(cerveja|vinho|vodka|whisky|uisque|tequila|cachaca)\b/,
    /\b(maconha|cannabis|cbd|cocaina|ecstasy|cogumelo magico)\b/,
    /\b(aposta|cassino|casa de apostas|sports betting)\b/,
    /\b(vibrador|dildo|pornografia|porno)\b/,
  ];
  if (blocked.some((rule) => rule.test(text))) throw new HttpError(400, 'Este tipo de produto não é permitido nesta versão da plataforma.');
}
