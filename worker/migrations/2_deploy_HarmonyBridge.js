var HarmonyBridge = artifacts.require("Bridge");

module.exports = function(deployer, network, accounts) {

const threshold = process.env.THRESHOLD;
const maxValidatorCount= process.env.MAX_VALIDATOR_COUNT;
const transferFee = process.env.TRANSFER_FEE;
const coinDailyLimit = process.env.COIN_DAILY_LIMIT;

deployer.then(function() {
  return deployer.deploy(HarmonyBridge, threshold, maxValidatorCount, transferFee, coinDailyLimit)
  .then(function() {
    })
    .catch(err => console.log('err :>> ', err));
  });
};