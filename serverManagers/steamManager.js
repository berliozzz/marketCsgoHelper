const config = require('../config');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const request = require('request');
const utils = require('../utils');
const fs = require('fs');
const EventEmitter = require('events');

const proxyUrl = utils.getProxyUrl();

const user = new SteamUser({httpProxy: proxyUrl});
const community = new SteamCommunity({ request: request.defaults({ proxy: proxyUrl }) });
const manager = new TradeOfferManager({
	steam: user,
	community: community,
	language: 'en'
});
class SteamManager extends EventEmitter {};
const steamManager = new SteamManager;

let acceptOfferErrCount = 0;
let loginKey = '';

//********************** Events ****************************
user.on('loggedOn', () => console.log('Logged into Steam'));

user.on('webSession', (sessionID, cookies) => {
	manager.setCookies(cookies);
  community.setCookies(cookies);
  console.log('webSession refreshed');
});

user.on('disconnected', (eresult, msg) => {
  console.log(`disconnected message: ${msg}`);
});

user.on('error', err => {
  console.log('Steam error: ' + err);
});

user.on('loginKey', key => {
  writeFileWithLoginKey(key)
    .then(res => console.log(res))
    .catch(err => console.log(err));
});

community.on('sessionExpired', err => {
  console.log(`SessionExpired emitted. Reason: ${err}`);
  try {
      console.log('steamID: ' + user.steamID);
      if (!user.steamID) {
          loginSteam(createLogOnOptions());
      } else {
          user.webLogOn(err => {
              if (err) {
                  console.log('node-user webLogOn error: ' + err.message);
              }
          });
      }
  } catch (error) {
      console.log('Relogin error: ' + error);
  }
});

manager.on('newOffer', offer => {
  user.getPersonas([offer.partner], (err, personas) => {
    if (!err) {
      const persona = personas[offer.partner];
      const name = persona ? persona.player_name : ('[' + offer.partner + ']');
      console.log('Новое предложение обмена от ' + name);
    } else {
      console.log('getPersonas err: ', err);
    }
  });

  // если в предложении нет моих предметов
  // и предметы не находятся на удержании, сразу принимаем
  if (offer.itemsToGive.length == 0 && offer.state != 11) {
    acceptOffer(offer);
  } else {
    console.log('Предложение не было принято.');
    if (offer.itemsToGive.length > 0) {
      console.log('В предложении есть мои предметы.');
    } else if (offer.state == 11) {
      console.log('Предмет в предложении находится на удержании.');
    }
  }
});

//*************** Private Functions ***************************
const acceptOffer = (offer) => {
  offer.accept((err, status) => {
    if (err) {
      console.log('accept offer: ' + err.message);
      if (acceptOfferErrCount < 3) {
        console.log('Пробую еще раз...');
        acceptOfferErrCount++;
        setTimeout(() => { acceptOffer(offer) }, 10 * 1000);
      } else {
        acceptOfferErrCount = 0;
        console.log('Не получилось принять предмет.');
      }
    } else {
      acceptOfferErrCount = 0;
      if (status == 'accepted') {
        console.log('Предложение успешно принято.');
      } else {
        console.log(status);
      }
    }
  });
}

const createLogOnOptions = () => {
  if (utils.isEmpty(loginKey)) {
    return {
      accountName:      config.steam.accountName,
      password:         config.steam.password,
      twoFactorCode:    SteamTotp.getAuthCode(config.steam.sharedSecret),
      rememberPassword: true
    }
  } else {
    return {
      accountName:      config.steam.accountName,
      loginKey:         loginKey, 
      rememberPassword: true
    }
  }
};

const readFileWithLoginKey = () => {
  fs.readFile('token.json', 'utf8', (err, data) => {
    if (err) {
      console.log('readFile error: ' + err);
    } else {
      loginKey = data;
    }
    user.logOn(createLogOnOptions());
  });
}

const writeFileWithLoginKey = (key) => {
  return new Promise ((resolve, reject) => {
    fs.writeFile('token.json', key, 'utf8', (err) => {
      if (!err) {
          resolve('Successful write to token.json.');
      } else {
          reject('writeFile token.json error: ' + err);
      }
    });
  });
}

//*************** SteamManager Methods *********************
steamManager.sendItem = (parameters) => {
  const message = parameters.tradeoffermessage;
  const items = parameters.items;
  const tradeLink = `https://steamcommunity.com/tradeoffer/new/?partner=${parameters.partner}&token=${parameters.token}`;

  let tradeOffer = manager.createOffer(tradeLink);
  tradeOffer.addMyItems(items);
  tradeOffer.setMessage(message);

  return new Promise ((resolve, reject) => {
    tradeOffer.send((err, status) => {
      if (err) {
        reject(err);
      } else {
        resolve({status: status, id: tradeOffer.id});
      }
    });
  });
}

steamManager.acceptConfirmation = (tradeOfferId) => {
  return new Promise ((resolve, reject) => {
    community.acceptConfirmationForObject(config.steam.identitySecret, tradeOfferId, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve('Обмен успешно подтвержден.');
      }
    });
  });
}

readFileWithLoginKey();
setInterval(() => user.webLogOn(), 30 * 60 * 1000);

module.exports = steamManager;