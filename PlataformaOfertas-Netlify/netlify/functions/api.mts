import { getDatabase } from '@netlify/database';
import type { Config, Context } from '@netlify/functions';
import { clearSessionCookie, createSessionCookie, isAuthenticated, requireAdmin, requireSameOrigin, verifyAdminPassword } from './_lib/auth.mts';
import { bodyJson, handleError, HttpError, json, publicJson } from './_lib/http.mts';
import { importGeneric } from './_lib/importers/generic.mts';
import { importMercadoLivre } from './_lib/importers/mercadolivre.mts';
import type { ImportedOffer } from './_lib/importers/types.mts';
import { assertCatalogContentAllowed, assertHttpUrl, assertPublicUrl, cleanText, discount, hostnameMatches, normalizeDomain, parseMoney, slugify } from './_lib/validation.mts';

const db = getDatabase();
const PUBLIC_FIELDS = `
  o.id, o.title, o.slug, o.description, o.image_url, o.brand, o.keywords,
  o.store_id, s.name AS store_name, s.slug AS store_slug,
  o.category_id, c.name AS category_name, c.slug AS category_slug,
  o.old_price, o.current_price, o.discount_percentage, o.status, o.featured,
  o.click_count, o.created_at, o.updated_at, o.published_at
`;
const ADMIN_FIELDS = `${PUBLIC_FIELDS}, o.original_url, s.domain AS store_domain, o.source_provider, o.external_id`;
const FROM_JOIN = `FROM offers o JOIN stores s ON s.id=o.store_id JOIN categories c ON c.id=o.category_id`;

function n(value: unknown, fallback = 0) { const x = Number(value); return Number.isFinite(x) ? x : fallback; }
function mapOffer(row: Record<string, unknown>) {
  return {
    ...row,
    id: n(row.id), store_id: n(row.store_id), category_id: n(row.category_id),
    old_price: row.old_price === null ? null : n(row.old_price), current_price: n(row.current_price),
    discount_percentage: row.discount_percentage === null ? null : n(row.discount_percentage),
    click_count: n(row.click_count), featured: Boolean(row.featured), keywords: Array.isArray(row.keywords) ? row.keywords : [],
  };
}
function intParam(value: string | null, fallback: number, min: number, max: number) { const x = Number(value); return Number.isInteger(x) ? Math.max(min, Math.min(max, x)) : fallback; }
function queryPrice(value: string | null) { if (!value) return null; return parseMoney(value, false); }
function pathOf(req: Request) { const p = new URL(req.url).pathname.replace(/^\/api/, '') || '/'; return p.length > 1 ? p.replace(/\/$/, '') : p; }
function method(req: Request) { return req.method.toUpperCase(); }
function allowedStatus(value: unknown) { const status = cleanText(value, 20).toUpperCase(); if (!['DRAFT','ACTIVE','INACTIVE','EXPIRED'].includes(status)) throw new HttpError(400,'Status inválido.'); return status; }
function bool(value: unknown) { return value === true || value === 'true' || value === 1 || value === '1'; }
function pgErrorCode(error: unknown) { return error && typeof error === 'object' && 'code' in error ? String((error as {code?:unknown}).code || '') : ''; }

async function uniqueSlug(base: string, ignoreId?: number) {
  const root = slugify(base); let candidate = root;
  for (let i=1;i<=50;i++) {
    const params: unknown[] = [candidate]; let sql='SELECT id FROM offers WHERE slug=$1';
    if (ignoreId) { params.push(ignoreId); sql += ' AND id<>$2'; }
    const r=await db.pool.query(sql,params); if(!r.rowCount) return candidate; candidate=`${root}-${i+1}`;
  }
  return `${root}-${Date.now()}`;
}

async function publicOffers(url: URL) {
  const page=intParam(url.searchParams.get('page'),1,1,100000); const limit=intParam(url.searchParams.get('limit'),24,1,48);
  const q=cleanText(url.searchParams.get('q'),100); const category=cleanText(url.searchParams.get('category'),120); const store=cleanText(url.searchParams.get('store'),120); const featured=url.searchParams.get('featured')==='1';
  const min=queryPrice(url.searchParams.get('minPrice')); const max=queryPrice(url.searchParams.get('maxPrice')); if(min!==null&&max!==null&&min>max)throw new HttpError(400,'O preço mínimo não pode ser maior que o máximo.');
  const values: unknown[]=[]; const add=(v:unknown)=>{values.push(v);return `$${values.length}`}; const where=[`o.status='ACTIVE'`,`s.active=TRUE`,`c.active=TRUE`];
  if(q){const p=add(`%${q}%`);where.push(`(normalize_text(o.title) LIKE normalize_text(${p}) OR normalize_text(COALESCE(o.description,'')) LIKE normalize_text(${p}) OR normalize_text(COALESCE(o.brand,'')) LIKE normalize_text(${p}) OR normalize_text(array_to_string(o.keywords,' ')) LIKE normalize_text(${p}) OR normalize_text(c.name) LIKE normalize_text(${p}) OR normalize_text(s.name) LIKE normalize_text(${p}))`);}
  if(category)where.push(`c.slug=${add(category)}`); if(store)where.push(`s.slug=${add(store)}`); if(min!==null)where.push(`o.current_price>=${add(min)}`); if(max!==null)where.push(`o.current_price<=${add(max)}`); if(featured)where.push('o.featured=TRUE');
  const orderMap:Record<string,string>={recent:'o.published_at DESC NULLS LAST, o.id DESC',discount:'o.discount_percentage DESC NULLS LAST, o.published_at DESC NULLS LAST',price_asc:'o.current_price ASC, o.id DESC',price_desc:'o.current_price DESC, o.id DESC',popular:'o.click_count DESC, o.published_at DESC NULLS LAST'}; const order=orderMap[url.searchParams.get('sort')||'recent'] ?? orderMap.recent!;
  const whereSql=where.join(' AND '); const count=await db.pool.query(`SELECT COUNT(*)::bigint AS total ${FROM_JOIN} WHERE ${whereSql}`,values); const total=n(count.rows[0]?.total); const itemValues=[...values,limit,(page-1)*limit];
  const rows=await db.pool.query(`SELECT ${PUBLIC_FIELDS} ${FROM_JOIN} WHERE ${whereSql} ORDER BY ${order} LIMIT $${values.length+1} OFFSET $${values.length+2}`,itemValues);
  return {items:rows.rows.map(mapOffer),page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))};
}

async function homeData() {
  const base=`SELECT ${PUBLIC_FIELDS} ${FROM_JOIN} WHERE o.status='ACTIVE' AND s.active=TRUE AND c.active=TRUE`;
  const queries=[
    db.pool.query(`${base} AND o.featured=TRUE ORDER BY o.published_at DESC NULLS LAST LIMIT 8`),
    db.pool.query(`${base} ORDER BY o.published_at DESC NULLS LAST, o.id DESC LIMIT 8`),
    db.pool.query(`${base} AND o.discount_percentage IS NOT NULL AND o.discount_percentage>0 ORDER BY o.discount_percentage DESC, o.published_at DESC NULLS LAST LIMIT 8`),
    db.pool.query(`${base} ORDER BY o.click_count DESC, o.published_at DESC NULLS LAST LIMIT 8`),
    db.pool.query(`${base} ORDER BY o.published_at DESC NULLS LAST, o.id DESC LIMIT 12`),
  ];
  const [featured,recent,discounts,popular,all]=await Promise.all(queries);
  return {featured:featured.rows.map(mapOffer),recent:recent.rows.map(mapOffer),discounts:discounts.rows.map(mapOffer),popular:popular.rows.map(mapOffer),all:all.rows.map(mapOffer)};
}

async function publicMeta() {
  const [categories,stores]=await Promise.all([db.pool.query(`SELECT id,name,slug,active FROM categories WHERE active=TRUE ORDER BY name`),db.pool.query(`SELECT id,name,slug,domain,logo_url,site_url,active FROM stores WHERE active=TRUE ORDER BY name`)]);
  return {categories:categories.rows.map(r=>({...r,id:n(r.id),active:Boolean(r.active)})),stores:stores.rows.map(r=>({...r,id:n(r.id),active:Boolean(r.active)}))};
}

async function offerDetail(slug: string) {
  const r=await db.pool.query(`SELECT ${PUBLIC_FIELDS} ${FROM_JOIN} WHERE o.slug=$1 AND o.status='ACTIVE' AND s.active=TRUE AND c.active=TRUE LIMIT 1`,[slug]); if(!r.rowCount)throw new HttpError(404,'Oferta não encontrada.'); const offer=mapOffer(r.rows[0]);
  const rel=await db.pool.query(`SELECT ${PUBLIC_FIELDS} ${FROM_JOIN} WHERE o.status='ACTIVE' AND o.id<>$1 AND o.category_id=$2 AND s.active=TRUE AND c.active=TRUE ORDER BY o.featured DESC,o.published_at DESC NULLS LAST LIMIT 4`,[offer.id,offer.category_id]);
  return {offer,related:rel.rows.map(mapOffer)};
}

async function clickOffer(id: number, req: Request) {
  if(!Number.isInteger(id)||id<=0)throw new HttpError(400,'Oferta inválida.'); const client=await db.pool.connect();
  try{await client.query('BEGIN');const r=await client.query(`SELECT o.original_url,s.domain FROM offers o JOIN stores s ON s.id=o.store_id WHERE o.id=$1 AND o.status='ACTIVE' FOR UPDATE`,[id]);if(!r.rowCount)throw new HttpError(404,'Oferta não encontrada.');const original=assertHttpUrl(r.rows[0].original_url)!;const domain=r.rows[0].domain as string|null;if(domain&&!hostnameMatches(original.hostname,domain))throw new HttpError(409,'O domínio do link não corresponde à loja cadastrada.');const ref=(req.headers.get('referer')||'').slice(0,1000)||null;await client.query('UPDATE offers SET click_count=click_count+1 WHERE id=$1',[id]);await client.query('INSERT INTO clicks (offer_id,referrer) VALUES ($1,$2)',[id,ref]);await client.query('COMMIT');return {url:original.toString()};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

async function adminOffers(url: URL) {
  const page=intParam(url.searchParams.get('page'),1,1,100000);const limit=intParam(url.searchParams.get('limit'),50,1,100);const q=cleanText(url.searchParams.get('q'),100);const id=intParam(url.searchParams.get('id'),0,0,2_000_000_000);const values:unknown[]=[];const add=(v:unknown)=>{values.push(v);return `$${values.length}`};const where=['TRUE'];if(id)where.push(`o.id=${add(id)}`);if(q){const p=add(`%${q}%`);where.push(`(normalize_text(o.title) LIKE normalize_text(${p}) OR normalize_text(s.name) LIKE normalize_text(${p}) OR normalize_text(c.name) LIKE normalize_text(${p}))`);}const whereSql=where.join(' AND ');const count=await db.pool.query(`SELECT COUNT(*)::bigint AS total ${FROM_JOIN} WHERE ${whereSql}`,values);const total=n(count.rows[0]?.total);const vals=[...values,limit,(page-1)*limit];const rows=await db.pool.query(`SELECT ${ADMIN_FIELDS} ${FROM_JOIN} WHERE ${whereSql} ORDER BY o.updated_at DESC,o.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,vals);return {items:rows.rows.map(mapOffer),page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))};
}

async function adminMeta() {
  const [categories,stores]=await Promise.all([db.pool.query('SELECT id,name,slug,active FROM categories ORDER BY name'),db.pool.query('SELECT id,name,slug,domain,logo_url,site_url,active FROM stores ORDER BY name')]);return {categories:categories.rows.map(r=>({...r,id:n(r.id),active:Boolean(r.active)})),stores:stores.rows.map(r=>({...r,id:n(r.id),active:Boolean(r.active)}))};
}

async function parseOfferInput(payload: Record<string,unknown>) {
  const title=cleanText(payload.title,180,true);const description=cleanText(payload.description,5000);const brand=cleanText(payload.brand,100);const originalUrl=await assertPublicUrl(assertHttpUrl(payload.original_url)!.toString());const imageRaw=cleanText(payload.image_url,2048);const imageUrl=imageRaw?await assertPublicUrl(assertHttpUrl(imageRaw)!.toString()):null;const storeId=n(payload.store_id);const categoryId=n(payload.category_id);if(!storeId||!categoryId)throw new HttpError(400,'Selecione loja e categoria.');const currentPrice=parseMoney(payload.current_price,true)!;const oldPrice=parseMoney(payload.old_price,false);const status=allowedStatus(payload.status);const featured=bool(payload.featured);const keywords=Array.isArray(payload.keywords)?payload.keywords.map(v=>cleanText(v,50)).filter(Boolean).slice(0,20):[];assertCatalogContentAllowed(title,description,brand,keywords);
  const [store,category]=await Promise.all([db.pool.query('SELECT id,domain,active FROM stores WHERE id=$1',[storeId]),db.pool.query('SELECT id,active FROM categories WHERE id=$1',[categoryId])]);if(!store.rowCount||!category.rowCount)throw new HttpError(400,'Loja ou categoria inválida.');if(status==='ACTIVE'&&(!store.rows[0].active||!category.rows[0].active))throw new HttpError(400,'Ative a loja e a categoria antes de publicar.');const domain=store.rows[0].domain as string|null;if(domain&&!hostnameMatches(originalUrl.hostname,domain))throw new HttpError(400,`O link da oferta precisa pertencer ao domínio ${domain}.`);
  return {title,description:description||null,brand:brand||null,original_url:originalUrl.toString(),image_url:imageUrl?.toString()||null,store_id:storeId,category_id:categoryId,current_price:currentPrice,old_price:oldPrice,discount_percentage:discount(oldPrice,currentPrice),status,featured,keywords};
}

async function createOffer(payload: Record<string,unknown>) {
  const x=await parseOfferInput(payload);const slug=await uniqueSlug(x.title);const r=await db.pool.query(`INSERT INTO offers (title,slug,description,image_url,original_url,brand,keywords,store_id,category_id,old_price,current_price,discount_percentage,status,featured,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $13='ACTIVE' THEN NOW() ELSE NULL END) RETURNING id`,[x.title,slug,x.description,x.image_url,x.original_url,x.brand,x.keywords,x.store_id,x.category_id,x.old_price,x.current_price,x.discount_percentage,x.status,x.featured]);const id=n(r.rows[0]?.id);const u=new URL('https://local/api/admin/offers');u.searchParams.set('id',String(id));return (await adminOffers(u)).items[0];
}

async function updateOffer(id:number,payload:Record<string,unknown>){if(!Number.isInteger(id)||id<=0)throw new HttpError(400,'Oferta inválida.');const x=await parseOfferInput(payload);const r=await db.pool.query(`UPDATE offers SET title=$2,description=$3,image_url=$4,original_url=$5,brand=$6,keywords=$7,store_id=$8,category_id=$9,old_price=$10,current_price=$11,discount_percentage=$12,status=$13,featured=$14,published_at=CASE WHEN $13='ACTIVE' THEN COALESCE(published_at,NOW()) ELSE published_at END WHERE id=$1 RETURNING id`,[id,x.title,x.description,x.image_url,x.original_url,x.brand,x.keywords,x.store_id,x.category_id,x.old_price,x.current_price,x.discount_percentage,x.status,x.featured]);if(!r.rowCount)throw new HttpError(404,'Oferta não encontrada.');const u=new URL('https://local/api/admin/offers');u.searchParams.set('id',String(id));return (await adminOffers(u)).items[0];}

async function deleteOffer(id:number){const r=await db.pool.query('DELETE FROM offers WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new HttpError(404,'Oferta não encontrada.');}

async function offerAction(id:number,action:string){
  if(!Number.isInteger(id)||id<=0)throw new HttpError(400,'Oferta inválida.');
  if(action==='duplicate'){const src=await db.pool.query('SELECT * FROM offers WHERE id=$1',[id]);if(!src.rowCount)throw new HttpError(404,'Oferta não encontrada.');const o=src.rows[0];const title=`${String(o.title)} (cópia)`.slice(0,180);const slug=await uniqueSlug(title);const r=await db.pool.query(`INSERT INTO offers (title,slug,description,image_url,original_url,brand,keywords,store_id,category_id,old_price,current_price,discount_percentage,status,featured,click_count,source_provider,external_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'DRAFT',FALSE,0,$13,$14) RETURNING id`,[title,slug,o.description,o.image_url,o.original_url,o.brand,o.keywords,o.store_id,o.category_id,o.old_price,o.current_price,o.discount_percentage,o.source_provider,o.external_id]);return {id:n(r.rows[0]?.id)};}
  const sql:Record<string,string>={publish:`UPDATE offers SET status='ACTIVE',published_at=COALESCE(published_at,NOW()) WHERE id=$1 RETURNING id`,deactivate:`UPDATE offers SET status='INACTIVE' WHERE id=$1 RETURNING id`,feature:`UPDATE offers SET featured=TRUE WHERE id=$1 RETURNING id`,unfeature:`UPDATE offers SET featured=FALSE WHERE id=$1 RETURNING id`};if(!sql[action])throw new HttpError(400,'Ação inválida.');const r=await db.pool.query(sql[action]!,[id]);if(!r.rowCount)throw new HttpError(404,'Oferta não encontrada.');return {id};
}

async function dashboard(){
  const [counts,topOffer,topStore,topCategory,recent]=await Promise.all([
    db.pool.query(`SELECT COUNT(*)::bigint AS total,COUNT(*) FILTER (WHERE status='ACTIVE')::bigint AS active,COUNT(*) FILTER (WHERE status='INACTIVE')::bigint AS inactive,COUNT(*) FILTER (WHERE status='DRAFT')::bigint AS draft,COUNT(*) FILTER (WHERE featured=TRUE)::bigint AS featured,COALESCE(SUM(click_count),0)::bigint AS clicks FROM offers`),
    db.pool.query(`SELECT title,click_count FROM offers ORDER BY click_count DESC,id DESC LIMIT 1`),
    db.pool.query(`SELECT s.name,COUNT(*)::bigint AS total FROM offers o JOIN stores s ON s.id=o.store_id GROUP BY s.id,s.name ORDER BY total DESC LIMIT 1`),
    db.pool.query(`SELECT c.name,COUNT(*)::bigint AS total FROM offers o JOIN categories c ON c.id=o.category_id GROUP BY c.id,c.name ORDER BY total DESC LIMIT 1`),
    db.pool.query(`SELECT clicked_at::date::text AS day,COUNT(*)::bigint AS clicks FROM clicks WHERE clicked_at>=CURRENT_DATE-INTERVAL '6 days' GROUP BY clicked_at::date ORDER BY clicked_at::date`),
  ]);const c=counts.rows[0]||{};return {totalOffers:n(c.total),activeOffers:n(c.active),inactiveOffers:n(c.inactive),draftOffers:n(c.draft),featuredOffers:n(c.featured),totalClicks:n(c.clicks),topOffer:topOffer.rowCount?{title:String(topOffer.rows[0].title),click_count:n(topOffer.rows[0].click_count)}:null,topStore:topStore.rowCount?{name:String(topStore.rows[0].name),total:n(topStore.rows[0].total)}:null,topCategory:topCategory.rowCount?{name:String(topCategory.rows[0].name),total:n(topCategory.rows[0].total)}:null,recentClicks:recent.rows.map(r=>({day:String(r.day),clicks:n(r.clicks)}))};
}

async function importOffer(urlRaw:unknown){
  const parsed=await assertPublicUrl(assertHttpUrl(urlRaw)!.toString());let provider='generic';let result:ImportedOffer;
  const isML=hostnameMatches(parsed.hostname,'mercadolivre.com.br')||hostnameMatches(parsed.hostname,'mercadolivre.com');
  try{
    if(isML&&process.env.MERCADOLIVRE_ACCESS_TOKEN){
      provider='mercadolivre';
      try{result=await importMercadoLivre(parsed.toString());}
      catch(officialError){provider='generic';result=await importGeneric(parsed.toString());result.warning=`A API oficial do Mercado Livre falhou (${officialError instanceof Error?officialError.message:'erro desconhecido'}). Dados públicos foram usados como fallback; revise antes de publicar.`;}
    } else {result=await importGeneric(parsed.toString());if(isML&&!process.env.MERCADOLIVRE_ACCESS_TOKEN)result.warning='Importação genérica utilizada. Configure MERCADOLIVRE_ACCESS_TOKEN para usar a API oficial de itens e preços.';}
    const stores=await db.pool.query('SELECT id,slug,domain FROM stores WHERE active=TRUE');const matched=stores.rows.find(s=>s.domain&&hostnameMatches(new URL(result.original_url).hostname,String(s.domain)));const other=await db.pool.query(`SELECT id FROM categories WHERE slug='outros' LIMIT 1`);await db.pool.query('INSERT INTO import_logs (source_url,provider,success,message) VALUES ($1,$2,TRUE,$3)',[parsed.toString(),provider,'Importação concluída']);return {...result,store_id:matched?n(matched.id):undefined,category_id:other.rowCount?n(other.rows[0].id):undefined};
  }catch(e){await db.pool.query('INSERT INTO import_logs (source_url,provider,success,message) VALUES ($1,$2,FALSE,$3)',[parsed.toString(),provider,(e instanceof Error?e.message:'Falha').slice(0,1000)]).catch(()=>{});throw e;}
}

async function createCategory(payload:Record<string,unknown>){const name=cleanText(payload.name,80,true);const slug=slugify(name);try{const r=await db.pool.query('INSERT INTO categories (name,slug) VALUES ($1,$2) RETURNING id',[name,slug]);return {id:n(r.rows[0]?.id)};}catch(e){if(pgErrorCode(e)==='23505')throw new HttpError(409,'Já existe uma categoria com esse nome.');throw e;}}
async function updateCategory(id:number,payload:Record<string,unknown>){const current=await db.pool.query('SELECT name,active FROM categories WHERE id=$1',[id]);if(!current.rowCount)throw new HttpError(404,'Categoria não encontrada.');const name=payload.name===undefined?String(current.rows[0].name):cleanText(payload.name,80,true);const active=payload.active===undefined?Boolean(current.rows[0].active):bool(payload.active);try{await db.pool.query('UPDATE categories SET name=$2,slug=$3,active=$4 WHERE id=$1',[id,name,slugify(name),active]);}catch(e){if(pgErrorCode(e)==='23505')throw new HttpError(409,'Já existe uma categoria com esse nome.');throw e;}}
async function deleteCategory(id:number){try{const r=await db.pool.query('DELETE FROM categories WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new HttpError(404,'Categoria não encontrada.');}catch(e){if(pgErrorCode(e)==='23503')throw new HttpError(409,'Esta categoria possui ofertas vinculadas e não pode ser excluída. Desative-a ou mova as ofertas antes.');throw e;}}

async function createStore(payload:Record<string,unknown>){const name=cleanText(payload.name,100,true);const domain=normalizeDomain(payload.domain);const siteRaw=cleanText(payload.site_url,2048);const logoRaw=cleanText(payload.logo_url,2048);const site=siteRaw?(await assertPublicUrl(assertHttpUrl(siteRaw)!.toString())).toString():null;const logo=logoRaw?(await assertPublicUrl(assertHttpUrl(logoRaw)!.toString())).toString():null;try{const r=await db.pool.query('INSERT INTO stores (name,slug,domain,site_url,logo_url) VALUES ($1,$2,$3,$4,$5) RETURNING id',[name,slugify(name),domain,site,logo]);return {id:n(r.rows[0]?.id)};}catch(e){if(pgErrorCode(e)==='23505')throw new HttpError(409,'Já existe uma loja com esse nome ou domínio.');throw e;}}
async function updateStore(id:number,payload:Record<string,unknown>){const cur=await db.pool.query('SELECT * FROM stores WHERE id=$1',[id]);if(!cur.rowCount)throw new HttpError(404,'Loja não encontrada.');const c=cur.rows[0];const name=payload.name===undefined?String(c.name):cleanText(payload.name,100,true);const domain=payload.domain===undefined?(c.domain as string|null):normalizeDomain(payload.domain);const siteRaw=payload.site_url===undefined?(c.site_url as string|null):cleanText(payload.site_url,2048);const logoRaw=payload.logo_url===undefined?(c.logo_url as string|null):cleanText(payload.logo_url,2048);const active=payload.active===undefined?Boolean(c.active):bool(payload.active);const site=siteRaw?(await assertPublicUrl(assertHttpUrl(siteRaw)!.toString())).toString():null;const logo=logoRaw?(await assertPublicUrl(assertHttpUrl(logoRaw)!.toString())).toString():null;try{await db.pool.query('UPDATE stores SET name=$2,slug=$3,domain=$4,site_url=$5,logo_url=$6,active=$7 WHERE id=$1',[id,name,slugify(name),domain,site,logo,active]);}catch(e){if(pgErrorCode(e)==='23505')throw new HttpError(409,'Já existe uma loja com esse nome ou domínio.');throw e;}}
async function deleteStore(id:number){try{const r=await db.pool.query('DELETE FROM stores WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new HttpError(404,'Loja não encontrada.');}catch(e){if(pgErrorCode(e)==='23503')throw new HttpError(409,'Esta loja possui ofertas vinculadas e não pode ser excluída. Desative-a ou mova as ofertas antes.');throw e;}}

export default async (req:Request,_context:Context)=>{
  try{
    const path=pathOf(req);const m=method(req);const url=new URL(req.url);
    if(path==='/health'&&m==='GET')return json({ok:true});
    if(path==='/home'&&m==='GET')return publicJson(await homeData(),60);
    if(path==='/meta'&&m==='GET')return publicJson(await publicMeta(),300);
    if(path==='/offers'&&m==='GET')return publicJson(await publicOffers(url),60);
    const offerSlug=path.match(/^\/offers\/([^/]+)$/);if(offerSlug&&m==='GET')return publicJson(await offerDetail(decodeURIComponent(offerSlug[1]!)),120);
    const click=path.match(/^\/click\/(\d+)$/);if(click&&m==='POST'){requireSameOrigin(req);return json(await clickOffer(Number(click[1]),req));}
    if(path==='/auth/session'&&m==='GET')return json({authenticated:isAuthenticated(req)});
    if(path==='/auth/login'&&m==='POST'){requireSameOrigin(req);const b=await bodyJson<{password?:unknown}>(req,8_000);const password=cleanText(b.password,200,true);if(!verifyAdminPassword(password))throw new HttpError(401,'Senha incorreta.');return json({ok:true},200,{'Set-Cookie':createSessionCookie(req)});}
    if(path==='/auth/logout'&&m==='POST'){requireSameOrigin(req);return json({ok:true},200,{'Set-Cookie':clearSessionCookie(req)});}

    if(path.startsWith('/admin/')){requireAdmin(req);if(['POST','PUT','PATCH','DELETE'].includes(m))requireSameOrigin(req);}
    if(path==='/admin/dashboard'&&m==='GET')return json(await dashboard());
    if(path==='/admin/meta'&&m==='GET')return json(await adminMeta());
    if(path==='/admin/offers'&&m==='GET')return json(await adminOffers(url));
    if(path==='/admin/offers'&&m==='POST'){const b=await bodyJson<Record<string,unknown>>(req);return json({offer:await createOffer(b)},201);}
    const adminOffer=path.match(/^\/admin\/offers\/(\d+)$/);if(adminOffer&&m==='PUT'){const b=await bodyJson<Record<string,unknown>>(req);return json({offer:await updateOffer(Number(adminOffer[1]),b)});}if(adminOffer&&m==='DELETE'){await deleteOffer(Number(adminOffer[1]));return json({ok:true});}
    const adminAction=path.match(/^\/admin\/offers\/(\d+)\/action$/);if(adminAction&&m==='POST'){const b=await bodyJson<{action?:unknown}>(req,8_000);const action=cleanText(b.action,30,true);return json({ok:true,...await offerAction(Number(adminAction[1]),action)});}
    if(path==='/admin/import'&&m==='POST'){const b=await bodyJson<{url?:unknown}>(req,8_000);return json(await importOffer(b.url));}
    if(path==='/admin/categories'&&m==='POST'){const b=await bodyJson<Record<string,unknown>>(req,8_000);return json(await createCategory(b),201);}
    const cat=path.match(/^\/admin\/categories\/(\d+)$/);if(cat&&m==='PUT'){const b=await bodyJson<Record<string,unknown>>(req,8_000);await updateCategory(Number(cat[1]),b);return json({ok:true});}if(cat&&m==='DELETE'){await deleteCategory(Number(cat[1]));return json({ok:true});}
    if(path==='/admin/stores'&&m==='POST'){const b=await bodyJson<Record<string,unknown>>(req,16_000);return json(await createStore(b),201);}
    const store=path.match(/^\/admin\/stores\/(\d+)$/);if(store&&m==='PUT'){const b=await bodyJson<Record<string,unknown>>(req,16_000);await updateStore(Number(store[1]),b);return json({ok:true});}if(store&&m==='DELETE'){await deleteStore(Number(store[1]));return json({ok:true});}
    throw new HttpError(404,'Rota não encontrada.');
  }catch(e){return handleError(e);}
};

export const config:Config={path:'/api/*',rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip','domain']}};
