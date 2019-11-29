const config = require('./config');

module.exports = {
  filterActiveTrades: (item) => {
    return item.status == 2;
  },
  isEmpty: (str) => {
    if (str.trim() == '') {
      return true;
    }
    return false;
  }, 
  getProxyUrl() {
    if (!this.isEmpty(config.proxy.domen) && !this.isEmpty(config.proxy.port) && !this.isEmpty(config.proxy.user) && !this.isEmpty(config.proxy.password)) {
      return `http://${config.proxy.user}:${config.proxy.password}@${config.proxy.domen}:${config.proxy.port}`;
    }
    if (!this.isEmpty(config.proxy.domen) && !this.isEmpty(config.proxy.port) && this.isEmpty(config.proxy.user) && this.isEmpty(config.proxy.password)) {
      return `http://${config.proxy.domen}:${config.proxy.port}`;
    }
    return '';
  }
}