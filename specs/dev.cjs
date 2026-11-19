// npm run dev: o site na máquina com banco e API falsos, em memória. o barbeiro entra em /?barbeiro=senha-do-barbeiro
const servir = require('./_serve.cjs'), { Banco } = require('./_banco.cjs'), { Api, SENHA } = require('./_api.cjs');
const banco = new Banco();
servir({ banco, api: new Api(banco), porta: Number(process.env.PORTA) || 8000 }).then(({ porta }) =>
  console.log(`Varanda na máquina: http://localhost:${porta}/  ·  barbeiro: http://localhost:${porta}/?barbeiro=${SENHA}`));
