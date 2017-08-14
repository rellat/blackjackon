var SocketIO = require('socket.io-client')
var Util = require('../game_server/game_util')

function BlackJackOn() {
    var self = this
    if (!(self instanceof BlackJackOn)) return new BlackJackOn()

    self.currentChoice = Util.PLAYERSTATES.DROP
        // self.betRange = 10
    self.totalMoney = 0
    self.betOnThisTurn = 0
    self.room_id = ''
    self.gameState = Util.GAMESTATES.INIT

    document.getElementById('bankroll').innerHTML = self.totalMoney

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
    } else if (self.gameState == Util.GAMESTATES.HITTING) {
        document.getElementById('actions').setAttribute('style', 'display:block;')
        document.getElementById('deal').setAttribute('style', 'display:none;')
    }

    if (!message.broadcast) {
        document.getElementById('hit').parentElement.setAttribute('style', 'display:none;')
        document.getElementById('stand').parentElement.setAttribute('style', 'display:none;')
        document.getElementById('double').parentElement.setAttribute('style', 'display:none;')
        document.getElementById('split').parentElement.setAttribute('style', 'display:none;')
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
        document.getElementById('dealer-total').innerHTML = Util.score(message.dealerCards)
        document.getElementById('playerstate').innerHTML = message.targetState
    }
    // prev_coin.className = prev_coin.className.replace(' hide', '')
    // prev_coin.className = prev_coin.className.replace(' head', '')
    // prev_coin.className = prev_coin.className.replace(' tail', '')
    // prev_coin.className += ' ' + message.coin_result
    // document.getElementById('game_message').innerText = 'You ' + (message.game_result ? 'won!' : 'lose!')
    // setTimeout(function() {
    //     prev_coin.className = prev_coin.className.replace(' head', '')
    //     prev_coin.className = prev_coin.className.replace(' tail', '')
    //     prev_coin.className += ' hide'
    //     document.getElementById('game_message').innerText = ''
    // }, 1000)

    // document.getElementById('game_money').innerHTML = self.totalMoney

    // self.user_bet()

    // if (self.totalMoney < 10) {
    //     var loanButton = document.getElementById('loan_button')
    //     loanButton.className = loanButton.className.replace(' hide', '')
    // }
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

module.exports = BlackJackOn