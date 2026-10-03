export type OfferStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  site_url: string | null;
  active: boolean;
}

export interface Offer {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  original_url?: string;
  brand: string | null;
  keywords: string[];
  store_id: number;
  store_name: string;
  store_slug: string;
  store_domain?: string | null;
  category_id: number;
  category_name: string;
  category_slug: string;
  old_price: number | null;
  current_price: number;
  discount_percentage: number | null;
  status: OfferStatus;
  featured: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface OffersResponse {
  items: Offer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MetaResponse {
  categories: Category[];
  stores: Store[];
}

export interface DashboardStats {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  draftOffers: number;
  featuredOffers: number;
  totalClicks: number;
  topOffer: { title: string; click_count: number } | null;
  topStore: { name: string; total: number } | null;
  topCategory: { name: string; total: number } | null;
  recentClicks: Array<{ day: string; clicks: number }>;
}

export interface OfferInput {
  title: string;
  description: string;
  image_url: string;
  original_url: string;
  brand: string;
  keywords: string[];
  store_id: number | '';
  category_id: number | '';
  old_price: string;
  current_price: string;
  status: OfferStatus;
  featured: boolean;
}

export interface ImportResult {
  provider: string;
  title?: string;
  description?: string;
  image_url?: string;
  original_url: string;
  brand?: string;
  old_price?: number | null;
  current_price?: number | null;
  store_id?: number;
  category_id?: number;
  external_id?: string | null;
  warning?: string;
}
