module.exports = {
  filterActiveTrades: (item) => {
    return item.status == 2;
  }
}