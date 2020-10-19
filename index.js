const harmonyListener = require("./subscribers/harmony_listener");
const utils = require("./utils/contract_utils");
const dbUtils = require("./utils/db_utils");
const hashUtils = require("./utils/hashing");
// let sleep = require('sleep');

console.log("Validator is running");

// dbUtils.insertTxData();
// dbUtils.getTxs();
// dbUtils.getStatuses();

// utils.convertAddress();
// utils.accountAddress();
// utils.transferMoney();

harmonyListener.listenEvents();
// harmonyListener.listenTestEvents();

utils.interactWithContract();
// utils.getData();
// utils.deployContract();

// utils.deployTestContract();
// utils.interactTestContract();