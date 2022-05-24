const express = require("express");
const User = require("../../schemas/user/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authMiddleWare = require("../../middleware/authMiddleWare");
// const{ KEY } = process.env.KEY;
const dotenv = require("dotenv").config();
const router = express.Router();

// login page
router.post("/login", async (req, res) => {
  console.log("login api");
  const { userId, userPw } = req.body;
  console.log("body->", userId, userPw);
  const user = await User.findOne({ userId });
  console.log("user-->", user);

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
  // body password = unHashPassword -->true
  // console.log("unHashPw->", unHashPw); // true or false
  // userId, password 없는경우
  // if (!user || unHashPw == false) {
  //   res.status(400).send({
  //     errorMessage: "아이디 또는 비밀번호가 틀렸습니다.",
  //   });
  //   return;
  // }

  const token = jwt.sign({ userId: user.userId }, `${process.env.KEY}`);
  // console.log('webtoken-->',token)
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
  await User.updateOne({ userId }, { $set: { login: false } });
  res.status(200).send({
    msg: "로그아웃 성공",
  });
});

// 새로고침 login check
router.get("/loginCheck", authMiddleWare, (req, res) => {
  const { user } = res.locals;
  console.log("loginCheck user-->", user);
  const userId = user[0].userId;
  const userNick = user[0].userNick;
  console.log("userId-->", userId);
  console.log("userNick-->", userNick);
  res.status(200).send({
    userId: userId,
    userNick: userNick,
  });
});

module.exports = router;
