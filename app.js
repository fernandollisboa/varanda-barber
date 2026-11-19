// @ts-check
// Varanda Barber: o cliente escolhe dia e hora, o barbeiro aceita. Firebase via REST, sem servidor.
// ?admin é a agenda do barbeiro: ele entra uma vez com a senha da conta dele no Firebase (EMAIL) e o aparelho lembra.
(() => {
  const DB = 'https://SEU-PROJETO-default-rtdb.firebaseio.com';
  const CHAVE = 'SUA-CHAVE-WEB'; // a "Chave de API da Web" do projeto Firebase (é pública)
  const EMAIL = 'luique@varanda.barber'; // a conta do barbeiro no Firebase Authentication; as regras do banco só deixam ela aceitar
  const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
  const TOKEN = 'https://securetoken.googleapis.com/v1/token';
  const BARBEIRO = 'Luique'; // o barbeiro, o único admin
  const ZAP = '557996491143'; // o zap do barbeiro, com DDI, só dígitos
  const HORAS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // o último corte começa 17h e acaba 18h
  const DIAS = 6; // quantos dias de trabalho aparecem pro cliente (domingo fecha)

  const $app = /** @type {HTMLElement} */ (document.getElementById('app'));
  const esc = (/** @type {string} */ s) => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const ehDia = (/** @type {string} */ d) => /^20\d{2}-[01]\d-[0-3]\d$/.test(d);
  const ehHora = (/** @type {string} */ h) => /^h(09|1[0-7])$/.test(h);

  /** @typedef {{ nome: string, em: number, ok?: boolean }} Pedido */
  /** o que vem do banco é hostil: só passa o formato do pedido */
  const clean = (/** @type {any} */ v) => {
    /** @type {Record<string, Pedido>} */ const r = {};
    if (!v || typeof v !== 'object') return r;
    for (const [h, p] of Object.entries(v))
      if (ehHora(h) && p && typeof p.nome === 'string') r[h] = { nome: p.nome.slice(0, 40), em: +p.em || 0, ok: p.ok === true };
    return r;
  };

  // o aparelho: { rt? (o login do barbeiro), meus: [{ dia, hora }] }
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

  // sem banco configurado (os SEU-... ali em cima), o app roda em preview: o banco e o login são imitados
  // no próprio aparelho (localStorage). a senha do barbeiro no preview é "preview"
  const PREVIEW = DB.includes('SEU-PROJETO');
  const falso = async (/** @type {string} */ url, /** @type {any} */ op = {}) => {
    const res = (/** @type {number} */ s, /** @type {any} */ v) => new Response(JSON.stringify(v), { status: s });
    /** @type {any} */ let b = {};
    try { b = JSON.parse(localStorage.getItem('varanda:preview') || '{}') || {}; } catch {}
    const salva = () => { try { localStorage.setItem('varanda:preview', JSON.stringify(b)); } catch {} };
    const [, dia, hora] = url.match(/pedidos\/([^/.]+)(?:\/(h\d\d))?\.json$/) || [];
    if (dia) {
      if (!op.method) return res(200, b[dia] || null);
      if (b[dia]?.[hora]) return res(401, null);
      (b[dia] ||= {})[hora] = { nome: JSON.parse(op.body).nome, em: Date.now() };
      salva();
      return res(200, null);
    }
    if (url.startsWith(AUTH)) return JSON.parse(op.body).password === 'preview' ? res(200, { idToken: 'preview', refreshToken: 'preview' }) : res(400, {});
    if (url.startsWith(TOKEN)) return res(200, { id_token: 'preview' });
    const [, d, h] = url.match(/pedidos\/([^/.]+)\/([^/.]+)\/ok\.json\?auth=preview$/) || [];
    if (d && b[d]?.[h]) { b[d][h].ok = true; salva(); return res(200, true); }
    return res(401, {});
  };
  const rede = PREVIEW ? falso : fetch;

  const lePedidos = async (/** @type {string} */ dia) => clean(await (await rede(`${DB}/pedidos/${dia}.json`)).json());

  // ---------- cliente ----------
  let dia = '', hora = '';
  /** @type {Record<string, Pedido>} */ let ocupados = {};

  async function cliente() {
    const dias = proximosDias(true);
    dia ||= dias[0];
    ocupados = await lePedidos(dia).catch(() => ({}));
    const agora = new Date(), hoje = iso(agora);
    const meus = guarda().meus || [];
    const ultimo = meus[meus.length - 1];
    let meu = '';
    if (ultimo && ehDia(ultimo.dia) && ehHora(ultimo.hora) && ultimo.dia >= hoje) {
      const p = (ultimo.dia === dia ? ocupados : await lePedidos(ultimo.dia).catch(() => ({})))[ultimo.hora];
      if (p) meu = `<section class="cartao" id="meu"><h2>seu horário: ${rotulo(ultimo.dia)} às ${hhDe(ultimo.hora)}</h2>
        <p class="status ${p.ok ? 'ok' : 'espera'}">${p.ok ? 'confirmado pelo barbeiro ✔' : 'esperando o barbeiro aceitar'}</p>
        <a class="botao" id="zap" target="_blank" rel="noopener" href="https://wa.me/${ZAP}?text=${encodeURIComponent(
          `Oi! Pedi corte na Varanda Barber ${rotulo(ultimo.dia)} às ${hhDe(ultimo.hora)} (${p.nome}). Aceita aqui: ${location.origin}${location.pathname}?admin&pedido=${ultimo.dia}/${ultimo.hora}`,
        )}">mandar pro ${BARBEIRO} no zap</a></section>`;
    }
    const livre = (/** @type {number} */ h) => { const k = 'h' + String(h).padStart(2, '0'); return !ocupados[k] && !(dia === hoje && h <= agora.getHours()); };
    $app.innerHTML = `${meu}<section class="cartao"><h2>escolhe o dia</h2>
      <div class="grade dias">${dias.map(d => `<button data-dia="${d}" aria-pressed="${d === dia}">${rotulo(d)}</button>`).join('')}</div>
      <h2>e a hora</h2>
      <div class="grade">${HORAS.map(h => { const k = 'h' + String(h).padStart(2, '0');
        return `<button data-hora="${k}" aria-pressed="${k === hora}"${livre(h) ? '' : ' disabled'}>${h}h</button>`; }).join('')}</div>
      <input id="nome" maxlength="40" placeholder="seu nome" autocomplete="given-name">
      <button class="principal" id="pede">pedir horário</button><p class="erro" id="erro"></p></section>`;
  }

  async function pede() {
    const nome = /** @type {HTMLInputElement} */ (document.getElementById('nome')).value.trim();
    const erro = /** @type {HTMLElement} */ (document.getElementById('erro'));
    if (!hora) return (erro.textContent = 'escolhe uma hora');
    if (!nome) return (erro.textContent = 'põe seu nome');
    const r = await rede(`${DB}/pedidos/${dia}/${hora}.json`, { method: 'PUT', body: JSON.stringify({ nome, em: { '.sv': 'timestamp' } }) }).catch(() => null);
    if (!r || !r.ok) { hora = ''; await cliente(); return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = 'esse horário acabou de sair, escolhe outro'); }
    const g = guarda(); g.meus = [...(g.meus || []), { dia, hora }].slice(-5); grava(g);
    hora = '';
    await cliente();
  }

  // ---------- barbeiro ----------
  let token = ''; // o idToken do Firebase (vale 1h); o aparelho guarda só o refreshToken (guarda().rt)
  const pegaToken = async () => {
    const rt = guarda().rt;
    if (!rt) return '';
    const r = await rede(`${TOKEN}?key=${CHAVE}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(rt)}` }).catch(() => null);
    return r && r.ok ? (await r.json()).id_token || '' : '';
  };

  async function barbeiro() {
    token ||= await pegaToken();
    if (!token) return ($app.innerHTML = `<section class="cartao"><h2>agenda do ${BARBEIRO}</h2>
      <input id="senha" type="password" placeholder="senha do ${BARBEIRO}" autocomplete="current-password">
      <button class="principal" id="entra">entrar</button><p class="erro" id="erro"></p></section>`);
    const dias = proximosDias();
    const todos = await Promise.all(dias.map(d => lePedidos(d).catch(() => ({}))));
    // na ordem do horário, de cima pra baixo; o pedido que veio pelo zap (&pedido=) fica marcado
    const linhas = dias.flatMap((d, i) => Object.keys(todos[i]).sort().map(h => [h, todos[i][h]]).map(([h, p]) => `<div class="pedido ${p.ok ? 'ok' : 'espera'}${alvoZap === d + '/' + h ? ' alvo' : ''}">
      <span>${rotulo(d)} ${hhDe(h)} · ${esc(p.nome)}</span>
      ${p.ok ? '<span class="status ok">aceito ✔</span>' : `<button data-aceita="${d}/${h}">aceitar</button>`}</div>`));
    $app.innerHTML = `<section class="cartao"><h2>agenda do ${BARBEIRO}</h2>${linhas.join('') || '<p class="vazio">nenhum pedido ainda</p>'}
      <p class="erro" id="erro"></p></section>`;
  }

  async function entra() {
    const senha = /** @type {HTMLInputElement} */ (document.getElementById('senha')).value;
    const r = await rede(`${AUTH}?key=${CHAVE}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: senha, returnSecureToken: true }) }).catch(() => null);
    if (!r || !r.ok) return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = r ? 'senha errada' : 'sem conexão, tenta de novo');
    const { idToken, refreshToken } = await r.json();
    const g = guarda(); g.rt = refreshToken; grava(g);
    token = idToken;
    await barbeiro();
  }

  async function aceita(/** @type {string} */ alvo) {
    const [d, h] = alvo.split('/');
    const manda = () => rede(`${DB}/pedidos/${d}/${h}/ok.json?auth=${token}`, { method: 'PUT', body: 'true' }).catch(() => null);
    let r = await manda();
    if (r?.status === 401) { token = await pegaToken(); r = await manda(); } // o token venceu (1h): renova e tenta de novo
    if (!r || !r.ok) return (/** @type {HTMLElement} */ (document.getElementById('erro')).textContent = r?.status === 401 ? 'só a conta do barbeiro aceita' : 'não deu, tenta de novo');
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
    else if (b.dataset.aceita) aceita(b.dataset.aceita);
    else if (b.id === 'entra') entra();
  });

  if (PREVIEW) document.querySelector('header')?.insertAdjacentHTML('beforeend', `<p class="preview">preview: os pedidos ficam só neste aparelho ·
    ${ehBarbeiro ? '<a href="./">ver como cliente</a>' : '<a href="?admin">ver como barbeiro</a> (senha: preview)'}</p>`);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  (ehBarbeiro ? barbeiro() : cliente()).catch(() => ($app.innerHTML = '<p class="erro cartao">sem conexão, tenta de novo</p>'));
})();
