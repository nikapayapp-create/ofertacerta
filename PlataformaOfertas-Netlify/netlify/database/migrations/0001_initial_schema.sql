CREATE OR REPLACE FUNCTION normalize_text(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    lower(coalesce(input, '')),
    'áàãâäéèêëíìîïóòõôöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'
  );
$$;

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  site_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  original_url TEXT NOT NULL,
  brand VARCHAR(100),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  old_price NUMERIC(12,2) CHECK (old_price IS NULL OR old_price >= 0),
  current_price NUMERIC(12,2) NOT NULL CHECK (current_price > 0),
  discount_percentage NUMERIC(5,2) CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','EXPIRED')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  source_provider VARCHAR(50),
  external_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clicks (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_logs (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'generic',
  success BOOLEAN NOT NULL,
  message VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_touch_updated_at ON categories;
CREATE TRIGGER categories_touch_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS stores_touch_updated_at ON stores;
CREATE TRIGGER stores_touch_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS offers_touch_updated_at ON offers;
CREATE TRIGGER offers_touch_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS offers_status_published_idx ON offers (status, published_at DESC);
CREATE INDEX IF NOT EXISTS offers_category_idx ON offers (category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS offers_store_idx ON offers (store_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS offers_discount_idx ON offers (discount_percentage DESC) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS offers_click_count_idx ON offers (click_count DESC) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS offers_featured_idx ON offers (featured, published_at DESC) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS clicks_offer_idx ON clicks (offer_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS clicks_date_idx ON clicks (clicked_at DESC);
CREATE INDEX IF NOT EXISTS import_logs_date_idx ON import_logs (created_at DESC);

INSERT INTO categories (name, slug) VALUES
  ('Ferramentas','ferramentas'),
  ('Eletrônicos','eletronicos'),
  ('Informática','informatica'),
  ('Celulares','celulares'),
  ('Games','games'),
  ('Casa','casa'),
  ('Eletrodomésticos','eletrodomesticos'),
  ('Automotivo','automotivo'),
  ('Moda','moda'),
  ('Outros','outros')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO stores (name, slug, domain, site_url) VALUES
  ('Mercado Livre','mercado-livre','mercadolivre.com.br','https://www.mercadolivre.com.br'),
  ('Amazon','amazon','amazon.com.br','https://www.amazon.com.br'),
  ('Shopee','shopee','shopee.com.br','https://shopee.com.br'),
  ('Magalu','magalu','magazineluiza.com.br','https://www.magazineluiza.com.br'),
  ('KaBuM','kabum','kabum.com.br','https://www.kabum.com.br'),
  ('AliExpress','aliexpress','aliexpress.com','https://www.aliexpress.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('site', '{"name":"OfertaCerta"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
