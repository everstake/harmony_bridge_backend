const transactionTables = {
  "Harmony": "harmony_polka_transaction",
  "Polka": "polka_harmony_transaction",
};

const transactionStatusTables = {
  "Harmony": "harmony_polka_transaction_status",
  "Polka": "polka_harmony_transaction_status",
};

const chainInfoTable = 'chain_info';

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
  return id[0];
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
  let _ = await knex(dbTxStatusTable)
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
    .where("status.status", status);

  return transactions;
};

exports.getTransactionByStatusAndTime = async function(blockchain, status, startTime) {
    if (!TXSTATUSES.includes(status)) {
        throw "New transaction status does not match possible status";
    }

    let dbTxTable = transactionTables[blockchain];
    let dbTxStatusTable = transactionStatusTables[blockchain];

    let transactions = await knex({ tx: dbTxTable, status: dbTxStatusTable })
        .select('*')
        .whereRaw('?? = ??', ['tx.id', 'status.transaction_id'])
        .where('status.status', status)
        .andWhere('tx.tx_time', '>', startTime);

    return transactions;
}

/*
 * Set last processed block for a chain
 *
 * @param  {String}  blockchain
 * @param  {Integer}  lastProcessed
 * 
 * @return ?
 */
exports.setLastProcessed = async function(blockchain, lastProcessed) {
    let rows = await knex(chainInfoTable)
        .select('*')
        .where('chain', blockchain);
    if (!rows || rows.length === 0) {
        return await knex(chainInfoTable)
            .insert({ chain: blockchain, last_processed: lastProcessed });
    }
    else {
        return await knex(chainInfoTable)
            .where('chain', blockchain)
            .update({ last_processed: lastProcessed });
    }
};

/*
 * Get last processed block for a chain
 *
 * @param  {String}  blockchain
 * 
 * @return {Integer}
 */
exports.getLastProcessed = async function(blockchain) {
    let rows = await knex(chainInfoTable)
        .select('*')
        .where('chain', blockchain);
    if (!rows || rows.length === 0) {
        return 0;
    }
    else {
        return rows[0].last_processed;
    }
};
