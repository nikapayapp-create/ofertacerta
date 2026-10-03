export interface ImportedOffer {
  provider: string;
  title?: string;
  description?: string;
  image_url?: string;
  original_url: string;
  brand?: string;
  old_price?: number | null;
  current_price?: number | null;
  external_id?: string | null;
  warning?: string;
}
