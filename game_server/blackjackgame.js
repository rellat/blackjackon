var debug = require('debug')('blackjackon:GameObject')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var Util = {
    SUITS: { HEART: 0, DIAMOND: 1, SPADE: 2, CLUB: 3 },
    SHAPES: ['♥', '♦', '♠', '♣'],
    RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    ACTIONS: {
        HIT: 'Hit',
        BUST: 'Bust',
        STAND: 'Stand',
        SPLIT: 'Split',
        DOUBLE: 'Double',
        SURRENDER: 'Surrender'
    },
    /**
     * Calculates the score total of a blackjack hand.
     * An ace is treated as 11 until the score is above 
     * 21 then it is used as a 1 instead. Returns an
     * integer value of the score of the hand.
     *
     * @param {Array} cards
     * @return {Integer} sum
     */
    score: function(cards) {
        var sum = 0

        // A flag to determine whether the hand has an ace
        var ace

        for (var i = 0, value; i < cards.length; i += 1) {
            if (cards[i].rank === 'J' || cards[i].rank === 'Q' || cards[i].rank === 'K') {
                value = 10
            } else if (cards[i].rank === 'A') {
                value = 1
                ace = true
            } else {
                value = parseInt(cards[i].rank, 10)
            }

            sum += value
        }

        // Treat the ace as an 11 if the hand will not bust
        if (ace && sum < 12) {
            sum += 10
        }

        return sum
    }
}

/**
 * Card
 * @param suit number 0~3, Util.SUITS.HEART = 0 ...
 * @param rank number 1~13
 */
function Card(suit, rank) {
    var self = this
    if (!(self instanceof Card)) return new Card()
    if (arguments.length < 2) return debug('cant create a card')

    self.suit = suit
    self.rank = rank
}
Card.prototype.getNumber = function() {
    return this.rank
}
Card.prototype.getName = function() {
    var self = this
    return { suit: Util.SHAPES[self.suit], rank: Util.RANKS[self.rank - 1] }
}

/**
 * Deck
 */
function Deck() {
    var self = this
    if (!(self instanceof Deck)) return new Deck()

    self.deck = new Array(52)
    var c = 0
        // i는 카드 모양, j는 카드의 값을 의미한다. 52개의 카드를 덱에 세팅한다.
    for (var i = 0; i < 4; i++) {
        for (var j = 1; i <= 13; i++) {
            self.deck[c++] = new Card(i, j)
        }
    }
    self.count = c
}
// 섞는 방법을 더 어렵게 해 볼수도 있겠다.
Deck.prototype.shuffle = function() {
    for (var i = 51; i > 0; i--) {
        var randomVal = Math.floor((i + 1) * Math.random(i))
        var temp = this.deck[i]
        this.deck[i] = this.deck[randomVal]
        this.deck[randomVal] = temp
    }

    this.count = 52
}

Deck.prototype.nextCard = function() {
    if (this.count === 0) throw 'this deck is out of card'
    return this.deck[--this.count]
}

/**
 * Player
 * @param {*} options {id, is_dealer, }
 */
function Player(options) {
    var self = this
    if (!(self instanceof Player)) return new Player(options)

    self.id = options.id
    self.is_dealer = options.is_dealer || false
    self.cards = []
    self.actions = []
    self.history = []
}
Player.prototype.getCards = function(params) {
    return this.cards
}

/** Can a player split their dealt cards.
 * @return {Boolean}
 */
Player.prototype.canSplit = function() {
    // The dealer can never split their cards
    if (this.prototype instanceof Player) {
        return false
    }

    var cards = this.cards
    if (cards.length === 2 && cards[0].rank === cards[1].rank) {
        return true
    }

    return false
}

/** Can a player double down their hand.
 * @return {Boolean}
 */
Player.prototype.canDouble = function() {
    // The dealer can never double down
    if (this.prototype instanceof Player) {
        return false
    }

    // A double down is only allowed on the first play or after a split
    if (this.history.length === 0 || this.history[this.history.length - 1] === SPLIT) {
        return true
    }

    return false
}

/** Get a list of possible actions for the player.
 * @return {Array}
 */
Player.prototype.getActions = function() {
    var total = Util.score(this.cards)
    this.actions = []

    if (total < 21) {
        this.actions.push(Util.ACTIONS.HIT)
        this.actions.push(Util.ACTIONS.STAND)
    }

    if (this.canDouble.call(this)) {
        this.actions.push(Util.ACTIONS.DOUBLE)
    }

    if (this.canSplit.call(this)) {
        this.actions.push(Util.ACTIONS.SPLIT)
    }

    return this.actions
}

/**
 * BlackJackGame
 * 
 * @event userleave 유저가 방을 나가는 액션을 할 때 호출. socket disconnect할 땐 반대로 roomManager에서 메소드를 호출한다.
 */
inherits(BlackJackGame, EventEmitter)

function BlackJackGame() {
    var self = this
    if (!(self instanceof BlackJackGame)) return new BlackJackGame()

    // 루프를 돌리면서 딜러는 유저가 딜 혹은 패스를 선택하길 기다린다.
    // 시퀀셜 진행
}
BlackJackGame.prototype.getgame = function() {
    //
}

module.exports = BlackJackGame