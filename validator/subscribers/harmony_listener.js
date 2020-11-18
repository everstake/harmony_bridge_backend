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

exports.listenEvents = async function () {
  const hmy = new Harmony(config.provider, {
    chainType: ChainType.Harmony,
    chainId: ChainID.HmyTestnet,
  });

  try{
    const contractO = hmy.contracts.createContract(contract.abi, contractAddr);
    contractO.events
      .Transfer()
      .on("data", async (event) => {
        logger.info.log("info", `Catch Transfer event in Harmony blockchain with such a data: ${event}`);
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
        await processEvent(eventData);
      })
      .on("error", async (error) => {
        logger.error.log("error", `Error while catch Harmony Transfer events: ${error}`);
      });
  } catch(e) {
    logger.error.log("error", `Error while listening Harmony Transfer events: ${e}`);
  }
};

exports.listenTestEvents = function () {
  const hmy = new Harmony(config.provider, {
    chainType: ChainType.Harmony,
    chainId: ChainID.HmyTestnet,
  });

  const testContract = require("../config/test_contract.json");

  const contractO = hmy.contracts.createContract(
    testContract.abi,
    "0xb4411095609bcb50512592c88095f137311a1883"
  );
  contractO.events
    .TestEvent()
    .on("data", (event) => {
      console.log("Here is the TestEvent event data:");
      console.log(event);
    })
    .on("error", console.error);
};
