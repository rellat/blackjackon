var dict = []

dict['buttons'] =
  '<button type="button" class="gameButton" id = "Deal">DEAL</button>'+
  '<button type="button" class="gameButton" id = "Hit" style="display: none">HIT</button>'+
  '<button type="button" class="gameButton" id = "Stand" style="display: none">STAND</button>'+
  '<button type="button" class="gameButton" id = "Split" style="display: none">SPLIT</button>'+
  '<button type="button" class="gameButton" id = "Double" style="display: none">DOUBLE DOWN</button>'

dict['chips'] =
  '<div class="pokerchip"> <div>10</div></div>' +
  '<div class="pokerchip red"><div>25</div></div>' +
  '<div class="pokerchip blue"><div>50</div></div>'

module.exports = dict