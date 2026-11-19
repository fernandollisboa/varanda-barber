const { test: base, createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const servir = require('../_serve.cjs');
const { Banco, SENHA } = require('../_banco.cjs');

class Mundo {
  constructor(browser, base) { this.browser = browser; this.base = base; this.banco = new Banco(); this.agora = 0; this.meus = {}; this.abas = {}; this.erros = []; }
  async abre(quem, busca = '') {
    if (this.abas[quem]) { await this.abas[quem].goto(this.base + '/' + busca); return (this.p = this.abas[quem]); }
    const ctx = await this.browser.newContext({ timezoneId: 'America/Sao_Paulo' });
    await ctx.clock.setSystemTime(this.agora);
    await ctx.route(servir.DB_FALSO + '/**', async r => { const q = r.request(), u = new URL(q.url());
      const res = this.banco.responde(q.method(), u.pathname, u.searchParams.get('auth'), q.postData());
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.corpo) }); });
    // o login do Firebase (Authentication): nenhum teste sai pra rede
    await ctx.route(/https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\/.*/, async r => { const q = r.request();
      const res = this.banco.login(q.url().includes('securetoken') ? 'token' : 'login', q.postData());
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.corpo), headers: { 'access-control-allow-origin': '*' } }); });
    const antes = { ...(this.meus[quem] ? { meus: this.meus[quem] } : {}), ...(quem === 'barbeiro' && this.barbeiroEntrou ? { rt: 'rt-luique' } : {}) };
    if (Object.keys(antes).length) await ctx.addInitScript(v => localStorage.setItem('varanda', v), JSON.stringify(antes));
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
Dado('que o barbeiro já entrou no celular dele', ({ mundo }) => { mundo.barbeiroEntrou = true; });
Dado('que {word} pediu o horário de {int}h de hoje', ({ mundo }, quem, h) => { mundo.banco.pede(HOJE, hora(h), quem); mundo.meus[quem] = [{ dia: HOJE, hora: hora(h) }]; });

Quando('{word} pede o horário de {int}h de hoje', async ({ mundo }, quem, h) => {
  const p = await mundo.abre(quem);
  await p.getByRole('button', { name: `${h}h`, exact: true }).click();
  await p.getByPlaceholder('seu nome').fill(quem);
  await p.getByRole('button', { name: 'pedir horário' }).click();
  await p.locator('#meu').waitFor(); // o pedido gravou
});
Quando('{word} abre o link', ({ mundo }, quem) => mundo.abre(quem));
const entra = async (mundo, quem, senha) => {
  const p = await mundo.abre(quem, '?barbeiro');
  await p.getByPlaceholder('senha do Luique').fill(senha);
  await p.getByRole('button', { name: 'entrar' }).click();
  return p;
};
Quando('o barbeiro entra com a senha dele e aceita o pedido de {word}', async ({ mundo }, quem) => {
  const p = await entra(mundo, 'barbeiro', SENHA);
  await p.locator('.pedido', { hasText: quem }).getByRole('button', { name: 'aceitar' }).click();
  await expect(p.locator('.pedido', { hasText: quem })).toContainText('aceito');
});
Quando('o barbeiro abre a agenda', ({ mundo }) => mundo.abre('barbeiro', '?barbeiro'));
Quando('alguém tenta entrar na agenda do barbeiro com uma senha inventada', ({ mundo }) => entra(mundo, 'intruso', 'chute'));

Então('{word} vê {string}', async ({ mundo }, quem, texto) => { await expect((await mundo.abre(quem)).locator('#meu')).toContainText(texto); });
Então('aparece {string}', ({ mundo }, texto) => expect(mundo.p.locator('main')).toContainText(texto));
Então('o horário de {int}h está ocupado', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}h`, exact: true })).toBeDisabled());
Então('o horário de {int}h está livre', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}h`, exact: true })).toBeEnabled());
Então('o primeiro dia da agenda é {string}', ({ mundo }, d) => expect(mundo.p.locator('[data-dia]').first()).toHaveText(d));
Então('o botão do zap manda pro Luique o link do pedido de {int}h de hoje', async ({ mundo }, h) => {
  const href = await mundo.p.getByRole('link', { name: 'mandar pro Luique no zap' }).getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/557996491143\?text=/);
  expect(decodeURIComponent(href.split('text=')[1])).toContain(`?barbeiro&pedido=${HOJE}/${hora(h)}`);
});
Então('ele vê o pedido de {word} pra aceitar', ({ mundo }, quem) => expect(mundo.p.locator('.pedido', { hasText: quem }).getByRole('button', { name: 'aceitar' })).toBeVisible());
