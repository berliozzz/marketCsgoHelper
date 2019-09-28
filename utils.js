module.exports = {
  filterActiveTrades: (trade) => {
    return trade.ui_status == 2;
  }
}