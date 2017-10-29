var SocketIO = require('socket.io-client')
var Util = require('../game_server/game_util')
var Canvas = require('./canvasManager')

function BlackJackOn () {
  var self = this
  if (!(self instanceof BlackJackOn)) return new BlackJackOn()

  self.currentChoice = Util.PLAYERSTATES.DROP
  // self.betRange = 10
  self.totalMoney = 0
  self.betOnThisTurn = 1
  self.room_id = ''
  self.gameState = Util.GAMESTATES.INIT

  // socket으로 서버와 연결한다
  self.socket = SocketIO(window.location.hostname + ':' + window.location.port)
  self.socket.on('game packet', self.turn_update.bind(self))
  self.socket.emit('join', 'hello')

  self.canvas = new Canvas()

  self.canvas.on('pressAction', function (data) {
    if (data.method === 'Deal') self.betOnThisTurn = data.betMoney
    if (!self.socket) return
    self.socket.emit('game packet', {
      client_id: self.socket.id,
      room_id: self.room_id,
      action: data.method,
      bet: self.betOnThisTurn
    })
  })
}

// 서버로부터 받은 메세지를 적용한다
BlackJackOn.prototype.turn_update = function (message) {
  var self = this
  console.log('got from server: ', message)
  self.room_id = message.room_id

  // game state 를 업데이트 한다
  // bet deal hit process 등이 있다
  /*
  message structure
  {
    client_id: target.id,
    room_id: self.room_id,
    broadcast: broadcast,
    gameState: self.gameState,
    dealerCards: (self.gameState == Util.GAMESTATES.HITTING) ? [self.players[Util.DEALER].cards[0]] : self.players[Util.DEALER].cards,
    targetCards: target.cards,
    targetState: target.state,
    moneyOnHand: target.moneyOnHand,
    getActions: (self.gameState == Util.GAMESTATES.HITTING && !broadcast && target.state != Util.PLAYERSTATES.DROP) ? target.getActions() : [],
    otherPlayers: otherPlayers
  }
  */

  switch (message.gameState) {
    case Util.GAMESTATES.BETTING:
      message.playerTotal = 0
      break
    case Util.GAMESTATES.HITTING:

      break
    case Util.GAMESTATES.PROCESSING: // 딜러 카드 까고 연산해서 승패 계산함
      message.dealerTotal = Util.score(message.dealerCards)
      break
  }

  message.playerTotal = Util.score(message.targetCards)

  // draw other users
  /*
  {
    cards: player.cards,
    client_id: player.id,
    state: player.state
   }
   */
  for (var k = 0; k < message.otherPlayers.length; k++) {
    var element = message.otherPlayers[k]
    if (element.client_id !== self.socket.id) {
      element.total = Util.score(element.cards)

    }
  }

  self.canvas.rerender(message)
}

module.exports = BlackJackOn