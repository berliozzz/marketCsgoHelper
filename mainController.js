const steamManager = require('./serverManagers/steamManager');
const marketManager = require('./serverManagers/marketManager');
const errorLog = require('./errorLog/errorMarketAPI');
const utils = require('./utils');
const config = require('./config');
const WebSocket = require('ws');

/******************** Variables *******************/
let trades = []; 
let itemRequestErrCount = 0;
let steamErrCount = 0;

/********************* Timers *********************/
let pingPongTimer;
let itemsTimer;

//************** Market API ***********************
const pingPong = () => {
  marketManager.pingPong()
    .then(res => {
      if (res.error) {
        console.log(res.error);
      }
    })
    .catch(err => {
      errorLog('pingPong', err);
    });
}

const items = () => {
  marketManager.items()
    .then(res => {
      if (res.success) {
        if (!res.items) return;
        trades = res.items;
        const activeTrades = trades.filter(utils.filterActiveTrades);
        if (activeTrades.length > 0) {
          tradeRequest();
        }
      } else {
        console.log('items response error: ' + res.error);
      }
    })
    .catch(err => {
      errorLog('items', err);
    });
}

const tradeRequest = () => {
  marketManager.tradeRequest() 
    .then(res => {
      if (res.success) {
        itemRequestErrCount = 0;
        sendItem(res.offer);
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
      errorLog('tradeRequest', err);
    });
}

const itemsDota = () => {
  marketManager.itemsDota()
    .then(res => {
      if (res.success) {
        if (!res.items) return;
        trades = res.items;
        const activeTrades = trades.filter(utils.filterActiveTrades);
        if (activeTrades.length > 0) {
          tradeRequestDota();
        }
      } else {
        console.log('items response error: ' + res.error);
      }
    })
    .catch(err => {
      errorLog('itemsDota', err);
    });
}

const tradeRequestDota = () => {
  marketManager.tradeRequestDota() 
    .then(res => {
      if (res.success) {
        itemRequestErrCount = 0;
        sendItem(res.offer);
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
      errorLog('tradeRequestDota', err);
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
      }
    });
}

/**************** Start functions ********************/
pingPong();

/***************** Start timers **********************/
pingPongTimer = setInterval(() => { pingPong() }, 120 * 1000);
itemsTimer = setInterval(() => {
  items();
  setTimeout(() => { itemsDota() }, 5 * 1000); 
}, 30 * 1000);

