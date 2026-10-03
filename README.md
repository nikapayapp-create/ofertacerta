# OfertaCerta — Plataforma de ofertas para Netlify

Aplicação full-stack de vitrine/agregador de promoções. A compra não ocorre no site: o visitante pesquisa uma oferta e é direcionado para a loja original. O projeto foi preparado para Netlify, com React + Vite + TypeScript no frontend, Netlify Functions no backend e Netlify Database (PostgreSQL) para persistência.

## Arquitetura

- `src/`: frontend React responsivo, home, busca/filtros, página de oferta e painel administrativo.
- `netlify/functions/api.mts`: API serverless pública e administrativa.
- `netlify/functions/sitemap.mts`: sitemap dinâmico das ofertas ativas.
- `netlify/database/migrations/`: schema PostgreSQL aplicado automaticamente pela Netlify no deploy.
- `netlify/database/seeds/`: seed opcional de demonstração (não é executado automaticamente).
- `netlify.toml`: build, Functions, headers de segurança e fallback da SPA.

## Funcionalidades

Área pública: destaque, recentes, maiores descontos, mais acessadas, listagem paginada, pesquisa sem diferenciação de acentos/caixa, filtros por categoria/loja/preço, ordenação, detalhes e ofertas relacionadas.

Admin: login server-side com cookie HttpOnly assinado, dashboard, criação/edição/exclusão, rascunho/publicação, ativação/desativação, duplicação, destaque, categorias, lojas, importação por link e logs básicos de importação.

Cliques: o backend valida a oferta e o domínio cadastrado, registra o clique e só então retorna o destino.

Importação: Mercado Livre usa `/items/{ITEM_ID}` para dados gerais e `/items/{ITEM_ID}/prices` para preço. O importador genérico tenta Open Graph e JSON-LD sem burlar CAPTCHA, Cloudflare ou proteções anti-bot.

## Variáveis de ambiente

Obrigatórias em produção:

- `ADMIN_PASSWORD`: senha forte do único administrador.
- `AUTH_SECRET`: segredo aleatório com pelo menos 32 caracteres; recomendamos 64+ bytes aleatórios.

Opcionais:

- `MERCADOLIVRE_ACCESS_TOKEN`: habilita o importador oficial do Mercado Livre.
- `MERCADOLIVRE_CLIENT_ID` e `MERCADOLIVRE_CLIENT_SECRET`: úteis para implementar/operar o fluxo OAuth e renovação de tokens.
- `NETLIFY_DB_URL`: normalmente não deve ser preenchida manualmente; a Netlify disponibiliza a conexão quando Netlify Database está ativo.
- `PUBLIC_SITE_NAME`: reservado para personalização futura.

Nunca coloque valores reais no `.env.example`, GitHub ou código-fonte.

## Instalação local

Requisitos: Node.js 22.13+ e npm.

```bash
npm install
npx netlify login
npx netlify database init
npx netlify database migrations apply
npm run dev:netlify
```

O `netlify database init` pode vincular/configurar o banco local. Como este projeto já possui `@netlify/database` e migrations, revise qualquer arquivo de exemplo criado pelo assistente do CLI para não sobrescrever o schema existente.

## Banco e migrations

A migration principal está em `netlify/database/migrations/0001_initial_schema.sql`. Em produção e Deploy Previews, Netlify Database aplica migrations automaticamente antes de publicar o deploy. Localmente:

```bash
npx netlify database migrations apply
npx netlify database status
```

Para criar uma migration futura:

```bash
npx netlify database migrations new --description "minha alteracao" --scheme sequential
```

## Seed opcional

O banco inicia sem ofertas fictícias. Categorias e lojas iniciais fazem parte da migration porque são cadastros reais da aplicação.

Para carregar demonstração local, abra uma sessão SQL e execute o conteúdo de `netlify/database/seeds/demo.sql`:

```bash
npx netlify database connect
```

Para remover somente os registros de demonstração, execute `netlify/database/seeds/clear-demo.sql`.

## Build e testes

```bash
npm run test
npm run typecheck
npm run build
```

## Segurança implementada

- senha e segredo apenas no backend;
- sessão HMAC em cookie HttpOnly, SameSite=Strict e Secure em HTTPS;
- proteção de mesma origem em requisições mutáveis;
- consultas PostgreSQL parametrizadas;
- validação e limites de tamanho em entradas;
- URLs limitadas a HTTP/HTTPS;
- validação de domínio da loja;
- proteção SSRF no importador (DNS/IP privado e redirects validados);
- rate limiting da Function;
- headers básicos de segurança;
- mensagens de erro sem stack trace;
- conteúdo de catálogo com bloqueio básico de categorias de risco/idade nesta V1.

## SEO e performance

A SPA possui metadados básicos, títulos dinâmicos no navegador, `robots.txt`, sitemap dinâmico, URLs amigáveis, paginação, lazy loading de imagens, debounce leve no catálogo, cache CDN nas leituras públicas e sem polling.

Para SEO avançado com HTML renderizado por oferta, uma evolução futura pode usar SSR/prerender sem alterar o banco.

## Troubleshooting rápido

- `AUTH_SECRET não configurado`: crie a variável na Netlify e faça novo deploy.
- `ADMIN_PASSWORD não configurada`: crie a variável com pelo menos 8 caracteres e faça novo deploy.
- erro de banco: confirme em **Data & Storage > Database** e verifique as migrations do deploy.
- `/admin` 404 ou refresh 404: confirme que `netlify.toml` está na raiz e que os redirects foram lidos no deploy.
- Function 500: abra os logs da Function `api` e confira banco/variáveis.
- Mercado Livre não importa: confirme o access token; sem token, o cadastro manual continua funcionando.
- imagem externa falha: a loja pode bloquear hotlink; informe outra URL pública de imagem.

Documentação de referência:
- https://docs.netlify.com/build/data-and-storage/netlify-database/
- https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- https://docs.netlify.com/build/functions/
- https://developers.mercadolivre.com.br/devcenter/api-de-precos
