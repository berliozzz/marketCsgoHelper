const steamManager = require('./serverManagers/steamManager');
const marketManager = require('./serverManagers/marketManager');
const utils = require('./utils');
const config = require('./config');
const WebSocket = require('ws');

/******************** Variables *******************/
let itemsInTrades = []; 
let itemsToSend = new Set();
let itemRequestErrCount = 0;
let steamErrCount = 0;

/********************* Timers *********************/
let pingPongTimer;

//************** Market API ***********************
const pingPong = () => {
  marketManager.pingPong()
    .then(res => {
      if (!res.success && !res.ping) {
        console.log('pingPong err: ' + res.error);
        pingPong();
      } else if (res.steamApiKey == false) {
        setSteamAPIKey();
      }
    })
    .catch(err => {
      console.log('pingPong error: ', err);
      pingPong();
    });
}

const trades = () => {
  marketManager.trades()
    .then(trades => {
      if (Array.isArray(trades)) {
        itemsInTrades = trades;

        if (trades.length > 0) {
          const activeTrades = trades.filter(utils.filterActiveTrades);
          if (activeTrades.length > 0) {
            itemRequest('in', '1');
          }
        }
      } else {
        console.log(`trades error: ${trades.error}`);
      }
    })
    .catch(err => {
      console.log('trades error: ', err);
      trades();
    });
}

const itemRequest = (sendOrReceive, botId) => {
  marketManager.itemRequest(sendOrReceive, botId)
    .then(res => {
        if (res.success) {
          itemRequestErrCount = 0;
          // если в сете еще нет нашего объекта
          if (!itemsToSend.has(res.secret)) {
            itemsToSend.add(res.secret);
            sendItem(res);
          }
        } else {
          console.log('itemRequest err:' + res.error);
          if (itemRequestErrCount != 3) {
            console.log('Пробую еще раз...');
            itemRequest('in', '1');
            itemRequestErrCount++;
          } else {
            itemRequestErrCount = 0;
            console.log('Не удалось передать предмет.');
          }
        }
    })
    .catch(err => {
      console.log('itemRequest error: ', err);
      itemRequest('in', '1');
    });
}

const getWSAuth = () => {
  marketManager.getWSAuth()
    .then(res => {
      if (res.success) {
        socketAuth(res);
      } else {
        console.log('getWSAuth err: ' + res.error);
        getWSAuth();
      }
    })
    .catch(err => {
      console.log('getWSAuth error: ', err);
      getWSAuth();
    });
}

const setSteamAPIKey = () => {
  marketManager.setSteamAPIKey()
    .then(res => {
      console.log(res);
    })
    .catch(err => {
      console.log('setSteamAPIKey error: ', err);
      setSteamAPIKey();
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
        itemsToSend.delete(params.secret);
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
        itemsToSend.delete(params.secret);
      }
    });
}

//************** Market sockets *******************
const socketAuth = response => {
  const ws = new WebSocket('wss://wsn.dota2.net/wsn/');
  ws.on('open', function open() {
    console.log('socket is open');
    ws.send(response.wsAuth);
    socketPingTimer = setInterval(() => ws.send('ping'), 40 * 1000);
  });
  
  ws.on('message', function incoming(msg) {
    if(msg != 'pong') {
      try {
        const message = JSON.parse(msg);
        if (message.type == 'setdirect' || message.type == 'setonline') {
          const data = JSON.parse(message.data);
          if (data == 'OFF') {
            pingPong();
          }
        } else if (message.type == 'itemout_new_go') {
          itemRequest('in', '1');
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
  
  ws.on('error', function error() { 
    console.log(`socketAuth: Error connecting! Reconnect...`);
    ws.close();
  });

  ws.on('close', function(code, message) {
    console.log(`Disconnection socket: ${code}`);
    clearInterval(socketPingTimer);
    setTimeout(() => getWSAuth(), 1 * 1000);
  });
}

/**************** Start functions ********************/
pingPong();
getWSAuth();

/***************** Start timers **********************/
pingPongTimer = setInterval(() => { pingPong() }, 150 * 1000);
tradesTimer = setInterval(() => { trades() }, 160 * 1000);

