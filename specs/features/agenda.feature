# language: pt
Funcionalidade: Agendar corte na Varanda
  Na chegada o cliente diz nome e zap; depois escolhe dia e hora, de 9h às 18h. O horário só vale
  quando o barbeiro aceita pela agenda dele (?admin; por enquanto sem senha).

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

  Cenário: o barbeiro vê o zap de quem pediu
    Quando Ana pede o horário de 10h de hoje
    E o barbeiro abre a agenda
    Então ele vê o pedido de Ana com o zap "(79) 99999-1234"

  Cenário: o barbeiro aceita e o cliente vê confirmado
    Dado que Ana pediu o horário de 10h de hoje
    Quando o barbeiro aceita o pedido de Ana pelo link dele
    Então Ana vê "confirmado pelo barbeiro"

  Cenário: na chegada, um pop-up pede nome e WhatsApp uma vez só
    Quando Bruno abre o link
    Então aparece o pop-up pedindo nome e WhatsApp
    Quando Bruno entra e diz o nome e o zap
    Então na próxima vez o pop-up não aparece

  Cenário: sem o zap não passa do pop-up
    Quando Bruno entra só com o nome
    Então aparece "põe seu zap com DDD"

  Cenário: com um pedido em aberto, o cliente só vê o pedido
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana abre o link
    Então ela vê o pedido e o botão de remarcar
    E não vê a agenda pra pedir outro

  Cenário: remarcar troca o horário e libera o antigo
    Dado que Ana pediu o horário de 10h de hoje
    Quando Ana remarca pro horário de 11h de hoje
    Então Ana vê "às 11h"
    E na agenda do barbeiro Ana está só às 11h

  Cenário: depois do último horário, a agenda do cliente já começa amanhã
    Dado que hoje é terça, 10/3, às 18h
    Quando Bruno abre o link
    Então o primeiro dia da agenda é "qua 11/3"

  Cenário: o pedido vai pro zap do Luique com o link pra aceitar
    Quando Ana pede o horário de 10h de hoje
    Então o botão do zap manda pro Luique o link do pedido de 10h de hoje
