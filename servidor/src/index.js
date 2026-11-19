// a API do Varanda Barber (Worker da Cloudflare, KV `varanda`): guarda o celular do barbeiro,
// avisa ele de pedido novo (push vazio, o sw.js escreve o texto) e aceita o pedido no banco.
// só quem tem a SENHA (o link ?barbeiro=<senha>) inscreve o celular e aceita.
// secrets: SENHA, FIREBASE_SECRET (segredo do banco, legado: passa por cima das regras), VAPID_PRIVATE, VAPID_PUBLIC
import { empurra } from './vapid.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (status, v) => new Response(JSON.stringify(v), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const rota = new URL(req.url).pathname;
    if (req.method === 'GET' && rota === '/chave') return json(200, { chave: env.VAPID_PUBLIC });
    if (req.method !== 'POST') return json(405, { erro: 'só POST' });
    let c = {};
    try { c = (await req.json()) || {}; } catch {}
    const dono = typeof c.senha === 'string' && !!env.SENHA && c.senha === env.SENHA;

    if (rota === '/avisa') {
      const sub = JSON.parse((await env.KV.get('barbeiro')) || 'null');
      if (!sub?.endpoint) return json(200, { ok: false });
      const s = await empurra(sub.endpoint, env);
      if (s === 404 || s === 410) await env.KV.delete('barbeiro');
      return json(200, { ok: s < 300 });
    }
    if (rota === '/inscreve') {
      if (!dono) return json(401, { erro: 'senha' });
      if (typeof c.sub?.endpoint !== 'string' || !c.sub.endpoint.startsWith('https://')) return json(400, { erro: 'inscrição' });
      await env.KV.put('barbeiro', JSON.stringify(c.sub));
      return json(200, { ok: true });
    }
    if (rota === '/aceita') {
      if (!dono) return json(401, { erro: 'senha' });
      if (!/^20\d{2}-[01]\d-[0-3]\d$/.test(c.dia) || !/^h(09|1[0-7])$/.test(c.hora)) return json(400, { erro: 'horário' });
      const url = `${env.FIREBASE_DB}/pedidos/${c.dia}/${c.hora}`;
      const auth = `.json?auth=${encodeURIComponent(env.FIREBASE_SECRET)}`;
      if ((await (await fetch(url + auth)).json()) == null) return json(404, { erro: 'sem pedido' });
      const r = await fetch(`${url}/ok${auth}`, { method: 'PUT', body: 'true' });
      return json(r.ok ? 200 : 502, { ok: r.ok });
    }
    return json(404, { erro: 'rota' });
  },
};
