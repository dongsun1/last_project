const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv").config();

// 비밀번호 초기화 -> 메일 발송
router.post("/findPw", async (req, res) => {
  const { email, userId } = req.body;
  console.log("body->", email, userId);
  const userInfo = await User.find({ userId, email });
  console.log("userInfo->", userInfo);

  var emailReg =
    /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;

  if (!userInfo.length) {
    res.status(400).send({
      errorMessage: "등록되지 않은 이메일 또는 아이디 입니다.",
    });
    return;
  } else if (userId == "" || userId == undefined || userId == null) {
    res.status(400).send({
      errorMessage: "아이디를 입력하세요.",
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
  }

  var variable =
    "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z".split(
      ","
    );
  var randomPassword = createRandomPassword(variable, 8);
  function createRandomPassword(variable, passwordLength) {
    var randomString = "";
    for (var i = 0; i < passwordLength; i++)
      randomString += variable[Math.floor(Math.random() * variable.length)];
    return randomString;
  }

  const transporter = nodemailer.createTransport({
    service: "naver",
    host: "smtp.naver.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "7707jo",
      pass: `${process.env.PASSWORD}`,
    },
  });
  const emailOptions = {
    // 옵션값 설정
    from: "7707jo@naver.com",
    to: email,
    subject: "마피양에서 임시비밀번호를 알려드립니다.",
    html:
      "<h1 >마피양에서 새로운 비밀번호를 알려드립니다.</h1> <h2> 비밀번호 : " +
      randomPassword +
      "</h2>" +
      '<h3 style="color: crimson;">임시 비밀번호로 로그인 하신 후, 반드시 비밀번호를 수정해 주세요.</h3>',
  };
  transporter.sendMail(emailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log("email 전송 완료 : " + info.response);
    }
    transporter.close();
  });
  const hashedPw = await bcrypt.hash(randomPassword, 10);
  const changePw = await User.findOneAndUpdate(
    { userId: userId },
    { $set: { userPw: hashedPw } },
    { new: true }
  );
  console.log("ChangeUser-->", changePw);
  res.status(200).send({
    msg: "임시 비밀번호가 생성되었습니다.",
  });
});

module.exports = router;
