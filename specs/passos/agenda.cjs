const { test: base, createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const servir = require('../_serve.cjs');
const { Banco } = require('../_banco.cjs');

class Mundo {
  constructor(browser, base) { this.browser = browser; this.base = base; this.banco = new Banco(); this.agora = 0; this.meus = {}; this.abas = {}; this.erros = []; }
  async abre(quem, busca = '') {
    if (quem !== 'barbeiro') this.quem = quem;
    if (this.abas[quem]) { await this.abas[quem].goto(this.base + '/' + busca); return (this.p = this.abas[quem]); }
    const ctx = await this.browser.newContext({ timezoneId: 'America/Sao_Paulo' });
    await ctx.clock.setSystemTime(this.agora);
    await ctx.route(servir.DB_FALSO + '/**', async r => { const q = r.request(), u = new URL(q.url());
      const res = this.banco.responde(q.method(), u.pathname, u.searchParams.get('auth'), q.postData());
      await r.fulfill({ status: res.status, contentType: 'application/json', body: JSON.stringify(res.corpo) }); });
    const antes = { ...(this.meus[quem] || this.quemJa === quem ? { nome: quem, tel: '79999990000' } : {}), ...(this.meus[quem] ? { meus: this.meus[quem] } : {}) };
    // o que o aparelho já tinha antes desta visita: só na primeira carga da aba
    if (Object.keys(antes).length) await ctx.addInitScript(v => { if (sessionStorage.getItem('__antes')) return; sessionStorage.setItem('__antes', '1'); localStorage.setItem('varanda', v); }, JSON.stringify(antes));
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
const HOJE = '2026-03-10', hora = h => 'h' + String(h).padStart(2, '0') + '00';

Dado('que hoje é terça, 10\\/3, às {int}h', ({ mundo }, h) => { mundo.agora = Date.parse(`${HOJE}T${String(h).padStart(2, '0')}:00:00-03:00`); });
Dado('que {word} pediu o horário de {int}h de hoje', ({ mundo }, quem, h) => { mundo.banco.pede(HOJE, hora(h), quem); mundo.meus[quem] = [{ dia: HOJE, hora: hora(h) }]; });

// o pop-up: o dia, a hora e confirmar (nome e zap já vêm se o aparelho lembra)
const escolhe = async (p, h, { nome = '', tel = '79999991234' } = {}) => {
  await p.getByRole('button', { name: 'ter 10/3' }).click();
  await p.getByRole('button', { name: `${h}:00`, exact: true }).click();
  if (nome) { await p.getByPlaceholder('seu nome').fill(nome); await p.getByPlaceholder('seu WhatsApp com DDD').fill(tel); }
  await p.getByRole('button', { name: 'confirmar' }).click();
};
Dado('que {word} já marcou antes neste celular', ({ mundo }, quem) => { mundo.quemJa = quem; });

Quando('{word} marca o horário de {int}h de hoje', async ({ mundo }, quem, h) => {
  const p = await mundo.abre(quem);
  await escolhe(p, h, { nome: quem, tel: '(79) 99999-1234' });
  await expect(p.locator('#meu')).toContainText(`às ${h}:00`); // o pedido gravou
});
Quando('{word} abre o link', ({ mundo }, quem) => mundo.abre(quem));
Quando('{word} escolhe o dia de hoje', async ({ mundo }, quem) => (await mundo.abre(quem)).getByRole('button', { name: 'ter 10/3' }).click());
Quando('{word} escolhe 10h de hoje e confirma só com o nome', async ({ mundo }, quem) => escolhe(await mundo.abre(quem), 10, { nome: quem, tel: '' }));
Quando('{word} escolhe 10h de hoje', async ({ mundo }, quem) => {
  const p = await mundo.abre(quem);
  await p.getByRole('button', { name: 'ter 10/3' }).click();
  await p.getByRole('button', { name: '10:00', exact: true }).click();
});
Então('o pop-up pergunta o dia', ({ mundo }) => expect(mundo.p.locator('#modal')).toContainText('que dia?'));
Então('nome e zap já vêm preenchidos', async ({ mundo }) => {
  await expect(mundo.p.getByPlaceholder('seu nome')).toHaveValue(mundo.quemJa);
  await expect(mundo.p.getByPlaceholder('seu WhatsApp com DDD')).toHaveValue('79999990000');
});
Quando('o barbeiro aceita o pedido de {word} pelo link dele', async ({ mundo }, quem) => {
  const p = await mundo.abre('barbeiro', '?admin');
  await p.locator('.pedido', { hasText: quem }).getByRole('button', { name: 'aceitar' }).click();
  await expect(p.locator('.pedido', { hasText: quem })).toContainText('aceito');
});
Quando('o barbeiro abre a agenda', ({ mundo }) => mundo.abre('barbeiro', '?admin'));

Então('{word} vê {string}', async ({ mundo }, quem, texto) => { await expect((await mundo.abre(quem)).locator('#meu')).toContainText(texto); });
Então('aparece {string}', ({ mundo }, texto) => expect(mundo.p.locator('body')).toContainText(texto));
Então('o horário de {int}h está ocupado', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}:00`, exact: true })).toBeDisabled());
Então('o horário de {int}h está livre', ({ mundo }, h) => expect(mundo.p.getByRole('button', { name: `${h}:00`, exact: true })).toBeEnabled());
Então('o primeiro dia é {string}', ({ mundo }, d) => expect(mundo.p.locator('[data-dia]').first()).toHaveText(d));
Então('o botão do zap manda pro Luique o link do pedido de {int}h de hoje', async ({ mundo }, h) => {
  const href = await mundo.p.getByRole('link', { name: 'mandar pro Luique no zap' }).getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/557996491143\?text=/);
  expect(decodeURIComponent(href.split('text=')[1])).toContain(`?admin&pedido=${HOJE}/${hora(h)}`);
});
Então('ele vê o pedido de {word} com o zap {string}', async ({ mundo }, quem, tel) => {
  const linha = mundo.p.locator('.pedido', { hasText: quem });
  await expect(linha.getByRole('link', { name: tel })).toHaveAttribute('href', 'https://wa.me/55' + tel.replace(/\D/g, ''));
  await expect(linha.getByRole('button', { name: 'aceitar' })).toBeVisible();
});
Então('ela vê só o pedido, com o botão de remarcar', async ({ mundo }) => {
  await expect(mundo.p.locator('#meu').getByRole('button', { name: 'remarcar' })).toBeVisible();
  await expect(mundo.p.locator('#modal')).toBeHidden();
});
Quando('{word} remarca pro horário de {int}h de hoje', async ({ mundo }, quem, h) => {
  const p = await mundo.abre(quem);
  await p.getByRole('button', { name: 'remarcar' }).click();
  await escolhe(p, h);
  await expect(p.locator('#meu')).toContainText(`às ${h}:00`);
});
Então('na agenda do barbeiro {word} está só às {int}h', async ({ mundo }, quem, h) => {
  const p = await mundo.abre('barbeiro', '?admin');
  await expect(p.locator('.pedido', { hasText: quem })).toHaveCount(1);
  await expect(p.locator('.pedido', { hasText: quem })).toContainText(` ${h}:00 `);
});
Quando('{word} marca o horário das {string} de hoje', async ({ mundo }, quem, t) => {
  const p = await mundo.abre(quem);
  await p.getByRole('button', { name: 'ter 10/3' }).click();
  await p.getByRole('button', { name: t, exact: true }).click();
  await p.getByPlaceholder('seu nome').fill(quem);
  await p.getByPlaceholder('seu WhatsApp com DDD').fill('79999991234');
  await p.getByRole('button', { name: 'confirmar' }).click();
});
