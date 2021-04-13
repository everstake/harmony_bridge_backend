const harmonyListener = require("./subscribers/harmony_listener");
const PolkaEventListener = require("./subscribers/polka_listener").PolkaEventListener;
const transactionSender = require("./services/transaction_sender");
const dbController = require("./services/db_controller");
let chainNames = require("./config/chain_names.json");
const logger = require('./logger');

console.log("Validator is running");
console.log('CHAIN_ID: ',      process.env.CHAIN_ID);
console.log('EDGEWARE_SEED: ', process.env.EDGEWARE_SEED);
console.log('HARMONY_KEY: ',   process.env.HARMONY_KEY);

if (process.argv.length > 2) {
    var skip = process.argv[2] === 'skip';
    console.log('Skip old blocks');
}

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
// polkaListener.listenEvents();
harmonyListener.listenEvents(skip);
logger.info.log('info', "Start doing more stuff");
logger.error.log('error', "Start doing more stuff");