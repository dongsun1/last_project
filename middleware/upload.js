const path = require("path"); //nodejs 기본 내장 라이브러리, 파일의 경로, 이름, 확장자 등을 알아낼 때 사용
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
require("dotenv").config();

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
  region: process.env.REGION,
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLocaleLowerCase();
  if (file.fieldname === "profile") {
    if (
      ext !== ".png" &&
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".PNG" &&
      ext !== ".JPG" &&
      ext !== ".JPEG"
    )
      cb({ message: "이미지 파일 형식이 맞지 않습니다." }, false);
    else cb(null, true);
  }
};

const storage = multerS3({
  s3: s3,
  bucket: "mafiyang",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  acl: "public-read",
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key(req, file, cb) {
    if (file.fieldname === "profile")
      cb(null, `images/${Date.now()}${path.basename(file.originalname)}`);
  },
});

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: fileFilter,
});
