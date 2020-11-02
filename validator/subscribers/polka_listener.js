const { ApiPromise, WsProvider } = require('@polkadot/api');

const dbController = require("../services/db_controller");
const config = require("../config/polka_conf.json");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function bin2string(array){
    var result = "";
    for(var i = 0; i < array.length; ++i){
        result+= (String.fromCharCode(array[i]));
    }
    return result;
}

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function byteArrayToNum(byteArray) {
    var value = 0;
    for ( var i = byteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + byteArray[i];
    }
    return value;
}


class PolkaEventListener {
    constructor(handler) {
        this.handler = handler;
        this.transferEventType = 0;
        this.wsProvider = new WsProvider(config.provider);
        this.lastProcessedBlock = 0;
        this.pendingLastProcessedBlock = 0;
        this.window = 10;
    }

    async loadNextEvents() {
        const lastHdr = await this.api.rpc.chain.getHeader();
        if (lastHdr.number <= this.lastProcessedBlock) {
            this.pendingLastProcessedBlock = this.lastProcessedBlock
            await sleep(5000);
            return [];
        }
        //console.log(JSON.stringify(lastHdr));
        const from = this.lastProcessedBlock + 1;
        const to = Math.min(from + this.window, lastHdr.number);
        this.pendingLastProcessedBlock = to;
        if (to - from < this.window) {
            await sleep(100);
        }
        const fromHash = await this.api.rpc.chain.getBlockHash(from);
        const toHash = await this.api.rpc.chain.getBlockHash(to);
        console.log(`From (${from}): ${fromHash.toHex()}, To (${to}): ${toHash.toHex()}`);
        return await this.api.query.system.events.range([ fromHash, toHash ]);
    }

    async listenEvents() {
        this.api = await ApiPromise.create({ provider: this.wsProvider });

        this.lastProcessedBlock = await dbController.getLastProcessed('polka');
        console.log("Start listening Polka events from " + this.lastProcessedBlock);

        var exit = false;
        while (!exit) {
            const blockEvents = await this.loadNextEvents();
            for (let i = 0; i < blockEvents.length; i++) {
                const [hash, events] = blockEvents[i];
                for (let j = 0; j < events.length; j++) {
                    await this.processEvent(events[j]);
                }
            }
            this.lastProcessedBlock = this.pendingLastProcessedBlock;
            await dbController.setLastProcessed('polka', this.lastProcessedBlock);
        }
    }

    async processEvent(eventRecord) {
        const { event, phase } = eventRecord;
        const types = event.typeDef;
        if (event.section != 'contracts' || event.method != 'ContractExecution') {
            //console.log(`Skip irrelevant event ${event.section}:${event.method}`);
            return;
        }

        console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
        if (event.data[0] == config.contractAddress) {
            const bytes = event.data[1];
            const eventData = this.decodeEvent(bytes);
            if (eventData) {
                this.handler(eventData);
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
        const receiver = bin2string(encoded.slice(1, stringSize + 1));
        //console.log('Event string: ', receiver);
        // Sender
        var nextId = stringSize + 1;
        var nextSize = 32;
        const sender = toHexString(encoded.slice(nextId, nextId + nextSize));
        //console.log('Sender:', sender);
        // Amount
        nextId = nextId + nextSize;
        nextSize = 16;
        const amount = byteArrayToNum(encoded.slice(nextId, nextId + nextSize));
        //console.log('Amount:', amount);
        // Asset
        nextId = nextId + nextSize;
        nextSize = 32;
        const asset = toHexString(encoded.slice(nextId, nextId + nextSize));
        //console.log('Asset:', sender);
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