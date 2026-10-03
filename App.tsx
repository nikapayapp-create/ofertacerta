import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OffersPage from './pages/OffersPage';
import OfferDetailPage from './pages/OfferDetailPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOffersPage from './pages/admin/AdminOffersPage';
import AdminOfferEditorPage from './pages/admin/AdminOfferEditorPage';
import AdminTaxonomyPage from './pages/admin/AdminTaxonomyPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/ofertas" element={<OffersPage />} />
      <Route path="/oferta/:slug" element={<OfferDetailPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/ofertas" element={<AdminOffersPage />} />
      <Route path="/admin/ofertas/nova" element={<AdminOfferEditorPage />} />
      <Route path="/admin/ofertas/:id" element={<AdminOfferEditorPage />} />
      <Route path="/admin/cadastros" element={<AdminTaxonomyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
