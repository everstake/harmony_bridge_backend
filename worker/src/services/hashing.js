const keccak256 = require("keccak256");
const Web3 = require("web3");
let web3 = new Web3(global.gConfig.harmony.endpoint);

exports.hashMessageForHarmony = function (message) {
  let abiMessage = web3.eth.abi.encodeParameters(
    ["uint", "address", "string", "uint", "uint", "address", "uint"],
    [
      message.chainId,
      message.receiver,
      message.sender,
      message.timestamp,
      message.amount,
      message.asset,
      message.transferNonce,
    ]
  );
  return "0x" + keccak256(abiMessage).toString("hex");
};
