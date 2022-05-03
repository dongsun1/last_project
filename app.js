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

const connect = require("./schemas");
const Room = require("./schemas/room");
const Vote = require("./schemas/vote");
const Game = require("./schemas/game");

connect();

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

  socket.on("roomList", async () => {
    console.log("roomList");
    const rooms = await Room.find({});
    io.emit("roomList", rooms);
  });

  socket.on("msg", (msg) => {
    console.log(`msg: ${msg}, id: ${socket.userId}`);
    io.to(socket.roomId).emit("msg", { msg, id: socket.userId });
  });

  socket.on("createRoom", async (data) => {
    const { roomTitle, roomPeople, roomPwd } = data;

    const maxNumber = await Room.findOne().sort("-roomId");

    let number = 1;
    if (maxNumber) {
      number = maxNumber.roomId + 1;
    }

    const room = await Room.create({
      roomId: number,
      userId: socket.userId,
      roomTitle,
      roomPeople,
      password: roomPwd,
    });

    console.log(
      `방 만들기: ${number}, ${socket.userId}, ${roomTitle}, ${roomPeople}, ${roomPwd}`
    );

    socket.emit("roomData", room);
  });

  socket.on("joinRoom", async (roomId) => {
    console.log(`${socket.userId}님이 ${roomId}에 입장하셨습니다.`);
    socket.join(roomId);
    socket.roomId = roomId;

    await Room.updateOne(
      { roomId },
      {
        $push: {
          currentPeople: socket.userId,
          currentPeopleSocketId: socket.id,
        },
      }
    );

    const room = await Room.findOne({ roomId });

    io.to(socket.roomId).emit(
      "joinRoomMsg",
      socket.userId,
      room.currentPeopleSocketId,
      room.currentPeople
    );
  });

  socket.on("leaveRoom", async () => {
    console.log(`${socket.userId}님이 ${socket.roomId}에서 퇴장하셨습니다.`);

    const roomId = socket.roomId;
    socket.leave(roomId);

    await Room.updateOne(
      { roomId },
      {
        $pull: {
          currentPeople: socket.userId,
          currentPeopleSocketId: socket.id,
        },
      }
    );

    const roomUpdate = await Room.findOne({ roomId });

    if (roomUpdate.currentPeople.length === 0) {
      await Room.deleteOne({ roomId });
      socket.emit("leaveRoomMsg", socket.id);
    } else {
      io.to(socket.roomId).emit("leaveRoomMsg", socket.id, socket.userId);
    }

    const rooms = await Room.find({});

    io.emit("roomList", rooms);
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

  socket.on("startGame", async () => {
    console.log(`${socket.roomId} 게임이 시작되었습니다.`);

    const roomId = socket.roomId;

    await Room.updateOne({ roomId }, { $set: { start: true } });

    io.to(socket.roomId).emit("startGame", {
      msg: "게임이 시작되었습니다.",
    });
  });

  socket.on("endGame", async () => {
    console.log(`${socket.roomId} 게임이 종료되었습니다.`);

    const roomId = socket.roomId;

    await Room.updateOne({ roomId }, { $set: { start: false } });

    io.to(socket.roomId).emit("endGame", {
      msg: "게임이 종료되었습니다.",
    });
  });

  socket.on("getJob", async (userArr) => {
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
    for (let i = 0; i < jobArr.length; i++) {
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

    const roomId = socket.roomId;

    const room = await Room.findOne({ roomId });

    for (let i = 0; i < userArr.length; i++) {
      console.log(`직업 부여 ${room.currentPeople[i]}: ${playerJob[i]}`);
      io.to(userArr[i]).emit("getJob", room.currentPeople[i], playerJob[i]);
      await Game.create({
        roomId,
        userId: room.currentPeople[i],
        userJop: playerJob[i],
      });
    }
  });

  socket.on("vote", async (data) => {
    console.log("vote", JSON.stringify(data));

    await Vote.create({
      roomId: socket.roomId,
      clickerJob: data.clickerJob,
      clickerId: data.clickerId,
      clickedId: data.clickedId,
      day: data.day,
    });
  });

  socket.on("dayVoteResult", async () => {
    const clicked = await Vote.find({ roomId: socket.roomId, day: true });

    const clickedArr = [];

    for (let i = 0; i < clicked.length; i++) {
      clickedArr.push(clicked[i].clickerId);
    }

    const clickedArrNum = [];

    for (let i = 0; i < clicked.length; i++) {
      let num = 0;
      for (let j = 0; j < clicked.length; j++) {
        if (clickedArr[i] === clickedArr[j]) {
          num++;
        }
      }
      clickedArrNum.push(num);
    }

    const maxIndex = clickedArrNum.indexOf(Math.max(...clickedArrNum));
    const max = Math.max(...clickedArrNum);
    clickedArrNum[maxIndex] = 0;
    const max2 = Math.max(...clickedArrNum);

    if (max === max2) {
      io.to(socket.roomId).emit("dayVoteResult", { id: "아무도 안죽음" });
    } else {
      io.to(socket.roomId).emit("dayVoteResult", { id: clickedArr[maxIndex] });
    }

    const roomId = socket.roomId;

    await Vote.deleteMany({ roomId, day: true });
  });

  socket.on("nightVoteResult", async () => {
    const clicked = await Vote.find({ roomId: socket.roomId, day: false });
  });

  // socket.on("voteList", () => {
  //   for (let i = 0; i < rooms.length; i++) {
  //     if (rooms[i].socketId === socket.roomId) {
  //       console.log("voteList", rooms[i].voteList);
  //       rooms[i].night ? (rooms[i].night = false) : (rooms[i].night = true);
  //       io.to(socket.roomId).emit("voteList", rooms[i].voteList);
  //       io.to(socket.roomId).emit("night", rooms[i].night);
  //       rooms[i].voteList = [];
  //       break;
  //     }
  //   }
  // });
});

// 서버 열기
httpServer.listen(httpPort, () => {
  console.log(httpPort, "포트로 서버가 켜졌어요!");
});

httpsServer.listen(httpsPort, () => {
  console.log(httpsPort, "포트로 서버가 켜졌어요!");
});
