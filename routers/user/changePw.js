const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv").config();

router.post("/changePw", async (req, res) => {
  const { userId, email, password, newPw, newPwCheck } = req.body;
  console.log(userId, email, password, newPw, newPwCheck);
  const userInfo = await User.findOne({ userId });
  console.log("userInfo-->", userInfo);
  const unHashPw = await bcrypt.compareSync(password, userInfo.userPw);
  console.log("unhash-->", unHashPw);

  if (unHashPw == false) {
    res.status(400).send({
      errorMessage: "임시 비밀번호가 틀렸습니다.",
    });
    return;
  } else if (newPw !== newPwCheck) {
    res.status(400).send({
      errorMessage: "새 비밀번호와 새 비밀번호 확인란이 일치하지 않습니다.",
    });
    return;
  }
  const hashedPw = await bcrypt.hash(newPw, 10);
  const updatePw = await User.findOneAndUpdate(
    { userId: userId },
    { $set: { userPw: hashedPw } },
    { new: true }
  );
  console.log("updatePw-->", updatePw);
  res.status(200).send({
    msg: "비밀번호 변경 완료",
  });
});

module.exports = router;
