import { ArrowRight, BadgePercent, Search, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import OfferSection from '../components/OfferSection';
import LoadingState from '../components/LoadingState';
import { api } from '../services/api';
import type { Offer } from '../types';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

interface HomeData { featured: Offer[]; recent: Offer[]; discounts: Offer[]; popular: Offer[]; all: Offer[] }

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  useDocumentMeta('OfertaCerta — ofertas de verdade', 'Encontre promoções selecionadas em lojas confiáveis e acesse diretamente a loja original.');

  useEffect(() => { api.getHome().then(setData).catch((e) => setError(e.message)); }, []);
  function submit(e: FormEvent) { e.preventDefault(); if (q.trim()) navigate(`/ofertas?q=${encodeURIComponent(q.trim())}`); }

  return (
    <PublicLayout>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Promoções selecionadas</span>
            <h1>Encontre uma boa oferta <span>sem perder tempo.</span></h1>
            <p>Pesquise produtos, filtre por categoria e compare promoções. Ao escolher uma oferta, você vai direto para a loja original.</p>
            <form className="hero-search" onSubmit={submit}>
              <Search size={22} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: notebook, monitor, parafusadeira…" />
              <button>Pesquisar</button>
            </form>
            <div className="hero-proof">
              <span><ShieldCheck size={17} /> Link direto para a loja</span>
              <span><BadgePercent size={17} /> Descontos calculados</span>
              <span><TrendingUp size={17} /> Ofertas mais acessadas</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
            <div className="hero-deal-card">
              <span className="mini-badge">OFERTA DO DIA</span>
              <div className="mock-image">%</div>
              <div className="mock-lines"><i /><i /><i /></div>
              <strong>Economize encontrando o melhor momento para comprar.</strong>
              <Link to="/ofertas">Explorar ofertas <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="container error-banner">{error}</div> : null}
      {!data && !error ? <LoadingState /> : null}
      {data ? <>
        <OfferSection title="Ofertas em destaque" subtitle="Seleção marcada pelo administrador" offers={data.featured} moreHref="/ofertas?featured=1" />
        <OfferSection title="Ofertas recentes" subtitle="Acabaram de entrar na plataforma" offers={data.recent} moreHref="/ofertas?sort=recent" />
        <OfferSection title="Maiores descontos" subtitle="Somente quando existe preço anterior válido" offers={data.discounts} moreHref="/ofertas?sort=discount" />
        <OfferSection title="Mais acessadas" subtitle="As promoções que mais chamaram atenção" offers={data.popular} moreHref="/ofertas?sort=popular" />
        <OfferSection title="Todas as ofertas" offers={data.all} />
      </> : null}
    </PublicLayout>
  );
}
