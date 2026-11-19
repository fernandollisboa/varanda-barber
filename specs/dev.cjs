// npm run dev: o site na máquina com o banco falso, em memória. a agenda do barbeiro é /?admin
const servir = require('./_serve.cjs'), { Banco } = require('./_banco.cjs');
servir({ banco: new Banco(), porta: Number(process.env.PORTA) || 8000 }).then(({ porta }) =>
  console.log(`Varanda na máquina: http://localhost:${porta}/  ·  barbeiro: http://localhost:${porta}/?admin`));
