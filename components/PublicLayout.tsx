import type { ReactNode } from 'react';
import PublicHeader from './PublicHeader';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <PublicHeader />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <strong>OfertaCerta</strong>
            <p>Uma vitrine de promoções. A compra acontece diretamente na loja anunciante.</p>
          </div>
          <div>
            <span>Transparência</span>
            <p>Preços podem mudar na loja de destino. Sempre confirme as condições antes de comprar.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
