const transactionTables = {
  "Harmony": "harmony_polka_transaction",
  "Polka": "polka_harmony_transaction",
};

const transactionStatusTables = {
  "Harmony": "harmony_polka_transaction_status",
  "Polka": "polka_harmony_transaction_status",
};

const TXSTATUSES = ["Requested", "Approved"];

let knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
  searchPath: ["knex", "public"],
});

/*
 * Save transaction as "requested"
 *
 * @param  {String} blockchain  Blockchain where transaction event was caught
 * @param {Object}  txData  Object with all the transacton data
 *
 * @return {Integer}  Index of inserted row into table
 * */
exports.saveTx = async function (blockchain, txData) {
  let dbTxTable = transactionTables[blockchain];
  let dbTxStatusTable = transactionStatusTables[blockchain];

  let id = await knex(dbTxTable).insert(txData).returning("id");
  let _ = await knex(dbTxStatusTable).insert({
    transaction_id: id[0],
    status: "Requested",
  });
  return id;
};

/*
 * Change transaction status
 *
 * @param  {String}  blockchain  Blockchain where transaction event was caught
 * @param  {Integer}  transaction's id
 * @param  {String}  newStatus
 *
 * @return  {Bool}
 */
exports.changeTxStatus = async function (blockchain, txId, newStatus) {
  if (!TXSTATUSES.includes(newStatus)) {
    throw "New transaction status does not match possible status";
  }

  let dbTxStatusTable = transactionStatusTables[blockchain];
  let _ = await knew(dbTxStatusTable)
    .where({ transaction_id: txId })
    .update({ status: newStatus });
  return true;
};

/*
 * Get transaction by status
 *
 * @param  {String}  blockchain
 * @param  {String}  status
 *
 * @return  {Array}
 */
exports.getTransactions = async function (blockchain, status) {
  if (!TXSTATUSES.includes(status)) {
    throw "New transaction status does not match possible status";
  }

  let dbTxTable = transactionTables[blockchain];
  let dbTxStatusTable = transactionStatusTables[blockchain];

  let transactions = await knex({ tx: dbTxTable, status: dbTxStatusTable })
    .select("*")
    .whereRaw("?? = ??", ["tx.id", "status.transaction_id"])
    .where("status.status", "Requested");

  return transactions;
};
