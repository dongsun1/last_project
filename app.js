const fs = require("fs");
const http = require("http");
const https = require("https");
const SocketIO = require("socket.io");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const appH = express();
const httpPort = 80;
const httpsPort = 443;

const privateKey = fs.readFileSync(__dirname + "/private.key", "utf8");
const certificate = fs.readFileSync(__dirname + "/certificate.crt", "utf8");
const ca = fs.readFileSync(__dirname + "/ca_bundle.crt", "utf8");
const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

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
app.use((req, res, next) => {
  if (req.secure) {
    next();
  } else {
    const to = `https://${req.hostname}:${httpsPort}${req.url}`;
    console.log(to);
    res.redirect(to);
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(requestMiddleware);
app.use(express.urlencoded({ extended: false }));

app.get(
  "/.well-known/pki-validation/C30850814E6E08C0AEFA95972F1708D6.txt",
  (req, res) => {
    res.sendFile(
      __dirname +
        "/.well-known/pki-validation/C30850814E6E08C0AEFA95972F1708D6.txt"
    );
  }
);

app.get("/", (req, res) => {
  res.send("http");
});

appH.get("/", (req, res) => {
  res.send("https");
});

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, appH);
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
        // 현재 인원 +1
        rooms[i].currentPeople += 1;
        console.log(`현재 인원 수 ${rooms[i].currentPeople}`);
        // 입장 문구
        io.to(socket.roomId).emit("joinRoomMsg", {
          msg: `${socket.userId}님이 입장하셨습니다.`,
        });
        break;
      }
    }
  });

  socket.on("leaveRoom", () => {
    console.log(`${socket.userId}님이 ${socket.roomId}에서 퇴장하셨습니다.`);

    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].socketId === socket.roomId) {
        // 현재 인원 -1
        rooms[i].currentPeople -= 1;
        console.log(`현재 인원 수 ${rooms[i].currentPeople}`);
        // 현재 인원이 0이라면 방 삭제
        if (rooms[i].currentPeople === 0) {
          rooms.splice(i, 1);
        }
        // 퇴장 문구
        io.to(socket.roomId).emit("leaveRoomMsg", {
          msg: `${socket.userId}님이 퇴장하셨습니다.`,
        });
        break;
      }
    }
    socket.leave(socket.roomId);
    socket.roomId = "";
  });

  socket.on("createRoom", (roomTitle, roomPeople, password) => {
    const socketId = socket.id;
    const room = {
      socketId,
      userId: socket.userId,
      roomTitle,
      roomPeople,
      password,
      currentPeople: 0,
    };
    rooms.push(room);
    console.log(
      `방 만들기: ${room.socketId}, ${room.userId}, ${room.roomTitle}, ${room.roomPeople}, ${room.password}`
    );
    socket.emit("roomData", room);
  });

  socket.on("callUser", (data) => {
    io.to(socket.roomId).emit("hey", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("acceptCall", (data) => {
    io.to(socket.roomId).emit("callAccepted", data.signal);
  });

  socket.on("disconnect", () => {
    console.log("disconnect: ", socket.id);
  });
});

// 서버 열기
httpServer.listen(httpPort, () => {
  console.log(httpPort, "포트로 서버가 켜졌어요!");
});

httpsServer.listen(httpsPort, () => {
  console.log(httpsPort, "포트로 서버가 켜졌어요!");
});
