var express = require('express');
var app = express();
var fs = require('fs');
var open = require('open');
var options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
var serverPort = (process.env.PORT  || 4443);
var https = require('https');
var http = require('http');
var server;
var avaliable;
var SocketIdAvaiableArray = [];
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require('socket.io')(server);

var roomList = {};

app.get('/callee', function(req, res){
  console.log('get /callee');
  res.sendFile(__dirname + '/callee.html');
});

app.get('/caller', function(req, res){
  console.log('get /caller');
  res.sendFile(__dirname + '/caller.html');
});

server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});

function socketIdsInRoom(name) {
  var socketIds = io.nsps['/'].adapter.rooms[name];
  if (socketIds) {
    console.log('socketIds not null');
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    console.log('socketIds is null');
    return [];
  }
}

io.on('connection', function(socket){
  console.log('connection');
    
  socket.on('disconnect', function(){
    console.log('disconnect:() socket.id = ',socket.id);
    console.log('disconnect:() socket.room = ',socket.room);
    if (socket.room) {
        var room = socket.room;
        console.log('disconnect:() room =' ,room);
        io.to(room).emit('leave', socket.id);
        socket.leave(room);
        
        for (var i in SocketIdAvaiableArray){
            var obj = SocketIdAvaiableArray[i];
            if(obj.RoomOwnerSocketId == socket.id){
                console.log('room owner leave!!!:  obj.CallerSocketId = ',obj.CallerSocketId);
                var to = io.sockets.connected[obj.CallerSocketId];
                console.log('disconnect: to = ', obj.CallerSocketId);
                if(obj.CallerSocketId){
                    to.emit('leave', obj.CallerSocketId);
                    
                }
                //delete SocketIdAvaiableArray[i];
                SocketIdAvaiableArray.splice(i,1);
                break;
            }else if(obj.RoomId == room){
                SocketIdAvaiableArray[i].Avaliable = 1;
                SocketIdAvaiableArray[i].CallerSocketId = null;
                break;
            }
        }
    }
  });
    
    /*socket.on('join', function(name, callback){
        console.log('join', name);
        var socketIds = socketIdsInRoom(name);
        callback(socketIds);
        socket.join(name);
        socket.room = name;
    });*/
    
  function checkRoomIdDuplicated(name){
      for (var i in SocketIdAvaiableArray){
          var obj = SocketIdAvaiableArray[i];
          console.log('obj.roomId =',obj.RoomId);
          if (name.toString().trim() === obj.RoomId.toString().trim()) 
            return true;
    }
      return false;
  }

  socket.on('calleejoin', function(name){
    console.log('====calleejoin====');
    //var socketIds = socketIdsInRoom(name);
    //callback(socketIds);
    
    var duplecated  = checkRoomIdDuplicated(name);
    
    if(!duplecated){
        socket.join(name);
        socket.room = name;

        var socketIds = io.nsps['/'].adapter.rooms[name];
        var collection = [];
        for (var key in socketIds) {
          console.log('key soceket : ',key);
          collection.push(key);
        }

        if(socketIds){
            console.log('new obj for stroe connectiong info!!');
          var obj = {
            RoomId : name,
            RoomOwnerSocketId : collection[0],
            Avaliable : 1,
            CallerSocketId : null
          };
        }
        console.log('obj.roomId =',obj.RoomId);
        console.log('obj.socketId =',obj.RoomOwnerSocketId);
        console.log('obj.avaliable =',obj.Avaliable);
        SocketIdAvaiableArray.push(obj);
        console.log('SocketIdAvaiableArray size = ',SocketIdAvaiableArray.length);
        for (var i in SocketIdAvaiableArray){
          var obj = SocketIdAvaiableArray[i];
          console.log('obj.roomId =',obj.RoomId);
          console.log('obj.socketId =',obj.RoomOwnerSocketId);
          console.log('obj.avaliable =',obj.Avaliable);
        }
    }else{
        console.log('room is duplecated!!!!!');
        var to = io.sockets.connected[socket.id];
        console.log('alert duplicated room id to socket.id = ', socket.id);
        if(socket.id)
            to.emit('duplicatedRoomId', socket.id);
    }
    //var socketIds = io.nsps['/'].adapter.rooms[name];
    //console.log('socketIds: ', socketIds);
  });


  
  socket.on('callerjoin', function(callback){
    console.log('caller join');
    //var socketIds = socketIdsInRoom(name);
    var socketIds = [];
    console.log('SocketIdAvaiableArray size = ',SocketIdAvaiableArray.length);
    for (var i in SocketIdAvaiableArray){
      var obj = SocketIdAvaiableArray[i];
        console.log('obj.RoomId = ',obj.RoomId);
        console.log('obj.RoomOwnerSocketId = ',obj.RoomId);
        console.log('obj.Avaliable = ',obj.Avaliable);
        console.log('obj.CallerSocketId = ',obj.CallerSocketId);
      if(obj.Avaliable == 1){
        socketId = obj.RoomOwnerSocketId;
        SocketIdAvaiableArray[i].CallerSocketId = socket.id;
        console.log('socketId =',socketId);
        socketIds.push(socketId);  
        socket.room = obj.RoomId;
        SocketIdAvaiableArray[i].Avaliable = 0;
        break;
      }
    }
    callback(socketIds);
    
    //socket.join(name);
    //socket.room = name;
    //var socketIds = io.nsps['/'].adapter.rooms[name];
    //console.log('socketIds: ', socketIds);
  });




  socket.on('exchange', function(data){
    console.log('exchange', data);
    data.from = socket.id;
    console.log('exchange: to = ', data.to);
    console.log('exchange: from = ', data.from);
    var to = io.sockets.connected[data.to];
    console.log('exchange: to = ', data.to);
    to.emit('exchange', data);
  });
});
