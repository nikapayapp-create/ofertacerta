-- Seed opcional. Execute somente em ambiente de demonstração.
INSERT INTO offers (title,slug,description,original_url,brand,keywords,store_id,category_id,old_price,current_price,discount_percentage,status,featured,published_at,source_provider)
SELECT 'Parafusadeira 12V com bateria','demo-parafusadeira-12v','Oferta fictícia para testar cards, pesquisa, filtros e painel.','https://www.mercadolivre.com.br/','DemoTools',ARRAY['parafusadeira','ferramenta'],s.id,c.id,699.90,449.90,35.72,'ACTIVE',TRUE,NOW(),'seed'
FROM stores s,categories c WHERE s.slug='mercado-livre' AND c.slug='ferramentas'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO offers (title,slug,description,original_url,brand,keywords,store_id,category_id,old_price,current_price,discount_percentage,status,featured,published_at,source_provider)
SELECT 'Monitor IPS 24 polegadas Full HD','demo-monitor-ips-24','Oferta fictícia para validar ordenação por desconto e preço.','https://www.amazon.com.br/','ViewDemo',ARRAY['monitor','ips','full hd'],s.id,c.id,899.00,699.00,22.25,'ACTIVE',TRUE,NOW()-INTERVAL '1 hour','seed'
FROM stores s,categories c WHERE s.slug='amazon' AND c.slug='informatica'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO offers (title,slug,description,original_url,brand,keywords,store_id,category_id,old_price,current_price,discount_percentage,status,featured,published_at,source_provider)
SELECT 'Organizador modular para cozinha','demo-organizador-cozinha','Oferta fictícia para demonstrar produtos sem marca obrigatória.','https://shopee.com.br/','',ARRAY['organizador','cozinha','casa'],s.id,c.id,129.90,89.90,30.79,'ACTIVE',FALSE,NOW()-INTERVAL '2 hours','seed'
FROM stores s,categories c WHERE s.slug='shopee' AND c.slug='casa'
ON CONFLICT (slug) DO NOTHING;
