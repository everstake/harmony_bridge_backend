const ethSig = require("nano-ethereum-signer");
// const keys = require("../config/keys.json");

exports.signMessageForHarmony = function (swapMessage, privateValidatorKey) {
  let signature = ethSig.signMessage(swapMessage, privateValidatorKey);
  return signature;
};
