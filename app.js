const fs = require("fs");
const http = require("http");
const https = require("https");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const winston = require("./config/winston");
const helmet = require("helmet");
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
const Job = require("./schemas/job");

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
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan("tiny"));
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

  socket.on("timer", async () => {
    const roomId = socket.roomId;

    const counter = 60;

    const countdown = setInterval(async () => {
      const min = parseInt(counter / 60);
      const sec = counter % 60;
      io.to(socket.roomId).emit("timer", { min, sec });
      counter--;

      if (counter < 0) {
        const day = await Room.findOne({ roomId });
        io.to(socket.roomId).emit("isNight", !day.night);
        await Room.updateOne({ roomId }, { $set: { night: !day.night } });

        if (day.night) {
          counter = 60;

          await Vote.deleteMany({ roomId, day: false });
          const votes = await Vote.find({ roomId, day: true });

          const clickedArr = [];

          for (let i = 0; i < votes.length; i++) {
            clickedArr.push(votes[i].clickedId);
          }

          const voteResult = getSortedArr(clickedArr);

          if (voteResult.length !== 1) {
            if (voteResult[0][1] === voteResult[1][1]) {
              io.to(socket.roomId).emit("dayVoteResult", {
                id: "아무도 안죽음",
              });
              console.log(`아무도 안죽음`);
            } else {
              io.to(socket.roomId).emit("dayVoteResult", {
                id: voteResult[0][0],
              });
              console.log(`${voteResult[0][0]} 죽음`);
            }
          } else {
            io.to(socket.roomId).emit("dayVoteResult", {
              id: voteResult[0][0],
            });
            console.log(`${voteResult[0][0]} 죽음`);
          }

          await Job.updateOne(
            { roomId, userId: voteResult[0][0] },
            { $set: { save: false } }
          );

          const endGame = await Job.find({ roomId });
          const result = endGameCheck(endGame);
          if (result) {
            clearInterval(countdown);
            io.to(socket.roomId).emit("endGame", {
              msg: "게임이 종료되었습니다.",
            });
            await Job.deleteMany({ roomId });
          }
        } else {
          counter = 120;

          await Vote.deleteMany({ roomId, day: true });
          const votes = await Vote.find({ roomId, day: false });

          const died = [];
          const saved = [];

          for (let i = 0; i < votes.length; i++) {
            // 마피아
            if (votes[i].clickerJob === "mafia") {
              await Job.updateOne(
                { roomId, userId: votes[i].clickedId },
                { $set: { save: false } }
              );
              console.log(
                `${votes[i].clickedId}님이 마피아에 의해 살해당했습니다.`
              );
              died.push(votes[i].clickedId);
            }
            // 경찰
            if (votes[i].clickerJob === "police") {
              const clickedJob = await Job.findOne({
                roomId,
                userId: votes[i].clickedId,
              });
              console.log(
                `경찰이 지목한 사람의 직업은 ${votes[i].clickedId}: ${clickedJob.userJob}입니다.`
              );
              io.to(votes[i].userSocketId).emit("police", clickedJob.userJob);
            }
          }

          // 의사
          for (let i = 0; i < votes.length; i++) {
            if (votes[i].clickerJob === "doctor") {
              const clickedUser = await Job.findOne({
                roomId,
                userId: votes[i].clickedId,
              });
              if (!clickedUser.save) {
                await Job.updateOne(
                  { roomId, userId: votes[i].clickedId },
                  { $set: { save: true } }
                );
                console.log(
                  `${votes[i].clickedId}님이 의사에 의해 치료되었습니다.`
                );
                saved.push(votes[i].clickedId);
              }
            }
          }

          // 투표 결과
          io.to(socket.roomId).emit("nightVoteResult", { died, saved });
        }

        const endGame = await Job.find({ roomId });
        const result = endGameCheck(endGame);
        if (result) {
          clearInterval(countdown);
          io.to(socket.roomId).emit("endGame", {
            msg: "게임이 종료되었습니다.",
          });
          await Job.deleteMany({ roomId });
        }
      }
    }, 1000);
  });

  socket.on("startGame", async () => {
    console.log(`${socket.roomId} 게임이 시작되었습니다.`);

    const roomId = socket.roomId;

    await Room.updateOne({ roomId }, { $set: { start: true } });

    // io.to(socket.roomId).emit("startGame", {
    //   msg: "게임이 시작되었습니다.",
    // });
  });

  socket.on("endGame", async () => {
    console.log(`${socket.roomId} 게임이 종료되었습니다.`);

    const roomId = socket.roomId;

    await Room.updateOne({ roomId }, { $set: { start: false } });
    await Vote.deleteMany({ roomId });
    await Job.deleteMany({ roomId });
  });

  socket.on("getJob", async () => {
    const roomId = socket.roomId;

    const roomOne = await Room.findOne({ roomId });
    const userArr = roomOne.currentPeopleSocketId;
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

    const room = await Room.findOne({ roomId });

    for (let i = 0; i < userArr.length; i++) {
      console.log(`직업 부여 ${room.currentPeople[i]}: ${playerJob[i]}`);
      io.to(userArr[i]).emit("getJob", room.currentPeople[i], playerJob[i]);
      await Job.create({
        roomId,
        userSocketId: userArr[i],
        userId: room.currentPeople[i],
        userJob: playerJob[i],
      });
    }
  });

  socket.on("vote", async (data) => {
    console.log("vote", JSON.stringify(data));

    const roomId = socket.roomId;
    const day = await Room.findOne({ roomId });

    await Vote.create({
      roomId: socket.roomId,
      userSocketId: socket.id,
      clickerJob: data.clickerJob,
      clickerId: data.clickerId,
      clickedId: data.clickedId,
      day: day.night,
    });
  });

  socket.on("dayVoteResult", async () => {});

  socket.on("nightVoteResult", async () => {
    console.log(`nightVoteResult`);
    const roomId = socket.roomId;
  });
});

// 서버 열기
httpServer.listen(httpPort, () => {
  winston.info(`${httpPort}, "포트로 서버가 켜졌어요!`);
});

httpsServer.listen(httpsPort, () => {
  winston.info(`${httpsPort}, "포트로 서버가 켜졌어요!`);
});

function getSortedArr(array) {
  // 1. 출연 빈도 구하기
  const counts = array.reduce((pv, cv) => {
    pv[cv] = (pv[cv] || 0) + 1;
    return pv;
  }, {});
  // 2. 요소와 개수를 표현하는 배열 생성 => [ [요소: 개수], [요소: 개수], ...]
  const result = [];
  for (let key in counts) {
    result.push([key, counts[key]]);
  }
  // 3. 출현 빈도별 정리하기
  result.sort((first, second) => {
    // 정렬 순서 바꾸려면 return first[1] - second[1];
    return second[1] - first[1];
  });
  return result;
}

function endGameCheck(endGame) {
  const jopArr = [];

  for (let i = 0; i < endGame.length; i++) {
    jopArr.push(endGame[i].userJop);
  }

  let citizenNum = 0;
  let mafiaNum = 0;
  for (let i = 0; i < jopArr.length; i++) {
    if (
      jopArr[i] === "citizen" ||
      jopArr[i] === "police" ||
      jopArr[i] === "doctor"
    ) {
      citizenNum++;
    } else if (jopArr[i] === "mafia") {
      mafiaNum++;
    }
  }

  if (citizenNum <= mafiaNum) {
    console.log("게임종료");
    return true;
  } else {
    return false;
  }
}
