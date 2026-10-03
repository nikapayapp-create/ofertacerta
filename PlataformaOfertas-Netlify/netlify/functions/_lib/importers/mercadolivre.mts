import { HttpError } from '../http.mts';
import type { ImportedOffer } from './types.mts';

function extractId(url:string){ const m=url.match(/MLB[-_]?([0-9]{6,})/i); return m?`MLB${m[1]}`:null; }
function validNow(start?:string|null,end?:string|null){const now=Date.now();return (!start||new Date(start).getTime()<=now)&&(!end||new Date(end).getTime()>=now);}

export async function importMercadoLivre(url:string):Promise<ImportedOffer>{
  const token=process.env.MERCADOLIVRE_ACCESS_TOKEN; if(!token)throw new HttpError(412,'A integração oficial do Mercado Livre precisa de MERCADOLIVRE_ACCESS_TOKEN. Você ainda pode cadastrar manualmente.');
  const id=extractId(url); if(!id)throw new HttpError(422,'Não foi possível identificar o ID MLB nesse link.');
  const headers={Authorization:`Bearer ${token}`,Accept:'application/json'};
  const [itemRes,pricesRes,descRes]=await Promise.all([
    fetch(`https://api.mercadolibre.com/items/${id}`,{headers,signal:AbortSignal.timeout(8000)}),
    fetch(`https://api.mercadolibre.com/items/${id}/prices`,{headers,signal:AbortSignal.timeout(8000)}),
    fetch(`https://api.mercadolibre.com/items/${id}/description`,{headers,signal:AbortSignal.timeout(8000)}).catch(()=>null),
  ]);
  if(itemRes.status===401||pricesRes.status===401)throw new HttpError(502,'O token do Mercado Livre foi recusado ou expirou.');
  if(!itemRes.ok)throw new HttpError(502,'O Mercado Livre não retornou os dados do anúncio.');
  if(!pricesRes.ok)throw new HttpError(502,'O Mercado Livre não retornou o preço atual pelo endpoint de preços.');
  const item=await itemRes.json() as Record<string,unknown>; const priceData=await pricesRes.json() as {prices?:Array<{type?:string;amount?:number;regular_amount?:number|null;conditions?:{context_restrictions?:string[];start_time?:string|null;end_time?:string|null}}>};
  const prices=priceData.prices||[]; const applicable=prices.filter(p=>validNow(p.conditions?.start_time,p.conditions?.end_time)&&((p.conditions?.context_restrictions||[]).length===0||(p.conditions?.context_restrictions||[]).includes('channel_marketplace')));
  const promo=applicable.filter(p=>p.type==='promotion'&&typeof p.amount==='number').sort((a,b)=>(a.amount||0)-(b.amount||0))[0]; const standard=applicable.find(p=>p.type==='standard'&&typeof p.amount==='number')||prices.find(p=>p.type==='standard'&&typeof p.amount==='number'); const current=promo?.amount??standard?.amount;
  if(typeof current!=='number')throw new HttpError(502,'O endpoint atual de preços não retornou um preço utilizável.');
  const regular=promo?.regular_amount??standard?.amount??null; const old=regular&&regular>current?regular:null;
  let description=''; if(descRes?.ok){try{const d=await descRes.json() as {plain_text?:string};description=d.plain_text||'';}catch{}}
  const attrs=Array.isArray(item.attributes)?item.attributes as Array<Record<string,unknown>>:[]; const brandAttr=attrs.find(a=>a.id==='BRAND'||a.id==='BRAND_NAME'); const brand=brandAttr?.value_name?String(brandAttr.value_name):'';
  const pics=Array.isArray(item.pictures)?item.pictures as Array<Record<string,unknown>>:[]; const image=String(pics[0]?.secure_url||pics[0]?.url||item.secure_thumbnail||item.thumbnail||'');
  return {provider:'mercadolivre',external_id:id,title:String(item.title||'').slice(0,180),description:description.slice(0,5000),image_url:image||undefined,original_url:url,brand:brand||undefined,current_price:current,old_price:old};
}
