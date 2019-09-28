const config = require('../config');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const EventEmitter = require('events');


const user = new SteamUser();
user.autoRelogin = false;
const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: user,
	community: community,
	language: 'en'
});
class SteamManager extends EventEmitter {};
const steamManager = new SteamManager;
let acceptOfferErrCount = 0;

const createLogOnOptions = () => {
	return {
    'accountName': config.steam.accountName,
    'password': config.steam.password,
    'twoFactorCode': SteamTotp.getAuthCode(config.steam.sharedSecret)
  }
};

user.logOn(createLogOnOptions());

//********************** Events ****************************
user.on('loggedOn', () => console.log('Logged into Steam'));

user.on('webSession', (sessionID, cookies) => {
	manager.setCookies(cookies);
  community.setCookies(cookies);
  console.log('webSession refreshed');
});

community.on('sessionExpired', err => {
  console.log('sessionExpired');
  if (user.steamID == null) {
    user.logOn(createLogOnOptions());
  } else {
    user.webLogOn(err => {
      if (err) {
          console.log('node-user webLogOn: ' + err.message);
      }
    });
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

//*************** SteamManager Methods *********************
steamManager.sendItem = (parameters) => {
  const message = parameters.request.tradeoffermessage;
  const tradeLink = parameters.request.tradelink;
  const items = parameters.request.items;
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

module.exports = steamManager;