# Varanda Barber

agendamento de corte pelo link do zap. o cliente escolhe dia e hora (9h às 18h, domingo fecha), põe o nome e pede.
o barbeiro recebe aviso no celular e aceita pelo link dele. sem app, sem cadastro, sem build.

- `index.html`, `style.css`, `app.js`: o site (GitHub Pages). `sw.js`: cache e o aviso. `database.rules.json`: regras do Firebase.
- `servidor/`: a API (Worker da Cloudflare, KV `varanda`): `/chave`, `/inscreve` (celular do barbeiro), `/avisa` (pedido novo), `/aceita`.
- `specs/`: um cucumber (`features/agenda.feature`). o banco e a API são falsos, em memória; a API falsa roda o Worker de verdade.

## comandos

- `npm ci`, `npm run dev` → http://localhost:8000 (barbeiro: `/?barbeiro=senha-do-barbeiro`)
- `npm test` · `npm run qualidade` (o que o CI cobra)

## preview e produção

sem banco configurado (`SEU-PROJETO` no `const DB`), o app roda em preview: banco e API imitados no localStorage,
barbeiro em `?barbeiro=preview`. pra valer de verdade: `PRA-VALER.txt`.
