const express = require("express");
const router = express.Router();
const dotenv = require("dotenv").config();
const rp = require("request-promise");
const User = require("../../schemas/user/user");
const jwt = require("jsonwebtoken");

// GOOGLE_API_KEY : 'AIzaSyAx19zKxrqeHOMUjT2GcZAw8vyzSxwjXsI'
// GOOGLE_CLIENTID : '106975674237-i62c0d3iv72p088027oa1vunqbsk4490.apps.googleusercontent.com'
// GOOGLE_SECRET_KEY : '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'

router.get('/googleLogin', (req, res) => {
    console.log('googleLogin Router');
    

})


module.exports = router;
