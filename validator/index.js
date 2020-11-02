// const harmonyListener = require("./subscribers/harmony_listener");
const PolkaEventListener = require("./subscribers/polka_listener").PolkaEventListener;
const dbController = require("./services/db_controller");
// const utils = require("./utils/contract_utils");
// const dbUtils = require("./utils/db_utils");
// const hashUtils = require("./utils/hashing");
const logger = require('./logger');

console.log("Validator is running");

// dbUtils.insertTxData();
// dbUtils.getTxs();
// dbUtils.getStatuses();

// utils.convertAddress();
// utils.accountAddress();
// utils.transferMoney();

logger.info.log('info', "Start listening events");

const polkaListener = new PolkaEventListener(async (data) => {
    logger.info.log("info", "Prepare Edgeware data to save and process it");
    console.log(data);
    let dataToSave = {
        address_to: data.receiver,
        address_from: data.sender,
        tx_time: data.timestamp,
        amount: data.amount,
        asset: data.asset,
        uniq_id: data.transferNonce
    };
    let txId = await dbController.saveTx("Polka", dataToSave);
    //await transactionSender.processEvent("Polka", "Harmony", data, txId);
});
polkaListener.listenEvents();
// harmonyListener.listenEvents();
// harmonyListener.listenTestEvents();
logger.info.log('info', "Start doing more stuff");
logger.error.log('error', "Start doing more stuff");
// utils.interactWithContract();
// utils.getData();
// utils.deployContract();

// utils.deployTestContract();
// utils.interactTestContract();