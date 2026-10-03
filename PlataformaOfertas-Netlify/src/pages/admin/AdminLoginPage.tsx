import { LockKeyhole, ShoppingBag } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useDocumentMeta('Admin — OfertaCerta');

  useEffect(() => { api.session().then(r => { if (r.authenticated) navigate('/admin/dashboard', { replace: true }); }).catch(() => {}); }, [navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.login(password); navigate('/admin/dashboard', { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha no login.'); }
    finally { setLoading(false); }
  }

  return <div className="admin-login-page">
    <div className="login-card">
      <div className="login-logo"><span className="brand-mark"><ShoppingBag size={20}/></span><strong>Oferta<span>Certa</span></strong></div>
      <div className="login-icon"><LockKeyhole/></div>
      <h1>Painel administrativo</h1>
      <p>Entre com a senha definida nas variáveis de ambiente da Netlify.</p>
      <form onSubmit={submit}>
        <label>Senha do administrador<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error ? <div className="inline-error">{error}</div>:null}
        <button className="primary-button" disabled={loading}>{loading?'Entrando…':'ENTRAR NO PAINEL'}</button>
      </form>
      <small>A senha nunca é armazenada no navegador. A sessão é validada pelo backend.</small>
    </div>
  </div>;
}
