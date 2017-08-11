var Game = require('./blackjackgame')
var MAX_CLIENT = 7

function RoomManager(socketio) {
    var self = this

    self.gameRooms = {}
    self.io = socketio
}

RoomManager.prototype.requestGameRoom = function(socket) {
    var self = this

    // 순차적으로 빈 방이 있는지 확인, MAX_CLIENT 확인
    for (var key in self.gameRooms) {
        if (self.gameRooms.hasOwnProperty(key)) {
            var gameroom = self.gameRooms[key]

            if (gameroom.clietns.length > MAX_CLIENT) continue

            socket.join(key)
            gameroom.pushClient(socket.id)
            return
        }
    }

    // 여기까지 도달하면 준비된 방이 없는 것이다. 새로 만든다.
    self.createGameRoom(socket)
}

RoomManager.prototype.createGameRoom = function(socket) {
    var self = this

    var gameroom = new Game()
    gameroom.pushClient(socket.id)
    socket.join(gameroom.room_id)
    gameroom.on('userleave', self.leaveGameRoom.bind(self))

    self.gameRooms[gameroom.room_id] = gameroom
}
RoomManager.prototype.leaveGameRoom = function(message) {
    var self = this

    if (message.room_is_empty) delete self.gameRooms[message.room_id]
}
module.exports = RoomManager