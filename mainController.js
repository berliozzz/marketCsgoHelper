const steamManager = require('./serverManagers/steamManager');
const marketManager = require('./serverManagers/marketManager');
const utils = require('./utils');
const config = require('./config');
const WebSocket = require('ws');

/******************** Variables *******************/
let trades = []; 
let itemsToSend = new Set();
let itemRequestErrCount = 0;
let steamErrCount = 0;

/********************* Timers *********************/
let pingPongTimer;
let itemsTimer;

//************** Market API ***********************
const pingPong = () => {
  marketManager.pingPong()
    .then(res => {
      //console.log(res);
    })
    .catch(err => {
      console.log('pingPong error: ', err);
    });
}

const items = () => {
  marketManager.items()
    .then(res => {
      if (res.success && res.items) {
        trades = res.items;
        if (trades.length > 0) {
          const activeTrades = trades.filter(utils.filterActiveTrades);
          if (activeTrades.length > 0) {
            tradeRequest();
          }
        }
      }
    })
    .catch(err => {
      console.log('items error: ', err);
    });
}

const tradeRequest = () => {
  marketManager.tradeRequest() 
    .then(res => {
      if (res.success) {
        itemRequestErrCount = 0;
        // если в сете еще нет нашего объекта
        if (!itemsToSend.has(res.offer.tradeoffermessage)) {
          itemsToSend.add(res.offer.tradeoffermessage);
          sendItem(res.offer);
        }
      } else {
        console.log('tradeRequest err:' + res.error);
        if (itemRequestErrCount != 3) {
          console.log('Пробую еще раз...');
          tradeRequest();
          itemRequestErrCount++;
        } else {
          itemRequestErrCount = 0;
          console.log('Не удалось передать предмет.');
        }
      }
    })
    .catch(err => {
      console.log('tradeRequest error: ', err);
    });
}

//*********** Steam Server Manager ****************
const sendItem = (params) => {
  steamManager.sendItem(params)
    .then(data => {
      if (data.status == 'pending') {
        steamErrCount = 0;
        console.log('Обмен отправлен и ожидает мобильного подтверждения...');
        setTimeout(() => { acceptConfirmation(data.id, params) }, 500);
      } else {
        console.log('status: ' + status);
      }
    })
    .catch(err => {
      console.log('sendItem: ' + err.message);
      if (~err.message.indexOf('(15)')) {
        console.log('Ошибка отправки предмета, данный профиль не может обмениваться: ' + params.profile);
      }
      if (steamErrCount > 5) {
        setTimeout(() => { sendItem(params) }, 5000);
      } else {
        steamErrCount = 0;
        itemsToSend.delete(params.tradeoffermessage);
      }
    });
}

const acceptConfirmation = (confirmationid, params) => {
  steamManager.acceptConfirmation(confirmationid)
    .then(str => {
      steamErrCount = 0;
      console.log(str);
    })
    .catch(err => {
      console.log('acceptConfirmation: ' + err.message);
      if (steamErrCount > 5) {
        setTimeout(() => { acceptConfirmation(confirmationid, params) }, 5000);
      } else {
        steamErrCount = 0;
        itemsToSend.delete(params.tradeoffermessage);
      }
    });
}

/**************** Start functions ********************/
pingPong();

/***************** Start timers **********************/
pingPongTimer = setInterval(() => { pingPong() }, 150 * 1000);
itemsTimer = setInterval(() => { items() }, 30 * 1000);

