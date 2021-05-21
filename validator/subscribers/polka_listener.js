const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Struct, Text, u32, u64, u128, GenericAccountId } = require('@polkadot/types');
const { Mainnet, Beresheet } = require('@edgeware/node-types');
const HarmonyAddress = require('@harmony-js/crypto');

const logger = require('../logger');
const transactionSender = require("../services/transaction_sender");
const dbController = require("../services/db_controller");
const config = require("../config/polka_conf.json");
const chainNames = require("../config/chain_names.json");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function bin2string(array) {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += (String.fromCharCode(array[i]));
    }
    return result;
}

function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function byteArrayToNum(byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }
    return value;
}


class PolkaEventListener {
    constructor(skipOldBlocks, handler) {
        this.skipOldBlocks = skipOldBlocks
        this.handler = handler;
        this.transferEventType = 0;
        this.wsProvider = new WsProvider(config.provider);
        this.lastProcessedBlock = 0;
        this.pendingLastProcessedBlock = 0;
        this.window = 10;
    }

    async processNotApproved() {
        const now = Date.now() / 1000;
        const fiveMinutes = 300;
        const txs = await dbController.getTransactionByStatusAndTime('Polka', 'Requested', (now - config.swapTimeout).toFixed());
        if (txs && txs.length !== 0) {
            console.log(`got ${txs.length} swap requests left not processed`);
        }
        for (var i = 0; i < txs.length; i++) {
            const tx = txs[i];
            if (tx.tx_time < now - fiveMinutes) {
                const data = {
                    receiver: tx.address_to,
                    sender: tx.address_from,
                    timestamp: tx.tx_time,
                    amount: tx.amount,
                    asset: tx.asset,
                    transferNonce: tx.uniq_id
                };
                await transactionSender.processEvent(chainNames.polka, chainNames.harmony, data, tx.id);
            }
        }
    }

    async listenEvents() {
        const handler = () => {
            this.processNotApproved()
                .then(() => { setTimeout(handler, 20000); })
                .catch(err => {
                    console.log(`error while processing requests: ${err.message}`);
                    setTimeout(handler, 20000);
                });
        };
        setTimeout(handler, 20000);

        this.api = await ApiPromise.create({ provider: this.wsProvider, ...Beresheet });

        if (this.skipOldBlocks) {
            const lastHdr = await this.api.rpc.chain.getHeader();
            this.lastProcessedBlock = lastHdr.number - 1;
        }
        else {
            this.lastProcessedBlock = await dbController.getLastProcessed('polka');
        }
        logger.info.info("Start listening Polka events from " + this.lastProcessedBlock);

        var exit = false;
        try {
            await this.loopProcessEvent(exit);
        } catch (err) {
            logger.info.error(`Error from loadNextEvents ${err}`);
            exit = true;
            await sleep(50000);
            await this.listenEvents();
        }

    }

    async loopProcessEvent(flag) {
        while (!flag) {
            this.loadNextEvents()
                .then((blockEvents) => {
                    for (let i = 0; i < blockEvents.length; i++) {
                        const [hash, events] = blockEvents[i];
                        for (let j = 0; j < events.length; j++) {
                            try {
                                await this.processEvent(events[j]);
                            } catch (err) {
                                logger.info.error(`Error while processing Polka event from block ${hash}: ${err.message}`);
                            }
                        }
                    }
                    this.lastProcessedBlock = this.pendingLastProcessedBlock;
                    await dbController.setLastProcessed('polka', this.lastProcessedBlock);
                })
                .catch(err => console.log('?????err :>> ', err));

        }
    }

    async loadNextEvents() {
        const lastHdr = await this.api.rpc.chain.getHeader();
        if (lastHdr.number <= this.lastProcessedBlock) {
            this.pendingLastProcessedBlock = this.lastProcessedBlock
            await sleep(50000);
            return [];
        }
        //console.log(JSON.stringify(lastHdr));
        const from = this.lastProcessedBlock + 1;
        const to = Math.min(from + this.window, lastHdr.number);
        this.pendingLastProcessedBlock = to;
        if (to - from < this.window) {
            await sleep(60000);
        }
        const fromHash = await this.api.rpc.chain.getBlockHash(from);
        const toHash = await this.api.rpc.chain.getBlockHash(to);
        console.log(`From (${from}): ${fromHash.toHex()}, To (${to}): ${toHash.toHex()}`);
        return new Promise((res, rej) => {
            const range = this.api.query.system.events.range([fromHash, toHash]).catch(console.log);
            res(range);
            rej(console.log);
        })
    }

    async processEvent(eventRecord) {
        const { event, phase } = eventRecord;

        if (event.section != 'contracts' || event.method != 'ContractExecution') {
            // console.log(`Skip irrelevant event ${event.section}:${event.method}`);
            return;
        }
        const types = event.typeDef;

        console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);

        if (true) { //event.data[0] === config.contractAddress) { todo fix it
            const bytes = event.data[1];
            const eventData = this.decodeEvent(bytes);
            if (eventData) {
                await this.handler(eventData);
            }
        }
        else {
            console.log("Skip event from other account:", event.data[0], config.contractAddress);
        }
    }

    decodeEvent(bytes) {
        const eventType = bytes[0];
        if (eventType != this.transferEventType) {
            console.log(`Don\`t know how to decode this event: ${eventType}`);
            return;
        }

        // bytes.forEach(byte => { process.stdout.write(`${byte} `); });
        // console.log(typeof bytes);
        const encoded = bytes.subarray(1);
        const stringSize = encoded[0] / 4;
        const receiverString = bin2string(encoded.slice(1, stringSize + 1));
        const receiver = HarmonyAddress.getAddress(receiverString).basicHex;
        console.log('got receiver address from Edgeware: ', receiver);
        // Sender
        var nextId = stringSize + 1;
        var nextSize = 32;
        const sender = GenericAccountId.encode(encoded.slice(nextId, nextId + nextSize));
        //console.log('Sender:', sender);
        // Amount
        nextId = nextId + nextSize;
        nextSize = 16;
        const amount = byteArrayToNum(encoded.slice(nextId, nextId + nextSize));
        //console.log('Amount:', amount);
        // Asset
        nextId = nextId + nextSize;
        nextSize = 32;
        const asset = GenericAccountId.encode(encoded.slice(nextId, nextId + nextSize));
        //console.log('Asset:', asset);
        // Transfer nonce
        nextId = nextId + nextSize;
        nextSize = 16;
        const transferNonce = byteArrayToNum(encoded.slice(nextId, nextId + nextSize));
        //console.log('Transfer nonce:', transferNonce);
        // Timestamp
        nextId = nextId + nextSize;
        nextSize = 8;
        const timestamp = byteArrayToNum(encoded.slice(nextId, nextId + nextSize));
        //console.log('Timestampe:', timestamp);
        return {
            receiver: receiver,
            sender: sender,
            amount: amount,
            asset: asset,
            transferNonce: transferNonce,
            timestamp: timestamp
        };
    }
}


module.exports = {
    PolkaEventListener
}
