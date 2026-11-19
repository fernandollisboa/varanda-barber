// a API do aviso: roda o Worker de verdade (servidor/src/index.js), com o KV em memória, o banco
// falso no lugar do Firebase e os pushes só anotados (o push de verdade se confere no celular)
const path = require('path'), { pathToFileURL } = require('url');
const { SEGREDO } = require('./_banco.cjs');
const worker = import(pathToFileURL(path.join(__dirname, '..', 'servidor', 'src', 'index.js')).href);
const SENHA = 'senha-do-barbeiro';
const vapid = (async () => {
  const { b64url } = await import(pathToFileURL(path.join(__dirname, '..', 'servidor', 'src', 'vapid.js')).href);
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { VAPID_PRIVATE: JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey)), VAPID_PUBLIC: b64url(await crypto.subtle.exportKey('raw', par.publicKey)) };
})();

class Api {
  constructor(banco) {
    this.banco = banco; this.pushes = []; const m = new Map();
    this.kv = { async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } };
  }
  // o fetch do Worker: o banco falso e o serviço de push falso
  async fetchFalso(url, op = {}) {
    const u = new URL(url);
    if (u.origin === 'https://banco.falso') { const r = this.banco.responde(op.method || 'GET', u.pathname, u.searchParams.get('auth'), op.body); return new Response(JSON.stringify(r.corpo), { status: r.status }); }
    this.pushes.push(url); return new Response(null, { status: 201 });
  }
  async responde(m, rota, texto) {
    const { default: w } = await worker, real = globalThis.fetch;
    globalThis.fetch = (u, op) => this.fetchFalso(u, op);
    try {
      const r = await w.fetch(new Request('https://api.falsa' + rota, { method: m, body: m === 'POST' ? texto || '' : undefined }),
        { KV: this.kv, SENHA, FIREBASE_DB: 'https://banco.falso', FIREBASE_SECRET: SEGREDO, ...(await vapid) });
      return { status: r.status, corpo: await r.json() };
    } finally { globalThis.fetch = real; }
  }
}
module.exports = { Api, SENHA };
