// o Firebase em memória, com as regras do database.rules.json. responde(método, caminho, auth, corpo) → { status, corpo }
const DIA = /^20\d{2}-[01]\d-[0-3]\d$/, HORA = /^h(09|1[0-8])(00|30)$/;

class Banco {
  constructor() { this.pedidos = {}; this.senhas = new Set(); this.aceites = {}; this.listagens = 0; }
  pede(dia, hora, nome, tel = '79999990000') { (this.pedidos[dia] ||= {})[hora] = { nome, tel, em: Date.now() }; }
  responde(m, caminho, auth, texto) {
    const partes = caminho.replace(/\.json$/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const json = (status, corpo) => ({ status, corpo }), nega = () => json(401, { error: 'Permission denied' });
    const v = JSON.parse(texto || 'null');
    // senhas/<s>: a primeira e única senha do barbeiro (ninguém lê)
    if (partes[0] === 'senhas' && partes.length === 2 && m === 'PUT') {
      if (this.senhas.size || v !== true || partes[1].length < 6) return nega();
      this.senhas.add(partes[1]); return json(200, true);
    }
    // entradas/<s>: o barbeiro prova a senha
    if (partes[0] === 'entradas' && partes.length === 2 && m === 'PUT')
      return this.senhas.has(partes[1]) && v?.['.sv'] === 'timestamp' ? json(200, Date.now()) : nega();
    // aceitar: o ok do pedido e o aceite com a senha, numa gravação só (PATCH na raiz)
    if (m === 'PATCH' && partes.length === 0) {
      const ks = Object.keys(v || {});
      const ok = ks.find(k => /^pedidos\/[^/]+\/[^/]+\/ok$/.test(k)), ac = ks.find(k => /^aceites\/[^/]+\/[^/]+$/.test(k));
      if (ks.length !== 2 || !ok || !ac) return nega();
      const [, d, h] = ok.split('/'), a = v[ac];
      if (ac !== `aceites/${d}/${h}` || !this.senhas.has(a?.s) || a?.em?.['.sv'] !== 'timestamp' || v[ok] !== true || !this.pedidos[d]?.[h]) return nega();
      this.pedidos[d][h].ok = true; (this.aceites[d] ||= {})[h] = { s: a.s, em: Date.now() };
      return json(200, v);
    }
    const [raiz, dia, hora, filho, ...resto] = partes;
    if (raiz !== 'pedidos' || !dia || resto.length) { if (m === 'GET') this.listagens++; return nega(); }
    if (!DIA.test(dia) || (hora && !HORA.test(hora))) return nega();
    const atual = hora ? this.pedidos[dia]?.[hora] : this.pedidos[dia];
    if (m === 'GET') return json(200, (filho ? atual?.[filho] : atual) ?? null);
    // remarcar: o cliente apaga o pedido velho (sem login, por enquanto qualquer um apaga)
    if (m === 'DELETE' && hora && !filho) { if (atual) delete this.pedidos[dia][hora]; return json(200, null); }
    // o ok sozinho não passa: só junto com o aceite da senha (o PATCH acima)
    if (m !== 'PUT' || !hora || filho) return nega();
    // o pedido: só cria (não sobrescreve), só { nome, tel, em }, nome de 1 a 40, tel com DDD, em é o relógio do banco
    const certo = !atual && v && Object.keys(v).sort().join() === 'em,nome,tel' && typeof v.nome === 'string' && /^\d{10,11}$/.test(v.tel)
      && v.nome.length > 0 && v.nome.length <= 40 && v.em?.['.sv'] === 'timestamp';
    if (!certo) return nega();
    (this.pedidos[dia] ||= {})[hora] = { nome: v.nome, tel: v.tel, em: Date.now() };
    return json(200, this.pedidos[dia][hora]);
  }
}
module.exports = { Banco, SENHA: 'navalha77' };
