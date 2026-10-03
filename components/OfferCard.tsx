import { ArrowUpRight, Store as StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Offer } from '../types';
import { formatBRL } from '../utils/money';

export default function OfferCard({ offer }: { offer: Offer }) {
  const [opening, setOpening] = useState(false);

  async function openOffer() {
    if (opening) return;
    setOpening(true);
    try {
      const { url } = await api.registerClick(offer.id);
      window.location.assign(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível abrir esta oferta.');
      setOpening(false);
    }
  }

  return (
    <article className="offer-card">
      <Link className="offer-image-wrap" to={`/oferta/${offer.slug}`}>
        {offer.discount_percentage && offer.discount_percentage > 0 ? (
          <span className="discount-badge">{Math.round(offer.discount_percentage)}% OFF</span>
        ) : null}
        {offer.image_url ? <img src={offer.image_url} alt={offer.title} loading="lazy" /> : <div className="image-placeholder">Sem imagem</div>}
      </Link>
      <div className="offer-card-body">
        <div className="offer-store"><StoreIcon size={14} /> {offer.store_name}</div>
        <Link to={`/oferta/${offer.slug}`} className="offer-title">{offer.title}</Link>
        <div className="offer-category">{offer.category_name}</div>
        <div className="price-block">
          {offer.old_price && offer.old_price > offer.current_price ? <span className="old-price">De {formatBRL(offer.old_price)}</span> : <span className="old-price empty">&nbsp;</span>}
          <strong>{formatBRL(offer.current_price)}</strong>
        </div>
        <button className="offer-cta" type="button" onClick={openOffer} disabled={opening}>{opening ? 'ABRINDO…' : 'VER OFERTA'} <ArrowUpRight size={17} /></button>
      </div>
    </article>
  );
}
