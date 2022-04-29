//const dotenv = require('dotenv');
//dotenv.config();
let { DOMAIN_OR_PUBLIC_IP, OPENVIDU_SECRET } = process.env;
/* CONFIGURATION */

var OpenVidu = require("openvidu-node-client").OpenVidu;

// Check launch arguments: must receive openvidu-server URL and the secret
// if (process.argv.length != 4) {
//   console.log('Usage: node ' + __filename + ' OPENVIDU_URL OPENVIDU_SECRET');
//   process.exit(-1);
// }
// For demo purposes we ignore self-signed certificate
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Environment variable: URL where our OpenVidu server is listening
// var OPENVIDU_URL = process.argv[2];
// // Environment variable: secret shared with our OpenVidu server
// var OPENVIDU_SECRET = process.argv[3];

// Entrypoint to OpenVidu Node Client SDK
var OV = new OpenVidu(DOMAIN_OR_PUBLIC_IP, OPENVIDU_SECRET);

const express = require("express");
const router = express.Router();
var OpenViduRole = require("openvidu-node-client").OpenViduRole;
const { Room } = require("../models/");

// Collection to pair session names with OpenVidu Session objects
var mapSessions = {};
// Collection to pair session names with tokens
var mapSessionNamesTokens = {};

// Get token (add new user to session)
router.post("/session", async function (req, res) {
  if (!isLogged(req.session)) {
    req.session.destroy();
    res.status(401).send("User not logged");
  } else {
    // The video-call to connect
    let sessionName = req.body.sessionName;

    //var sessionName = req.body.sessionName;
    let findDBsessionName = await Room.findAll({
      raw: true,
      attributes: ["id"],
    });

    let nickname = req.session.loggedUser.nickname;
    //console.log(nickname);

    var role = [{ user: `${nickname}`, role: OpenViduRole.PUBLISHER }];
    //console.log(role);
    // Role associated to this user
    //let user = User.findAll({ where: { nickname } });
    //var role = User.findOne((u) => u.nickname === req.session.loggedUser).role;
    // var role = User.findOne({ where: { nickname } });

    // Optional data to be passed to other users when this user connects to the video-call
    // In this case, a JSON with the value we stored in the req.session object on login
    // var serverData = JSON.stringify({
    //   serverData: req.session.loggedUser.nickname,
    // });
    var serverData = JSON.stringify(nickname);
    //let role = OpenViduRole.PUBLISHER;
    console.log("Getting a token | {sessionName}={" + sessionName + "}");

    // Build connectionProperties object with the serverData and the role
    var connectionProperties = {
      data: serverData,
      role: OpenViduRole.PUBLISHER,
    };
    if (findDBsessionName === sessionName) {
      if (mapSessions[sessionName]) {
        console.log(sessionName);
        // Session already exists
        console.log("Existing session " + sessionName);

        // Get the existing Session from the collection
        var mySession = mapSessions[sessionName];

        // Generate a new token asynchronously with the recently created connectionProperties
        mySession
          .createConnection(connectionProperties)
          .then((connection) => {
            // Store the new token in the collection of tokens
            mapSessionNamesTokens[sessionName].push(connection.token);

            // Return the token to the client
            res.status(200).send({
              0: connection.token,
            });
          })
          .catch((error) => {
            console.error(error);
          });
        console.log(mapSessions[sessionName]);
      }
    } else {
      // New session
      console.log("New session " + sessionName);

      // Create a new OpenVidu Session asynchronously
      OV.createSession()
        .then((session) => {
          // Store the new Session in the collection of Sessions
          mapSessions[sessionName] = session;
          // Store a new empty array in the collection of tokens
          mapSessionNamesTokens[sessionName] = [];

          // Generate a new connection asynchronously with the recently created connectionProperties
          session
            .createConnection(connectionProperties)
            .then((connection) => {
              // Store the new token in the collection of tokens
              mapSessionNamesTokens[sessionName].push(connection.token);

              // Return the Token to the client
              res.status(200).send({
                0: connection.token,
              });
            })
            .catch((error) => {
              console.error(error);
            });
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
});

// Remove user from session
router.post("/api-sessions/remove-user", function (req, res) {
  if (!isLogged(req.session)) {
    req.session.destroy();
    res.status(401).send("User not logged");
  } else {
    // Retrieve params from POST body
    var sessionName = req.body.sessionName;
    var token = req.body.token;
    console.log(
      "Removing user | {sessionName, token}={" +
        sessionName +
        ", " +
        token +
        "}"
    );

    // If the session exists
    if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
      var tokens = mapSessionNamesTokens[sessionName];
      var index = tokens.indexOf(token);

      // If the token exists
      if (index !== -1) {
        // Token removed
        tokens.splice(index, 1);
        console.log(sessionName + ": " + tokens.toString());
      } else {
        var msg = "Problems in the app server: the TOKEN wasn't valid";
        console.log(msg);
        res.status(500).send(msg);
      }
      if (tokens.length == 0) {
        // Last user left: session must be removed
        console.log(sessionName + " empty!");
        delete mapSessions[sessionName];
      }
      res.status(200).send();
    } else {
      var msg = "Problems in the app server: the SESSION does not exist";
      console.log(msg);
      res.status(500).send(msg);
    }
  }
});

/* REST API */

/* AUXILIARY METHODS */

// async function login(user, pass) {
//   user = await User.findOne({ where: { user }, raw: true });
//   console.log(user);
//   return user;
// }

function isLogged(session) {
  console.log(session.loggedUser);
  return session.loggedUser != null;
}
function getBasicAuth() {
  return (
    "Basic " + new Buffer("OPENVIDUAPP:" + OPENVIDU_SECRET).toString("base64")
  );
}

module.exports = router;
