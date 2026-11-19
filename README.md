# Varanda Barber

agendamento de corte pelo link do zap. o cliente escolhe dia e hora (9h às 18h, domingo fecha), põe o nome e pede.
o barbeiro recebe aviso no celular e aceita pelo link dele. sem app, sem cadastro, sem build.

- `index.html`, `style.css`, `app.js`: o site (GitHub Pages). `sw.js`: cache e o aviso. `database.rules.json`: regras do Firebase.
- `servidor/`: a API (Worker da Cloudflare, KV `varanda`): `/chave`, `/inscreve` (celular do barbeiro), `/avisa` (pedido novo), `/aceita`.
- `specs/`: um cucumber (`features/agenda.feature`). o banco e a API são falsos, em memória; a API falsa roda o Worker de verdade.

## comandos

- `npm ci`, `npm run dev` → http://localhost:8000 (barbeiro: `/?barbeiro=senha-do-barbeiro`)
- `npm test` · `npm run qualidade` (o que o CI cobra)

## pôr no ar (uma vez)

1. **Firebase**: crie o projeto e o Realtime Database. cole o `database.rules.json` em Regras. pegue a URL do banco e o
   segredo legado (Configurações do projeto › Contas de serviço › Chaves secretas do banco de dados).
2. **troque os `SEU-...`**: a URL do banco no `app.js` (`const DB`) e no `servidor/wrangler.toml` (`FIREBASE_DB`);
   a URL do Worker no `app.js` (`const API`) e na CSP do `index.html` (aparece no resumo do 1º deploy do `servidor.yml`).
   o número do barbeiro em `const ZAP` (opcional).
3. **secrets do repositório**: `CLOUDFLARE_API_TOKEN` (modelo "Edit Cloudflare Workers"), `CLOUDFLARE_ACCOUNT_ID`,
   `SENHA` (a do link do barbeiro, 20+ letras), `FIREBASE_SECRET`.
4. **Pages**: Settings › Pages › Source: GitHub Actions. push na `main` publica o site e sobe o Worker.
5. o barbeiro abre `https://<site>/?barbeiro=<SENHA>` uma vez e toca em "receber aviso". depois o link é só `?barbeiro`.
   no iPhone o aviso só funciona com o site adicionado à tela de início.
