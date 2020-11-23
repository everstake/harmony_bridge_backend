const keccak256 = require("keccak256");
const Web3 = require("web3");
const BigNumber = require('big-number');
let web3 = new Web3(global.gConfig.harmony.endpoint);

exports.hashMessageForHarmony = function (message) {
  let abiMessage = web3.eth.abi.encodeParameters(
    ["uint256", "address", "string", "uint256", "uint256", "address", "uint256"],
    [
      message.chainId,
      message.receiver,
      message.sender,
      message.timestamp,
      new BigNumber(message.amount),
      message.asset,
      message.transferNonce,
    ]
  );
  return "0x" + keccak256(abiMessage).toString("hex");
};
