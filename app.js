const fs = require("fs");
const http = require("http");
const https = require("https");
const SocketIO = require("socket.io");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app_low = express();
const app = express();
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

const Room = require("./schemas/room");

const webRTC = require("./routers/webRTC");

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
app_low.use((req, res, next) => {
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
app.use(cookieParser());
app.use(requestMiddleware);
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    saveUninitialized: true,
    resave: false,
    secret: "MY_SECRET",
  })
);
app.use("/", webRTC);

app.get(
  "/.well-known/pki-validation/8175506BEAA40D3B37C6C000D41DAA4A.txt",
  (req, res) => {
    res.sendFile(
      __dirname +
        "/.well-known/pki-validation/8175506BEAA40D3B37C6C000D41DAA4A.txt"
    );
  }
);

const httpServer = http.createServer(app_low);
const httpsServer = https.createServer(credentials, app);
const io = SocketIO(httpsServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("connection: ", socket.id);

  socket.on("main", (id) => {
    console.log(`아이디 받아오기: ${id}`);
    socket.userId = id;
  });

  socket.on("roomList", () => {
    console.log("roomList");
    const rooms = Room.find({});
    io.emit("roomList", rooms);
  });

  socket.on("msg", (msg) => {
    console.log(`msg: ${msg}, id: ${socket.userId}`);
    io.to(socket.roomId).emit("msg", { msg, id: socket.userId });
  });

  socket.on("createRoom", (data) => {
    const { roomTitle, roomPeople, roomPwd } = data;
    const socketId = socket.id;

    const room = Room.create({
      socketId,
      userId: socket.userId,
      roomTitle,
      roomPeople,
      password: roomPwd,
    });
    console.log(
      `방 만들기: ${socketId}, ${socket.userId}, ${roomTitle}, ${roomPeople}, ${roomPwd}`
    );
    socket.emit("roomData", room);
  });

  socket.on("joinRoom", (socketId) => {
    console.log(`${socket.userId}님이 ${socketId}에 입장하셨습니다.`);

    let room = Room.find({ socketId });
    console.log(room.socketId);

    socket.join(room.socketId);

    socket.roomId = room.socketId;
    Room.updateOne(
      { socketId },
      {
        $push: {
          currentPeople: socket.userId,
          currentPeopleSocketId: socket.id,
        },
      }
    );

    room = Room.find({ socketId });

    io.to(socket.roomId).emit(
      "joinRoomMsg",
      socket.userId,
      room.currentPeopleSocketId,
      room.currentPeople
    );

    // for (let i = 0; i < rooms.length; i++) {
    //   if (rooms[i].socketId === roomSocketId) {
    //     socket.join(rooms[i].socketId);
    //     socket.roomId = rooms[i].socketId;
    //     // 현재 인원 +1
    //     rooms[i].currentPeople.push(socket.userId);
    //     rooms[i].currentPeopleSocketId.push(socket.id);
    //     console.log(`현재 인원 수 ${rooms[i].currentPeople.length}`);
    //     // 입장 문구
    //     io.to(socket.roomId).emit(
    //       "joinRoomMsg",
    //       socket.userId,
    //       rooms[i].currentPeopleSocketId,
    //       rooms[i].currentPeople
    //     );
    //     break;
    //   }
    // }
  });

  socket.on("leaveRoom", () => {
    console.log(`${socket.userId}님이 ${socket.roomId}에서 퇴장하셨습니다.`);

    const socketId = socket.roomId;

    let room = Room.find({ socketId });

    Room.updateOne(
      { socketId },
      {
        $pull: {
          currentPeople: socket.userId,
          currentPeopleSocketId: socket.id,
        },
      }
    );

    room = Room.find({ socketId });

    io.to(socket.roomId).emit(
      "leaveRoomMsg",
      socket.userId,
      room.currentPeople
    );

    socket.leave(room.socketId);
    socket.roomId = "";

    // for (let i = 0; i < rooms.length; i++) {
    //   if (rooms[i].socketId === socket.roomId) {
    //     // 현재 인원 -1
    //     for (let j = 0; j < rooms[i].currentPeople.length; j++) {
    //       if (rooms[i].currentPeople[j] === socket.userId) {
    //         rooms[i].currentPeople.splice(j, 1);
    //         rooms[i].currentPeopleSocketId.splice(j, 1);
    //         break;
    //       }
    //     }
    //     console.log(`현재 인원 수 ${rooms[i].currentPeople.length}`);
    //     // 현재 인원이 0이라면 방 삭제
    //     if (rooms[i].currentPeople.length === 0) {
    //       rooms.splice(i, 1);
    //       // 퇴장 문구
    //       io.to(socket.roomId).emit("leaveRoomMsg", socket.userId);
    //     } else {
    //       // 퇴장 문구
    //       io.to(socket.roomId).emit(
    //         "leaveRoomMsg",
    //         socket.userId,
    //         rooms[i].currentPeople
    //       );
    //     }

    //     break;
    //   }
    // }
    // socket.leave(socket.roomId);
    // socket.roomId = "";
  });

  socket.on("timer", (counter) => {
    const countdown = setInterval(() => {
      const min = parseInt(counter / 60);
      const sec = counter % 60;
      io.to(socket.roomId).emit("timer", { min, sec });
      counter--;
      if (counter < 0) {
        clearInterval(countdown);
      }
    }, 1000);
  });

  socket.on("startGame", () => {
    console.log(`${socket.roomId} 게임이 시작되었습니다.`);

    const socketId = socket.roomId;

    Room.updateOne({ socketId }, { $set: { start: true } });

    io.to(socket.roomId).emit("startGame", {
      msg: "게임이 시작되었습니다.",
    });

    // for (let i = 0; i < rooms.length; i++) {
    //   if (rooms[i].socketId === socket.roomId) {
    //     rooms[i].start = true;
    //     io.to(socket.roomId).emit("startGame", {
    //       msg: "게임이 시작되었습니다.",
    //     });
    //     break;
    //   }
    // }
  });

  socket.on("endGame", () => {
    console.log(`${socket.roomId} 게임이 종료되었습니다.`);

    const socketId = socket.roomId;

    Room.updateOne({ socketId }, { $set: { start: false } });

    io.to(socket.roomId).emit("endGame", {
      msg: "게임이 종료되었습니다.",
    });

    // for (let i = 0; i < rooms.length; i++) {
    //   if (rooms[i].socketId === socket.roomId) {
    //     rooms[i].start = false;
    //     break;
    //   }
    // }
  });

  socket.on("getJob", (userArr) => {
    // 각 user 직업 부여
    const job = [];
    // 1:citizen, 2:doctor, 3:police, 4:mafia
    switch (userArr.length) {
      case 4:
        job.push(1, 1, 1, 4);
        break;
      case 5:
        job.push(1, 1, 1, 2, 4);
        break;
      case 6:
        job.push(1, 1, 2, 3, 4, 4);
        break;
    }

    // job random 부여
    const jobArr = job.sort(() => Math.random() - 0.5);
    // console.log('jobArr->', jobArr);
    const playerJob = [];
    for (var i = 0; i < jobArr.length; i++) {
      if (jobArr[i] == 1) {
        playerJob.push("citizen");
      } else if (jobArr[i] == 2) {
        playerJob.push("doctor");
      } else if (jobArr[i] == 3) {
        playerJob.push("police");
      } else if (jobArr[i] == 4) {
        playerJob.push("mafia");
      }
    }
    // console.log('1.playerJob->', playerJob)

    for (var i = 0; i < userArr.length; i++) {
      // console.log('arr', userArr[i])
      // userArr[i]["job"] = playerJob[i];
      // userArr[i]["userLife"] = "save";
      console.log(`직업 부여 ${userArr[i]}: ${playerJob[i]}`);
      io.to(userArr[i]).emit("getJob", playerJob[i]);
    }
  });

  socket.on("vote", (data) => {
    console.log("vote", JSON.stringify(data));
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].socketId === socket.roomId) {
        rooms[i].voteList.push(data);
        break;
      }
    }
  });

  socket.on("voteList", () => {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].socketId === socket.roomId) {
        console.log("voteList", rooms[i].voteList);
        rooms[i].night ? (rooms[i].night = false) : (rooms[i].night = true);
        io.to(socket.roomId).emit("voteList", rooms[i].voteList);
        io.to(socket.roomId).emit("night", rooms[i].night);
        rooms[i].voteList = [];
        break;
      }
    }
  });
});

// 서버 열기
httpServer.listen(httpPort, () => {
  console.log(httpPort, "포트로 서버가 켜졌어요!");
});

httpsServer.listen(httpsPort, () => {
  console.log(httpsPort, "포트로 서버가 켜졌어요!");
});
