const express = require("express");
const User = require("../../schemas/user/user");
const bcrypt = require("bcrypt");
const router = express.Router();

// register --> email 정규식 추가(04.25) ->findPw
router.post("/register", async (req, res) => {
  console.log("user/register");

  const { userId, email, userPw, userPwCheck, userNick } = req.body;
  console.log("register-->", req.body);

  // Validation Check
  var userNickReg = /^([a-zA-Z0-9ㄱ-ㅎ|ㅏ-ㅣ|가-힣]).{1,15}$/; //2~15자 한글,영문,숫자
  var emailReg =
    /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
  var userPwReg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,15}$/; //4~15자 영문+숫자

  // signup -> userId, userName 중복검사
  const existUsers = await User.find({
    $or: [{ userId }, { userNick }, { email }],
  });

  if (userId == "" || userId == undefined || userId == null) {
    res.status(400).send({
      errorMessage: "아이디를 입력하세요.",
    });
    return;
  } else if (!userPwReg.test(userId)) {
    res.status(400).send({
      errorMessage: "아이디는 4~15자 영문 및 숫자만 가능합니다.",
    });
    return;
  } else if (email == "" || email == undefined || email == null) {
    res.status(400).send({
      errorMessage: "이메일을 입력하세요.",
    });
    return;
  } else if (!emailReg.test(email)) {
    res.status(400).send({
      errorMessage: "이메일 형식을 올바르게 입력해주세요.",
    });
    return;
  } else if (userNick == "" || userNick == undefined || userNick == null) {
    res.status(400).send({
      errorMessage: "닉네임을 입력하세요.",
    });
    return;
  } else if (!userNickReg.test(userNick)) {
    res.status(400).send({
      errorMessage: "닉네임은 2~15자, 한글,영문 및 숫자만 가능합니다.",
    });
    return;
  } else if (existUsers.length) {
    res.status(400).send({
      errorMessage: "이미 가입된 아이디,닉네임 또는 이메일 입니다.",
    });
    return;
  } else if (userPw == "" || userPw == undefined || userPw == null) {
    res.status(400).send({
      errorMessage: "비밀번호를 입력하세요.",
    });
    return;
  } else if (
    userPwCheck == "" ||
    userPwCheck == undefined ||
    userPwCheck == null
  ) {
    res.status(400).send({
      errorMessage: "비밀번호 확인란을 입력하세요.",
    });
    return;
  } else if (!userPwReg.test(userPw)) {
    res.status(400).send({
      errorMessage: "4~15자, 영문 및 숫자만 가능합니다.",
    });
    return;
  } else if (userPw !== userPwCheck) {
    res.status(400).send({
      errorMessage: "비밀번호가 비밀번호 확인란과 일치하지 않습니다.",
    });
    return;
  }

  // bcrypt module -> 암호화
  // 10 --> saltOrRound --> salt를 10번 실행 (높을수록 강력)
  const userWin = 0;
  const userLose = 0;
  const from = "webSite";
  const hashed = await bcrypt.hash(userPw, 10);
  const user = new User({
    userId,
    email,
    userNick,
    userWin,
    userLose,
    userPw: hashed,
    from,
  });
  console.log("user-->", user);
  await user.save();

  res.status(200).send({
    msg: "회원가입 완료",
    userId,
    userNick,
  });
});

module.exports = router;
