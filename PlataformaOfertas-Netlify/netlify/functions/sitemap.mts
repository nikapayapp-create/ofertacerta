import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';
const db=getDatabase();
function esc(v:string){return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
export default async(req:Request)=>{const base=new URL(req.url).origin;const r=await db.pool.query(`SELECT slug,COALESCE(updated_at,published_at,created_at) AS changed FROM offers WHERE status='ACTIVE' ORDER BY updated_at DESC LIMIT 50000`);const urls=[`<url><loc>${esc(base)}/</loc></url>`,`<url><loc>${esc(base)}/ofertas</loc></url>`,...r.rows.map(x=>`<url><loc>${esc(base)}/oferta/${encodeURIComponent(String(x.slug))}</loc><lastmod>${new Date(String(x.changed)).toISOString()}</lastmod></url>`)];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=3600'}})};
export const config:Config={path:'/sitemap.xml'};
