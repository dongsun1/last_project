const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const authMiddleware = require("../../middleware/authMiddleWare");

router.get("/gameRecord", authMiddleware, async (req, res) => {
  const { user } = res.locals;
  const userId = user[0].userId;
  const userNick = user[0].userNick;
  console.log("loginUserId :", userId, "loginUserNick :", userNick);

  const userRecord = await User.findOne({
    userId: userId,
  });
  console.log("result", userRecord);
  res.status(200).send({
    msg: "게임전적 조회 완료.",
    userWin: userRecord.userWin,
    userLose: userRecord.userLose,
  });
});

module.exports = router;
