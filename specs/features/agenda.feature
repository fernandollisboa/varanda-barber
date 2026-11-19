# language: pt
Funcionalidade: Agendar corte na Varanda
  O cliente escolhe dia e hora pelo link, de 9h às 18h. O horário só vale quando o barbeiro
  aceita, e só o link dele aceita.

  Contexto:
    Dado que hoje é terça, 10/3, às 8h

  Cenário: o cliente pede um horário e o barbeiro é avisado no celular
    Dado que o barbeiro ligou o aviso no celular
    Quando Ana pede o horário de 10h de hoje
    Então Ana vê "esperando o barbeiro aceitar"
    E o celular do barbeiro recebe um aviso

  Cenário: horário pedido não fica livre pra mais ninguém
    Dado que Ana pediu o horário de 10h de hoje
    Quando Bruno abre o link
    Então o horário de 10h está ocupado
    E o horário de 11h está livre

  Cenário: o barbeiro aceita e o cliente vê confirmado
    Dado que Ana pediu o horário de 10h de hoje
    Quando o barbeiro aceita o pedido de Ana pelo link dele
    Então Ana vê "confirmado pelo barbeiro"

  Cenário: link de barbeiro inventado não aceita
    Dado que Ana pediu o horário de 10h de hoje
    Quando alguém tenta aceitar o pedido de Ana com um link de barbeiro inventado
    Então aparece "esse link não é o do barbeiro"
    E Ana vê "esperando o barbeiro aceitar"

  Cenário: o barbeiro liga o aviso pelo link dele
    Quando o barbeiro liga o aviso no celular pelo link dele
    Então aparece "aviso ligado"

  Cenário: depois do último horário, a agenda do cliente já começa amanhã
    Dado que hoje é terça, 10/3, às 18h
    Quando Bruno abre o link
    Então o primeiro dia da agenda é "qua 11/3"

  Cenário: o pedido vai pro zap do Luique com o link pra aceitar
    Quando Ana pede o horário de 10h de hoje
    Então o botão do zap manda pro Luique o link do pedido de 10h de hoje
