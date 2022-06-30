const fs = require("fs");
const http = require("http");
const https = require("https");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const winston = require("./config/winston");
const helmet = require("helmet");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const SocketIO = require("./utils/socket");
const connect = require("./schemas");
const app_low = express();
const app = express();
const httpPort = 80;
const httpsPort = 443;

const privateKey = fs.readFileSync(__dirname + "/private.key", "utf8");
const certificate = fs.readFileSync(__dirname + "/certificate.crt", "utf8");
const ca = fs.readFileSync(__dirname + "/ca_bundle.crt", "utf8");
const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

connect();

const requestMiddleware = (req, res, next) => {
  console.log(
    "[Ip address]:",
    req.ip,
    "[method]:",
    req.method,
    "Request URL:",
    req.originalUrl,
    " - ",
    new Date()
  );
  next();
};

// 각종 미들웨어
app_low.use((req, res, next) => {
  if (req.secure) {
    next();
  } else {
    const to = `https://${req.hostname}:${httpsPort}${req.url}`;
    res.redirect(to);
  }
});

// router -> user
const usersRouter = require("./routers/user/login");
const resisterRouter = require("./routers/user/register");
const kakaoRouter = require("./routers/user/kakaoLogin");
const findPwRouter = require("./routers/user/findPw");
const changePwRouter = require("./routers/user/changePw");
const friendListRouter = require("./routers/user/friendList");
const naverRouter = require("./routers/user/naverLogin");
const googleRouter = require("./routers/user/googleLogin");
const profileRouter = require("./routers/user/profile");
const changeNickRouter = require("./routers/user/changeNick");
const gameRecordRouter = require("./routers/user/gameRecord");

app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan("tiny"));
app.use(express.json());
app.use(cookieParser());
app.use(requestMiddleware);
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    saveUninitialized: true,
    resave: false,
    secret: "MY_SECRET",
  })
);

app.use("/user", [
  usersRouter,
  resisterRouter,
  findPwRouter,
  changePwRouter,
  friendListRouter,
  profileRouter,
  changeNickRouter,
  gameRecordRouter,
]);

app.use("", [kakaoRouter, naverRouter, googleRouter]);

app.get(
  "/.well-known/pki-validation/1328EE4FCF7B7FA0471EE8B3C46ECCC3.txt",
  (req, res) => {
    res.sendFile(
      __dirname +
        "/.well-known/pki-validation/1328EE4FCF7B7FA0471EE8B3C46ECCC3.txt"
    );
  }
);

app.get("/", (req, res) => {
  res.send("mafiyang");
});

const httpServer = http.createServer(app_low);
const httpsServer = https.createServer(credentials, app);
SocketIO(httpsServer);

// 서버 열기
httpServer.listen(httpPort, () => {
  winston.info(`${httpPort}, "포트로 서버가 켜졌어요!`);
});

httpsServer.listen(httpsPort, () => {
  winston.info(`${httpsPort}, "포트로 서버가 켜졌어요!`);
});
