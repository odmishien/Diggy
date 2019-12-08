const express = require("express");
const request = require("request");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
const dateformat = require("dateformat");

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URL;
const tolerance = 0.1;
const tempoTolerance = 20;
const queryStrs =
  "abcdefghijklmnopqrstuvwxyzあいうえおかきくけこさしすせそたちってとなにぬねのはひふへほまみむめもやゆよわをん";

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

var app = express();
app.set('port', (process.env.PORT || 5000));

app
  .use(express.static(__dirname + "/public", { index: false }))
  .use(cors())
  .use(cookieParser());

app.get("/", function (req, res) {
  let access_token = req.cookies.at;
  let userId = req.cookies.userId;
  if (access_token && userId) {
    res.sendFile(path.join(__dirname, "public/index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

app.get("/login", function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = "user-read-private playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      })
  );
});

app.get("/callback", function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch"
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64")
      },
      json: true
    };

    request.post(authOptions, async function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        let userId;

        let spotifyApi = new SpotifyWebApi({
          clientId: client_id,
          clientSecret: client_secret,
          redirectUri: redirect_uri
        });
        spotifyApi.setAccessToken(access_token);
        res.cookie('at', access_token, { maxAge: 600000 });
        await spotifyApi
          .getMe()
          .then(data => {
            userId = data.body.id;
          })
          .catch(err => {
            console.log(err);
            res.send("There was an error during the authentication");
          });
        res.cookie('userId', userId, { maxAge: 600000 });
        res.redirect("/");
      } else {
        res.send("There was an error during the authentication");
      }
    });
  }
});

app.get("/refresh_token", function(req, res) {
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token
      });
    }
  });
});

app.get("/dig", async (req, res) => {
  let access_token = req.cookies.at;
  let userId = req.cookies.userId;
  if (!access_token || !userId) {
    res.redirect('/')
  } else {
    let happinessVal = req.query.happiness;
    let energyVal = req.query.energy;
    let tempoVal = req.query.tempo;
    let properTracks = [];

    let spotifyApi = new SpotifyWebApi({
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uri
    });
    spotifyApi.setAccessToken(access_token);
    await createPlaylist(100);

    async function createPlaylist(tryCount) {
      let playlistUri;
      for (let i = 0; i < tryCount; i++) {
        await new Promise(r => setTimeout(r, 3000));
        let q = queryStrs[getRandomInt(0, queryStrs.length)];
        spotifyApi
          .searchTracks(q, {
            market: "JP",
            limit: 5,
            offset: getRandomInt(1, 1000)
          })
          .then(data => {
            let tracks = data.body.tracks.items;
            for (let track of tracks) {
              spotifyApi
                .getAudioFeaturesForTrack(track.id)
                .then(data => {
                  let featureResult = data.body;
                  if (isProperTrack(featureResult)) {
                    properTracks.push(track.uri);
                  }
                })
                .catch(err => {
                  console.log(err);
                });
            }
          })
          .catch(err => {
            console.log(err);
          });
        if (properTracks.length > 6) {
          // もう日本時間にしたろ
          let now = new Date().toLocaleString({ timeZone: 'Asia/Tokyo' });
          let ts = dateformat(now, "yyyy/MM/dd HH:mm:ss");
          spotifyApi
            .createPlaylist(userId, ts)
            .then(data => {
              let playlistId = data.body.id;
              playlistUri = data.body.external_urls.spotify;
              spotifyApi
                .addTracksToPlaylist(playlistId, properTracks)
                .then(data => {
                  console.log("playlist:");
                  console.log(playlistUri);
                  res.redirect(playlistUri);
                })
                .catch(err => {
                  console.log(err);
                  res.send('something wrong!!');
                });
            })
            .catch(err => {
              console.log(err);
              res.send('something wrong!!');
            });
          break;
        }
      }
    }

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
    }

    function isProperTrack(feature) {
      let judgeCount = 0;
      if (
        happinessVal / 100 - tolerance < feature.valence &&
        feature.valence < happinessVal / 100 + tolerance
      ) {
        judgeCount += 1;
      }

      if (
        energyVal / 100 - tolerance < feature.energy &&
        feature.energy < energyVal / 100 + tolerance
      ) {
        judgeCount += 1;
      }

      if (
        tempoVal - tempoTolerance < feature.tempo &&
        feature.tempo < tempoVal + tempoTolerance
      ) {
        judgeCount += 1;
      }

      if (judgeCount >= 2) {
        return true;
      } else {
        return false;
      }
    }
  }
});

app.listen(app.get('port'));
