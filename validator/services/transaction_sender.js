const axios = require("axios");

const hasher = require("../utils/hashing");
const signer = require("./signer");
let assets = require("../config/assets.json");
let chainIds = require("../config/chain_ids.json");
let workerEndpoints = require("../config/worker_endpoints.json");
let dbController = require("./db_controller");
const logger = require("../logger");

exports.processEvent = async function (
  fromBlockchain,
  toBlockchain,
  eventData,
  transactionId
) {
  logger.info.log(
    "info",
    `Start to prepare data about transfer from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} for signing and sending to the Worker`
  );
  eventData.chainId = chainIds[process.env.CHAIN_ID];
  eventData.asset =
    assets[fromBlockchain + "-" + toBlockchain][eventData.asset];
  try {
    let sortedData = sortDict(eventData);
    let hashedMessage = hashSwapRequest(sortedData, toBlockchain);
    let signature = signSwapRequest(hashedMessage, toBlockchain);
    let sendRequestSwap = await sendSwapRequest(
      sortedData,
      hashedMessage,
      signature
    );
    if (sendRequestSwap) {
      logger.info.log(
        "info",
        `Swap request from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} was sent to the Worker successfully`
      );
      let changeStatus = await dbController.changeTxStatus(
        fromBlockchain,
        transactionId,
        "Approved"
      );
      logger.info.log("info", `Swap request from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} was save in DB as "Approved"`);
    } else {
      logger.error.log(
        "error",
        `Error occurse while try to send swap request from ${fromBlockchain} to ${toBlockchain} to the Worker. Transaction with ID ${transactionId} will be send latter with Recovery service.`
      );
    }
  } catch (e) {
    logger.error.log(
      "error",
      `Error while processing data about transfer from ${fromBlockchain} to ${toBlockchain}: ${e}`
    );
  }
};

function hashSwapRequest(message, toBlockchain) {
  if (toBlockchain == "Harmony") {
    let hashedMessage = hasher.hashMessageForHarmony(message);
    return hashedMessage;
  } else {
    throw "Receive unknown blockchain";
  }
}

function signSwapRequest(message, toBlockchain) {
  if (toBlockchain == "Harmony") {
    let signerMessage = signer.signMessageForHarmony(message);
    return signerMessage;
  } else {
    throw "Receive unknown blockchain";
  }
}

async function sendSwapRequest(message, hashedMessage, signature) {
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
  if (response.ok) {
    return true;
  } else {
    return false;
  }
}

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
