const config = require('../config');

var rp = require('request-promise').defaults({
  baseUrl: 'https://market.csgo.com/api/v2/',
  qs: {key: config.market.marketApiKey},
  json: true 
});

const pingPong = () => {
  return new Promise ((resolve, reject) => {
    rp('ping')
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const items = () => {
  return new Promise ((resolve, reject) => {
    rp('items')
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

const tradeRequest = () => {
  return new Promise ((resolve, reject) => {
    rp('trade-request-give-p2p')
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
  items:          items,
  tradeRequest:   tradeRequest
}