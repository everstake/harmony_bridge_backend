let dbController = require("../services/db_controller");

exports.insertTxData = async function () {
  let txData = {
    chain_id: 1,
    address_to: "address1",
    address_from: "address2",
    tx_time: 12345,
    amount: 7,
    asset: "asset row",
    uniq_id: 32,
  };
  let result = await dbController.saveTx("Harmony", txData);
  console.log("Insert result");
  console.log(result);
  return result;
};

exports.getTxs = async function () {
  let txs = await dbController.getTransactions("Harmony", "Requested");
  console.log("Result");
  console.log(txs);
};

exports.getStatuses = async function () {
  let statuses = await dbController.getAllStatuses("Harmony");
  console.log("Statuses");
  console.log(statuses);
};
