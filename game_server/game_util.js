module.exports = {
  SUITS: {HEART: 3, DIAMOND: 2, SPADE: 0, CLUB: 1},
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
  GAMESTATES: {INIT: 'init', BETTING: 'bet', HITTING: 'hit', PROCESSING: 'process'},
  PLAYERSTATES: {
    DEAL: 'deal',
    DROP: 'drop',
    BLACKJACK: 'blackjack',
    BUST: 'bust',
    STAND: 'stand',
    WIN: 'win',
    LOSE: 'lose',
    TIE: 'tie'
  },
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
  score: function (cards) {
    var sum = 0

    // A flag to determine whether the hand has an ace
    var ace = false

    for (var i = 0, value; i < cards.length; i++) {
      if (!cards[i]) {
        // throw 'card is null: ' + i
        debug('card is null: ' + i)
      }

      value = cards[i].rank

      if (value >= 10) value = 10
      else if (value === 1) ace = true

      sum += value
    }

    // Treat the ace as an 11 if the hand will not bust
    if (ace && sum < 12) sum += 10

    return sum
  },
  isNumber (s) {
    s += '' // 문자열로 변환
    s = s.replace(/^\s*|\s*$/g, '') // 좌우 공백 제거
    if (s === '' || isNaN(s)) return false
    return true
  },
  cardContainerXY: [
    [110, 280],
    [300, 360],
    [480, 400],
    [700, 360],
    [890, 280]
  ],
  otherCardContainerXY: [
    [110, 280],
    [300, 360],
    [700, 360],
    [890, 280]
  ],
  messageViewXY: [350, 180],
  betMoneyView: {
    frame: {x: 10, y: 10},
    text: {x: 110, y: 50},
    inner: 'BET : $'
  },
  balMoneyView: {
    frame: {x: 790, y: 10},
    text: {x: 890, y: 50},
    inner: 'BAL : $'
  },
  playerStateView: {
    frame: {x: 410, y: 10},
    text: {x: 510, y: 50},
    inner: 'Ready'
  },
}