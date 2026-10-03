# COMO COLOCAR A PLATAFORMA ONLINE NA NETLIFY

Guia preparado para a interface/documentação da Netlify em outubro de 2026.

## ETAPA 1 — Criar as contas

Crie uma conta no GitHub e uma conta na Netlify. Para esta V1, GitHub + deploy contínuo é o fluxo mais simples para atualizar o projeto depois.

## ETAPA 2 — Preparar o projeto

Extraia `PlataformaOfertas-Netlify.zip`. Na pasta extraída, você deve ver diretamente `package.json`, `netlify.toml`, `src/`, `netlify/`, `public/` e os arquivos de documentação. Não coloque tudo dentro de uma segunda pasta antes de enviar ao GitHub.

## ETAPA 3 — Subir no GitHub

1. No GitHub, crie um repositório em **New repository**.
2. Dê um nome, por exemplo `ofertacerta`.
3. Abra o repositório e use **Add file > Upload files**.
4. Envie o conteúdo extraído mantendo as pastas.
5. Confirme que `package.json` e `netlify.toml` ficaram na raiz.
6. Nunca envie um arquivo `.env` com senhas ou tokens. O `.env.example` pode ser enviado porque não contém valores reais.

## ETAPA 4 — Criar o projeto na Netlify

1. Abra o painel da Netlify.
2. Vá em **Projects > Add new project > Import an existing project**.
3. Selecione GitHub e autorize a integração quando solicitado.
4. Selecione o repositório criado na etapa anterior.
5. Confira as configurações e publique.

O `netlify.toml` já configura:

- Base directory: deixar vazio
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node: linha 22 (o projeto exige Node 22.13+)

## ETAPA 5 — Banco de dados

Este projeto usa `@netlify/database` e já contém `netlify/database/migrations/0001_initial_schema.sql`. No fluxo atual, a Netlify pode provisionar o Netlify Database automaticamente no deploy e aplicar as migrations antes de publicar o site.

Se preferir criar primeiro pela interface, abra **Data & Storage > Database > Create a database manually**.

Depois do deploy, em **Data & Storage > Database**, confirme as tabelas:

- `offers`
- `categories`
- `stores`
- `clicks`
- `settings`
- `import_logs`

As categorias e lojas iniciais são criadas pela migration. As ofertas fictícias não são inseridas automaticamente.

## ETAPA 6 — Variáveis de ambiente

Abra **Project configuration > Environment variables** e crie:

Obrigatórias:

- `ADMIN_PASSWORD`: escolha uma senha longa e exclusiva.
- `AUTH_SECRET`: segredo aleatório com pelo menos 32 caracteres; 64 bytes aleatórios é uma boa escolha.

No Windows PowerShell, você pode gerar um segredo assim:

```powershell
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Opcionais:

- `MERCADOLIVRE_ACCESS_TOKEN`
- `MERCADOLIVRE_CLIENT_ID`
- `MERCADOLIVRE_CLIENT_SECRET`
- `NETLIFY_DB_URL`: normalmente não precisa ser criado manualmente; o Netlify Database fornece a conexão ao ambiente.

Depois de alterar variáveis, faça um novo build/deploy para que a mudança entre em vigor.

## ETAPA 7 — Acessar o admin

Após o deploy, abra:

`https://SEU-PROJETO.netlify.app/admin`

Entre com a senha definida em `ADMIN_PASSWORD`. A senha não fica no JavaScript público; o backend valida e cria uma sessão assinada em cookie HttpOnly.

## ETAPA 8 — Mercado Livre

A plataforma funciona sem a API do Mercado Livre: você pode cadastrar ofertas manualmente e o importador genérico pode tentar metadados públicos quando permitido.

Para usar a integração oficial:

1. Entre no DevCenter do Mercado Livre e abra **Minhas aplicações**.
2. Use **Criar uma aplicação** e preencha os dados obrigatórios.
3. A URL de redirecionamento precisa usar HTTPS.
4. Para esta V1, use escopo de leitura quando ele for suficiente para a consulta desejada.
5. Guarde Client ID, Client Secret e tokens somente como segredos; nunca coloque no frontend ou GitHub.
6. Faça o fluxo OAuth server-side conforme a documentação do Mercado Livre para obter o access token.
7. Coloque o token atual em `MERCADOLIVRE_ACCESS_TOKEN` na Netlify e faça novo deploy.

A integração consulta os dados do item e consulta o preço pelo endpoint atual de preços, em vez de depender dos campos de preço em descontinuação de `/items`.

Limitação da V1: o projeto não automatiza o ciclo completo de renovação/rotação do OAuth do Mercado Livre. Quando o access token expirar, atualize a variável ou implemente posteriormente um fluxo persistente de refresh token. Se a API oficial falhar, o sistema tenta o importador genérico quando a página permitir e sempre mantém o cadastro manual.

Atenção à regra atual do Mercado Livre: desde 30/08/2026, aplicações de Mercado Livre e Mercado Pago devem ficar separadas por unidade de negócio.

## ETAPA 9 — Deploy

Na tela do projeto, acompanhe **Deploys**. O primeiro deploy irá:

1. instalar dependências;
2. executar `npm run build`;
3. detectar o uso de Netlify Database;
4. aplicar as migrations no ciclo de deploy;
5. publicar `dist`;
6. disponibilizar as Functions.

Se uma migration falhar, a Netlify bloqueia a publicação daquele deploy.

## ETAPA 10 — Testar

Use este checklist:

- [ ] Home abriu.
- [ ] Banco aparece em Data & Storage > Database.
- [ ] Tabelas foram criadas.
- [ ] `/admin` abriu.
- [ ] Login funcionou.
- [ ] Criar oferta funcionou.
- [ ] Publicar oferta funcionou.
- [ ] Oferta apareceu na área pública.
- [ ] Pesquisa encontrou parte de uma palavra.
- [ ] Filtros funcionaram.
- [ ] “VER OFERTA” registrou clique e abriu a loja.
- [ ] “IR PARA OFERTA” registrou clique e abriu a loja.
- [ ] Dashboard mostrou cliques.
- [ ] Novo deploy não apagou os dados.
- [ ] Teste no celular e desktop.

## ETAPA 11 — Domínio

Você pode começar com `nome-do-projeto.netlify.app` sem comprar domínio.

Quando quiser usar domínio próprio, abra **Domain management > Add a domain > Add a domain you already own**, informe o domínio e siga os registros DNS mostrados pela Netlify. Você pode usar Netlify DNS ou manter seu provedor de DNS externo.

## ETAPA 12 — Plano Free e créditos

Para contas no modelo atual por créditos, o Free custa US$ 0 e inclui 300 créditos por mês com limite rígido. Na tabela atual da Netlify:

- Functions compute: 10 créditos por GB-hora;
- Database compute: 10 créditos por GB-hora;
- Web requests: 2 créditos por 10.000 requests;
- Web bandwidth: 20 créditos por GB;
- Database bandwidth: 20 créditos por GB;
- deploy de produção publicado: 15 créditos.

O Free também lista atualmente até 3 bancos e 20 branches ativos de banco. Esses limites podem mudar; confira o painel/documentação antes de escalar.

Para acompanhar consumo, vá ao dashboard da equipe em **Usage & billing > Account usage insights**. Veja principalmente Credits, Bandwidth, Compute, Production deploys e Web Requests.

Para economizar: evite deploys de produção desnecessários, imagens pesadas hospedadas pela própria Netlify, polling, atualização automática de preço em intervalos curtos e chamadas repetidas. Esta V1 já usa cache público, paginação e uma resposta agregada na home.

## SE DER ERRO

### Deploy failed / Build failed
Abra **Deploys**, clique no deploy com erro e leia o log. Confirme Node 22+, `package.json` e `netlify.toml` na raiz.

### Variável ausente
Abra **Project configuration > Environment variables**, crie/corrija a variável e faça novo deploy.

### Banco não conectado
Abra **Data & Storage > Database**. Se não existir banco, use **Create a database manually** ou confira se `@netlify/database` está instalado no `package.json` e faça novo deploy.

### Migration falhou
Leia o log do deploy. A migration principal fica em `netlify/database/migrations/0001_initial_schema.sql`. Não renomeie fora do padrão de migration da Netlify.

### Function retornando 500
Abra a área de Functions/observabilidade do projeto e veja os logs da Function `api`. Confira variáveis, banco e migration.

### Página ou `/admin` retornando 404 ao atualizar
Confirme que `netlify.toml` está na raiz. Ele contém os rewrites necessários para a SPA.

### CORS / requisição recusada
A aplicação foi projetada para frontend e API no mesmo domínio Netlify. Evite separar o frontend da Function em domínios diferentes nesta V1.

### Mercado Livre não importando
Confira se o token está válido. Tokens expiram; atualize `MERCADOLIVRE_ACCESS_TOKEN`. Se a página bloquear o fallback genérico, preencha manualmente — o sistema não tenta contornar proteções anti-bot.

### Imagem externa não carregando
Algumas lojas bloqueiam hotlink. Use outra URL pública HTTPS de imagem que você tenha permissão para exibir, ou adicione uma solução de upload/CDN numa evolução futura.
