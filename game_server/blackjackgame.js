var debug = require('debug')('blackjackon:GameObject')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var Util = require('./game_util')
var _ = require('underscore')
var Player = require('./player')
var Deck = require('./carddeck').Deck

/**
 * BlackJackGame
 *
 * @event userleave 유저가 방을 나가는 액션을 할 때 호출. socket disconnect할 땐 반대로 roomManager에서 메소드를 호출한다.
 */
inherits(BlackJackGame, EventEmitter)

function BlackJackGame (options) {
  var self = this
  if (!(self instanceof BlackJackGame)) return new BlackJackGame(options)

  self.room_id = options.room_id || Math.random().toString(36).substr(2)
  self.numOfDecks = options.num_of_decks || 1
  self.gameState = Util.GAMESTATES.INIT // 시퀀셜 진행
  // 시퀀셜 루프를 돌리면서 딜러는 유저가 딜 혹은 패스를 선택하길 기다린다.
  self.decks = [] // Deck을 보관하는 배열이다.
  self.deckIndex = 0 // 현재 사용중인 Deck의 인덱스이다.
  self.players = {}
  self.gameInterval = null
  self.prevTick = 0
  self.ChangeGameState = function (state) {
    self.gameState = state
    self.prevTick = Date.now()
    // 여기서 makeResponse를 해버리면 뭔가 메세지가 가는 시점이 예측 불가능해 진다
    // 내가 필요한 시점이 아닌데 message가 갈 수 있다
    //self.makeResponse(Util.RESPONSE_TYPE.STATECHANGE)
  }
}

BlackJackGame.prototype.changeDeck = function () {
  var self = this
  if (++self.deckIndex >= self.decks.length) {
    self.deckIndex = 0
    // Create the decks using the setting
    for (var i = 0; i < self.numOfDecks; i += 1) {
      self.decks[i].shuffle()
    }
  }
}
BlackJackGame.prototype.initDecks = function () {
  var self = this
  self.decks = []
  self.deckIndex = 0
  // Create the decks using the setting
  for (var i = 0; i < self.numOfDecks; i += 1) {
    var deck = new Deck()
    deck.shuffle()
    deck.on('outofcard', self.changeDeck.bind(self))
    self.decks.push(deck)
  }
}

BlackJackGame.prototype.initGame = function () {
  var self = this

  // 덱을 초기화 한다
  self.initDecks()
  // 딜러를 추가한다
  self.pushClient({id: Util.DEALER, is_dealer: true})
  //self.ChangeGameState(Util.GAMESTATES.READY)
  self.ChangeGameState(Util.GAMESTATES.BETTING)

  // 일정 시간마다 돌아갈 것 이다
  function gameLoop () {
    var self = this

    // 만약 플레이어가 1명이고, 계속 사람이 추가된다면 이건 의미가 없을 수 있다
    // 그런데 플레이어가 4명일 때 시작한다면 의미가 있을 수 있다
    // 그런데 블랙잭 게임의 특성상 플레이어가 다 와야 시작하는 것이 아니라서 이건 의미가 없을 것 같다
    /*if (self.gameState === Util.GAMESTATES.READY) {
      // 게임이 시작되면 READY 상태인데 이떄 1초가 지나면 game state를 변경하고 플레이어들에게 알린다
      if (1000 * 1 < (Date.now() - self.prevTick)) {
        self.ChangeGameState(Util.GAMESTATES.BETTING)

        var players = _.values(self.players)
        players.forEach(function (ele) {
          if(!ele.is_dealer) self.makeResponse(ele)
        })
      }
      // betting 상태일 때의 동작이다
    } else */

    if (self.gameState === Util.GAMESTATES.BETTING) {
      var isReady = false
      var readyCount = 0
      if (1000 * 30 < (Date.now() - self.prevTick)) isReady = true
      // 플레이어의 배팅이 끝나기를 기다린다. 제한시간 30초를 주고 제한시간 안어 모든 플레이어가 의사결정을 마치면 속행한다.

      var players = _.values(self.players)
      var len = players.length

      for (var i = 0; i < len; i++) {
        var player = players[i]

        if (player.is_dealer) {
          if (player.state !== Util.PLAYERSTATES.DEAL) { player.doAction(Util.ACTIONS.DEAL) }
          // Dealer always deals
          readyCount++
        } else if (isReady && player.state !== Util.PLAYERSTATES.DEAL) {
          // if player didn't decide after 10 sec, make them drop automaticaly
          // 제한시간이 종료되면 강제로 드랍한다.
          player.doAction(Util.ACTIONS.DROP)
          readyCount++
        } else if (player.state === Util.PLAYERSTATES.DEAL) {
          readyCount++
        }
      }
      // 모든 플레이어의 준비가 끝났음을 확인한다
      if (len === readyCount) isReady = true

      if (!isReady) return
      for (var i = 0; i < len; i++) {
        var player = players[i]
        if (!player.is_dealer && player.state === Util.PLAYERSTATES.DEAL) {
          player.moneyOnHand -= player.betOnTurn
        }
      }

      // 다음 state에서 쓰일 데이터들을 미리 초가화 해 두고 state를 변경한다
      self.ChangeGameState(Util.GAMESTATES.HITTING)

      // 여기서 제대로 초기화 안돼고 넘어가서 그럼
      //init player for hitting state
      for (var i = 0; i < len; i++) {
        var player = players[i]

        if (player.state !== Util.PLAYERSTATES.DROP) {
          player.pushCard(self.decks[self.deckIndex].nextCard())
          player.pushCard(self.decks[self.deckIndex].nextCard())
        }
      }

      // other players 의 card가 다 뽑힌 후에 그걸 모아서 전송 해 주어야 한다
      for (var i = 0; i < len; i++) {
        var player = players[i]
        if (!player.is_dealer) self.makeResponse(Util.RESPONSE_TYPE.STATECHANGE, player, false)
      }

      // end betting

    } else if (self.gameState === Util.GAMESTATES.HITTING) {
      var isOver = false
      var overCount = 0
      if (1000 * 60 * 10 < (Date.now() - self.prevTick)) isOver = true

      var players = _.values(self.players)
      var len = players.length
      for (var i = 0; i < len; i++) {
        var player = players[i]

        // 선택이 끝나는 경우 - dealer blackjack or bust or stand, player blackjack or bust or stand
        if (player.is_dealer) {
          if (player.state === Util.PLAYERSTATES.BLACKJACK) {
            overCount++
          } else if (player.state === Util.PLAYERSTATES.BUST) {
            overCount++
          } else if (player.state === Util.PLAYERSTATES.STAND) {
            overCount++
          }
          if (overCount === 0) {
            if (player.getScore() > 17) {
              player.doAction(Util.ACTIONS.STAND)
            } else {
              player.pushCard(self.decks[self.deckIndex].nextCard())
              player.doAction(Util.ACTIONS.HIT)
            }
          }
        } else {
          switch (player.state) {
            case Util.PLAYERSTATES.DROP:
            case Util.PLAYERSTATES.BUST:
            case Util.PLAYERSTATES.STAND:
            case Util.PLAYERSTATES.BLACKJACK:
              overCount++
              break
          }
        }
        // 선택이 계속되는 경우 - hit, double, split
      }
      debug('over count: ' + overCount + ' / ' + len)

      if (len === overCount) isOver = true
      if (!isOver) return
      self.ChangeGameState(Util.GAMESTATES.PROCESSING)
      //self.makeResponse('changeState')

      var dealerScore = 0
      var dealerBlackjack = false

      for (var i = 0; i < len; i++) {
        var player = players[i]

        if (player.is_dealer) {
          dealerScore = player.getScore()
          if (player.state === Util.PLAYERSTATES.BLACKJACK) { dealerBlackjack = true }
        } else if (player.state !== Util.PLAYERSTATES.DROP) {
          // 모든 플레이어의 선택이 종료되면 각 플레이어의 Win, Lose, Tie를 판정한다.
          if (player.state === Util.PLAYERSTATES.BLACKJACK) {
            if (!dealerBlackjack) {
              // win
              player.state = Util.PLAYERSTATES.WIN
              player.moneyOnHand += player.betOnTurn * 2
            } else {
              // Tie
              player.state = Util.PLAYERSTATES.TIE
              player.moneyOnHand += player.betOnTurn
            }
          } else if (player.state === Util.PLAYERSTATES.BUST) {
            if (dealerScore > 21) {
              // Tie
              player.state = Util.PLAYERSTATES.TIE
              player.moneyOnHand += player.betOnTurn
            } else {
              // Lose
              player.state = Util.PLAYERSTATES.LOSE
            }
          } else {
            var playerScore = player.getScore()
            if (playerScore === dealerScore) { // Tie
            } else if (playerScore > dealerScore) {
              // Win
              player.state = Util.PLAYERSTATES.WIN
              player.moneyOnHand += player.betOnTurn * 2
            } else {
              // Lose
              player.state = Util.PLAYERSTATES.LOSE
            }
          }
        }

      }

      for (var i = 0; i < len; i++) {
        var player = players[i]
        self.makeResponse(Util.RESPONSE_TYPE.PROCESSINGDONE, player, false)
      }
    }

    else if (self.gameState === Util.GAMESTATES.PROCESSING) {
      if (1000 * 2 >= (Date.now() - self.prevTick)) return

      // 다음 판을 기다리는 시간을 준다.
      self.ChangeGameState(Util.GAMESTATES.BETTING)

      var players = _.values(self.players)
      var len = players.length
      for (var i = 0; i < len; i++) {
        var player = players[i]
        // if (!player.is_dealer) {  }

        // 플레이어 상태를 초기화한다.
        player.state = Util.PLAYERSTATES.DROP
        player.emptyCards()

        self.makeResponse('', player, true)
      }// end loop
    }// end processing
  }// end game loop

  if (self.gameInterval) clearInterval(self.gameInterval)
  self.gameInterval = setInterval(gameLoop.bind(self), 1000 * 0.5)
}

BlackJackGame.prototype.pushClient = function (options) {
  var self = this
  var player = new Player(options)
  self.players[options.id || Util.DEALER] = player
  // 게임 중간에들어온 경우 drop으로 처리한다
  if (self.gameState !== Util.GAMESTATES.BETTING) player.doAction(Util.ACTIONS.DROP)
  if (!options.is_dealer) { self.makeResponse(/* Util.RESPONSE_TYPE.CONNECT */'', null, true) }
}

/**
 * clientEventHandler
 *
 * @param {*} message {
 *  client_id: String 
 *  room_id: String
 *  action: String - > Deal, Drop, Hit, Stand, Double, Split, Surrender, Insurance
 *  bet: Number
 * }
 * @event {*} response {
 *  client_id: String
 *  room_id: String
 *  gameState: String
 *  dealerCards: Array
 *  moneyOnHand: Number
 *  getActions: Array Get possible action for current state
 *  otherPlayers: Array See other player's cards
 * }
 */
BlackJackGame.prototype.clientEventHandler = function (message) {
  var self = this

  var player = self.players[message.client_id]
  // client id -> action
  if (self.gameState === Util.GAMESTATES.BETTING) {
    if (message.action === Util.ACTIONS.DEAL) {
      player.betOnTurn = message.bet
      player.doAction(message.action)
      self.makeResponse('bet', player, false)
    }
  } else if (self.gameState === Util.GAMESTATES.HITTING) {
    if (message.action === Util.ACTIONS.HIT || message.action === Util.ACTIONS.DOUBLE || message.action === Util.ACTIONS.STAND || message.action === Util.ACTIONS.SPLIT) {
      player.doAction(message.action)
      if (message.action === Util.ACTIONS.HIT || message.action === Util.ACTIONS.DOUBLE) {
        player.pushCard(self.decks[self.deckIndex].nextCard())
        if (message.action === Util.ACTIONS.DOUBLE) {
          if (player.moneyOnHand >= player.betOnTurn * 2) {
            player.moneyOnHand -= player.betOnTurn
            player.betOnTurn = player.betOnTurn * 2
          }
        }
      }

      self.makeResponse('bet', player, false)

      var players = _.values(self.players)
      var len = players.length
      for (var i = 0; i < len; i++) {
        var ele = players[i]
        if (ele.id !== player.id && !ele.is_dealer) {
          self.makeResponse('otherEvent', ele, false)
        }
      }
    }
  } else {
    debug('ignore client action: ' + JSON.stringify(message))
  }
}

BlackJackGame.prototype.makeResponse = function (responseType, target, broadcast) {
  var self = this

  if (!target) {
    target = self.players[Util.DEALER]
  }

  var otherPlayers = []
  for (var key in self.players) {
    if (self.players.hasOwnProperty(key)) {
      var player = self.players[key]
      if (!player.is_dealer && target.id !== player.id && target.id !== 'Dealer') {
        otherPlayers.push({
          client_id: player.id,
          cards: player.cards,
          state: player.state
        })
      }
    }
  }

  var message = {
    client_id: target.id,
    room_id: self.room_id,
    broadcast: broadcast,
    gameState: self.gameState,
    dealerCards: (self.gameState === Util.GAMESTATES.HITTING) ? [self.players[Util.DEALER].cards[0], null] : self.players[Util.DEALER].cards,
    targetCards: target.cards,
    targetState: target.state,
    moneyOnHand: target.moneyOnHand,
    getActions: (self.gameState === Util.GAMESTATES.HITTING && !broadcast && target.state !== Util.PLAYERSTATES.DROP) ? target.getActions() : [],
    otherPlayers: otherPlayers,
    betOnTurn: self.players[target.id].betOnTurn,
    responseType: responseType
  }

  self.emit('response', message)

}

BlackJackGame.prototype.updateDisconectedUser = function (client_id) {
  var self = this
  if (self.players[client_id]) delete self.players[client_id]
  debug('client: ' + client_id + ' disconnect from room: ' + self.room_id)
}

module.exports = BlackJackGame