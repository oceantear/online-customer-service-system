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
            if(obj.SocketId == socket.id){
                console.log('room owner leave!!!');
                delete SocketIdAvaiableArray[i];
            }else if(obj.RoomId == room){
                SocketIdAvaiableArray[i].Avaliable = 1;
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

  socket.on('calleejoin', function(name){
    console.log('calleejoin');
    //var socketIds = socketIdsInRoom(name);
    //callback(socketIds);
    
    socket.join(name);
    socket.room = name;

    var socketIds = io.nsps['/'].adapter.rooms[name];
    var collection = [];
    for (var key in socketIds) {
      console.log('key soceket : ',key);
      collection.push(key);
    }

    //console.log('socketId =',socketId);
    if(socketIds){
      var obj = {
        RoomId : name,
        SocketId : collection[0],
        Avaliable : 1
      };
    }
    console.log('obj.roomId =',obj.RoomId);
    console.log('obj.socketId =',obj.SocketId);
    console.log('obj.avaliable =',obj.Avaliable);
    SocketIdAvaiableArray.push(obj);
    
    for (var i in SocketIdAvaiableArray){
      var obj = SocketIdAvaiableArray[i];
      console.log('obj.roomId =',obj.RoomId);
      console.log('obj.socketId =',obj.SocketId);
      console.log('obj.avaliable =',obj.Avaliable);
    }
    
    //var socketIds = io.nsps['/'].adapter.rooms[name];
    //console.log('socketIds: ', socketIds);
  });


  
  socket.on('callerjoin', function(callback){
    console.log('caller join');
    //var socketIds = socketIdsInRoom(name);
    var socketIds = [];
    for (var i in SocketIdAvaiableArray){
      var obj = SocketIdAvaiableArray[i];
      if(obj.Avaliable == 1){
        socketId = obj.SocketId;
        console.log('socketId =',socketId);
        socketIds.push(socketId);  
        socket.room = obj.RoomId;
        SocketIdAvaiableArray[i].Avaliable = 0;
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
    console.log('exchange: from = ', data.from);
    var to = io.sockets.connected[data.to];
    console.log('exchange: to = ', data.to);
    to.emit('exchange', data);
  });
});
