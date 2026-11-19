// npm run dev: o site na máquina com banco e login falsos, em memória. o barbeiro entra em /?admin com a senha abaixo
const servir = require('./_serve.cjs'), { Banco, SENHA } = require('./_banco.cjs');
servir({ banco: new Banco(), porta: Number(process.env.PORTA) || 8000 }).then(({ porta }) =>
  console.log(`Varanda na máquina: http://localhost:${porta}/  ·  barbeiro: http://localhost:${porta}/?admin (senha: ${SENHA})`));
