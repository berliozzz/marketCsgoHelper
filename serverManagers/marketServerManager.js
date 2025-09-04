import axios from 'axios'
import {HttpsProxyAgent} from 'https-proxy-agent'
import {market} from '../config.js'
import {isEmpty,getProxyUrl} from '../utils.js'

const proxyUrl = getProxyUrl()

const marketApiInstance = axios.create({
  baseURL: market.baseUrl,
  params: {key: market.apiKey}
})

if (!isEmpty(proxyUrl)) marketApiInstance.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl)

export const pingNew = accessToken => {
  const options = {
    method: 'post',
    url: 'ping-new',
    data: { access_token: accessToken, proxy: proxyUrl }
  }
  return new Promise((resolve, reject) => {
    marketApiInstance(options)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        reject(error)
      })
  })
}
export const items = () => {
  const options = {
    method: 'GET',
    url: 'items'
  }
  return new Promise((resolve, reject) => {
    marketApiInstance(options)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        reject(error)
      })
  })
}
export const tradeRequest = () => {
  const options = {
    method: 'GET',
    url: 'trade-request-give-p2p'
  }
  return new Promise((resolve, reject) => {
    marketApiInstance(options)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        reject(error)
      })
  })
}
export const tradeReady = offerId => {
  const options = {
    method: 'GET',
    url: 'trade-ready',
    params: {tradeoffer: offerId}
  }
  return new Promise((resolve, reject) => {
    marketApiInstance(options)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        reject(error)
      })
  })
}