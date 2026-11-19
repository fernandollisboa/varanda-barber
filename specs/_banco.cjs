// o Firebase em memória: o banco com as regras do database.rules.json e o login (Authentication) do barbeiro.
// responde(método, caminho, auth, corpo) e login(rota, corpo) → { status, corpo }
const SENHA = 'senha-do-luique', EMAIL = 'luique@varanda.barber'; // a conta do barbeiro
const DIA = /^20\d{2}-[01]\d-[0-3]\d$/, HORA = /^h(09|1[0-7])$/;

class Banco {
  constructor() { this.pedidos = {}; this.listagens = 0; this.tokens = { 'token-luique': EMAIL, 'token-outro': 'outro@exemplo.com' }; }
  pede(dia, hora, nome) { (this.pedidos[dia] ||= {})[hora] = { nome, em: Date.now() }; }
  // signInWithPassword (login) e a troca do refreshToken (token)
  login(rota, texto) {
    if (rota.endsWith('token')) return /refresh_token=rt-luique/.test(texto) ? { status: 200, corpo: { id_token: 'token-luique' } } : { status: 400, corpo: {} };
    const c = JSON.parse(texto || '{}');
    return c.email === EMAIL && c.password === SENHA ? { status: 200, corpo: { idToken: 'token-luique', refreshToken: 'rt-luique' } } : { status: 400, corpo: { error: { message: 'INVALID_LOGIN_CREDENTIALS' } } };
  }
  responde(m, caminho, auth, texto) {
    const [raiz, dia, hora, filho, ...resto] = caminho.replace(/\.json$/, '').split('/').filter(Boolean);
    const json = (status, corpo) => ({ status, corpo }), nega = () => json(401, { error: 'Permission denied' });
    if (raiz !== 'pedidos' || !dia || resto.length) { if (m === 'GET') this.listagens++; return nega(); }
    if (!DIA.test(dia) || (hora && !HORA.test(hora))) return nega();
    const atual = hora ? this.pedidos[dia]?.[hora] : this.pedidos[dia];
    if (m === 'GET') return json(200, (filho ? atual?.[filho] : atual) ?? null);
    if (m !== 'PUT' || !hora) return nega();
    const v = JSON.parse(texto || 'null');
    // o ok: só a conta do barbeiro, só true, só em pedido que existe
    if (filho === 'ok') { if (this.tokens[auth] !== EMAIL || v !== true || !atual) return nega(); atual.ok = true; return json(200, true); }
    // o pedido: só cria (não sobrescreve), só { nome, em }, nome de 1 a 40, em é o relógio do banco
    const ok = !filho && !atual && v && Object.keys(v).sort().join() === 'em,nome' && typeof v.nome === 'string'
      && v.nome.length > 0 && v.nome.length <= 40 && v.em?.['.sv'] === 'timestamp';
    if (!ok) return nega();
    (this.pedidos[dia] ||= {})[hora] = { nome: v.nome, em: Date.now() };
    return json(200, this.pedidos[dia][hora]);
  }
}
module.exports = { Banco, SENHA };
