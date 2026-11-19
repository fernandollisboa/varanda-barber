# language: pt
Funcionalidade: Agendar corte na Varanda
  Na chegada, um pop-up pergunta uma coisa por vez: nome e zap, o dia (segunda a sábado) e a hora
  (9h às 18h). O horário só vale quando o barbeiro aceita pela agenda dele (?admin; por enquanto sem senha).

  Contexto:
    Dado que hoje é terça, 10/3, às 8h

  Cenário: o cliente marca tudo no pop-up e fica esperando o barbeiro
    Quando Ana marca o horário de 10h de hoje
    Então Ana vê "esperando o barbeiro aceitar"

  Cenário: na chegada, o pop-up pergunta o nome e o WhatsApp
    Quando Bruno abre o link
    Então o pop-up pergunta o nome e o WhatsApp

  Cenário: quem já deu nome e zap vai direto pro dia
    Dado que Bruno já deu o nome e o zap
    Quando Bruno abre o link
    Então o pop-up já pergunta o dia

  Cenário: sem o zap não passa
    Quando Bruno chega só com o nome
    Então aparece "põe seu zap com DDD"

  Cenário: horário pedido não fica livre pra mais ninguém
    Dado que Ana pediu o horário de 10h de hoje
    Quando Bruno chega e escolhe o dia de hoje
    Então o horário de 10h está ocupado
    E o horário de 11h está livre

  Cenário: com um pedido em aberto, o cliente só vê o pedido
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana abre o link
    Então ela vê só o pedido, com o botão de remarcar

  Cenário: remarcar troca o horário e libera o antigo
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana remarca pro horário de 11h de hoje
    Então Ana vê "às 11h"
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
    Dado que hoje é terça, 10/3, às 18h
    Quando Bruno chega e diz o nome e o zap
    Então o primeiro dia é "qua 11/3"
