import SteamUser from 'steam-user'
import {LoginSession, EAuthTokenPlatformType} from 'steam-session'
import {getAuthCode} from 'steam-totp'
import SteamCommunity from 'steamcommunity'
import TradeOfferManager from 'steam-tradeoffer-manager'
import request from 'request'
import EventEmitter from 'events'
import {steam} from '../config.js'
import {isEmpty,getProxyUrl} from '../utils.js'

class SteamManager extends EventEmitter {}
let steamManager = new SteamManager

const SEC = 1000
const proxyUrl = getProxyUrl()
const userOptions = {autoRelogin: false, renewRefreshTokens: true}
if (!isEmpty(proxyUrl)) userOptions.httpProxy = proxyUrl

const user = new SteamUser(userOptions)
const community = new SteamCommunity({request: request.defaults({proxy: proxyUrl})})
const manager = new TradeOfferManager({
	steam: user,
	community: community,
	language: 'en',
  cancelTime: 10 * 60 * SEC,
  pendingCancelTime: 1 * 60 * SEC,
  useAccessToken: true 
})

let acceptOfferErrCount = 0
let isWebSessionFired = false
let refreshToken = ''

//*************** SteamManager Methods *********************
steamManager.sendItem = parameters => {
  const message = parameters.tradeoffermessage
  const items = parameters.items
  const tradeLink = `https://steamcommunity.com/tradeoffer/new/?partner=${parameters.partner}&token=${parameters.token}`

  let tradeOffer = manager.createOffer(tradeLink)
  tradeOffer.addMyItems(items)
  tradeOffer.setMessage(message)
  
  return new Promise ((resolve, reject) => {
    tradeOffer.send((err, status) => {
      if (err) {
        reject(err)
      } else {
        resolve({status: status, id: tradeOffer.id})
      }
    })
  })
}
steamManager.acceptConfirmation = tradeOfferId => {
  return new Promise ((resolve, reject) => {
    community.acceptConfirmationForObject(steam.identitySecret, tradeOfferId, err => {
      if (err) {
        reject(err)
      } else {
        resolve('Обмен успешно подтвержден.')
      }
    })
  })
}

//********************** Events ****************************
user.on('loggedOn', () => {
  if (!isWebSessionFired) {
    console.log('logged on')
  }
})
user.on('webSession', (sid, cookies) => {
  if (!isWebSessionFired) {
    console.log('webSession event.')
    isWebSessionFired = true
  }
	manager.setCookies(cookies)
  community.setCookies(cookies)
})
user.on('error', err => {
  if (!isWebSessionFired) {
    console.log('node user: ' + err.message)
  }
})
user.on('disconnected', (eresult, msg) => {
  console.log(`disconnected message: ${msg}`)
})
user.on('refreshToken', refreshToken => {
  console.log('Got new refresh token: ' + refreshToken)
  steamManager.emit('accessToken', {
    accessToken: session.accessToken
  })
})
community.on('sessionExpired', err => {
  console.log(`SessionExpired emitted. Reason: ${err}`)
})
manager.on('newOffer', offer => {
  offer.getUserDetails((err, me, them) => {
    let partner = {}
    if (err) {
      console.log('getUserDetails error: ' + err.message)
      partner.escrowDays = 0
      partner.personaName = 'Unknown user'
      partner.contexts = {
        '730': {
          asset_count: 3 
        }
      }
    } else {
      partner = them
    }
    console.log('Новое предложение обмена от ' + partner.personaName)

    if (offer.itemsToGive.length > 0) {
      console.log('В предложении есть мои предметы. Предложение не было принято.')
      return
    }
    if (partner.escrowDays != 0) {
      console.log(`У этого пользователя предметы на удержании ${partner.escrowDays} дня. Предложение не было принято.`)
      return
    }
    acceptOffer(offer)
  })
})
manager.on('sentOfferCanceled', () => {
  console.log('Обмен отменен, так как не был принят течение 10 минут.')
})
manager.on('sentPendingOfferCanceled', () => {
  console.log('Обмен отменен, так как не был подтверждён.')
})

//*************** Help Functions ***************************
const acceptOffer = offer => {
  offer.accept((err, status) => {
    if (err) {
      console.log('accept offer: ' + err.message)
      if (acceptOfferErrCount < 3) {
        console.log('Пробую еще раз...')
        if (!(~err.message.indexOf('(28)'))) {
          acceptOfferErrCount++
        }
        setTimeout(() => { acceptOffer(offer) }, 2 * SEC)
      } else {
        acceptOfferErrCount = 0
        console.log('Не получилось принять предмет.')
      }
    } else {
      acceptOfferErrCount = 0
      if (status == 'accepted') {
        console.log('Предложение успешно принято.')
        steamManager.emit('acceptedOffer')
      } else {
        console.log(`Предложение принято со статусом: ${status}`)
      }
    }
  })
}

/************** steam-session ******************/
let session = new LoginSession(EAuthTokenPlatformType.SteamClient, {httpProxy: proxyUrl}) 
session.startWithCredentials({
	accountName: steam.accountName,
	password: steam.password,
	steamGuardCode: getAuthCode(steam.sharedSecret)
})
session.on('authenticated', () => {
  console.log('authenticated')
  refreshToken = session.refreshToken
  user.logOn({ refreshToken })
  steamManager.emit('accessToken', {
    accessToken: session.accessToken
  })
})

//************* Start steam manager *********************
setInterval(() => {
  if (user.steamID) {
    user.webLogOn()
  } else {
    user.logOn({ refreshToken })
  }
}, 60 * 60 * SEC)

export {steamManager as default}