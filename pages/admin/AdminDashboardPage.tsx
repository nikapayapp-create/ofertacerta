import { Boxes, Eye, FileText, MousePointerClick, PackageCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import LoadingState from '../../components/LoadingState';
import { api } from '../../services/api';
import type { DashboardStats } from '../../types';

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  useEffect(()=>{ api.dashboard().then(setData).catch(e=>setError(e.message)); },[]);
  const cards = data ? [
    ['Total de ofertas', data.totalOffers, Boxes], ['Ofertas ativas', data.activeOffers, PackageCheck], ['Rascunhos', data.draftOffers, FileText], ['Em destaque', data.featuredOffers, Star], ['Total de cliques', data.totalClicks, MousePointerClick], ['Inativas', data.inactiveOffers, Eye],
  ] as const : [];
  return <AdminLayout title="Dashboard" subtitle="Visão geral da plataforma">
    {error?<div className="error-banner">{error}</div>:null}
    {!data&&!error?<LoadingState/>:data?<>
      <div className="stats-grid">{cards.map(([label,value,Icon])=><div className="stat-card" key={label}><span><Icon size={20}/></span><div><small>{label}</small><strong>{Number(value).toLocaleString('pt-BR')}</strong></div></div>)}</div>
      <div className="dashboard-grid">
        <section className="admin-card"><h2>Destaques operacionais</h2><div className="metric-list"><div><span>Oferta mais clicada</span><strong>{data.topOffer?.title || 'Sem dados'}</strong><small>{data.topOffer ? `${data.topOffer.click_count.toLocaleString('pt-BR')} cliques` : '—'}</small></div><div><span>Loja com mais ofertas</span><strong>{data.topStore?.name || 'Sem dados'}</strong><small>{data.topStore ? `${data.topStore.total} ofertas` : '—'}</small></div><div><span>Categoria com mais ofertas</span><strong>{data.topCategory?.name || 'Sem dados'}</strong><small>{data.topCategory ? `${data.topCategory.total} ofertas` : '—'}</small></div></div></section>
        <section className="admin-card"><h2>Cliques nos últimos 7 dias</h2><div className="mini-chart">{data.recentClicks.length ? data.recentClicks.map((d,i)=>{ const max=Math.max(...data.recentClicks.map(x=>x.clicks),1); return <div className="bar-wrap" key={d.day}><div className="bar" style={{height:`${Math.max((d.clicks/max)*100,5)}%`}} title={`${d.clicks} cliques`} /><small>{new Date(`${d.day}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</small><b>{d.clicks}</b></div>}) : <p className="muted">Ainda não há cliques registrados.</p>}</div></section>
      </div>
    </>:null}
  </AdminLayout>;
}
