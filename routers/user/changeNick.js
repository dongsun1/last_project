const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const authMiddleware = require("../../middleware/authMiddleWare");

router.post("/changeNick", authMiddleware, async (req, res) => {
  const { changeNick } = req.body;
  const { user } = res.locals;
  const userId = user[0].userId;

  // Validation check
  var userNickReg = /^([a-zA-Z0-9ㄱ-ㅎ|ㅏ-ㅣ|가-힣]).{1,15}$/; //2~15자 한글,영문,숫자

  const existUsers = await User.findOne({ userNick: changeNick });

  if (changeNick == "" || changeNick == undefined || changeNick == null) {
    res.status(400).send({
      errorMessage: "닉네임을 입력하세요.",
    });
  } else if (!userNickReg.test(changeNick)) {
    res.status(400).send({
      errorMessage: "닉네임은 2~15자, 한글,영문 및 숫자만 가능합니다.",
    });
  } else if (existUsers) {
    res.status(400).send({
      errorMessage: "이미 가입된 닉네임 입니다.",
    });
  }

  const changeUserNick = await User.findOneAndUpdate(
    { userId },
    { $set: { userNick: changeNick } },
    { new: true }
  );

  res.status(200).send({
    msg: "닉네임 변경 완료",
    userNick: changeUserNick.userNick,
  });
});

module.exports = router;
