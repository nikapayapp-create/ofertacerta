import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Offer } from '../types';
import OfferCard from './OfferCard';

export default function OfferSection({ title, subtitle, offers, moreHref = '/ofertas' }: { title: string; subtitle?: string; offers: Offer[]; moreHref?: string }) {
  if (!offers.length) return null;
  return (
    <section className="section container">
      <div className="section-heading">
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
        <Link to={moreHref}>Ver todas <ChevronRight size={17} /></Link>
      </div>
      <div className="offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div>
    </section>
  );
}
