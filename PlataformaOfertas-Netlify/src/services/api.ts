import type { DashboardStats, ImportResult, MetaResponse, Offer, OfferInput, OffersResponse } from '../types';

const headers = { 'Content-Type': 'application/json' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String(payload.error) : `Erro ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  getHome: () => request<{ featured: Offer[]; recent: Offer[]; discounts: Offer[]; popular: Offer[]; all: Offer[] }>('/api/home'),
  getMeta: () => request<MetaResponse>('/api/meta'),
  getOffers: (params: URLSearchParams) => request<OffersResponse>(`/api/offers?${params}`),
  getOffer: (slug: string) => request<{ offer: Offer; related: Offer[] }>(`/api/offers/${encodeURIComponent(slug)}`),
  registerClick: (id: number) => request<{ url: string }>(`/api/click/${id}`, { method: 'POST', headers }),
  login: (password: string) => request<{ ok: boolean }>('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', headers }),
  session: () => request<{ authenticated: boolean }>('/api/auth/session'),
  dashboard: () => request<DashboardStats>('/api/admin/dashboard'),
  adminOffers: (params = new URLSearchParams({ page: '1', limit: '50' })) => request<OffersResponse>(`/api/admin/offers?${params}`),
  createOffer: (data: OfferInput) => request<{ offer: Offer }>('/api/admin/offers', { method: 'POST', headers, body: JSON.stringify(data) }),
  updateOffer: (id: number, data: OfferInput) => request<{ offer: Offer }>(`/api/admin/offers/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }),
  deleteOffer: (id: number) => request<{ ok: boolean }>(`/api/admin/offers/${id}`, { method: 'DELETE', headers }),
  actionOffer: (id: number, action: string) => request<{ ok: boolean; offer?: Offer }>(`/api/admin/offers/${id}/action`, { method: 'POST', headers, body: JSON.stringify({ action }) }),
  importOffer: (url: string) => request<ImportResult>('/api/admin/import', { method: 'POST', headers, body: JSON.stringify({ url }) }),
  adminTaxonomy: () => request<MetaResponse>('/api/admin/meta'),
  createCategory: (name: string) => request('/api/admin/categories', { method: 'POST', headers, body: JSON.stringify({ name }) }),
  updateCategory: (id: number, data: Record<string, unknown>) => request(`/api/admin/categories/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request(`/api/admin/categories/${id}`, { method: 'DELETE', headers }),
  createStore: (data: Record<string, unknown>) => request('/api/admin/stores', { method: 'POST', headers, body: JSON.stringify(data) }),
  updateStore: (id: number, data: Record<string, unknown>) => request(`/api/admin/stores/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }),
  deleteStore: (id: number) => request(`/api/admin/stores/${id}`, { method: 'DELETE', headers }),
};
