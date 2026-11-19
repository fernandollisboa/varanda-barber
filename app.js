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
  // ícones de traço, na cor do texto
  const ICONES = {
    tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    dia: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    hora: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    zap: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10c0 3 2 5 5 5l1.2-1.2-2-1-.9.6c-.8-.4-1.4-1-1.8-1.8l.6-.9-1-2L9 10z"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    remarca: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    lapis: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  };
  const ic = (/** @type {keyof typeof ICONES} */ n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n]}</svg>`;
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
  const telBonito = (/** @type {string} */ t) => `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}`;
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
      if (p) meu = `<section class="cartao" id="meu"><h2>${ic('tesoura')} seu horário</h2>
        <p class="quando">${ic('dia')} ${rotulo(ultimo.dia)} <span>${ic('hora')} às ${hhDe(ultimo.hora)}</span></p>
        <p class="status ${p.ok ? 'ok' : 'espera'}">${p.ok ? ic('ok') + ' confirmado pelo barbeiro' : ic('hora') + ' esperando o barbeiro aceitar'}</p>
        <a class="botao" id="zap" target="_blank" rel="noopener" href="https://wa.me/${ZAP}?text=${encodeURIComponent(
          `Oi! Pedi corte na Varanda Barber ${rotulo(ultimo.dia)} às ${hhDe(ultimo.hora)} (${p.nome}). Aceita aqui: ${location.origin}${location.pathname}?admin&pedido=${ultimo.dia}/${ultimo.hora}`,
        )}">${ic('zap')} mandar pro ${BARBEIRO} no zap</a>
        ${remarcando ? '<button id="volta">deixa como está</button>' : `<button id="remarca">${ic('remarca')} remarcar</button>`}</section>`;
    }
    // com pedido em aberto, só o pedido: outro horário é remarcar
    if (meu && !remarcando) return ($app.innerHTML = meu);
    if (!meu) remarcando = false;
    const livre = (/** @type {number} */ h) => { const k = 'h' + String(h).padStart(2, '0'); return !ocupados[k] && !(dia === hoje && h <= agora.getHours()); };
    const g = guarda();
    const eu = g.nome ? `<button class="eu" id="eu">${ic('pessoa')} ${esc(g.nome)} · ${telBonito(g.tel || '')} ${ic('lapis')}</button>` : '';
    $app.innerHTML = `${meu}${eu}<section class="cartao"><h2>${ic('dia')} ${remarcando ? 'escolhe o novo dia' : 'escolhe o dia'}</h2>
      <div class="grade dias">${dias.map(d => `<button data-dia="${d}" aria-pressed="${d === dia}">${rotulo(d)}</button>`).join('')}</div>
      <h2>${ic('hora')} e a hora</h2>
      <div class="grade">${HORAS.map(h => { const k = 'h' + String(h).padStart(2, '0');
        return `<button data-hora="${k}" aria-pressed="${k === hora}"${livre(h) ? '' : ' disabled'}>${h}h</button>`; }).join('')}</div>
      <button class="principal" id="pede">${ic('tesoura')} pedir horário</button><p class="erro" id="erro"></p></section>`;
  }

  // a chegada: um pop-up pede nome e zap uma vez; o aparelho lembra (o botão com o nome troca)
  const $modal = /** @type {HTMLElement} */ (document.getElementById('modal'));
  function quemE() {
    const g = guarda();
    $modal.innerHTML = `<form class="caixa" id="quem" novalidate>
      <div class="selo"><span class="marca"></span></div>
      <h2>bora marcar seu corte?</h2>
      <p>pro ${BARBEIRO} saber quem é e te chamar no zap</p>
      <label class="campo">${ic('pessoa')}<input id="nome" maxlength="40" placeholder="seu nome" autocomplete="given-name" value="${esc(g.nome || '')}"></label>
      <label class="campo">${ic('zap')}<input id="tel" type="tel" inputmode="numeric" maxlength="16" placeholder="seu WhatsApp com DDD" autocomplete="tel-national" value="${esc(g.tel || '')}"></label>
      <button class="principal">${ic('ok')} continuar</button><p class="erro" id="erroQuem"></p></form>`;
    $modal.hidden = false;
    /** @type {HTMLInputElement} */ (document.getElementById(g.nome ? 'tel' : 'nome')).focus();
  }
  $modal.addEventListener('submit', e => {
    e.preventDefault();
    const nome = /** @type {HTMLInputElement} */ (document.getElementById('nome')).value.trim();
    // o zap com DDD, só os números (sem o 55 e sem o 0 da operadora)
    const tel = /** @type {HTMLInputElement} */ (document.getElementById('tel')).value.replace(/\D/g, '').replace(/^0+/, '').replace(/^55(?=\d{10,11}$)/, '');
    const erro = /** @type {HTMLElement} */ (document.getElementById('erroQuem'));
    if (!nome) return (erro.textContent = 'põe seu nome');
    if (!/^\d{10,11}$/.test(tel)) return (erro.textContent = 'põe seu zap com DDD');
    const g = guarda(); g.nome = nome; g.tel = tel; grava(g);
    $modal.hidden = true;
    cliente();
  });

  async function pede() {
    const erro = /** @type {HTMLElement} */ (document.getElementById('erro'));
    if (!hora) return (erro.textContent = 'escolhe uma hora');
    const { nome, tel } = guarda();
    if (!nome || !tel) return quemE();
    const r = await fetch(`${DB}/pedidos/${dia}/${hora}.json`, { method: 'PUT', body: JSON.stringify({ nome, tel, em: { '.sv': 'timestamp' } }) }).catch(() => null);
    if (!r || !r.ok) { hora = ''; await cliente(); return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = 'esse horário acabou de sair, escolhe outro'); }
    const g = guarda(), velho = (g.meus || []).slice(-1)[0];
    // remarcou: o horário velho só sai depois que o novo gravou
    if (remarcando && velho && ehDia(velho.dia) && ehHora(velho.hora)) await fetch(`${DB}/pedidos/${velho.dia}/${velho.hora}.json`, { method: 'DELETE' }).catch(() => null);
    remarcando = false;
    g.meus = [{ dia, hora }]; grava(g);
    hora = '';
    await cliente();
  }

  // ---------- barbeiro ----------
  async function barbeiro() {
    const dias = proximosDias();
    const todos = await Promise.all(dias.map(d => lePedidos(d).catch(() => ({}))));
    // na ordem do horário, de cima pra baixo; o pedido que veio pelo zap (&pedido=) fica marcado
    const linhas = dias.flatMap((d, i) => Object.keys(todos[i]).sort().map(h => [h, todos[i][h]]).map(([h, p]) => `<div class="pedido ${p.ok ? 'ok' : 'espera'}${alvoZap === d + '/' + h ? ' alvo' : ''}">
      <span>${rotulo(d)} ${hhDe(h)} · ${esc(p.nome)}${p.tel ? `<br><a class="tel" href="https://wa.me/55${p.tel}" target="_blank" rel="noopener">${ic('zap')} ${telBonito(p.tel)}</a>` : ''}</span>
      ${p.ok ? `<span class="status ok">${ic('ok')} aceito</span>` : `<button data-aceita="${d}/${h}">${ic('ok')} aceitar</button>`}</div>`));
    $app.innerHTML = `<section class="cartao"><h2>${ic('dia')} agenda do ${BARBEIRO}</h2>${linhas.join('') || '<p class="vazio">nenhum pedido ainda</p>'}
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
    else if (b.id === 'eu') quemE();
    else if (b.id === 'remarca' || b.id === 'volta') { remarcando = b.id === 'remarca'; hora = ''; cliente(); }
    else if (b.dataset.aceita) aceita(b.dataset.aceita);
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!ehBarbeiro && !guarda().nome) quemE();
  (ehBarbeiro ? barbeiro() : cliente()).catch(() => ($app.innerHTML = '<p class="erro cartao">sem conexão, tenta de novo</p>'));
})();
