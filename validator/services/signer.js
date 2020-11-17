const ethSig = require("../nano-ethereum-signer");
const keys = require("../config/keys.json");

exports.signMessageForHarmony = function (swapMessage) {
  let signature = ethSig.signMessage(swapMessage, this.keys.harmony_key);
  return signature;
};
