// o Firebase em memória, com as regras do database.rules.json. responde(método, caminho, auth, corpo) → { status, corpo }
const SEGREDO = 'segredo-do-banco'; // o FIREBASE_SECRET do Worker: passa por cima das regras, como no Firebase
const DIA = /^20\d{2}-[01]\d-[0-3]\d$/, HORA = /^h(09|1[0-7])$/;

class Banco {
  constructor() { this.pedidos = {}; this.listagens = 0; }
  pede(dia, hora, nome) { (this.pedidos[dia] ||= {})[hora] = { nome, em: Date.now() }; }
  responde(m, caminho, auth, texto) {
    const [raiz, dia, hora, filho, ...resto] = caminho.replace(/\.json$/, '').split('/').filter(Boolean);
    const json = (status, corpo) => ({ status, corpo }), nega = () => json(401, { error: 'Permission denied' });
    if (raiz !== 'pedidos' || !dia || resto.length) { if (m === 'GET') this.listagens++; return nega(); }
    if (!DIA.test(dia) || (hora && !HORA.test(hora))) return nega();
    const atual = hora ? this.pedidos[dia]?.[hora] : this.pedidos[dia];
    if (m === 'GET') return json(200, (filho ? atual?.[filho] : atual) ?? null);
    if (m !== 'PUT' || !hora) return nega();
    const v = JSON.parse(texto || 'null');
    if (auth === SEGREDO) { if (filho !== 'ok') return json(400, {}); (this.pedidos[dia][hora] ||= {}).ok = v; return json(200, v); }
    // as regras: só cria (não sobrescreve), só { nome, em }, nome de 1 a 40, em é o relógio do banco
    const ok = !filho && !atual && v && Object.keys(v).sort().join() === 'em,nome' && typeof v.nome === 'string'
      && v.nome.length > 0 && v.nome.length <= 40 && v.em?.['.sv'] === 'timestamp';
    if (!ok) return nega();
    (this.pedidos[dia] ||= {})[hora] = { nome: v.nome, em: Date.now() };
    return json(200, this.pedidos[dia][hora]);
  }
}
module.exports = { Banco, SEGREDO };
