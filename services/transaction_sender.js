// const axios = require("axios");

const hasher = require("../utils/hashing");
const signer = require("./signer");
let assets = require("../config/assets.json");
let chainIds = require("../config/chain_ids.json");
let workerEndpoints = require("../config/worker_endpoints.json");
let dbController = require("./db_controller");

exports.processEvent = async function (
  fromBlockchain,
  toBlockchain,
  eventData,
  transactionId
) {
  eventData.chainId = chainIds[process.env.CHAIN_ID];
  eventData.asset =
    assets[fromBlockchain + "-" + toBlockchain][eventData.asset];
  let sortedData = sortDict(eventData);
  let hashedMessage = hashSwapRequest(sortedData, toBlockchain);
  let signature = signSwapRequest(hashedMessage, toBlockchain);
  let sendRequestSwap = await sendSwapRequest(sortedData, hashedMessage, signature);
  if (sendRequestSwap) {
    let changeStatus = await dbController.changeTxStatus(fromBlockchain, transactionId, "Approved");
    console.log("CHANGE TX STATUS SUCCESSFULLY");
  } else {
      NaN  // TODO: write error into logs
  }
};

function hashSwapRequest (message, toBlockchain) {
  if (toBlockchain == "Harmony") {
    let hashedMessage = hasher.hashMessageForHarmony(message);
    return hashedMessage;
  } else {
    throw "Receive unknown blockchain";
  }
};

function signSwapRequest (message, toBlockchain) {
  if (toBlockchain == "Harmony") {
    let signerMessage = signer.signMessageForHarmony(message);
    return signerMessage;
  } else {
    throw "Receive unknown blockchain";
  }
};

async function sendSwapRequest (message, hashedMessage, signature) {
  let response = await axios.post(
    workerEndpoints.worker1 + "/swapTransaction",
    {
      chainId: message.chainId,
      receiver: message.receiver,
      sender: message.sender,
      timestamp: message.timestamp,
      amount: message.amount,
      asset: message.asset,
      transferNonce: message.transferNonce,
      hashedMessage: hashedMessage,
      signature: signature,
    }
  );
  if (response.ok) {  // TODO: check what response will be and check it status
      return true;
  } else {
      return false;
  }
};

function sortDict(unsortedMessage) {
  return {
    chainId: unsortedMessage.chainId,
    receiver: unsortedMessage.receiver,
    sender: unsortedMessage.sender,
    timestamp: unsortedMessage.timestamp,
    amount: unsortedMessage.amount,
    asset: unsortedMessage.asset,
    transferNonce: unsortedMessage.transferNonce,
  };
}
