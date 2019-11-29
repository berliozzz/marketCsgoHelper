module.exports = (functionName, error) => {
  const result = error.message.match(/(\d+) - "/);

  if (result) {
    const numberOfError = result[1];
    console.log(`${functionName} error: ${numberOfError}`);
  } else {
    console.log(`${functionName} error: ${error.message}`);
  }
}