const express = require("express");
const router = express.Router();
const dotenv = require("dotenv").config();
const rp = require("request-promise");
const User = require("../../schemas/user/user");
const jwt = require("jsonwebtoken");
const { request } = require("http");

const naver = {
    clientid: `${process.env.CLIENT_ID}`, //REST API
    redirectUri: "http://localhost:3000/naverLogin/main",
    client_secret: `${process.env.CLIENT_SECRET}`,
    state: 'login'
  };

// naver login page URL
router.get("/naverLogin", (req, res) => {
    const naverAuthURL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naver.clientid}&redirect_uri=${naver.redirectUri}&state=${naver.state}`;
    res.redirect(naverAuthURL);
});

//  /main 설정 시 kakao redirectUri랑 동일함.. -> token 2번요청 -> error
router.get('/naverLogin/main', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const naver_api_url = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id='
     + naver.clientid + '&client_secret=' + naver.client_secret + '&redirect_uri=' + naver.redirectUri + '&code=' + code + '&state=' + state;

    var options = {
        url: naver_api_url,
        headers: {
            'X-Naver-Client-Id':naver.clientid,
            'X-Naver-Client-Secret': naver.client_secret
        }
     };
     const result = await rp.get(options);
     console.log('result->', result)
     const naverToken = JSON.parse(result).access_token;
     console.log('naverToken->', naverToken);

     const info_options = {
        url: 'https://openapi.naver.com/v1/nid/me',
        headers: {'Authorization': 'Bearer ' + naverToken}
    };

    const info_result = await rp.get(info_options);
  	// string 형태로 값이 담기니 JSON 형식으로 parse를 해줘야 한다.
    const info_result_json = JSON.parse(info_result).response;
    // console.log('info->', info_result_json);
    const userId = info_result_json.id;
    const userNick = info_result_json.nickname;
    const email = info_result_json.email;
    // console.log('userId',userId)
    // console.log('nickname',nickname)
    // console.log('email',email)


    // 가입여부 중복확인
    const existUser = await User.find({ userId });
    console.log("existUser-->", existUser);
  
    if (!existUser.length) {
      const from = "naver";
      const user = new User({ userId, userNick, email, from });
      console.log("user-->", user);
      await user.save();
    }
  
    const loginUser = await User.find({ userId });
    console.log("loginUser-->", loginUser);
    var naverId = loginUser[0].userId
    var naverNick = loginUser[0].userNick
    const token = jwt.sign({ userId: loginUser.userId }, `${process.env.KEY}`);
    console.log("token-->", token);
    res.status(200).send({
      token,
      naverId,
      naverNick
    });
  

});

module.exports = router;
