module.exports = {
  filterActiveTrades: (item) => {
    return item.status == 2;
  },
  isEmpty: (str) => {
    if (str.trim() == '') {
      return true;
    }
    return false;
  }
}