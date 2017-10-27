
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
inherits(DrawBlackjactGame, EventEmitter)

var Util = require('./../game_server/game_util')

function DrawBlackjactGame (gameData) {
  var self = this

  self.drawobj = null
  self.game = gameData

  self.p5sketch = function (p) {
    self.drawobj = p

    p.preload = function () {
      self.sprite_sheet_image = p.loadImage('image/cards.png')
    }

    p.setup = function () {
      p.noStroke()
      p.noLoop()
      //p.createCanvas(588, 609)
      p.createCanvas(1118, 609)

    }

    p.draw = function () {
      p.clear()
      self.draw_blackjackGame()
    }
  }

  self.ob = new p5(self.p5sketch, 'myp5sketch')
}

DrawBlackjactGame.prototype.redraw = function (gameData) {
  var self = this

  self.game = gameData
  if (!self.ob._renderer) return
  //self.drawobj.redraw.bind(self.drawobj)
  self.drawobj.redraw()
}

DrawBlackjactGame.prototype.draw_blackjackGame = function () {
  var self = this

  self.draw_GameBoard(self.game.dealerTotal, self.game.playerTotal, self.game.otherPlayers)
  self.draw_money(self.game.moneyOnHand)

  switch (self.game.gameState) {

    case Util.GAMESTATES.INIT:
    case Util.GAMESTATES.BETTING:
      self.draw_bettingView()
      break
    case Util.GAMESTATES.HITTING:
    case Util.GAMESTATES.PROCESSING:
      self.draw_playView()
      self.draw_cards(self.game.targetCards, self.game.dealerCards, self.game.otherPlayers)
      break
  }

  self.draw_GameMessage(self.game.gameState)
}

DrawBlackjactGame.prototype.draw_cards = function (playerCards, dealerCards, otherPlayers) {
  //(2,4)는 뒷면 이미지.
  var self = this
  dealerCards.forEach(function (dc, i) {
    if (dc === null) self.drawobj.image(self.sprite_sheet_image, Util.DealerCardPositionXY[i][0], Util.DealerCardPositionXY[i][1], 79, 123, 2 * 79, 4 * 123, 79, 123)
    else self.drawobj.image(self.sprite_sheet_image, Util.DealerCardPositionXY[i][0], Util.DealerCardPositionXY[i][1], 79, 123, (dc.rank - 1) * 79, (dc.suit) * 123, 79, 123)
  })

  // 지금은 필요 없지만 나중에 다인용 블랙잭에서는 다른 플레이어의 카드를 가리기 위해 필요할 수 있다.
  playerCards.forEach(function (pc, i) {
    self.drawobj.image(self.sprite_sheet_image, Util.PlayerCardPositionXY[i][0], Util.PlayerCardPositionXY[i][1], 79, 123, (pc.rank - 1) * 79, (pc.suit) * 123, 79, 123)
  })

  otherPlayers.forEach(function (op) {
    op.cards.forEach(function (opc, i) {
      // 최하위 위치만 조정하고 나머지는 원래 플레이어를 그리는 것과 동일한게 그린다
      self.drawobj.image(self.sprite_sheet_image, (260 * (i + 1)) + Util.PlayerCardPositionXY[i][0], Util.PlayerCardPositionXY[i][1], 79, 123, (opc.rank - 1) * 79, (opc.suit) * 123, 79, 123)
    })
  })

  for (var i = 0, len = otherPlayers.length; i < len; i++) {
    var ele = otherPlayers[i].cards
    for (var j = 0, len2 = ele.length; j < len2; j++) {
      self.drawobj.image(self.sprite_sheet_image, (260 * (i + 1)) + Util.PlayerCardPositionXY[i][0], Util.PlayerCardPositionXY[i][1], 79, 123, (ele[j].rank - 1) * 79, (ele[j].suit) * 123, 79, 123)
    }
  }

}

// 나중엔 Sx, Sy를 받아서 그려 줄 것 이다.
DrawBlackjactGame.prototype.draw_GameBoard = function (dealerTotal, playerTotal) {
  var self = this

  self.drawobj.fill(self.drawobj.color('#666600'))
  self.drawobj.rect(30, 0, 1060, 530)

  self.drawobj.fill(self.drawobj.color('#228800'))
  self.drawobj.rect(40, 10, 1040, 510)

  self.drawobj.push()
  self.drawobj.translate(40, 10)
  self.drawobj.textSize(20)
  self.drawobj.fill(self.drawobj.color('#99FF99'))
  var dstr = 'Dealer'
  if (dealerTotal) {
    var dealerTotalText = dealerTotal + ''
    dstr += ' ' + dealerTotalText
  }
  self.drawobj.text(dstr, 30, 25)

  self.drawobj.textSize(20)
  self.drawobj.fill(self.drawobj.color('#99FF99'))
  var pstr = 'PlayerA'
  if (playerTotal) {
    var playerTotalText = playerTotal + ''
    pstr += ' ' + playerTotalText
  }
  self.drawobj.text(pstr, 30, 335)
  self.drawobj.text('PlayerB', 30 + 260 * 1, 335)
  self.drawobj.text('PlayerC', 30 + 260 * 2, 335)
  self.drawobj.text('PlayerD', 30 + 260 * 3, 335)

  self.drawobj.pop()
}

DrawBlackjactGame.prototype.draw_bettingView = function () {
  var self = this

  self.drawobj.removeElements()
  self.game.gameMessage = self.game.gameState

  self.draw_input()
  self.draw_betButton()
}

DrawBlackjactGame.prototype.draw_playView = function () {
  var self = this

  self.drawobj.removeElements()
  self.game.gameMessage = self.game.gameState

  self.draw_Buttons()
  self.draw_betMoney(self.game.betOnTurn)
}

DrawBlackjactGame.prototype.draw_money = function (money) {
  // 나중에는 금액을 인자로 받아서 처리
  var self = this

  self.drawobj.push()
  self.drawobj.translate(40, 10)

  self.drawobj.textSize(20)
  self.drawobj.fill(self.drawobj.color('#99FF99'))
  self.drawobj.text('Your Money', 30, 220)

  self.drawobj.textSize(40)
  self.drawobj.fill(self.drawobj.color('#FFFF00'))
  self.drawobj.text('$' + money.toString(), 50, 270)

  self.drawobj.pop()
}

DrawBlackjactGame.prototype.draw_betMoney = function (money) {
  // 나중에는 금액을 인자로 받아서 처리
  var self = this

  self.drawobj.push()
  self.drawobj.translate(40, 10)

  self.drawobj.textSize(20)
  self.drawobj.fill(self.drawobj.color('#99FF99'))
  self.drawobj.text('Your bet', 370, 220)

  self.drawobj.textSize(40)
  self.drawobj.fill(self.drawobj.color('#FFFF00'))
  self.drawobj.text('$' + money, 390, 270)
  self.drawobj.pop()

}

DrawBlackjactGame.prototype.draw_GameMessage = function (str) {
  var self = this

  self.drawobj.push()
  self.drawobj.translate(40, 10)

  self.drawobj.textSize(30)
  self.drawobj.textAlign(self.drawobj.CENTER)
  self.drawobj.text(str, 500, 570)

  self.drawobj.pop()
}

DrawBlackjactGame.prototype.draw_input = function () {
  var self = this

  self.betInput = self.drawobj.createInput()
  self.betInput.width = 60
  self.betInput.position(300, 260)
}

DrawBlackjactGame.prototype.draw_betButton = function () {
  var self = this

  self.betButton = self.drawobj.createButton('Betting!')
  self.betButton.position(450, 260)
  self.betButton.mousePressed(self.OnBettingButtonClicked.bind(self))
}

DrawBlackjactGame.prototype.draw_Buttons = function () {
  var self = this

  self.hitButton = self.drawobj.createButton('hit')
  self.hitButton.position(265, 270)
  self.hitButton.mousePressed(self.OnHitButtonClicked.bind(self))

  self.standButton = self.drawobj.createButton('stand')
  self.standButton.position(305, 270)
  self.standButton.mousePressed(self.OnStandButtonClicked.bind(self))
}

// 이건 어떤 버튼이 눌렸는지, 눌렸을 떄의 필요한 value를 보내주면 서버에서 받아서 player 객체에 적용하고 응답을 준다
// gamepacket이 오면 betOnturn 변수가 사용자가 입력한 베팅 금액을 가지고 있을 것 이다
DrawBlackjactGame.prototype.OnBettingButtonClicked = function () {
  var self = this

  if (self.game.gameState === Util.GAMESTATES.PROCESSING) return
  var betText = self.betInput.value()
  if (!Util.isNumber(betText) || betText < 1 || betText > self.game.moneyOnHand) {
    self.game.gameState = 'Bet must be a number between 1 and ' + self.game.moneyOnHand.toString()
    self.drawobj.redraw()
    return
  } else {
    self.emit('pressAction', {
      betMoney: Number(betText),
      method: 'Deal'
    })
  }
}

DrawBlackjactGame.prototype.OnHitButtonClicked = function () {
  var self = this

  if (self.game.gameState === Util.GAMESTATES.PROCESSING) return

  self.emit('pressAction', {
    method: 'Hit'
  })
}

DrawBlackjactGame.prototype.OnStandButtonClicked = function () {
  var self = this

  if (self.game.gameState === Util.GAMESTATES.PROCESSING) return

  self.emit('pressAction', {
    method: 'Stand'
  })
}

module.exports = DrawBlackjactGame
