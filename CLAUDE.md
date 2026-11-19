# CLAUDE.md

Varanda Barber: agendamento de corte, mesmo esquema do tô lisa (HTML/CSS/JS puros, Firebase via REST, sem servidor). tudo em pt-BR.
o mapa está no README.

## regras que não se quebram

- **sem dependência no site, sem framework, sem build.** `package.json` é só ferramenta de teste.
- **aspas simples no `const DB = '...'`**: o `specs/_serve.cjs` troca a linha pelo banco falso.
- **o banco é hostil**: texto passa por `esc()` antes de `innerHTML`, o que vem do banco passa por `clean()`.
- **o pedido**: o cliente só cria (e apaga, pra remarcar); o `ok` só passa junto com `aceites/<dia>/<hora>` com a senha do
  barbeiro, que mora em `senhas/` (ninguém lê). a senha se cria uma vez só, pelo link `?admin&criar`.
  mexeu no `database.rules.json`, mexa no `_banco.cjs`.
- **service worker**: mudou a estratégia, troque o nome `CACHE`.

## comandos

`npm run dev` · `npm test` · `npm run qualidade` (verde antes de subir).
