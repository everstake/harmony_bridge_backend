const harmonyListener = require("./subscribers/harmony_listener");
const PolkaEventListener = require("./subscribers/polka_listener").PolkaEventListener;
const transactionSender = require("./services/transaction_sender");
const dbController = require("./services/db_controller");
let chainNames = require("./config/chain_names.json");
// const utils = require("./utils/contract_utils");
// const dbUtils = require("./utils/db_utils");
// const hashUtils = require("./utils/hashing");
const logger = require('./logger');

console.log("Validator is running");
console.log('CHAIN_ID: ',      process.env.CHAIN_ID);
console.log('EDGEWARE_SEED: ', process.env.EDGEWARE_SEED);
console.log('HARMONY_KEY: ',   process.env.HARMONY_KEY);

if (process.argv.length > 1) {
    var skip = process.argv[1] === 'skip';
    console.log('Skip old blocks');
}

// dbUtils.insertTxData();
// dbUtils.getTxs();
// dbUtils.getStatuses();

// utils.convertAddress();
// utils.accountAddress();
// utils.transferMoney();

logger.info.log('info', "Start listening events");

const polkaListener = new PolkaEventListener(skip, async (data) => {
    logger.info.info("Prepare Edgeware data to save and process it");
    console.log(data);
    let dataToSave = {
        address_to: data.receiver,
        address_from: data.sender,
        tx_time: data.timestamp,
        amount: data.amount,
        asset: data.asset,
        uniq_id: data.transferNonce
    };
    let txId = await dbController.saveTx(chainNames.polka, dataToSave);
    await transactionSender.processEvent(chainNames.polka, chainNames.harmony, data, txId);
});
polkaListener.listenEvents();
harmonyListener.listenEvents(skip);
logger.info.log('info', "Start doing more stuff");
logger.error.log('error', "Start doing more stuff");
// utils.interactWithContract();
// utils.getData();
// utils.deployContract();

// utils.deployTestContract();
// utils.interactTestContract();