import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';
import LoadingState from './LoadingState';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'no'>('loading');
  useEffect(() => { api.session().then((r) => setState(r.authenticated ? 'ok' : 'no')).catch(() => setState('no')); }, []);
  if (state === 'loading') return <LoadingState label="Validando sessão…" />;
  if (state === 'no') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
