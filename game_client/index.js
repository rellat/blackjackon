var SocketIO = require('socket.io-client')
var Util = require('../game_server/game_util')

function BlackJackOn() {
    var self = this
    if (!(self instanceof BlackJackOn)) return new BlackJackOn()

    self.currentChoice = Util.PLAYERSTATES.DROP
        // self.betRange = 10
    self.totalMoney = 0
    self.betOnThisTurn = 1
    self.room_id = ''
    self.gameState = Util.GAMESTATES.INIT

    document.getElementById('bankroll').innerHTML = self.totalMoney

    var chips = document.getElementsByClassName('chip')
    for (var i = 0; i < chips.length; i++) {
        var elem = chips.item(i)
        elem.addEventListener('click', self.pressBet.bind(self))
    }

    self.socket = SocketIO(window.location.hostname + ':' + window.location.port)
    self.socket.on('game packet', self.turn_update.bind(self))
    self.socket.emit('join', 'hello')
    console.log('init')
}
BlackJackOn.prototype.turn_update = function(message) {
    var self = this
    console.log('got from server: ' + JSON.stringify(message))
    self.room_id = message.room_id

    var gs = document.getElementById('gamestate')
    gs.innerHTML = message.gameState
    self.gameState = message.gameState

    if (self.gameState == Util.GAMESTATES.BETTING) {
        document.getElementById('deal').setAttribute('style', 'display:block;')
        document.getElementById('actions').setAttribute('style', 'display:none;')
        document.getElementById('player-total').innerHTML = 0
        document.getElementById('dealer-total').innerHTML = 0
        document.getElementById('dealer-cards').innerHTML = ''
        document.getElementById('player-cards').innerHTML = ''
    } else if (self.gameState == Util.GAMESTATES.HITTING) {
        document.getElementById('actions').setAttribute('style', 'display:block;')
        document.getElementById('deal').setAttribute('style', 'display:none;')

        document.getElementById('dealer-cards').innerHTML = ''
        for (var i = 0; i < 2; i++) {
            var card = message.dealerCards[i]
            if (i == 0 & !card) continue
            var carddiv = document.createElement('div')
            carddiv.setAttribute('style', 'display:inline-block;padding:5px;')
            if (i == 0) {
                carddiv.innerHTML = '[' + Util.SHAPES[card.suit] + ' ' + card.rank + ']'
            } else { carddiv.innerHTML = '[ ? ]' }
            document.getElementById('dealer-cards').appendChild(carddiv)
        }
    } else if (self.gameState == Util.GAMESTATES.PROCESSING) {
        document.getElementById('actions').setAttribute('style', 'display:none;')
        document.getElementById('deal').setAttribute('style', 'display:none;')

        document.getElementById('dealer-cards').innerHTML = ''
        for (var i = 0; i < message.dealerCards.length; i++) {
            var card = message.dealerCards[i]
            var carddiv = document.createElement('div')
            carddiv.setAttribute('style', 'display:inline-block;padding:5px;')
            carddiv.innerHTML = '[' + Util.SHAPES[card.suit] + ' ' + card.rank + ']'
            document.getElementById('dealer-cards').appendChild(carddiv)
        }

        document.getElementById('dealer-total').innerHTML = Util.score(message.dealerCards)
    }

    document.getElementById('hit').parentElement.setAttribute('style', 'display:none;')
    document.getElementById('stand').parentElement.setAttribute('style', 'display:none;')
    document.getElementById('double').parentElement.setAttribute('style', 'display:none;')
    document.getElementById('split').parentElement.setAttribute('style', 'display:none;')
    if (!message.broadcast) {
        document.getElementById('bankroll').innerHTML = message.moneyOnHand
        document.getElementById('player-cards').innerHTML = ''
        for (var i = 0; i < message.targetCards.length; i++) {
            var card = message.targetCards[i]
            var carddiv = document.createElement('div')
            carddiv.setAttribute('style', 'display:inline-block;padding:5px;')
            carddiv.innerHTML = '[' + Util.SHAPES[card.suit] + ' ' + card.rank + ']'
            document.getElementById('player-cards').appendChild(carddiv)
        }

        for (var i = 0; i < message.getActions.length; i++) {
            var action = message.getActions[i]
            if (action == Util.ACTIONS.HIT) {
                document.getElementById('hit').parentElement.setAttribute('style', 'display:block;')
            } else if (action == Util.ACTIONS.STAND) {
                document.getElementById('stand').parentElement.setAttribute('style', 'display:block;')
            } else if (action == Util.ACTIONS.DOUBLE) {
                document.getElementById('double').parentElement.setAttribute('style', 'display:block;')
            } else if (action == Util.ACTIONS.SPLIT) {
                document.getElementById('split').parentElement.setAttribute('style', 'display:block;')
            }
        }
        document.getElementById('player-total').innerHTML = Util.score(message.targetCards)
        document.getElementById('playerstate').innerHTML = message.targetState
    }

    // draw other users
    var others = document.getElementById('other-players')
    others.innerHTML = ''
    for (var k = 0; k < message.otherPlayers.length; k++) {
        var element = message.otherPlayers[k]
        if (element.client_id != self.socket.id) {
            others.innerHTML += 'ID: ' + element.client_id.substr(0, 4) + ' [' + element.state + '] '
                // cards, client_id, state
            for (var key in element.cards) {
                if (element.cards.hasOwnProperty(key)) {
                    var card = element.cards[key]
                    others.innerHTML += '[' + Util.SHAPES[card.suit] + ' ' + card.rank + ']'
                }
            }
            others.innerHTML += '\n'
        }
    }
}
BlackJackOn.prototype.pressAction = function(method) {
    var self = this
    if (!self.socket) return
        /**
         * {
         *  client_id: String 
         *  room_id: String
         *  action: String - > Deal, Drop, Hit, Stand, Double, Split, Surrender, Insurance
         *  bet: Number
         * }
         */
    self.socket.emit('game packet', { client_id: self.socket.id, room_id: self.room_id, action: method, bet: self.betOnThisTurn })
}
BlackJackOn.prototype.pressBet = function(e) {
    var self = this
    var amount = e.target.parentElement.dataset.value

    self.betOnThisTurn = amount
    console.log('bet change: ' + amount)
}
module.exports = BlackJackOn