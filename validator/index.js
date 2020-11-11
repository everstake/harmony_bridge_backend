const harmonyListener = require("./subscribers/harmony_listener");
const utils = require("./utils/contract_utils");
const dbUtils = require("./utils/db_utils");
const hashUtils = require("./utils/hashing");
const logger = require('./logger');

console.log("Validator is running");

// dbUtils.insertTxData();
// dbUtils.getTxs();
// dbUtils.getStatuses();

// utils.convertAddress();
// utils.accountAddress();
// utils.transferMoney();

logger.info.log('info', "Start listening events");
// harmonyListener.listenEvents();
// harmonyListener.listenTestEvents();
logger.info.log('info', "Start doing more stuff");
logger.error.log('error', "Start doing more stuff");
// utils.interactWithContract();
// utils.getData();
// utils.deployContract();

// utils.deployTestContract();
// utils.interactTestContract();