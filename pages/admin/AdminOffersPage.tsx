import { Copy, Edit3, EyeOff, PackagePlus, Star, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { api } from '../../services/api';
import type { Offer, OffersResponse } from '../../types';
import { formatBRL } from '../../utils/money';

export default function AdminOffersPage() {
  const [data,setData]=useState<OffersResponse|null>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const [q,setQ]=useState(''); const [page,setPage]=useState(1);
  async function load(search=q,targetPage=page){ setLoading(true); setError(''); try{ const p=new URLSearchParams({page:String(targetPage),limit:'50'}); if(search.trim()) p.set('q',search.trim()); setData(await api.adminOffers(p)); setPage(targetPage); }catch(e){setError(e instanceof Error?e.message:'Erro');}finally{setLoading(false);} }
  useEffect(()=>{void load('',1);},[]);
  async function action(offer:Offer, name:string){ if(name==='delete' && !confirm('Tem certeza que deseja excluir esta oferta?')) return; try{ if(name==='delete') await api.deleteOffer(offer.id); else await api.actionOffer(offer.id,name); await load(q,page); }catch(e){alert(e instanceof Error?e.message:'Não foi possível concluir a ação.');} }
  return <AdminLayout title="Ofertas" subtitle="Gerencie publicações, destaque e status" actions={<Link className="primary-button compact" to="/admin/ofertas/nova"><PackagePlus size={17}/> Nova oferta</Link>}>
    <div className="admin-toolbar"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load(q,1);}} placeholder="Pesquisar oferta…"/><button onClick={()=>void load(q,1)}>Pesquisar</button></div>
    {error?<div className="error-banner">{error}</div>:null}{loading?<LoadingState/>:data&&data.items.length?<><div className="admin-offers-list">{data.items.map(o=><article className="admin-offer-row" key={o.id}><div className="admin-offer-thumb">{o.image_url?<img src={o.image_url} alt=""/>:<span>—</span>}</div><div className="admin-offer-main"><div className="row-title"><strong>{o.title}</strong>{o.featured?<span className="featured-pill"><Star size={12}/> Destaque</span>:null}</div><small>{o.store_name} · {o.category_name}</small><div className="row-price"><b>{formatBRL(o.current_price)}</b>{o.discount_percentage? <span>{Math.round(o.discount_percentage)}% OFF</span>:null}<span>{o.click_count.toLocaleString('pt-BR')} cliques</span></div></div><div className={`status-pill ${o.status.toLowerCase()}`}>{o.status}</div><div className="row-actions"><Link title="Editar" to={`/admin/ofertas/${o.id}`}><Edit3 size={16}/></Link><button title={o.status==='ACTIVE'?'Desativar':'Publicar'} onClick={()=>action(o,o.status==='ACTIVE'?'deactivate':'publish')}>{o.status==='ACTIVE'?<EyeOff size={16}/>:<Upload size={16}/>}</button><button title="Duplicar" onClick={()=>action(o,'duplicate')}><Copy size={16}/></button><button title={o.featured?'Remover destaque':'Destacar'} onClick={()=>action(o,o.featured?'unfeature':'feature')}><Star size={16}/></button><button className="danger" title="Excluir" onClick={()=>action(o,'delete')}><Trash2 size={16}/></button></div></article>)}</div>{data.totalPages>1?<div className="pagination"><button disabled={page<=1} onClick={()=>void load(q,page-1)}>Anterior</button><span>Página {page} de {data.totalPages}</span><button disabled={page>=data.totalPages} onClick={()=>void load(q,page+1)}>Próxima</button></div>:null}</>:<EmptyState title="Nenhuma oferta cadastrada" description="Crie a primeira oferta pelo botão acima."/>}
  </AdminLayout>;
}
