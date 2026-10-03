import { BarChart3, Boxes, LogOut, PackagePlus, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AdminGuard from './AdminGuard';

export default function AdminLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const navigate = useNavigate();
  async function logout() { try { await api.logout(); } finally { navigate('/admin'); } }
  return (
    <AdminGuard>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link to="/" className="brand admin-brand"><span className="brand-mark">%</span><span>Oferta<span>Certa</span></span></Link>
          <nav>
            <NavLink to="/admin/dashboard"><BarChart3 size={18} /> Dashboard</NavLink>
            <NavLink to="/admin/ofertas"><Boxes size={18} /> Ofertas</NavLink>
            <NavLink to="/admin/ofertas/nova"><PackagePlus size={18} /> Nova oferta</NavLink>
            <NavLink to="/admin/cadastros"><Tags size={18} /> Categorias e lojas</NavLink>
          </nav>
          <button className="sidebar-logout" onClick={logout}><LogOut size={17} /> Sair</button>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
            <div className="admin-actions">{actions}</div>
          </header>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </AdminGuard>
  );
}
