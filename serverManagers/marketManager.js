const config = require('../config');

var rp = require('request-promise').defaults({
  baseUrl: 'https://market.csgo.com/api/',
  qs: {key: config.market.marketApiKey},
  json: true 
});


const pingPong = () => {
  return new Promise ((resolve, reject) => {
    rp('PingPong/direct/')
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const trades = () => {
  return new Promise ((resolve, reject) => {
    rp('Trades/')
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const itemRequest = (sendOrReceive, botId) => {
  return new Promise ((resolve, reject) => {
    rp(`ItemRequest/${sendOrReceive}/${botId}/`)
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const getWSAuth = () => {
  return new Promise ((resolve, reject) => {
    rp('GetWSAuth/')
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const setSteamAPIKey = () => {
  return new Promise ((resolve, reject) => {
    rp(`SetSteamAPIKey/${config.steam.steamApiKey}/`)
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

module.exports = {
  pingPong:       pingPong,
  trades:         trades,
  itemRequest:    itemRequest,
  getWSAuth:      getWSAuth,
  setSteamAPIKey: setSteamAPIKey
}