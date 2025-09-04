import {proxy} from './config.js'

export const isEmpty = string => {
  if (string.trim() == '') {
    return true
  }
  return false
}
export const getProxyUrl = () => {
  if (!isEmpty(proxy.domen) && !isEmpty(proxy.port) && !isEmpty(proxy.user) && !isEmpty(proxy.password)) {
    return `http://${proxy.user}:${proxy.password}@${proxy.domen}:${proxy.port}`
  }
  if (!isEmpty(proxy.domen) && !isEmpty(proxy.port) && isEmpty(proxy.user) && isEmpty(proxy.password)) {
    return `http://${proxy.domen}:${proxy.port}`
  }
  return ''
}
export const filterActiveTrades = item => {
  if (item.status == 2 && item.left > 0) {
    return true
  }
  return false
}
