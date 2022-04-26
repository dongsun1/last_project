const http = require("http");
const SocketIO = require("socket.io");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { SocketAddress } = require("net");
const app = express();
const port = 3000;

const requestMiddleware = (req, res, next) => {
  console.log(
    "[Ip address]:",
    req.ip,
    "[method]:",
    req.method,
    "Request URL:",
    req.originalUrl,
    " - ",
    new Date()
  );
  next();
};

// 각종 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(requestMiddleware);
app.use(express.urlencoded({ extended: false }));

const httpServer = http.createServer(app);
const io = SocketIO(httpServer, { cors: { origin: "*" } });

let rooms = [];

io.on("connection", (socket) => {
  console.log("connection: ", socket.id);

  socket.on("main", (id) => {
    console.log(`아이디 받아오기: ${id}`);
    socket.userId = id;
  });

  socket.on("roomList", () => {
    console.log("roomList");
    io.emit("roomList", rooms);
  });

  socket.on("msg", (msg) => {
    console.log(`msg: ${msg}, id: ${socket.userId}`);
    io.to(socket.roomId).emit("msg", { msg, id: socket.userId });
  });

  socket.on("joinRoom", (roomSocketId) => {
    console.log(`${socket.userId}님이 ${roomSocketId}에 입장하셨습니다.`);
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].socketId === roomSocketId) {
        socket.join(rooms[i].socketId);
        socket.roomId = rooms[i].socketId;
        break;
      }
    }
  });

  socket.on("createRoom", (roomTitle, roomPeople, password) => {
    const socketId = socket.id;
    const room = {
      socketId,
      userId: socket.userId,
      roomTitle,
      roomPeople,
      password,
    };
    rooms.push(room);
    console.log(
      `방 만들기: ${room.socketId}, ${room.userId}, ${room.roomTitle}, ${room.roomPeople}, ${room.password}`
    );
    socket.emit("roomData", room);
  });

  socket.on("disconnect", function () {
    console.log("disconnect: ", socket.id);
  });
});

// 서버 열기
httpServer.listen(port, () => {
  console.log(port, "포트로 서버가 켜졌어요!");
});
