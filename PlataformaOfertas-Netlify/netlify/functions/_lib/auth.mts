import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.mts';

const COOKIE = 'ofertas_session';
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new HttpError(500, 'AUTH_SECRET não configurado corretamente.');
  return value;
}

function b64url(value: string) { return Buffer.from(value).toString('base64url'); }
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }

export function createSessionCookie(req: Request) {
  const payload = b64url(JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }));
  const token = `${payload}.${sign(payload)}`;
  const production = process.env.CONTEXT === 'production' || new URL(req.url).protocol === 'https:';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${production ? '; Secure' : ''}`;
}

export function clearSessionCookie(req: Request) {
  const production = process.env.CONTEXT === 'production' || new URL(req.url).protocol === 'https:';
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production ? '; Secure' : ''}`;
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function isAuthenticated(req: Request) {
  try {
    const token = cookieValue(req, COOKIE); if (!token) return false;
    const [payload, signature] = token.split('.'); if (!payload || !signature) return false;
    const expected = sign(payload);
    const a = Buffer.from(signature); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number; v?: number };
    return data.v === 1 && typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export function requireAdmin(req: Request) { if (!isAuthenticated(req)) throw new HttpError(401, 'Sessão expirada. Entre novamente.'); }

export function verifyAdminPassword(candidate: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || configured.length < 8) throw new HttpError(500, 'ADMIN_PASSWORD não configurada corretamente.');
  const a = Buffer.from(candidate); const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const target = new URL(req.url);
  try { if (new URL(origin).host !== target.host) throw new HttpError(403, 'Origem da requisição não permitida.'); }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(403, 'Origem inválida.'); }
}
