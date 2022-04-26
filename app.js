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

let rooms = ["room 1", "room 2"];

io.on("connection", (socket) => {
  console.log("connection: ", socket.id);

  io.emit("roomList", rooms);

  socket.on("msg", (msg, id) => {
    console.log(`msg: ${msg}, id: ${id}`);
    socket.userId = id;
    io.to(rooms[socket.roomNum]).emit("msg", { msg, id });
  });

  socket.on("joinRoom", (roomNum) => {
    socket.join(rooms[roomNum]);
    socket.roomNum = roomNum;
  });

  socket.on("createRoom", (room) => {
    rooms.push(room);
  });

  socket.on("disconnect", function () {
    console.log("disconnect: ", socket.id);
  });
});

// 서버 열기
httpServer.listen(port, () => {
  console.log(port, "포트로 서버가 켜졌어요!");
});
