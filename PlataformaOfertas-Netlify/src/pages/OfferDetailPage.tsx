import { ArrowLeft, ArrowUpRight, Calendar, ExternalLink, ShieldCheck, Store as StoreIcon, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import OfferCard from '../components/OfferCard';
import PublicLayout from '../components/PublicLayout';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { api } from '../services/api';
import type { Offer } from '../types';
import { formatDate } from '../utils/date';
import { formatBRL } from '../utils/money';

export default function OfferDetailPage() {
  const { slug = '' } = useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [related, setRelated] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState(false);
  const [error, setError] = useState('');
  useDocumentMeta(offer ? `${offer.title} — OfertaCerta` : 'Oferta — OfertaCerta', offer?.description || undefined, offer?.image_url);

  useEffect(() => { setLoading(true); api.getOffer(slug).then(r=>{setOffer(r.offer);setRelated(r.related)}).catch(e=>setError(e.message)).finally(()=>setLoading(false)); }, [slug]);
  async function goToOffer() {
    if (!offer || clicking) return;
    setClicking(true);
    try { const { url } = await api.registerClick(offer.id); window.location.assign(url); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir a oferta.'); setClicking(false); }
  }

  return <PublicLayout>
    <div className="container offer-detail-page">
      <Link to="/ofertas" className="back-link"><ArrowLeft size={16}/> Voltar para ofertas</Link>
      {loading ? <LoadingState /> : error && !offer ? <EmptyState title="Oferta indisponível" description={error}/> : offer ? <>
        <div className="detail-grid">
          <div className="detail-image">{offer.discount_percentage && offer.discount_percentage > 0 ? <span className="discount-badge large">{Math.round(offer.discount_percentage)}% OFF</span>:null}{offer.image_url?<img src={offer.image_url} alt={offer.title}/>:<div className="image-placeholder">Sem imagem</div>}</div>
          <div className="detail-info">
            <div className="detail-meta"><span><StoreIcon size={15}/>{offer.store_name}</span><span><Tag size={15}/>{offer.category_name}</span></div>
            <h1>{offer.title}</h1>
            {offer.brand ? <p className="brand-line">Marca: <strong>{offer.brand}</strong></p> : null}
            <div className="detail-price">{offer.old_price && offer.old_price > offer.current_price ? <span>De <s>{formatBRL(offer.old_price)}</s></span>:null}<strong>{formatBRL(offer.current_price)}</strong>{offer.discount_percentage && offer.discount_percentage>0?<em>Economia de {Math.round(offer.discount_percentage)}%</em>:null}</div>
            <button className="big-cta" onClick={goToOffer} disabled={clicking}>{clicking?'Abrindo…':'IR PARA OFERTA'} <ExternalLink size={19}/></button>
            <div className="safe-note"><ShieldCheck size={18}/><div><strong>Compra na loja original</strong><p>Você será direcionado para o site da loja. Confira preço, frete e disponibilidade antes de finalizar.</p></div></div>
            <div className="publish-date"><Calendar size={15}/> Publicada em {formatDate(offer.published_at || offer.created_at)}</div>
            {error ? <div className="inline-error">{error}</div> : null}
          </div>
        </div>
        {offer.description ? <section className="description-box"><h2>Sobre esta oferta</h2><p>{offer.description}</p></section>:null}
        {related.length ? <section className="section related-section"><div className="section-heading"><div><h2>Ofertas relacionadas</h2><p>Mais opções da mesma categoria</p></div></div><div className="offer-grid">{related.map(o=><OfferCard key={o.id} offer={o}/>)}</div></section>:null}
      </>:null}
    </div>
  </PublicLayout>;
}
