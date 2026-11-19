// @ts-check
// Varanda Barber: o cliente escolhe dia e hora, o barbeiro aceita. Firebase via REST, sem servidor.
// ?admin é a agenda do barbeiro. por enquanto sem login: quem tem o link aceita.
(() => {
  const DB = 'https://varanda-417d1-default-rtdb.firebaseio.com';
  const BARBEIRO = 'Luique'; // o barbeiro, o único admin
  const ZAP = '557996491143'; // o zap do barbeiro, com DDI, só dígitos
  const HORAS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // o último corte começa 17h e acaba 18h
  const DIAS = 6; // quantos dias de trabalho aparecem pro cliente (domingo fecha)

  const $app = /** @type {HTMLElement} */ (document.getElementById('app'));
  const esc = (/** @type {string} */ s) => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const ehDia = (/** @type {string} */ d) => /^20\d{2}-[01]\d-[0-3]\d$/.test(d);
  const ehHora = (/** @type {string} */ h) => /^h(09|1[0-7])$/.test(h);

  /** @typedef {{ nome: string, tel: string, em: number, ok?: boolean }} Pedido */
  /** o que vem do banco é hostil: só passa o formato do pedido */
  const clean = (/** @type {any} */ v) => {
    /** @type {Record<string, Pedido>} */ const r = {};
    if (!v || typeof v !== 'object') return r;
    for (const [h, p] of Object.entries(v))
      if (ehHora(h) && p && typeof p.nome === 'string') r[h] = { nome: p.nome.slice(0, 40), tel: /^\d{10,11}$/.test(p.tel) ? p.tel : '', em: +p.em || 0, ok: p.ok === true };
    return r;
  };

  // o aparelho: { nome?, tel?, meus: [{ dia, hora }] }
  const guarda = () => { try { return JSON.parse(localStorage.getItem('varanda') || '{}') || {}; } catch { return {}; } };
  const grava = (/** @type {any} */ v) => { try { localStorage.setItem('varanda', JSON.stringify(v)); } catch {} };

  const iso = (/** @type {Date} */ d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const rotulo = (/** @type {string} */ dia) => { const [a, m, d] = dia.split('-').map(Number); return `${SEMANA[new Date(a, m - 1, d).getDay()]} ${d}/${m}`; };
  const hhDe = (/** @type {string} */ h) => +h.slice(1) + 'h';
  // passou do último horário, o dia de hoje sai da agenda do cliente (o barbeiro ainda vê os de hoje)
  const proximosDias = (/** @type {boolean} */ pulaHojeSeTarde = false) => {
    const r = [], d = new Date();
    if (pulaHojeSeTarde && d.getHours() >= HORAS[HORAS.length - 1]) d.setDate(d.getDate() + 1);
    d.setHours(12);
    while (r.length < DIAS) { if (d.getDay() !== 0) r.push(iso(d)); d.setDate(d.getDate() + 1); }
    return r;
  };

  const lePedidos = async (/** @type {string} */ dia) => clean(await (await fetch(`${DB}/pedidos/${dia}.json`)).json());

  // ---------- cliente ----------
  let dia = '', hora = '', remarcando = false;
  /** @type {Record<string, Pedido>} */ let ocupados = {};

  async function cliente() {
    const dias = proximosDias(true);
    dia ||= dias[0];
    ocupados = await lePedidos(dia).catch(() => ({}));
    const agora = new Date(), hoje = iso(agora);
    const meus = guarda().meus || [];
    const ultimo = meus[meus.length - 1];
    let meu = '';
    // o pedido em aberto: de hoje em diante, e se for hoje, a hora ainda não passou
    if (ultimo && ehDia(ultimo.dia) && ehHora(ultimo.hora) && ultimo.dia >= hoje && !(ultimo.dia === hoje && +ultimo.hora.slice(1) < agora.getHours())) {
      const p = (ultimo.dia === dia ? ocupados : await lePedidos(ultimo.dia).catch(() => ({})))[ultimo.hora];
      if (p) meu = `<section class="cartao" id="meu"><h2>seu horário: ${rotulo(ultimo.dia)} às ${hhDe(ultimo.hora)}</h2>
        <p class="status ${p.ok ? 'ok' : 'espera'}">${p.ok ? 'confirmado pelo barbeiro ✔' : 'esperando o barbeiro aceitar'}</p>
        <a class="botao" id="zap" target="_blank" rel="noopener" href="https://wa.me/${ZAP}?text=${encodeURIComponent(
          `Oi! Pedi corte na Varanda Barber ${rotulo(ultimo.dia)} às ${hhDe(ultimo.hora)} (${p.nome}). Aceita aqui: ${location.origin}${location.pathname}?admin&pedido=${ultimo.dia}/${ultimo.hora}`,
        )}">mandar pro ${BARBEIRO} no zap</a>
        ${remarcando ? '<button id="volta">deixa como está</button>' : '<button id="remarca">remarcar</button>'}</section>`;
    }
    // com pedido em aberto, só o pedido: outro horário é remarcar
    if (meu && !remarcando) return ($app.innerHTML = meu);
    if (!meu) remarcando = false;
    const livre = (/** @type {number} */ h) => { const k = 'h' + String(h).padStart(2, '0'); return !ocupados[k] && !(dia === hoje && h <= agora.getHours()); };
    $app.innerHTML = `${meu}<section class="cartao"><h2>${remarcando ? 'escolhe o novo dia' : 'escolhe o dia'}</h2>
      <div class="grade dias">${dias.map(d => `<button data-dia="${d}" aria-pressed="${d === dia}">${rotulo(d)}</button>`).join('')}</div>
      <h2>e a hora</h2>
      <div class="grade">${HORAS.map(h => { const k = 'h' + String(h).padStart(2, '0');
        return `<button data-hora="${k}" aria-pressed="${k === hora}"${livre(h) ? '' : ' disabled'}>${h}h</button>`; }).join('')}</div>
      <input id="nome" maxlength="40" placeholder="seu nome" autocomplete="given-name" value="${esc(guarda().nome || '')}">
      <input id="tel" type="tel" inputmode="numeric" maxlength="16" placeholder="seu zap com DDD" autocomplete="tel-national" value="${esc(guarda().tel || '')}">
      <button class="principal" id="pede">pedir horário</button><p class="erro" id="erro"></p></section>`;
  }

  async function pede() {
    const nome = /** @type {HTMLInputElement} */ (document.getElementById('nome')).value.trim();
    const erro = /** @type {HTMLElement} */ (document.getElementById('erro'));
    if (!hora) return (erro.textContent = 'escolhe uma hora');
    if (!nome) return (erro.textContent = 'põe seu nome');
    // o zap com DDD, só os números (sem o 55 e sem o 0 da operadora)
    const tel = /** @type {HTMLInputElement} */ (document.getElementById('tel')).value.replace(/\D/g, '').replace(/^0+/, '').replace(/^55(?=\d{10,11}$)/, '');
    if (!/^\d{10,11}$/.test(tel)) return (erro.textContent = 'põe seu zap com DDD');
    const r = await fetch(`${DB}/pedidos/${dia}/${hora}.json`, { method: 'PUT', body: JSON.stringify({ nome, tel, em: { '.sv': 'timestamp' } }) }).catch(() => null);
    if (!r || !r.ok) { hora = ''; await cliente(); return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = 'esse horário acabou de sair, escolhe outro'); }
    const g = guarda(), velho = (g.meus || []).slice(-1)[0];
    // remarcou: o horário velho só sai depois que o novo gravou
    if (remarcando && velho && ehDia(velho.dia) && ehHora(velho.hora)) await fetch(`${DB}/pedidos/${velho.dia}/${velho.hora}.json`, { method: 'DELETE' }).catch(() => null);
    remarcando = false;
    g.meus = [{ dia, hora }]; g.nome = nome; g.tel = tel; grava(g);
    hora = '';
    await cliente();
  }

  // ---------- barbeiro ----------
  const telBonito = (/** @type {string} */ t) => `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}`;
  async function barbeiro() {
    const dias = proximosDias();
    const todos = await Promise.all(dias.map(d => lePedidos(d).catch(() => ({}))));
    // na ordem do horário, de cima pra baixo; o pedido que veio pelo zap (&pedido=) fica marcado
    const linhas = dias.flatMap((d, i) => Object.keys(todos[i]).sort().map(h => [h, todos[i][h]]).map(([h, p]) => `<div class="pedido ${p.ok ? 'ok' : 'espera'}${alvoZap === d + '/' + h ? ' alvo' : ''}">
      <span>${rotulo(d)} ${hhDe(h)} · ${esc(p.nome)}${p.tel ? `<br><a class="tel" href="https://wa.me/55${p.tel}" target="_blank" rel="noopener">${telBonito(p.tel)}</a>` : ''}</span>
      ${p.ok ? '<span class="status ok">aceito ✔</span>' : `<button data-aceita="${d}/${h}">aceitar</button>`}</div>`));
    $app.innerHTML = `<section class="cartao"><h2>agenda do ${BARBEIRO}</h2>${linhas.join('') || '<p class="vazio">nenhum pedido ainda</p>'}
      <p class="erro" id="erro"></p></section>`;
  }

  async function aceita(/** @type {string} */ alvo) {
    const [d, h] = alvo.split('/');
    const r = await fetch(`${DB}/pedidos/${d}/${h}/ok.json`, { method: 'PUT', body: 'true' }).catch(() => null);
    if (!r || !r.ok) return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = 'não deu, tenta de novo');
    await barbeiro();
  }

  // ---------- começo ----------
  const q = new URLSearchParams(location.search);
  const ehBarbeiro = q.has('admin') || q.has('barbeiro'); // ?barbeiro é o nome antigo
  const alvoZap = q.get('pedido') || '';

  $app.addEventListener('click', e => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!b) return;
    if (b.dataset.dia) { dia = b.dataset.dia; hora = ''; cliente(); }
    else if (b.dataset.hora) { hora = b.dataset.hora; $app.querySelectorAll('[data-hora]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    else if (b.id === 'pede') pede();
    else if (b.id === 'remarca' || b.id === 'volta') { remarcando = b.id === 'remarca'; hora = ''; cliente(); }
    else if (b.dataset.aceita) aceita(b.dataset.aceita);
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  (ehBarbeiro ? barbeiro() : cliente()).catch(() => ($app.innerHTML = '<p class="erro cartao">sem conexão, tenta de novo</p>'));
})();
