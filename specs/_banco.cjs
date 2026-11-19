// o Firebase em memória, com as regras do database.rules.json. responde(método, caminho, auth, corpo) → { status, corpo }
const DIA = /^20\d{2}-[01]\d-[0-3]\d$/, HORA = /^h(09|1[0-7])$/;

class Banco {
  constructor() { this.pedidos = {}; this.listagens = 0; }
  pede(dia, hora, nome, tel = '79999990000') { (this.pedidos[dia] ||= {})[hora] = { nome, tel, em: Date.now() }; }
  responde(m, caminho, auth, texto) {
    const [raiz, dia, hora, filho, ...resto] = caminho.replace(/\.json$/, '').split('/').filter(Boolean);
    const json = (status, corpo) => ({ status, corpo }), nega = () => json(401, { error: 'Permission denied' });
    if (raiz !== 'pedidos' || !dia || resto.length) { if (m === 'GET') this.listagens++; return nega(); }
    if (!DIA.test(dia) || (hora && !HORA.test(hora))) return nega();
    const atual = hora ? this.pedidos[dia]?.[hora] : this.pedidos[dia];
    if (m === 'GET') return json(200, (filho ? atual?.[filho] : atual) ?? null);
    if (m !== 'PUT' || !hora) return nega();
    const v = JSON.parse(texto || 'null');
    // o ok: por enquanto qualquer um (sem login), só true, só em pedido que existe
    if (filho === 'ok') { if (v !== true || !atual) return nega(); atual.ok = true; return json(200, true); }
    // o pedido: só cria (não sobrescreve), só { nome, tel, em }, nome de 1 a 40, tel com DDD, em é o relógio do banco
    const ok = !filho && !atual && v && Object.keys(v).sort().join() === 'em,nome,tel' && typeof v.nome === 'string' && /^\d{10,11}$/.test(v.tel)
      && v.nome.length > 0 && v.nome.length <= 40 && v.em?.['.sv'] === 'timestamp';
    if (!ok) return nega();
    (this.pedidos[dia] ||= {})[hora] = { nome: v.nome, tel: v.tel, em: Date.now() };
    return json(200, this.pedidos[dia][hora]);
  }
}
module.exports = { Banco };
