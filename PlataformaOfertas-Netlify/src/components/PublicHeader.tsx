import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Category } from '../types';

export default function PublicHeader() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getMeta().then((data) => setCategories(data.categories.filter((c) => c.active))).catch(() => {});
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/ofertas?q=${encodeURIComponent(q)}` : '/ofertas');
    setOpen(false);
  }

  return (
    <header className="site-header">
      <div className="header-top container">
        <Link to="/" className="brand" aria-label="OfertaCerta - início">
          <span className="brand-mark"><ShoppingBag size={21} /></span>
          <span>Oferta<span>Certa</span></span>
        </Link>

        <form className="header-search" onSubmit={submit}>
          <Search size={20} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qual produto você está procurando?" aria-label="Pesquisar ofertas" />
          <button type="submit">Buscar</button>
        </form>

        <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-label="Abrir menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <nav className={`category-nav ${open ? 'open' : ''}`}>
        <div className="container nav-scroll">
          <Link to="/ofertas" onClick={() => setOpen(false)} className="nav-main">Todas as ofertas</Link>
          {categories.slice(0, 10).map((category) => (
            <Link key={category.id} to={`/ofertas?category=${category.slug}`} onClick={() => setOpen(false)}>{category.name}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
