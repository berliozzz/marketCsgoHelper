import * as serverManager from './serverManagers/marketServerManager.js'
import steamManager from './serverManagers/steamManager.js'
import {market} from './config.js'
import * as utils from './utils.js'

/******************** Variables *******************/
let trades = []
let transferredItems = []
let itemRequestErrCount = 0
let steamErrCount = 0
let accessToken = ''

const SEC = 1000

//************** Market API ***********************
const pingNew = accessToken => {
  serverManager.pingNew(accessToken)
    .then(res => {
      if (!res.data.success) {
        if (res.data.message.includes('token')) {
          console.log(res.data.message)
        }
      }
    })
    .catch(err => {
      if (market.showLog) console.log('pingNew err: ' + err.message)
    })
}
const items = () => {
  serverManager.items()
    .then(res => {
      if (res.data.success) {
        trades = res.data.items
        
        const activeTrades = trades.filter(utils.filterActiveTrades)
        if (activeTrades.length > 0) {
          tradeRequest()
        }
      } else {
        console.log('items response error: ' + res.data.message)
      }
    })
    .catch(err => {
      if (market.showLog) console.log('getItems err: ' + err.message)
    })
}
const tradeRequest = () => {
  serverManager.tradeRequest() 
    .then(res => {
      if (res.data.success) {
        itemRequestErrCount = 0
        for (const tradeoffermessage of transferredItems) {
          if (res.data.offer.tradeoffermessage === tradeoffermessage) {
            return
          }
        }
        sendItem(res.data.offer)
      } else {
        console.log('tradeRequest response error: ' + res.data.message)
        if (itemRequestErrCount != 3) {
          console.log('Пробую еще раз...')
          tradeRequest()
          itemRequestErrCount++
        } else {
          itemRequestErrCount = 0
          console.log('Не удалось передать предмет.')
        }
      }
    })
    .catch(err => {
      if (market.showLog) console.log('tradeRequest err: ' + err.message)
      tradeRequest()
    })
}
const tradeReady = offerId => {
  serverManager.tradeReady(offerId)
    .then(res => {
      if (res.data.success) {
        if (market.showLog) console.log(colors.green(res.data))
      } else {
        if (market.showLog) console.log(colors.red('tradeReady res err: ' + res.data.error))
      }
    })
    .catch(err => {
      if (market.showLog) console.log(colors.red('tradeReady err: ' + err.message))
      setTimeout(() => tradeReady(offerId), 2 * SEC)
    })
}

/***************** Start timers **********************/
const startTimers = () => {
  setInterval(() => pingNew(accessToken), 60 * SEC)
  setInterval(() => items(), 20 * SEC)
}

//*********** Steam Server Manager ****************
const sendItem = (params) => {
  steamManager.sendItem(params)
    .then(data => {
      if (data.status == 'pending') {
        steamErrCount = 0
        console.log('Обмен отправлен и ожидает мобильного подтверждения...')
        setTimeout(() => { acceptConfirmation(data.id, params) }, 500)
      } else {
        console.log('status: ' + data.status)
      }
    })
    .catch(err => {
      console.log('sendItem error: ' + err.message)
      if (~err.message.indexOf('(15)')) {
        console.log('Ошибка отправки предмета, данный профиль не может обмениваться.')
      }
      if (steamErrCount > 5) {
        setTimeout(() => { sendItem(params) }, 5000)
      } else {
        steamErrCount = 0
      }
    })
}
const acceptConfirmation = (confirmationid, params) => {
  steamManager.acceptConfirmation(confirmationid)
    .then(res => {
      steamErrCount = 0
      console.log(res)
      transferredItems.push(params.tradeoffermessage)
      tradeReady(confirmationid)
    })
    .catch(err => {
      console.log('acceptConfirmation err: ' + err.message)
      if (steamErrCount > 5) {
        setTimeout(() => { acceptConfirmation(confirmationid) }, 5000)
      } else {
        steamErrCount = 0
      }
    })
}
steamManager.on('webSession', () => {
  items()
})
steamManager.on('accessToken', token => {
  accessToken = token.accessToken
  pingNew(accessToken)
  startTimers()
})