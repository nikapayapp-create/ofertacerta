import { HttpError } from '../http.mts';
import { readTextLimited, safeFetchExternal } from '../validation.mts';
import type { ImportedOffer } from './types.mts';

function decodeHtml(value='') { return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(); }
function meta(html:string, key:string) {
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,`i`),new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,`i`)];
  for(const p of patterns){const m=html.match(p);if(m?.[1])return decodeHtml(m[1]);} return undefined;
}
function numberFrom(value:unknown){ if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'){const n=Number(value.replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null;}return null; }
function findProduct(node:unknown):Record<string,unknown>|null{
  if(Array.isArray(node)){for(const x of node){const r=findProduct(x);if(r)return r;}return null;}
  if(!node||typeof node!=='object')return null; const obj=node as Record<string,unknown>; const type=obj['@type']; if(type==='Product'||(Array.isArray(type)&&type.includes('Product')))return obj; if(obj['@graph'])return findProduct(obj['@graph']); return null;
}
function parseJsonLd(html:string){const blocks=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];for(const b of blocks){try{const raw=(b[1]||'').trim();if(!raw)continue;const product=findProduct(JSON.parse(raw));if(product)return product;}catch{}}return null;}

export async function importGeneric(url:string):Promise<ImportedOffer>{
  const {response,finalUrl}=await safeFetchExternal(url);
  if(response.status===403||response.status===429)throw new HttpError(502,'O site bloqueou a importação automática. Preencha os dados manualmente.');
  if(!response.ok)throw new HttpError(502,'Não foi possível acessar a página do produto.');
  const type=response.headers.get('content-type')||''; if(!type.includes('text/html')&&!type.includes('application/xhtml'))throw new HttpError(502,'O link não retornou uma página HTML.');
  const html=await readTextLimited(response); const p=parseJsonLd(html); const offers=p?.offers as Record<string,unknown>|Record<string,unknown>[]|undefined; const offer=Array.isArray(offers)?offers[0]:offers;
  const brandObj=p?.brand; const brand=typeof brandObj==='string'?brandObj:(brandObj&&typeof brandObj==='object'?String((brandObj as Record<string,unknown>).name||''):'');
  const current=numberFrom(offer?.price ?? meta(html,'product:price:amount') ?? meta(html,'og:price:amount'));
  const old=numberFrom((offer as Record<string,unknown>|undefined)?.highPrice ?? meta(html,'product:original_price:amount'));
  const imageRaw=p?.image; const image=Array.isArray(imageRaw)?String(imageRaw[0]||''):typeof imageRaw==='string'?imageRaw:meta(html,'og:image');
  const title=typeof p?.name==='string'?p.name:meta(html,'og:title')||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description=typeof p?.description==='string'?p.description:meta(html,'og:description')||meta(html,'description');
  if(!title&&!image&&!current)throw new HttpError(422,'Não foi possível importar automaticamente esta oferta. Preencha os dados manualmente.');
  return {provider:'generic',title:title?decodeHtml(title).slice(0,180):undefined,description:description?decodeHtml(description).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,5000):undefined,image_url:image||undefined,original_url:finalUrl,brand:brand||undefined,current_price:current,old_price:old&&current&&old>current?old:null,external_id:null};
}
