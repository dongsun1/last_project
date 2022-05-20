const express = require("express");
const router = express.Router();
const User = require("../../schemas/user/user");
const authMiddleWare = require("../../middleware/authMiddleWare");

// 친구 추가 router
router.post("/friendAdd", authMiddleWare, async (req, res) => {
  console.log("friendList router");

  // find friend id
  const { friendUserId } = req.body;
  console.log("friendUserId->", friendUserId);

  // login user info
  const { user } = res.locals;
  // console.log('user->', user);
  const loginUser = user[0].userId;
  console.log("loginUser->", loginUser);

  const searchInfo = await User.findOne({userId:friendUserId});
  if(searchInfo == null || searchInfo == undefined || searchInfo.length == 0){
    res.send({
      msg : '존재하지 않는 아이디 입니다.'
    });
    return;
  }else{
    var msg = "";
    const existFriend = await User.find(
      { userId: loginUser },
      { friendList: { $elemMatch: { userId: friendUserId } } }
    );
    console.log("existFriend->", existFriend);
  
    if (existFriend[0].friendList.length !== 0) {
      console.log("11->", existFriend[0].friendList);
      res.send({
        msg: "이미 추가된 친구입니다.",
      });
      return;
    } else {
      const friendAdd = await User.updateOne(
        { userId: loginUser },
        { $push: { friendList: { userId: friendUserId } } }
      );
      console.log("result->", friendAdd);
      msg = "친구추가 완료";
    }  
  }
  // const loginUserInfo = await User.find({userId : loginUser});
  // console.log('loginUserInfo-->', loginUserInfo);
  // const saveFriendList = loginUserInfo[0].friendList;
  // console.log('saveFriendList->',saveFriendList);

  const info = await User.find({ userId: loginUser });
  const friendList = info[0].friendList;
  console.log("list", friendList);
  res.send({
    msg,
  });
});

//친구 삭제
router.post("/friendRemove", authMiddleWare, async (req, res) => {
  const { removeUserId } = req.body;
  console.log(removeUserId);
  const { user } = res.locals;
  // console.log('user->', user);
  const userId = user[0].userId;

  const remove = await User.updateOne(
    {userId: userId},
    {$pull : {friendList: {userId: removeUserId}}}
    );
  console.log('removeDB :', remove);
  const userInfo = await User.findOne({userId:userId});
  const friendList = userInfo.friendList
  console.log('friendList :', friendList)
  res.status(200).send({
    msg: '친구삭제 완료',
    friendList
  });
 
});

//친구목록 조회
router.post("/friendList", authMiddleWare, async (req, res) => {
  console.log("user/friendList router");
  const { user } = res.locals;
  // console.log( 'user->', user );
  const userId = user[0].userId;
  // console.log(userId)
  const userInfo = await User.find({ userId: userId });
  const friendList = userInfo[0].friendList;
  console.log("friendList-> ", friendList);
  res.status(200).send({
    friendList,
  });
});

module.exports = router;
