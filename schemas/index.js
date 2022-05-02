// const mongoose = require("mongoose");

// const db = () => {
//     mongoose
//       .connect(
//         "mongodb://localhost:27017/mapiaGame",
//         // 이후 배포 시 변경 필요.
//         { ignoreUndefined: true }
//       )
//       .catch((err) => {
//         console.error(err);
//       });
//   };
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

var db = () => {
  mongoose
    .connect("mongodb+srv://" + `${process.env.DB}` + "majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, //MondDB 6.0 이상에서는 지원 X
      ignoreUndefined: true,
    })
    .then(() => console.log("MongoDB 연결완료"))
    .catch((err) => {
      console.log(err);
    });
};

module.exports = db;
