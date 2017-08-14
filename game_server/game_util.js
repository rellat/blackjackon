var debug = require('debug')('blackjackon:GameUtil')

module.exports = {
    SUITS: { HEART: 0, DIAMOND: 1, SPADE: 2, CLUB: 3 },
    SHAPES: ['♥', '♦', '♠', '♣'],
    RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    ACTIONS: {
        DEAL: 'Deal',
        DROP: 'Drop',
        HIT: 'Hit',
        STAND: 'Stand',
        DOUBLE: 'Double',
        SPLIT: 'Split', // TODO: 구현 안됨
        SURRENDER: 'Surrender', // TODO: 구현 안됨
        INSURANCE: 'Insurance' // TODO: 구현 안됨
    },
    GAMESTATES: { INIT: 'init', BETTING: 'bet', HITTING: 'hit', PROCESSING: 'process' },
    PLAYERSTATES: { DEAL: 'deal', DROP: 'drop', BLACKJACK: 'blackjack', BUST: 'bust', STAND: 'stand' },
    DEALER: 'Dealer',
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
            if (!cards[i]) {
                throw 'card is null: ' + i
            }
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