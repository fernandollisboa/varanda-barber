const { defineConfig } = require('./_pw.cjs'); // também acha o chromium da máquina
const { defineBddConfig } = require('playwright-bdd');
const testDir = defineBddConfig({ features: 'features/*.feature', steps: 'passos/*.cjs', language: 'pt', outputDir: '.gerado' });
module.exports = defineConfig({
  testDir, outputDir: '.resultados', fullyParallel: true, workers: '100%', forbidOnly: !!process.env.CI, retries: 0,
  reporter: process.env.CI ? [['dot'], ['github']] : [['list']],
  use: { viewport: { width: 390, height: 844 }, trace: 'off', launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined } },
});
