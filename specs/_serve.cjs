// serve o site trocando o banco de verdade pelo falso (_banco.cjs).
// com { banco } (o npm run dev) o falso mora no próprio servidor, em /__banco;
// sem ele (os testes), o playwright intercepta o banco falso
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const DB_FALSO = 'https://fake-db.firebaseio.com';
const lerCorpo = async q => { let t = ''; for await (const c of q) t += c; return t; };

module.exports = ({ banco = null, porta = 0 } = {}) => new Promise(ok => {
  const srv = http.createServer(async (q, r) => {
    const u = new URL(q.url, 'http://x');
    const falso = res => { r.writeHead(res.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); r.end(JSON.stringify(res.corpo)); };
    if (banco && u.pathname.startsWith('/__banco/')) return falso(banco.responde(q.method, u.pathname.slice(8), u.searchParams.get('auth'), await lerCorpo(q)));
    let file = u.pathname; if (file.endsWith('/')) file += 'index.html';
    const abs = path.join(ROOT, file); if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('Content-Type', TYPES[path.extname(abs)] || 'application/octet-stream');
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), DB = /const DB = '[^']*';/;
    // não achou a linha, o app.js nem sai: teste nenhum fala com produção
    if (file === '/app.js') { if (!DB.test(app)) { r.statusCode = 500; return r.end("_serve.cjs: cadê o const DB = '...'?"); }
      let src = app.replace(DB, `const DB = '${banco ? '/__banco' : DB_FALSO}';`);
      return r.end(src); }
    r.end(fs.readFileSync(abs));
  }).listen(porta, () => ok({ srv, porta: srv.address().port }));
});
Object.assign(module.exports, { DB_FALSO });
