const { test: base, createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const servir = require('../_serve.cjs');
const { Banco } = require('../_banco.cjs');
const { Api, SENHA } = require('../_api.cjs');

// um celular que deixa avisar: permissão no toque e uma inscrição de push de mentira (o headless não tem push)
function celularComAviso() {
  window.Notification = /** @type {any} */ ({ requestPermission: async () => 'granted' });
  const sub = { endpoint: 'https://push.falso/barbeiro', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'x', auth: 'y' } }; } };
  const reg = { pushManager: { getSubscription: async () => null, subscribe: async () => sub } };
  Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => reg, ready: Promise.resolve(reg) } });
}

class Mundo {
  constructor(browser, base) { this.browser = browser; this.base = base; this.banco = new Banco(); this.api = new Api(this.banco); this.agora = 0; this.meus = {}; this.abas = {}; this.erros = []; }
  async abre(quem, busca = '') {
    if (this.abas[quem]) { await this.abas[quem].goto(this.base + '/' + busca); return (this.p = this.abas[quem]); }
    const ctx = await this.browser.newContext({ timezoneId: 'America/Sao_Paulo' });
    await ctx.clock.setSystemTime(this.agora);
    await ctx.route(servir.DB_FALSO + '/**', async r => { const q = r.request(), u = new URL(q.url());
      const res = this.banco.responde(q.method(), u.pathname, u.searchParams.get('auth'), q.postData());
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.corpo) }); });
    await ctx.route(servir.API_FALSA + '/**', async r => { const q = r.request();
      const res = await this.api.responde(q.method(), new URL(q.url()).pathname, q.postData());
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.corpo), headers: { 'access-control-allow-origin': '*' } }); });
    if (quem === 'barbeiro') await ctx.addInitScript(celularComAviso);
    if (this.meus[quem]) await ctx.addInitScript(v => localStorage.setItem('varanda', v), JSON.stringify({ meus: this.meus[quem] }));
    const p = await ctx.newPage(); p.on('pageerror', e => this.erros.push(e.message));
    await p.goto(this.base + '/' + busca);
    return (this.abas[quem] = this.p = p);
  }
  async fecha() { for (const p of Object.values(this.abas)) await p.context().close(); expect(this.erros).toEqual([]); expect(this.banco.listagens, 'tentou listar o banco').toBe(0); }
}

const test = base.extend({
  servidor: [async ({}, use) => { const { srv, porta } = await servir(); await use(`http://localhost:${porta}`); srv.close(); }, { scope: 'worker' }],
  mundo: async ({ browser, servidor }, use) => { const m = new Mundo(browser, servidor); await use(m); await m.fecha(); },
});
const { Given: Dado, When: Quando, Then: Então } = createBdd(test);
module.exports = { test };
const HOJE = '2026-03-10', hora = h => 'h' + String(h).padStart(2, '0');

Dado('que hoje é terça, 10\\/3, às {int}h', ({ mundo }, h) => { mundo.agora = Date.parse(`${HOJE}T${String(h).padStart(2, '0')}:00:00-03:00`); });
Dado('que o barbeiro ligou o aviso no celular', ({ mundo }) => mundo.api.kv.put('barbeiro', JSON.stringify({ endpoint: 'https://push.falso/barbeiro' })));
Dado('que {word} pediu o horário de {int}h de hoje', ({ mundo }, quem, h) => { mundo.banco.pede(HOJE, hora(h), quem); mundo.meus[quem] = [{ dia: HOJE, hora: hora(h) }]; });

Quando('{word} pede o horário de {int}h de hoje', async ({ mundo }, quem, h) => {
  const p = await mundo.abre(quem);
  await p.getByRole('button', { name: `${h}h`, exact: true }).click();
  await p.getByPlaceholder('seu nome').fill(quem);
  await p.getByRole('button', { name: 'pedir horário' }).click();
  await p.locator('#meu').waitFor(); // o pedido gravou
});
Quando('{word} abre o link', ({ mundo }, quem) => mundo.abre(quem));
Quando('o barbeiro aceita o pedido de {word} pelo link dele', async ({ mundo }, quem) => {
  const p = await mundo.abre('barbeiro', '?barbeiro=' + SENHA);
  await p.locator('.pedido', { hasText: quem }).getByRole('button', { name: 'aceitar' }).click();
  await expect(p.locator('.pedido', { hasText: quem })).toContainText('aceito');
});
Quando('alguém tenta aceitar o pedido de {word} com um link de barbeiro inventado', async ({ mundo }, quem) => {
  const p = await mundo.abre('intruso', '?barbeiro=chute');
  await p.locator('.pedido', { hasText: quem }).getByRole('button', { name: 'aceitar' }).click();
});
Quando('o barbeiro liga o aviso no celular pelo link dele', async ({ mundo }) => {
  const p = await mundo.abre('barbeiro', '?barbeiro=' + SENHA);
  await p.getByRole('button', { name: /receber aviso/ }).click();
});

Então('{word} vê {string}', async ({ mundo }, quem, texto) => { await expect((await mundo.abre(quem)).locator('#meu')).toContainText(texto); });
Então('aparece {string}', ({ mundo }, texto) => expect(mundo.p.locator('main')).toContainText(texto));
Então('o celular do barbeiro recebe um aviso', ({ mundo }) => expect.poll(() => mundo.api.pushes).toEqual(['https://push.falso/barbeiro']));
Então('o horário de {int}h está ocupado', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}h`, exact: true })).toBeDisabled());
Então('o horário de {int}h está livre', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}h`, exact: true })).toBeEnabled());
