# Varanda Barber

agendamento de corte pelo link do zap. o cliente escolhe dia e hora (9h às 18h, domingo fecha), põe o nome e pede.
o cliente manda o pedido pro zap do barbeiro, que entra na agenda (`?barbeiro`, conta dele no Firebase) e aceita. sem app, sem servidor, sem build.

- `index.html`, `style.css`, `app.js`: o site (GitHub Pages). `sw.js`: cache. `database.rules.json`: regras do Firebase.
- `specs/`: um cucumber (`features/agenda.feature`). o banco e o login do Firebase são falsos, em memória (`_banco.cjs`).

## comandos

- `npm ci`, `npm run dev` → http://localhost:8000 (barbeiro: `/?barbeiro`, senha `senha-do-luique`)
- `npm test` · `npm run qualidade` (o que o CI cobra)

## preview e produção

sem banco configurado (`SEU-PROJETO` no `const DB`), o app roda em preview: banco e login imitados no localStorage,
barbeiro em `?barbeiro` com a senha `preview`. pra valer de verdade: `PRA-VALER.txt`.
