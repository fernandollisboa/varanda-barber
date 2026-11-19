# Varanda Barber

agendamento de corte pelo link do zap. o cliente escolhe dia e hora (9h às 18h, domingo fecha), põe o nome e pede.
o cliente deixa nome e zap e manda o pedido pro zap do barbeiro, que aceita na agenda (`?admin`, por enquanto sem senha). sem app, sem servidor, sem build.

- `index.html`, `style.css`, `app.js`: o site (GitHub Pages). `sw.js`: cache. `database.rules.json`: regras do Firebase.
- `specs/`: um cucumber (`features/agenda.feature`). o banco é falso, em memória (`_banco.cjs`).

## comandos

- `npm ci`, `npm run dev` → http://localhost:8000 (barbeiro: `/?admin`)
- `npm test` · `npm run qualidade` (o que o CI cobra)

## no ar

o que falta e os links: `PRA-VALER.txt`.
