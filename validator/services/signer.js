const ethSig = require("../nano-ethereum-signer");

exports.signMessageForHarmony = function (swapMessage, key) {
  let signature = ethSig.signMessage(swapMessage, key);
  return signature;
};
