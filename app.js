// @ts-check
// Varanda Barber: o cliente escolhe dia e hora, o barbeiro aceita. Firebase via REST, sem servidor.
// ?admin é a agenda do barbeiro. por enquanto sem login: quem tem o link aceita.
(() => {
  const DB = 'https://varanda-417d1-default-rtdb.firebaseio.com';
  const BARBEIRO = 'Luique'; // o barbeiro, o único admin
  const ZAP = '557996491143'; // o zap do barbeiro, com DDI, só dígitos
  // de 30 em 30 minutos, das 9:00 às 18:30 (o último corte acaba 19h). a chave no banco é h + hhmm: h0930
  const HORAS = Array.from({ length: 20 }, (_, i) => 'h' + String(9 + Math.floor(i / 2)).padStart(2, '0') + (i % 2 ? '30' : '00'));
  const MANHA = HORAS.filter(h => h < 'h1300'), TARDE = HORAS.filter(h => h >= 'h1300');
  // a poltrona de barbearia de frente: apoio de cabeça, encosto, braços, assento, coluna e base
  const POLTRONA = '<svg viewBox="0 0 48 60" aria-hidden="true"><rect class="c" x="18" y="2" width="12" height="6" rx="3"/><rect class="c" x="12" y="9" width="24" height="22" rx="5"/><rect class="c" x="5" y="22" width="8" height="12" rx="3"/><rect class="c" x="35" y="22" width="8" height="12" rx="3"/><rect class="c" x="9" y="30" width="30" height="9" rx="4"/><rect class="p" x="21" y="39" width="6" height="11" rx="1"/><ellipse class="p" cx="24" cy="54" rx="15" ry="4"/></svg>';
  const DIAS = 6; // quantos dias de trabalho aparecem pro cliente (domingo fecha)

  const $app = /** @type {HTMLElement} */ (document.getElementById('app'));
  // os dois ícones que ajudam: o do zap e o de ok
  const ICONES = {
    zap: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10c0 3 2 5 5 5l1.2-1.2-2-1-.9.6c-.8-.4-1.4-1-1.8-1.8l.6-.9-1-2L9 10z"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
  };
  const ic = (/** @type {keyof typeof ICONES} */ n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n]}</svg>`;
  const esc = (/** @type {string} */ s) => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const ehDia = (/** @type {string} */ d) => /^20\d{2}-[01]\d-[0-3]\d$/.test(d);
  const ehHora = (/** @type {string} */ h) => /^h(09|1[0-8])(00|30)$/.test(h);

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
  const hhDe = (/** @type {string} */ h) => +h.slice(1, 3) + ':' + h.slice(3);
  const minutos = (/** @type {string} */ h) => +h.slice(1, 3) * 60 + +h.slice(3);
  const agoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  // passou do último horário, o dia de hoje sai da agenda do cliente (o barbeiro ainda vê os de hoje)
  const proximosDias = (/** @type {boolean} */ pulaHojeSeTarde = false) => {
    const r = [], d = new Date();
    if (pulaHojeSeTarde && agoraMin() >= minutos(HORAS[HORAS.length - 1])) d.setDate(d.getDate() + 1);
    d.setHours(12);
    while (r.length < DIAS) { if (d.getDay() !== 0) r.push(iso(d)); d.setDate(d.getDate() + 1); }
    return r;
  };

  const lePedidos = async (/** @type {string} */ dia) => clean(await (await fetch(`${DB}/pedidos/${dia}.json`)).json());

  // ---------- cliente ----------
  // tudo num pop-up, uma pergunta por vez: quem (nome e zap) → dia → hora. com pedido em aberto, só o pedido na tela
  const $modal = /** @type {HTMLElement} */ (document.getElementById('modal'));
  const $ = (/** @type {string} */ id) => /** @type {HTMLInputElement} */ (document.getElementById(id));
  let dia = '', hora = '', remarcando = false;

  /** o pedido em aberto deste aparelho, se ainda vale: de hoje em diante, e se for hoje, a hora não passou */
  async function meuPedido() {
    const ultimo = (guarda().meus || []).slice(-1)[0], agora = new Date(), hoje = iso(agora);
    if (!ultimo || !ehDia(ultimo.dia) || !ehHora(ultimo.hora) || ultimo.dia < hoje) return null;
    if (ultimo.dia === hoje && minutos(ultimo.hora) + 30 <= agoraMin()) return null;
    const p = (await lePedidos(ultimo.dia))[ultimo.hora];
    return p ? { dia: ultimo.dia, hora: ultimo.hora, p } : null;
  }

  async function cliente() {
    const meu = await meuPedido().catch(() => null);
    if (!meu) remarcando = false;
    $app.innerHTML = meu ? `<section class="cartao" id="meu"><h2>seu horário</h2>
        <p class="quando">${rotulo(meu.dia)} às ${hhDe(meu.hora)}</p>
        <p class="status ${meu.p.ok ? 'ok' : 'espera'}">${meu.p.ok ? ic('ok') + ' confirmado pelo barbeiro' : 'esperando o barbeiro aceitar'}</p>
        <a class="botao principal" id="zap" target="_blank" rel="noopener" href="https://wa.me/${ZAP}?text=${encodeURIComponent(
          `Oi! Pedi corte na Varanda Barber ${rotulo(meu.dia)} às ${hhDe(meu.hora)} (${meu.p.nome}). Aceita aqui: ${location.origin}${location.pathname}?admin&pedido=${meu.dia}/${meu.hora}`,
        )}">${ic('zap')} mandar pro ${BARBEIRO} no zap</a>
        <button id="remarca">remarcar</button></section>`
      : '';
    if (meu && !remarcando) return fecha();
    await abre('dia');
  }

  const fecha = () => { $modal.hidden = true; $modal.innerHTML = ''; };
  // os três passos do pedido: o dia, a hora e confirmar (com nome e zap, que o aparelho lembra)
  const PASSOS = ['dia', 'hora', 'confirmar'];
  async function abre(/** @type {string} */ passo) {
    const g = guarda(), n = PASSOS.indexOf(passo);
    const trilha = `<ol class="passos">${PASSOS.map((p, i) => `<li class="${i < n ? 'feito' : i === n ? 'agora' : ''}">${p}</li>`).join('')}</ol>`;
    let corpo = '';
    if (passo === 'dia') corpo = `<h2>que dia?</h2>
      <div class="grade">${proximosDias(true).map(d => `<button data-dia="${d}">${rotulo(d)}</button>`).join('')}</div>`;
    if (passo === 'hora') {
      const ocupados = await lePedidos(dia).catch(() => ({})), hoje = iso(new Date());
      const livre = (/** @type {string} */ h) => !ocupados[h] && !(dia === hoje && minutos(h) <= agoraMin());
      // as poltronas em fileiras de quatro, curvadas como sala de cinema; um bloco pra manhã, outro pra tarde
      const salao = (/** @type {string[]} */ hs) => `<div class="salao">${hs.map(h => `<button class="pol" data-hora="${h}"${livre(h) ? '' : ' disabled'}>${POLTRONA}<span>${hhDe(h)}</span></button>`).join('')}</div>`;
      const conta = (/** @type {string[]} */ hs) => hs.filter(livre).length;
      corpo = `<h2>que horas?</h2><p class="oi">${rotulo(dia)}</p>
      <p class="turno">manhã <i>${conta(MANHA)} livres</i></p>${salao(MANHA)}
      <p class="turno">tarde <i>${conta(TARDE)} livres</i></p>${salao(TARDE)}
      <button class="link" data-volta="dia">voltar</button>`;
    }
    if (passo === 'confirmar') corpo = `<h2>${rotulo(dia)} às ${hhDe(hora)}</h2>
      <input id="nome" maxlength="40" placeholder="seu nome" autocomplete="given-name" value="${esc(g.nome || '')}">
      <input id="tel" type="tel" inputmode="numeric" maxlength="16" placeholder="seu WhatsApp com DDD" autocomplete="tel-national" value="${esc(g.tel || '')}">
      <button class="principal" id="confirma">${ic('ok')} confirmar</button>
      <button class="link" data-volta="hora">voltar</button>`;
    $modal.innerHTML = `<div class="caixa">${trilha}${corpo}${remarcando ? '<button class="link" id="volta">deixa como está</button>' : ''}<p class="erro" id="erro"></p></div>`;
    $modal.hidden = false;
  }
  const erro = (/** @type {string} */ t) => ($('erro').textContent = t);

  async function confirma() {
    const nome = $('nome').value.trim();
    // o zap com DDD, só os números (sem o 55 e sem o 0 da operadora)
    const tel = $('tel').value.replace(/\D/g, '').replace(/^0+/, '').replace(/^55(?=\d{10,11}$)/, '');
    if (!nome) return erro('põe seu nome');
    if (!/^\d{10,11}$/.test(tel)) return erro('põe seu zap com DDD');
    const g = guarda(); g.nome = nome; g.tel = tel; grava(g);
    await marca();
  }

  async function marca() {
    const g = guarda();
    const r = await fetch(`${DB}/pedidos/${dia}/${hora}.json`, { method: 'PUT', body: JSON.stringify({ nome: g.nome, tel: g.tel, em: { '.sv': 'timestamp' } }) }).catch(() => null);
    if (!r || !r.ok) { hora = ''; await abre('hora'); return erro('esse horário acabou de sair, escolhe outro'); }
    const velho = (g.meus || []).slice(-1)[0];
    // remarcou: o horário velho só sai depois que o novo gravou
    if (remarcando && velho && ehDia(velho.dia) && ehHora(velho.hora)) await fetch(`${DB}/pedidos/${velho.dia}/${velho.hora}.json`, { method: 'DELETE' }).catch(() => null);
    g.meus = [{ dia, hora }];
    grava(g);
    remarcando = false; hora = '';
    fecha();
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

  document.body.addEventListener('click', e => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!b) return;
    if (b.dataset.aceita) return aceita(b.dataset.aceita);
    if (b.dataset.dia) { dia = b.dataset.dia; hora = ''; abre('hora'); }
    else if (b.dataset.hora) { hora = b.dataset.hora; abre('confirmar'); }
    else if (b.dataset.volta) abre(b.dataset.volta);
    else if (b.id === 'confirma') confirma();
    else if (b.id === 'remarca') { remarcando = true; cliente(); }
    else if (b.id === 'volta') { remarcando = false; hora = ''; cliente(); }
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  (ehBarbeiro ? barbeiro() : cliente()).catch(() => ($app.innerHTML = '<p class="erro cartao">sem conexão, tenta de novo</p>'));
})();
