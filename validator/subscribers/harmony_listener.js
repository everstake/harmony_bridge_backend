const { ContractFactory } = require("@harmony-js/contract");
const { Wallet, Account } = require("@harmony-js/account");
const { Messenger, WSProvider } = require("@harmony-js/network");
const { ChainID, ChainType, hexToNumber } = require("@harmony-js/utils");
const { Harmony } = require("@harmony-js/core");

const dbController = require("../services/db_controller");
const transactionSender = require("../services/transaction_sender");
const logger = require('../logger');

const config = require("../config/harmony_conf.json");
const contract = require("../config/harmony_contract.json");

const ws = new WSProvider(config.provider);

const wallet = new Wallet(
  new Messenger(ws, ChainType.Harmony, ChainID.HmyTestnet)
);
const factory = new ContractFactory(wallet);

const contractAddr = config.contractAddress;

const contractObj = factory.createContract(contract.abi, contractAddr);

async function processEvent(eventData) {
  logger.info.log("info", "Prepare Harmony data to save and process it");
  let dataToSave = {
    chain_id: eventData.returnData.chainId,
    address_to: eventData.returnData.receiver,
    address_from: eventData.returnData.sender,
    tx_time: eventData.returnData.timestamp,
    amount: eventData.returnData.amount,
    asset: eventData.returnData.asset,
    uniq_id: eventData.returnData.transferNonce,
    transaction_hash: eventData.transactionHash,
    block_hash: eventData.blockHash
  }
  let txId = await dbController.saveTx("Harmony", dataToSave);
  await transactionSender.processSwapToEdgeware(/*"Harmony", "Polka", */eventData.returnData, txId);
}

exports.listenEvents = async function (skipOldBlocks) {
  const hmy = new Harmony(config.provider, {
    chainType: ChainType.Harmony,
    chainId: ChainID.HmyTestnet,
  });

  try{
    var options = {};
    if (!skipOldBlocks) {
      const lastProcessedBlock = await dbController.getLastProcessed('harmony');
      options = { fromBlock: lastProcessedBlock + 1 };
    }
    console.log(`start listening for Harmony events from ${options.fromBlock ?? 10057790}`);
    contractObj.events.TokensTransfered(options)
      .on("data", async (event) => {
        logger.info.log("info", `Catch Transfer event in Harmony blockchain with such a data: ${event}`);
        console.log(`Catch Transfer event in Harmony blockchain with such a data: ${JSON.stringify(event)}`);
        let eventData = {
          transactionHash: event.transactionHash,
          blockHash: event.blockHash,
          returnData: {
            receiver: event.returnValues['0'],
            sender: event.returnValues['1'],
            amount: event.returnValues['2'],
            asset: event.returnValues['3'],
            transferNonce: event.returnValues['4'],
            timestamp: event.returnValues['5']
          }
        };
        if (typeof eventData.returnData.amount === 'string') {
          eventData.returnData.amount = parseInt(eventData.returnData.amount);
        }
        if (typeof eventData.returnData.transferNonce === 'string') {
          eventData.returnData.transferNonce = parseInt(eventData.returnData.transferNonce);
        }
        if (typeof eventData.returnData.timestamp === 'string') {
          eventData.returnData.timestamp = parseInt(eventData.returnData.timestamp);
        }
        await processEvent(eventData);
        if (event.blockNumber) {
          await dbController.setLastProcessed('harmony', event.blockNumber);
        }
      })
      .on("error", async (error) => {
        logger.error.log("error", `Error while catch Harmony Transfer events: ${error}`);
        console.log(`Error while catch Harmony Transfer events: ${JSON.stringify(error)}`);
      });
  } catch(e) {
    logger.error.log("error", `Error while listening Harmony Transfer events: ${e}`);
    console.log(`Error while listening Harmony Transfer events: ${e}`);
  }
};
