# language: pt
Funcionalidade: Agendar corte na Varanda
  O cliente escolhe dia e hora pelo link, de 9h às 18h. O horário só vale quando o barbeiro
  aceita, e só a conta dele aceita.

  Contexto:
    Dado que hoje é terça, 10/3, às 8h

  Cenário: o cliente pede um horário e fica esperando o barbeiro
    Quando Ana pede o horário de 10h de hoje
    Então Ana vê "esperando o barbeiro aceitar"

  Cenário: horário pedido não fica livre pra mais ninguém
    Dado que Ana pediu o horário de 10h de hoje
    Quando Bruno abre o link
    Então o horário de 10h está ocupado
    E o horário de 11h está livre

  Cenário: o barbeiro aceita e o cliente vê confirmado
    Dado que Ana pediu o horário de 10h de hoje
    Quando o barbeiro entra com a senha dele e aceita o pedido de Ana
    Então Ana vê "confirmado pelo barbeiro"

  Cenário: o aparelho do barbeiro lembra que ele já entrou
    Dado que Ana pediu o horário de 10h de hoje
    E que o barbeiro já entrou no celular dele
    Quando o barbeiro abre a agenda
    Então ele vê o pedido de Ana pra aceitar

  Cenário: senha errada não entra na agenda
    Dado que Ana pediu o horário de 10h de hoje
    Quando alguém tenta entrar na agenda do barbeiro com uma senha inventada
    Então aparece "senha errada"
    E Ana vê "esperando o barbeiro aceitar"

  Cenário: depois do último horário, a agenda do cliente já começa amanhã
    Dado que hoje é terça, 10/3, às 18h
    Quando Bruno abre o link
    Então o primeiro dia da agenda é "qua 11/3"

  Cenário: o pedido vai pro zap do Luique com o link pra aceitar
    Quando Ana pede o horário de 10h de hoje
    Então o botão do zap manda pro Luique o link do pedido de 10h de hoje
