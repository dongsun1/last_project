const SocketIO = require("socket.io");
const Room = require("../schemas/room");
const Vote = require("../schemas/vote");
const Job = require("../schemas/job");
const User = require("../schemas/user/user");

module.exports = (server) => {
  const io = SocketIO(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("connection: ", socket.id);

    // 아이디 받아오기
    socket.on("main", (userId) => {
      console.log(`아이디 받아오기: ${userId}`);
      socket.userId = userId;
    });

    // 방 리스트
    socket.on("roomList", async () => {
      console.log("roomList");
      const rooms = await Room.find({});
      socket.emit("roomList", rooms);
    });

    // 채팅
    socket.on("msg", async (msg) => {
      const roomId = socket.roomId;
      const night = await Room.findOne({ roomId });

      if (night.night) {
        // 밤 마피아 채팅
        console.log(`밤 msg: ${msg}, id: ${socket.userId}`);
        const userJob = "mafia";
        const mafia = await Job.find({ roomId, userJob });
        for (let i = 0; i < mafia.length; i++) {
          io.to(mafia[i].userSocketId).emit("msg", { msg, id: socket.userId });
        }
      } else {
        // 낮 채팅
        console.log(`낮 msg: ${msg}, id: ${socket.userId}`);
        io.to(socket.roomId).emit("msg", { msg, id: socket.userId });
      }
    });

    // 방 만들기
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

    // Peer 방 들어가기
    socket.on("peerJoinRoom", (peerId, userNick, streamId) => {
      socket.peerId = peerId;
      socket.userNick = userNick;
      socket.streamId = streamId;
      const roomId = socket.roomId;
      console.log(`peerId ${peerId}`);
      socket.broadcast
        .to(roomId)
        .emit("user-connected", peerId, userNick, streamId);
    });

    // 방 들어가기
    socket.on("joinRoom", async (roomId) => {
      console.log(`${socket.userId}님이 ${roomId}에 입장하셨습니다.`);
      socket.join(roomId);
      socket.roomId = roomId;

      // Room 현재 인원에서 push
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

      io.to(roomId).emit(
        "joinRoomMsg",
        socket.userId,
        room.currentPeopleSocketId,
        room.currentPeople
      );
    });

    // 방 나가기
    socket.on("leaveRoom", async () => {
      console.log(`${socket.userId}님이 ${socket.roomId}에서 퇴장하셨습니다.`);

      const roomId = socket.roomId;
      socket.leave(roomId);

      // Room 현재 인원에서 pull
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

      // 방의 현재 인원이 0 이라면 방 삭제
      if (roomUpdate.currentPeople.length === 0) {
        await Room.deleteOne({ roomId });
        socket.emit("leaveRoomMsg", socket.id);
      } else {
        io.to(roomId).emit("leaveRoomMsg", socket.id, socket.userId);
      }

      const rooms = await Room.find({});

      socket.emit("roomList", rooms);

      socket.broadcast
        .to(roomId)
        .emit(
          "user-disconnected",
          socket.peerId,
          socket.userNick,
          socket.streamId
        );
    });

    // 준비하기
    socket.on("ready", async (ready) => {
      const roomId = socket.roomId;
      if (ready) {
        console.log(`${socket.userId} 준비완료`);
        await Room.updateOne(
          { roomId },
          { $push: { currentReadyPeople: socket.userId } }
        );
      } else {
        console.log(`${socket.userId} 준비해제`);
        await Room.updateOne(
          { roomId },
          { $pull: { currentReadyPeople: socket.userId } }
        );
      }

      const readyPeople = await Room.findOne({ roomId });
      io.to(roomId).emit("readyPeople", readyPeople.currentReadyPeople);
    });

    // 게임시작
    socket.on("startGame", async () => {
      const roomId = socket.roomId;

      await Room.updateOne(
        { roomId },
        { $push: { currentReadyPeople: socket.userId } }
      );
      const ready = await Room.findOne({ roomId });

      const readyResult = readyCheck(
        ready.currentPeople,
        ready.currentReadyPeople
      );

      if (readyResult) {
        console.log(`${socket.roomId} 게임이 시작되었습니다.`);

        socket.emit("ready", true);
        await Room.updateOne({ roomId }, { $set: { start: true } });

        let room = await Room.findOne({ roomId });

        // AI 생성
        if (room.currentPeople.length < room.roomPeople) {
          const aiNum = room.roomPeople.length - room.currentPeople.length;
          for (let i = 0; i < aiNum; i++) {
            const ai = `AI${room.currentPeople.length + i}`;
            await Room.updateOne(
              { roomId },
              { $push: { currentPeople: ai, currentPeopleSocketId: ai } }
            );
          }
        }
        room = await Room.findOne({ roomId });

        const userArr = room.currentPeopleSocketId;
        // 각 user 직업 부여
        const job = [];
        // 1:citizen, 2:doctor, 3:police, 4:mafia, 5:reporter, 6:sniper
        switch (userArr.length) {
          case 4:
            job.push(1, 1, 1, 4);
            break;
          case 5:
            job.push(1, 1, 2, 3, 4);
            break;
          case 6:
            job.push(1, 1, 1, 2, 3, 4);
            break;
          case 7:
            job.push(1, 1, 1, 2, 3, 4, 4);
            break;
          case 8:
            job.push(1, 1, 1, 2, 3, 4, 4, 5);
            break;
          case 9:
            job.push(1, 1, 1, 1, 2, 3, 4, 4, 5);
            break;
          case 10:
            job.push(1, 1, 1, 1, 2, 3, 4, 4, 5, 6);
            break;
        }

        // job random 부여
        const jobArr = job.sort(() => Math.random() - 0.5);
        const playerJob = [];
        for (let i = 0; i < jobArr.length; i++) {
          switch (jobArr[i]) {
            case 1:
              playerJob.push("citizen");
              break;
            case 2:
              playerJob.push("doctor");
              break;
            case 3:
              playerJob.push("police");
              break;
            case 4:
              playerJob.push("mafia");
              break;
            case 5:
              playerJob.push("reporter");
              break;
            case 6:
              playerJob.push("sniper");
              break;
          }
        }

        // 직업 DB 생성
        for (let i = 0; i < userArr.length; i++) {
          console.log(`직업 부여 ${room.currentPeople[i]}: ${playerJob[i]}`);
          io.to(userArr[i]).emit("getJob", room.currentPeople[i], playerJob[i]);
          if (userArr[i].includes("AI")) {
            await Job.create({
              roomId,
              userSocketId: userArr[i],
              userId: room.currentPeople[i],
              userJob: playerJob[i],
              AI: true,
            });
          } else {
            await Job.create({
              roomId,
              userSocketId: userArr[i],
              userId: room.currentPeople[i],
              userJob: playerJob[i],
            });
          }
        }

        let counter = 20;
        let first = true;

        // 타이머
        const countdown = setInterval(async () => {
          const min = parseInt(counter / 60);
          const sec = counter % 60;
          io.to(socket.roomId).emit("timer", { min, sec });
          counter--;
          if (!first) {
            // 자기소개 시간이 아닐 때
            if (counter < 0) {
              // 카운터가 끝났을 때
              // 낮, 밤 체크
              const room = await Room.findOne({ roomId });
              io.to(socket.roomId).emit("isNight", !room.night);
              await Room.updateOne(
                { roomId },
                { $set: { night: !room.night } }
              );

              // AI 투표
              const AI = await Job.find({ roomId, AI: true });

              const currentPeople = room.currentPeople;

              for (let i = 0; i < AI.length; i++) {
                const random = Math.floor(
                  Math.random() * (room.currentPeople - 1)
                );

                // 랜덤이 본인일 경우
                if (random === currentPeople.indexOf(`AI${random}`)) {
                  i--;
                } else {
                  const save = await Job.findOne({
                    userId: currentPeople[random],
                  });
                  // 랜덤이 살아있을 경우 create
                  if (save.save) {
                    await Vote.create({
                      roomId: AI[i].roomId,
                      userSocketId: AI[i],
                      clickerJob: AI[i].userJob,
                      clickerId: AI[i].userId,
                      clickedId: currentPeople[random],
                      day: !room.night,
                    });
                  } else {
                    i--;
                  }
                }
              }

              if (!room.night) {
                // 낮 투표 결과
                console.log(`${roomId} 밤이 되었습니다.`);
                counter = 20;

                await Vote.deleteMany({ roomId, day: false });
                const votes = await Vote.find({ roomId, day: true });

                const clickedArr = [];

                for (let i = 0; i < votes.length; i++) {
                  clickedArr.push(votes[i].clickedId);
                }

                // 투표 결과
                const voteResult = getSortedArr(clickedArr);

                const diedPeople = await Job.find({ roomId });
                const diedPeopleArr = [];
                const savedPeopleArr = [];
                for (let i = 0; i < diedPeople.length; i++) {
                  if (!diedPeople[i].save) {
                    diedPeopleArr.push(diedPeople[i].userId);
                  } else {
                    savedPeopleArr.push(diedPeople[i].userId);
                  }
                }

                if (voteResult.length !== 1) {
                  // 1명만 투표된게 아닐 때
                  if (voteResult[0][1] === voteResult[1][1]) {
                    // 투표 동률일 때
                    io.to(socket.roomId).emit("dayVoteResult", {
                      id: "아무도 안죽음",
                      diedPeopleArr,
                      savedPeopleArr,
                    });
                    console.log(`아무도 안죽음`);
                  } else {
                    // 투표 동률이 아닐 때
                    io.to(socket.roomId).emit("dayVoteResult", {
                      id: voteResult[0][0],
                      diedPeopleArr,
                      savedPeopleArr,
                    });
                    console.log(`${voteResult[0][0]} 죽음`);
                    await Job.updateOne(
                      { roomId, userId: voteResult[0][0] },
                      { $set: { save: false } }
                    );
                  }
                } else {
                  // 여러명 투표될 때
                  io.to(socket.roomId).emit("dayVoteResult", {
                    id: voteResult[0][0],
                    diedPeopleArr,
                    savedPeopleArr,
                  });
                  console.log(`${voteResult[0][0]} 죽음`);
                  await Job.updateOne(
                    { roomId, userId: voteResult[0][0] },
                    { $set: { save: false } }
                  );
                }
              } else {
                // 밤 투표 결과
                console.log(`${roomId} 낮이 되었습니다.`);
                counter = 30;

                await Vote.deleteMany({ roomId, day: true });
                const votes = await Vote.find({ roomId, day: false });

                let died = [];
                let saved = [];
                let sniper = [];

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

                  // 기자
                  if (votes[i].clickerJob === "reporter") {
                    const clickedUser = await Job.findOne({
                      roomId,
                      userId: votes[i].clickedId,
                    });
                    await Job.updateOne(
                      { roomId, userId: votes[i].clickerId },
                      { $set: { chance: false } }
                    );
                    console.log(
                      `기자가 지목한 ${clickedUser.userId}의 직업은 ${clickedUser.userJob}입니다.`
                    );
                    io.to(roomId).emit("reporter", {
                      clickerJob: clickedUser.userJob,
                      clickerId: clickedUser.userId,
                    });
                  }

                  // 저격수
                  if (votes[i].clickerJob === "sniper") {
                    const sniper = await Job.findOne({
                      roomId,
                      userId: votes[i].clickerId,
                    });
                    if (sniper.chance) {
                      await Job.updateOne(
                        { roomId, userId: votes[i].clickerId },
                        { $set: { chance: false } }
                      );
                      await Job.updateOne(
                        { roomId, userId: votes[i].clickedId },
                        { $set: { save: false } }
                      );
                      console.log(
                        `${votes[i].clickedId}님이 저격수에 의해 살해당했습니다.`
                      );
                      sniper.push(votes[i].clickedId);
                      socket.emit("sniper", true);
                    } else {
                      socket.emit("sniper", false);
                    }
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

                // 살린 사람 지우기
                died = died.filter((x) => !saved.includes(x));

                const diedPeople = await Job.find({ roomId });
                const diedPeopleArr = [];
                const savedPeopleArr = [];
                for (let i = 0; i < diedPeople.length; i++) {
                  if (!diedPeople[i].save) {
                    diedPeopleArr.push(diedPeople[i].userId);
                  } else {
                    savedPeopleArr.push(diedPeople[i].userId);
                  }
                }

                // 밤 투표 결과
                io.to(socket.roomId).emit("nightVoteResult", {
                  died,
                  saved,
                  diedPeopleArr,
                  savedPeopleArr,
                });
              }

              // 게임 끝났는지 체크
              const endGame = await Job.find({ roomId });
              const result = endGameCheck(endGame);

              const endGameUserId = [];
              const endGameUserJob = [];
              for (let i = 0; i < endGame.length; i++) {
                endGameUserId.push(endGame.userId);
                endGameUserJob.push(endGame.userJob);
              }

              let msg = "";
              if (result) {
                if (result === "시민 승") {
                  msg = "시민이 승리하였습니다.";
                  // 전적 업데이트
                  for (let i = 0; i < endGame.length; i++) {
                    if (endGameUserJob[i] !== "mafia") {
                      await User.updateOne(
                        { userId: endGameUserId[i] },
                        { $inc: { userWin: 1 }, $set: { ready: false } }
                      );
                    } else {
                      await User.updateOne(
                        { userId: endGameUserId[i] },
                        { $inc: { userWin: -1 }, $set: { ready: false } }
                      );
                    }
                  }
                } else if (result === "마피아 승") {
                  msg = "마피아가 승리하였습니다.";
                  // 전적 업데이트
                  for (let i = 0; i < endGame.length; i++) {
                    if (endGameUserJob[i] === "mafia") {
                      await User.updateOne(
                        { userId: endGameUserId[i] },
                        { $inc: { userWin: 1 }, $set: { ready: false } }
                      );
                    } else {
                      await User.updateOne(
                        { userId: endGameUserId[i] },
                        { $inc: { userWin: -1 }, $set: { ready: false } }
                      );
                    }
                  }
                }
                clearInterval(countdown);
                console.log(`${roomId} ${msg}`);
                io.to(socket.roomId).emit("endGame", { msg });
                const currentPeople = await Room.findOne({ roomId });
                await Room.updateOne(
                  { roomId },
                  {
                    $set: { start: false },
                    $pullAll: {
                      currentReadyPeople: currentPeople.currentPeople,
                    },
                  }
                );
                await Vote.deleteMany({ roomId });
                await Job.deleteMany({ roomId });
              }
            }
          }
          if (counter < 0) {
            // 자기소개 시간이 끝났을 때
            first = false;
            counter = 20;
            console.log(`${roomId} 밤이 되었습니다.`);
            const day = await Room.findOne({ roomId });
            io.to(socket.roomId).emit("isNight", !day.night);
            await Room.updateOne({ roomId }, { $set: { night: !day.night } });
          }
        }, 1000);
      } else {
        const ready = await Room.findOne({ roomId });

        const notReadyId = [];
        notReadyId = ready.currentPeople.filter(
          (x) => !ready.currentReadyPeople.includes(x)
        );

        console.log(`${notReadyId} 참가자들이 준비가 되지 않았습니다.`);
        socket.emit("ready", false, notReadyId);
      }
    });

    // 투표
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
        day: !day.night,
      });

      if (data.clickerJob === "reporter") {
        const reporter = await Job.findOne({
          roomId,
          userId: data.clickerId,
        });

        const chance = reporter.chance;

        if (day.night && !chance) {
          await Vote.deleteOne({
            roomId: socket.roomId,
            userSocketId: socket.id,
            clickerJob: data.clickerJob,
            clickerId: data.clickerId,
            clickedId: data.clickedId,
            day: !day.night,
          });

          socket.emit("reporterOver");
        }
      }

      if (day.night) {
        // 경찰
        if (data.clickerJob === "police") {
          const clickedUser = await Job.findOne({
            roomId,
            userId: data.clickedId,
          });

          if (clickedUser.userJob === "mafia") {
            console.log(`경찰이 지목한 사람은 ${data.clickedId} 마피아입니다.`);
            socket.emit("police", true);
          } else {
            console.log(
              `경찰이 지목한 사람은 ${data.clickedId} 마피아가 아닙니다.`
            );
            socket.emit("police", false);
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`disconnection: ${socket.id}`);
    });
  });
};

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
  const jobArr = [];

  for (let i = 0; i < endGame.length; i++) {
    if (endGame[i].save) {
      jobArr.push(endGame[i].userJob);
    }
  }

  let citizenNum = 0;
  let mafiaNum = 0;
  for (let i = 0; i < jobArr.length; i++) {
    if (jobArr[i] === "mafia") {
      mafiaNum++;
    } else {
      citizenNum++;
    }
  }
  if (citizenNum <= mafiaNum) {
    return "마피아 승";
  }
  if (mafiaNum === 0) {
    return "시민 승";
  }
  return false;
}

function readyCheck(current, ready) {
  if (current.length === ready.length) {
    return true;
  } else {
    return false;
  }
}
