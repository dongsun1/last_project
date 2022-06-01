const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const authMiddleWare = require("../../middleware/authMiddleWare");

// 친구 추가 router
router.post("/friendAdd", authMiddleWare, async (req, res) => {
  // find friend id
  const { friendUserId } = req.body;

  // login user info
  const { user } = res.locals;
  const loginUser = user[0].userId;

  const searchInfo = await User.findOne({ userId: friendUserId });
  if (searchInfo == null || searchInfo == undefined || searchInfo.length == 0) {
    res.send({
      msg: "존재하지 않는 아이디 입니다.",
    });
    return;
  } else {
    let msg = "";
    const existFriend = await User.find(
      { userId: loginUser },
      { friendList: { $elemMatch: { userId: friendUserId } } }
    );

    if (existFriend[0].friendList.length !== 0) {
      res.send({
        msg: "이미 추가된 친구입니다.",
      });
    } else {
      await User.updateOne(
        { userId: loginUser },
        { $push: { friendList: { userId: friendUserId } } }
      );
      msg = "친구추가 완료";
    }
  }
  const info = await User.find({ userId: loginUser });
  info[0].friendList;
  res.send({ msg });
});

//친구 삭제
router.post("/friendRemove", authMiddleWare, async (req, res) => {
  const { removeUserId } = req.body;
  const { user } = res.locals;
  const userId = user[0].userId;

  await User.updateOne(
    { userId: userId },
    { $pull: { friendList: { userId: removeUserId } } }
  );
  const userInfo = await User.findOne({ userId: userId });
  const friendList = userInfo.friendList;
  res.status(200).send({
    msg: "친구삭제 완료",
    friendList,
  });
});

//친구목록 조회
router.post("/friendList", authMiddleWare, async (req, res) => {
  const { user } = res.locals;
  const userId = user[0].userId;
  const userInfo = await User.find({ userId: userId });
  const friendList = userInfo[0].friendList;
  res.status(200).send({
    friendList,
  });
});

module.exports = router;
