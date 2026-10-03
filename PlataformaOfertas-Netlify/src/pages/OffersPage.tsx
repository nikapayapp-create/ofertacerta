import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import OfferCard from '../components/OfferCard';
import PublicLayout from '../components/PublicLayout';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { api } from '../services/api';
import type { MetaResponse, OffersResponse } from '../types';

export default function OffersPage() {
  const [params, setParams] = useSearchParams();
  const [meta, setMeta] = useState<MetaResponse>({ categories: [], stores: [] });
  const [data, setData] = useState<OffersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [searchText, setSearchText] = useState(params.get('q') || '');
  useDocumentMeta(params.get('q') ? `Ofertas para “${params.get('q')}” — OfertaCerta` : 'Todas as ofertas — OfertaCerta');

  const queryKey = params.toString();
  useEffect(() => { api.getMeta().then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      const next = new URLSearchParams(params);
      if (!next.has('page')) next.set('page', '1');
      if (!next.has('limit')) next.set('limit', '24');
      setError('');
      api.getOffers(next).then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar as ofertas.')).finally(() => setLoading(false));
    }, 100);
    return () => window.clearTimeout(timer);
  }, [queryKey]);

  const activeFilters = useMemo(() => ['category','store','minPrice','maxPrice','sort','featured'].filter((k) => params.get(k)).length, [queryKey]);
  function update(key: string, value: string) { const n = new URLSearchParams(params); value ? n.set(key, value) : n.delete(key); n.set('page','1'); setParams(n); }
  function submit(e: FormEvent) { e.preventDefault(); update('q', searchText.trim()); }
  function clearFilters() { const q = params.get('q'); setParams(q ? { q } : {}); }
  function goPage(page: number) { const n = new URLSearchParams(params); n.set('page', String(page)); setParams(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return (
    <PublicLayout>
      <div className="container offers-page">
        <div className="offers-title-row"><div><span className="eyebrow"><Filter size={14}/> Catálogo</span><h1>Ofertas</h1><p>{data ? `${data.total} ${data.total === 1 ? 'oferta encontrada' : 'ofertas encontradas'}` : 'Buscando…'}</p></div></div>
        <form className="catalog-search" onSubmit={submit}><Search size={19}/><input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="Pesquisar por produto, marca, categoria ou loja"/><button>Pesquisar</button></form>
        <button className="mobile-filter-button" onClick={()=>setMobileFilters(true)}><SlidersHorizontal size={17}/> Filtros {activeFilters ? <b>{activeFilters}</b> : null}</button>

        <div className="catalog-layout">
          <aside className={`filters-panel ${mobileFilters ? 'mobile-open' : ''}`}>
            <div className="filter-header"><strong>Filtros</strong><button className="mobile-only" onClick={()=>setMobileFilters(false)}><X/></button></div>
            <label>Categoria<select value={params.get('category') || ''} onChange={(e)=>update('category', e.target.value)}><option value="">Todas</option>{meta.categories.filter(c=>c.active).map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
            <label>Loja<select value={params.get('store') || ''} onChange={(e)=>update('store', e.target.value)}><option value="">Todas</option>{meta.stores.filter(s=>s.active).map(s=><option key={s.id} value={s.slug}>{s.name}</option>)}</select></label>
            <div className="filter-price-row"><label>Preço mín.<input inputMode="decimal" value={params.get('minPrice') || ''} onChange={(e)=>update('minPrice', e.target.value.replace(/[^0-9.,]/g,''))} placeholder="R$ 0"/></label><label>Preço máx.<input inputMode="decimal" value={params.get('maxPrice') || ''} onChange={(e)=>update('maxPrice', e.target.value.replace(/[^0-9.,]/g,''))} placeholder="R$ 5.000"/></label></div>
            <label>Ordenar<select value={params.get('sort') || 'recent'} onChange={(e)=>update('sort', e.target.value)}><option value="recent">Mais recentes</option><option value="discount">Maior desconto</option><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option><option value="popular">Mais acessados</option></select></label>
            <label className="check-line"><input type="checkbox" checked={params.get('featured')==='1'} onChange={(e)=>update('featured', e.target.checked?'1':'')}/> Somente destaques</label>
            {activeFilters ? <button className="clear-filter" onClick={clearFilters}>Limpar filtros</button> : null}
          </aside>
          <section className="catalog-results">
            {error ? <div className="error-banner">{error}</div> : null}
            {loading ? <LoadingState /> : data && data.items.length ? <div className="offer-grid">{data.items.map(o=><OfferCard key={o.id} offer={o}/>)}</div> : <EmptyState />}
            {data && data.totalPages > 1 ? <div className="pagination"><button disabled={data.page<=1} onClick={()=>goPage(data.page-1)}>Anterior</button><span>Página {data.page} de {data.totalPages}</span><button disabled={data.page>=data.totalPages} onClick={()=>goPage(data.page+1)}>Próxima</button></div> : null}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
