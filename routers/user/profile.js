const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleWare");

const User = require("../schemas/user/user");

// 프로필 사진 가져오기
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = res.locals.user;

    const user = await User.findOne({ userId });
    res.status(200).send({ result: true, profile: user.profile });
  } catch (e) {
    res.status(400).send({ result: false, msg: "실패" });
    console.log("profile.js에서 에러남");
  }
});

// 프로필 수정
router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = res.locals.user;
    const { profile } = req.body;

    await User.updateOne({ userId }, { $set: { profile } });
    res.status(200).send({ result: true, msg: "등록 성공" });
  } catch (error) {
    console.log(error);
    res.status(400).send({ result: false, msg: "등록 실패" });
    console.log("profile.js에서 에러남");
  }
});

module.exports = router;
