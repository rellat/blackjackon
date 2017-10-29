// global PIXI
var mustache = require('mustache')
var template = require('./template')
var Util = require('./../game_server/game_util')
var _ = require('underscore')

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
inherits(CanvasManager, EventEmitter)

function CanvasManager () {
  var self = this
  if (!(self instanceof CanvasManager)) new CanvasManager()

  self.renderer = null
  self.stage = null
  self.buttonContainer = null
  self.chipContainer = null

  self.cardTextures = []

  // 다 제거하고 생성하지 않고 있는 객체의 속성 값을 바꿔주는 방식으로 rerendering 할 것 이다
  self.betMoneyText = null
  self.balMoneyText = null
  self.gameStateText = null
  self.playerStateText = null

  // 일단 '나'와 '딜러'의 card 데이터들은 따로 관리하는데 나중에 더 나은 방식을 찾아봐야겠다
  self.myCardContainer = null
  self.myValueSumText = null

  self.dealerCardContainer = null
  self.dealerValueSumText = null

  self.otherCardContainer = {}
  self.otherValueSumTexts = []

  self.game = null
  self.betMoney = 0
  self.moneyOnHand = 100
  self.hittingViewFlag = true

  self.init()
}

CanvasManager.prototype.init = function () {
  var self = this

  // create canvas
  self.renderer = PIXI.autoDetectRenderer(1000, 800, {transparent: true})
  document.body.appendChild(self.renderer.view)

  // create background
  self.stage = new PIXI.Container()
  self.stage.addChild(PIXI.Sprite.fromImage('./../image/table.png'))

  // create initial bar
  self.initBar()
  // create initial button and chips
  self.initButtonAndChips()
  // create game state view
  self.initGamestateView('INIT')

  // slice card image
  PIXI.loader.add('spritesheet', './../image/cards2.json')
    .load(self.onAssetsLoaded.bind(self))
}

CanvasManager.prototype.onAssetsLoaded = function () {
  var self = this
  // slice card image and save as texture
  for (var i = 1; i <= 52; i++) {
    self.cardTextures.push(PIXI.Texture.fromFrame('card' + i + '.png'))
  }
}

CanvasManager.prototype.initButtonAndChips = function () {
  var self = this

  // 이건 아직 애매하다
  self.buttonContainer = document.createElement('div')
  self.buttonContainer.setAttribute('class', 'buttonContainer')
  self.buttonContainer.innerHTML = mustache.render(template['buttons'], {})
  document.body.appendChild(self.buttonContainer)

  var buttons = document.getElementsByClassName('gameButton')
  for (var i = 0, len = buttons.length; i < len; i++) {
    buttons[i].addEventListener('click', function (e) {
      console.log(e.target.id)
      self.onButtonClicked(e.target.id)
    })
  }

  self.chipContainer = document.createElement('div')
  self.chipContainer.setAttribute('class', 'chipContainer')
  self.chipContainer.innerHTML = mustache.render(template['chips'], {})
  document.body.appendChild(self.chipContainer)

  var chips = document.getElementsByClassName('pokerchip')

  chips[0].addEventListener('click', function () {
    console.log('10')
    self.onChipClicked(10)
  })

  chips[1].addEventListener('click', function () {
    console.log('25')
    self.onChipClicked(25)
  })

  chips[2].addEventListener('click', function () {
    console.log('50')
    self.onChipClicked(50)
  })
}

CanvasManager.prototype.initBar = function () {
  var self = this

  // create status bar
  var barContainer = new PIXI.Container()
  self.bar = PIXI.Sprite.fromImage('./../image/bar.jpg')
  self.shadow = PIXI.Sprite.fromImage('./../image/shadow.png')
  barContainer.x = 0
  barContainer.y = 700
  barContainer.addChild(self.bar)
  barContainer.addChild(self.shadow)

  var graphics = new PIXI.Graphics()

  self.betMoneyText = self.addViewInBar(graphics, Util.betMoneyView)
  self.balMoneyText = self.addViewInBar(graphics, Util.balMoneyView)
  self.playerStateText = self.addViewInBar(graphics, Util.playerStateView)

  barContainer.addChild(graphics)
  barContainer.addChild(self.betMoneyText)
  barContainer.addChild(self.balMoneyText)
  barContainer.addChild(self.playerStateText)
  self.stage.addChild(barContainer)
}

CanvasManager.prototype.addViewInBar = function (graphic, set) {
  var self = this

  // bet money box
  graphic.lineStyle(2, 0xb5beb4, 1)
  graphic.beginFill(0x1C281A, 1)
  graphic.drawRoundedRect(set.frame.x, set.frame.y, 200, 80, 15)
  graphic.endFill()

  var text = new PIXI.Text(set.inner, {
    font: '30px Snippet',
    fill: 'white',
    align: 'center'
  })
  text.anchor.set(0.5, 0.5)
  text.position.set(set.text.x, set.text.y)

  return text
}

CanvasManager.prototype.initGamestateView = function (message) {
  var self = this

  var messageContainer = new PIXI.Container()

  var graphics = new PIXI.Graphics()
  graphics.lineStyle(2, 0xb5beb4, 1)
  graphics.beginFill(0x1C281A, 1)
  graphics.drawRoundedRect(0, 0, 200, 100, 15)
  graphics.endFill()
// create some white text using the Snippet webfont
  self.gameStateText = new PIXI.Text(message, {
    font: '30px Snippet',
    fill: 'white',
    align: 'center'
  })

  self.gameStateText.anchor.set(0.5, 0.5)
  self.gameStateText.position.set(100, 50)

  messageContainer.addChild(graphics)
  messageContainer.addChild(self.gameStateText)
  messageContainer.x = 10
  messageContainer.y = 10

  self.stage.addChild(messageContainer)
}
CanvasManager.prototype.createCardContainer = function (x, y) {
  var self = this

  var container = new PIXI.Container()
  container.x = x
  container.y = y

  var valuesumContainer = new PIXI.Container()
  var graphics = new PIXI.Graphics()
  // draw a rounded rectangle
  graphics.beginFill(0x000000, 0.7)
  graphics.drawRoundedRect(-40, -70, 50, 50, 15)
  graphics.endFill()

  var text = new PIXI.Text(' ', {
    font: '30px Snippet',
    fill: 'white',
    align: 'center'
  })

  text.anchor.set(0.5, 0.5)
  text.position.set(-15, -45)
  valuesumContainer.addChild(graphics)
  valuesumContainer.addChild(text)

  var cardContainer = new PIXI.Container()
  cardContainer.x = -12
  cardContainer.y = 0

  container.addChild(valuesumContainer)
  container.addChild(cardContainer)

  return {
    container: container,
    text: text
  }
}

/**
 *
 * @param card // suit  0 ~ 3 , value  1 ~ 13
 * @param container // card image container for each player
 */
CanvasManager.prototype.addCard = function (card, container) {
  var self = this

  if (!card) return
  var suit = card.suit
  var value = card.rank - 1
  var index = suit * 13 + value
  var childLen = container.children.length + 1

  var sprite = PIXI.Sprite.from(self.cardTextures[index])
  sprite.anchor.set(0.5)
  sprite.x = 30 * childLen
  sprite.y = 0
  sprite.scale.set(0.8)

  // 으허 container에 anchor가 안먹어서 내가 직접 밀어줘야하다니....
  container.parent.x -= 4
  container.addChild(sprite)
}

/**
 *
 * @param money : int value from server
 */
CanvasManager.prototype.updateBetMoney = function (money) {
  var self = this
  self.betMoneyText.text = 'BET : $' + money
}

CanvasManager.prototype.updateBalMoney = function (money) {
  var self = this
  self.balMoneyText.text = 'BAL : $' + money
}

CanvasManager.prototype.updatePlayerstate = function (state) {
  var self = this
  self.playerStateText.text = state
}

CanvasManager.prototype.updateGamestate = function (state) {
  var self = this
  self.gameStateText.text = state
}

CanvasManager.prototype.updateValueSum = function (id, sum) {
  var self = this
  self.valueSumTexts[id].text = sum
}

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
CanvasManager.prototype.rerender = function (gameData) {
  var self = this
  self.game = gameData
  self.updateGamestate(self.game.gameState)
  self.updatePlayerstate(self.game.targetState)

  switch (self.game.gameState) {
    case Util.GAMESTATES.BETTING:
      self.changeButtonAndChips()
      self.clearBettingView()

      break
    case Util.GAMESTATES.HITTING:
      if (self.game.responseType === Util.RESPONSE_TYPE.STATECHANGE) {
        self.changeButtonAndChips()
        self.initCardArea()
        self.initOtherCardArea(self.game.otherPlayers)
      }
      self.applyGameData()
      break
    case Util.GAMESTATES.PROCESSING:
      if (self.game.responseType === Util.RESPONSE_TYPE.STATECHANGE) {
        self.changeButtonAndChips()
      } else {
        self.applyGameData()
        self.updateBetMoney(self.betMoney = 0)
        self.updateBalMoney(self.moneyOnHand = self.game.moneyOnHand)
      }
      break
  }
  self.renderer.render(self.stage)
}

CanvasManager.prototype.initCardArea = function () {
  var self = this

  var set = self.createCardContainer(480, 400)
  self.myCardContainer = set.container
  self.myValueSumText = set.text
  self.stage.addChild(self.myCardContainer)

  var set = self.createCardContainer(480, 200)
  self.dealerCardContainer = set.container
  self.dealerValueSumText = set.text
  self.stage.addChild(self.dealerCardContainer)
}

CanvasManager.prototype.initOtherCardArea = function (otherPlayers) {
  var self = this

  for (var i = 0, len = otherPlayers.length; i < len; i++) {
    var xy = Util.otherCardContainerXY[i]

    var set = self.createCardContainer(xy[0], xy[1])

    self.stage.addChild(set.container)
    self.otherValueSumTexts[otherPlayers[i].client_id] = set.text
    self.otherCardContainer[otherPlayers[i].client_id] = set.container
  }
}

// 상황에 따라 card 그리고 value sum 그리기
CanvasManager.prototype.applyGameData = function () {
  var self = this

  // dealer
  self.rebuildContainer(self.dealerCardContainer.children[1], self.game.dealerCards)
  if (self.game.dealerTotal) self.dealerValueSumText.text = self.game.dealerTotal

  if (self.game.client_id === 'Dealer') return

  // my
  self.rebuildContainer(self.myCardContainer.children[1], self.game.targetCards)
  self.myValueSumText.text = self.game.playerTotal

  //others
  for (var j = 0, otherLen = self.game.otherPlayers.length; j < otherLen; j++) {
    var other = self.game.otherPlayers[j]
    self.rebuildContainer(self.otherCardContainer[other.client_id].children[1], other.cards)
    self.otherValueSumTexts[other.client_id].text = other.total
  }
}

CanvasManager.prototype.clearBettingView = function () {
  var self = this

  // 이전에 card 들이 있었다면 다 제거한다
  if (self.myCardContainer && self.dealerCardContainer) {
    self.myCardContainer.parent.removeChild(self.myCardContainer)
    self.myCardContainer = null

    self.dealerCardContainer.parent.removeChild(self.dealerCardContainer)
    self.dealerCardContainer = null
  }

  var others = _.values(self.otherCardContainer)

  for(var i = 0, len = others.length; i < len; i++){
    others[i].parent.removeChild(others[i])
  }

  self.otherCardContainer = {}
}

CanvasManager.prototype.rebuildContainer = function (container, cards) {
  var self = this

  // 이 안에는 value sum container, text와 함께 card sprite들이 들어있다
  // 처음 2개의 자식은 text와 text container이고 그 다음부터 card 들이다
  // 일단 원래 있던 카드들을 다 지운다
  container.removeChildren()
  // card value에 맞는 sprite 넣어준다
  for (var i = 0, len = cards.length; i < len; i++) {
    self.addCard(cards[i], container)
  }
}

CanvasManager.prototype.changeButtonAndChips = function () {
  var self = this

  var dealStyle = 'none'
  var otherButtonStyle = 'none'
  var chipStyle = 'none'

  if (self.game.gameState === Util.GAMESTATES.BETTING) {
    dealStyle = 'inline-block'
    chipStyle = 'block'
  } else if (self.game.gameState === Util.GAMESTATES.HITTING) {
    otherButtonStyle = 'inline-block'
  }

  var children = self.buttonContainer.children
  children[0].style.display = dealStyle
  for (var i = 1, len = children.length; i < len; i++) {
    children[i].style.display = otherButtonStyle
  }
  self.chipContainer.style.display = chipStyle
}

CanvasManager.prototype.onButtonClicked = function (method) {
  var self = this

  if (self.game.gameState === Util.GAMESTATES.PROCESSING) return

  self.emit('pressAction', {
    method: method,
    betMoney: (method === 'Deal') ? self.betMoney : 0
  })
}

CanvasManager.prototype.onChipClicked = function (amount) {
  var self = this
  if (self.betMoney + amount > self.moneyOnHand) return

  self.betMoney += amount
  self.moneyOnHand -= amount
  self.updateBetMoney(self.betMoney)
  self.updateBalMoney(self.moneyOnHand)
  self.renderer.render(self.stage)
}

module.exports = CanvasManager