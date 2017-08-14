var debug = require('debug')('blackjackon:GameObject')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var Util = require('./game_util')
var Player = require('./player')
var Deck = require('./carddeck').Deck

/**
 * BlackJackGame
 * 
 * @event userleave 유저가 방을 나가는 액션을 할 때 호출. socket disconnect할 땐 반대로 roomManager에서 메소드를 호출한다.
 */
inherits(BlackJackGame, EventEmitter)

function BlackJackGame(options) {
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
    self.ChangeGameState = function(state) {
        self.gameState = state
        self.prevTick = Date.now()
        self.makeRespnse()
    }
}
BlackJackGame.prototype.changeDeck = function() {
    var self = this
    if (++self.deckIndex >= self.decks.length) {
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
}
BlackJackGame.prototype.initGame = function() {
    var self = this
    self.changeDeck()
    self.pushClient({ id: Util.DEALER, is_dealer: true })
    self.ChangeGameState(Util.GAMESTATES.READY)

    function gameLoop() {
        var self = this
        if (self.gameState == Util.GAMESTATES.READY) {
            if (1000 * 1 < (Date.now() - self.prevTick)) {
                self.ChangeGameState(Util.GAMESTATES.BETTING)
                    // give it a time to set things up
            }
        } else if (self.gameState == Util.GAMESTATES.BETTING) {
            var isReady = false
            var readyCount = 0
            if (1000 * 5 < (Date.now() - self.prevTick)) isReady = true
                // 플레이어의 배팅이 끝나기를 기다린다. 제한시간 10초를 주고 제한시간 안어 모든 플레이어가 의사결정을 마치면 속행한다.
            for (var key in self.players) {
                if (self.players.hasOwnProperty(key)) {
                    var player = self.players[key]
                    if (player.is_dealer) {
                        if (player.state != Util.PLAYERSTATES.DEAL) { player.doAction(Util.ACTIONS.DEAL) }
                        // Dealer always deals
                        readyCount++
                    } else if (isReady && player.state != Util.PLAYERSTATES.DEAL) {
                        // if player didn't decide after 10 sec, make them drop automaticaly
                        // 제한시간이 종료되면 강제로 드랍한다.
                        player.doAction(Util.ACTIONS.DROP)
                        readyCount++
                    } else if (player.state == Util.PLAYERSTATES.DEAL) {
                        readyCount++
                    }
                }
            }
            if (self.players.length == readyCount) isReady = true
            if (isReady) self.ChangeGameState(Util.GAMESTATES.HITTING)
        } else if (self.gameState == Util.GAMESTATES.HITTING) {
            var isOver = false
            var overCount = 0
            var playerCount = 0
            if (1000 * 60 * 10 < (Date.now() - self.prevTick)) { isOver = true }
            // 각 플레이어의 선택이 끝났는지 확인한다.
            for (var key in self.players) {
                if (self.players.hasOwnProperty(key)) {
                    var player = self.players[key]
                    playerCount++
                    if (player.cards.length == 0) {
                        player.pushCard(self.decks[self.deckIndex].nextCard())
                        player.pushCard(self.decks[self.deckIndex].nextCard())
                        if (!player.is_dealer) { self.makeRespnse(player) }
                    }
                    // 선택이 끝나는 경우 - dealer blackjack or bust or stand, player blackjack or bust or stand
                    if (player.is_dealer) {
                        if (player.state == Util.PLAYERSTATES.BLACKJACK) {
                            overCount++
                        } else if (player.state == Util.PLAYERSTATES.BUST) {
                            overCount++
                        } else if (player.state == Util.PLAYERSTATES.STAND) {
                            overCount++
                        }
                        if (overCount == 0) {
                            if (player.getScore() > 17) {
                                player.pushCard(self.decks[self.deckIndex].nextCard())
                                player.doAction(Util.ACTIONS.HIT)
                            } else {
                                player.doAction(Util.ACTIONS.STAND)
                            }
                        }
                    } else {
                        if (player.state == Util.PLAYERSTATES.DROP) {
                            overCount++
                        } else if (player.state == Util.PLAYERSTATES.BUST) {
                            overCount++
                        } else if (player.state == Util.PLAYERSTATES.STAND) {
                            overCount++
                        } else if (player.state == Util.PLAYERSTATES.BLACKJACK) {
                            overCount++
                        }
                    }
                    // 선택이 계속되는 경우 - hit, double, split
                }
            }
            debug('over count: ' + overCount + ' / ' + playerCount)
                // 모든 플레이어의 선택이 종료되면 Win, Lose, Tie를 판정한다.
            if (playerCount == overCount) isOver = true
            if (isOver) {
                self.ChangeGameState(Util.GAMESTATES.PROCESSING)
                for (var key in self.players) {
                    if (self.players.hasOwnProperty(key)) {
                        var player = self.players[key]
                        player.emptyCards()
                    }
                }
            }
        } else if (self.gameState == Util.GAMESTATES.PROCESSING) {
            if (1000 * 1 < (Date.now() - self.prevTick)) {
                // 다음 판을 기다리는 시간을 준다.
                self.ChangeGameState(Util.GAMESTATES.BETTING)
            }
        }
    }

    if (self.gameInterval) clearInterval(self.gameInterval)
    self.gameInterval = setInterval(gameLoop.bind(self), 1000 * 0.5)
}

BlackJackGame.prototype.pushClient = function(options) {
    var self = this
    var player = new Player(options)
    self.players[options.id || Util.DEALER] = player
    if (!options.is_dealer) { self.makeRespnse() }
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
BlackJackGame.prototype.clientEventHandler = function(message) {
    var self = this
    var player = self.players[message.client_id]
        // client id -> action
    if (self.gameState == Util.GAMESTATES.BETTING) {
        if (message.action == Util.ACTIONS.DEAL) {
            player.betOnTurn = message.bet
            player.doAction(message.action)
            self.makeRespnse(player)
        }
    } else if (self.gameState == Util.GAMESTATES.HITTING) {
        if (message.action == Util.ACTIONS.HIT || message.action == Util.ACTIONS.DOUBLE || message.action == Util.ACTIONS.STAND || message.action == Util.ACTIONS.SPLIT) {
            player.doAction(message.action)
            if (message.action == Util.ACTIONS.HIT || message.action == Util.ACTIONS.DOUBLE) {
                player.pushCard(self.decks[self.deckIndex].nextCard())
                if (message.action == Util.ACTIONS.DOUBLE) {
                    if (player.moneyOnHand >= player.betOnTurn * 2) { player.betOnTurn = player.betOnTurn * 2 }
                }
            }
            self.makeRespnse(player)
        }
    } else {
        debug('ignore client action: ' + JSON.stringify(message))
    }
}
BlackJackGame.prototype.makeRespnse = function(target) {
    var self = this
    var broadcast = false
    if (!target) {
        target = self.players[Util.DEALER]
        broadcast = true
    }

    var otherPlayers = []
    for (var key in self.players) {
        if (self.players.hasOwnProperty(key)) {
            var player = self.players[key]
            if (!player.is_dealer && player.id != target.id) {
                otherPlayers.push({
                    cards: player.cards,
                    client_id: player.id,
                    state: player.state
                })
            }
        }
    }

    self.emit('response', {
        client_id: target.id,
        room_id: self.room_id,
        broadcast: broadcast,
        gameState: self.gameState,
        dealerCards: self.players[Util.DEALER].cards,
        targetCards: target.cards,
        targetState: target.state,
        moneyOnHand: target.moneyOnHand,
        getActions: (self.gameState == Util.GAMESTATES.HITTING && !target.is_dealer && target.state != Util.PLAYERSTATES.DROP) ? target.getActions() : [],
        otherPlayers: otherPlayers
    })
}

BlackJackGame.prototype.updateDisconectedUser = function(client_id) {}

module.exports = BlackJackGame