const express = require("express");
const User = require("../../schemas/user/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authMiddleWare = require("../../middleware/authMiddleWare");
// const{ KEY } = process.env.KEY;
require("dotenv").config();
const router = express.Router();

// login page
router.post("/login", async (req, res) => {
  const { userId, userPw } = req.body;
  const user = await User.findOne({ userId });

  if (!user) {
    res.status(400).send({
      errorMessage: "아이디 또는 비밀번호가 틀렸습니다.",
    });
  } else {
    const unHashPw = bcrypt.compareSync(userPw, user.userPw);
    if (unHashPw === false) {
      res.status(400).send({
        errorMessage: "아이디 또는 비밀번호가 틀렸습니다.",
      });
    }
  }

  if (user.login) {
    res.status(400).send({
      errorMessage: "이미 로그인 되어 있습니다.",
    });
  }

  const token = jwt.sign({ userId: user.userId }, `${process.env.KEY}`);
  await User.updateOne({ userId }, { $set: { login: true } });
  res.status(200).send({
    token,
    userId,
    userNick: user.userNick,
  });
});

router.get("/logout", authMiddleWare, async (req, res) => {
  const { user } = res.locals;
  const userId = user[0].userId;
  if (user[0].from !== "kakao" && user[0].from !== "naver") {
    const result = await User.updateOne({ userId }, { $set: { login: false } });
    if (result.modifiedCount === 1) {
      res.status(200).send({
        msg: "로그아웃 성공",
      });
    } else {
      res.status(400).send({
        msg: "로그아웃 실패",
      });
    }
  } else {
    res.status(200).send({
      msg: "로그아웃 성공",
    });
  }
});

// 새로고침 login check
router.get("/loginCheck", authMiddleWare, (req, res) => {
  const { user } = res.locals;
  const userId = user[0].userId;
  const userNick = user[0].userNick;
  res.status(200).send({
    userId: userId,
    userNick: userNick,
  });
});

module.exports = router;
