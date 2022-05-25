const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const authMiddleware = require("../../middleware/authMiddleWare");

router.get("/gameRecord", authMiddleware, async (req, res) => {
  const { user } = res.locals;
  const userId = user[0].userId;

  const userRecord = await User.findOne({
    userId: userId,
  });

  if (userRecord) {
    res.status(200).send({
      msg: "게임 전적 조회 완료",
      userWin: userRecord.userWin,
      userLose: userRecord.userLose,
    });
  } else {
    res.status(400).send({
      msg: "게임 전적 조회 실패",
    });
  }
});

module.exports = router;
