# language: pt
Funcionalidade: Agendar corte na Varanda
  Na chegada, um pop-up no meio da tela pede em três passos: o dia (segunda a sábado), a hora
  (poltronas de 30 em 30 minutos, das 9:00 às 18:30, manhã e tarde) e confirmar, com nome e zap. O horário só vale quando o barbeiro aceita pela agenda dele (?admin; por enquanto sem senha).

  Contexto:
    Dado que hoje é terça, 10/3, às 8h

  Cenário: o cliente marca tudo no pop-up e fica esperando o barbeiro
    Quando Ana marca o horário de 10h de hoje
    Então Ana vê "esperando o barbeiro aceitar"

  Cenário: com a manhã lotada, as poltronas já abrem na tarde
    Dado que a manhã de hoje está toda ocupada
    Quando Bruno escolhe o dia de hoje
    Então aparecem as poltronas da tarde

  Cenário: dá pra pegar meia hora
    Quando Ana marca o horário das "10:30" de hoje
    Então Ana vê "às 10:30"

  Cenário: na chegada, o pop-up já pergunta o dia
    Quando Bruno abre o link
    Então o pop-up pergunta o dia

  Cenário: quem já marcou neste celular não digita nome e zap de novo
    Dado que Bruno já marcou antes neste celular
    Quando Bruno escolhe 10h de hoje
    Então nome e zap já vêm preenchidos

  Cenário: sem o zap não confirma
    Quando Bruno escolhe 10h de hoje e confirma só com o nome
    Então aparece "põe seu zap com DDD"

  Cenário: horário pedido não fica livre pra mais ninguém
    Dado que Ana pediu o horário de 10h de hoje
    Quando Bruno escolhe o dia de hoje
    Então o horário de 10h está ocupado
    E o horário de 11h está livre

  Cenário: com um pedido em aberto, o cliente só vê o pedido
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana abre o link
    Então ela vê só o pedido, com o botão de remarcar

  Cenário: remarcar troca o horário e libera o antigo
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana remarca pro horário de 11h de hoje
    Então Ana vê "às 11:00"
    E na agenda do barbeiro Ana está só às 11h

  Cenário: o pedido vai pro zap do Luique com o link pra aceitar
    Quando Ana marca o horário de 10h de hoje
    Então o botão do zap manda pro Luique o link do pedido de 10h de hoje

  Cenário: o barbeiro vê o zap de quem pediu
    Quando Ana marca o horário de 10h de hoje
    E o barbeiro abre a agenda
    Então ele vê o pedido de Ana com o zap "(79) 99999-1234"

  Cenário: o barbeiro aceita e o cliente vê confirmado
    Dado que Ana pediu o horário de 10h de hoje
    Quando o barbeiro aceita o pedido de Ana pelo link dele
    Então Ana vê "confirmado pelo barbeiro"

  Cenário: depois do último horário, o primeiro dia já é amanhã
    Dado que hoje é terça, 10/3, às 19h
    Quando Bruno abre o link
    Então o primeiro dia é "qua 11/3"
