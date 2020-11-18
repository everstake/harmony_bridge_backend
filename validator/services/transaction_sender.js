const axios = require("axios");
const ethSig = require("../nano-ethereum-signer");
const util = require("@polkadot/util");
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { ContractPromise } = require('@polkadot/api-contract');

const EdgewareSender = require('./edgeware_sender');
const hasher = require("../utils/hashing");
const signer = require("./signer");
let keys = require("../config/keys.json");
let assets = require("../config/assets.json");
let chainIds = require("../config/chain_ids.json");
let polkaConf = require("../config/polka_conf.json");
let polkaAbi = require("../config/polka_abi.json");
let workerEndpoints = require("../config/worker_endpoints.json");
let dbController = require("./db_controller");
const logger = require("../logger");

const wsProvider = new WsProvider(polkaConf.provider);
let edg_sender = null;
ApiPromise.create({ provider: wsProvider })
    .then(api => {
        edg_sender = new EdgewareSender(new ContractPromise(api, polkaAbi, polkaConf.contractAddress));
        console.log(`Created Edgeware sender: ${edg_sender}`);
    })
    .catch(err => {
        console.log(`failed to create contract instance: ${err.message}`);
        process.exit(0);
    });

exports.processEvent = async function (
    fromBlockchain,
    toBlockchain,
    eventData,
    transactionId
) {
    logger.info.log(
        "info",
        `Start to prepare data about transfer from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} for signing and sending to the Worker`
    );
    eventData.chainId = chainIds[process.env.CHAIN_ID];
    eventData.asset =
        assets[fromBlockchain + "-" + toBlockchain][eventData.asset];
    try {
        let sortedData = sortDict(eventData);
        let hashedMessage = hashSwapRequest(sortedData, toBlockchain);
        let signature = signSwapRequest(hashedMessage, toBlockchain);
        const signer = ethSig.signerAddress(hashedMessage, signature);
        await sendToWorker({
            chain_id: 'harmony',
            chain_type: sortedData.chainId,
            address_to: sortedData.receiver,
            address_from: sortedData.sender,
            tx_time: sortedData.timestamp,
            amount: sortedData.amount,
            asset: sortedData.asset,
            nonce: sortedData.transferNonce,
        }, {
            validator: signer,
            signature: signature
        });
        logger.info.log(
            "info",
            `Swap request from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} was sent to the Worker successfully`
        );
        let changeStatus = await dbController.changeTxStatus(fromBlockchain, transactionId, "Approved");
        logger.info.log("info", `Swap request from ${fromBlockchain} to ${toBlockchain} with ID ${transactionId} was save in DB as "Approved"`);
    } catch (e) {
        logger.error.log(
            "error",
            `Error while processing data about transfer from ${fromBlockchain} to ${toBlockchain}: ${e}`
        );
    }
};

exports.processSwapToEdgeware = async function (eventData, transactionId) {
    const keyring = new Keyring({ type: "sr25519" });
    const validatorKeys = keyring.addFromSeed(util.hexToU8a(keys.polka_key));
    console.log('Imported validator', validatorKeys.address.toString());

    eventData.chainId = chainIds[process.env.CHAIN_ID];
    if (eventData.asset !== '') {
        eventData.asset = assets['Harmony-Polka'][eventData.asset];
    }
    if (!edg_sender) {
        throw new Error('sender not initialized');
    }
    try {
        var blockhash = await edg_sender.sendHarmDataToEdgewareAndGetHashBlock(eventData, validatorKeys);
    }
    catch (err) {
        console.log(`failed to send transaction to Edgeware: ${err.message}`);
        return;
    }
    console.log(`Tx to Edgeware is in block ${blockhash}`);
    try {
        await sendToWorker({
            chain_id: 'polka',
            chain_type: eventData.chainId,
            address_to: eventData.receiver,
            address_from: eventData.sender,
            tx_time: eventData.timestamp,
            amount: eventData.amount,
            asset: eventData.asset,
            nonce: eventData.transferNonce,
        }, {
            validator: validatorKeys.address.toString(),
            hash: blockhash
        });
    }
    catch (err) {
        if (err.response) {
            console.log(`request failed (${err.response.status}): ${JSON.stringify(err.response.data)}`);
        }
        else {
            console.log(`request failed with error: ${err.message}`);
        }
    }
    let changeStatus = await dbController.changeTxStatus('Harmony', 'Polka', 'Approved');
    logger.info.log("info", `Swap request from Harmony to Polka was saved in DB as "Approved"`);
}

function hashSwapRequest(message, toBlockchain) {
    if (toBlockchain == "Harmony") {
        let hashedMessage = hasher.hashMessageForHarmony(message);
        return hashedMessage;
    } else {
        throw "Receive unknown blockchain";
    }
}

function signSwapRequest(message, toBlockchain) {
    if (toBlockchain == "Harmony") {
        let signerMessage = signer.signMessageForHarmony(message);
        return signerMessage;
    } else {
        throw "Receive unknown blockchain";
    }
}

async function sendToWorker(data, validator_payload) {
    let response = await axios.post(
        workerEndpoints.worker1 + "/v1/api/submit",
        {
            data: data,
            validator_payload: validator_payload
        }
    );
    if (response.status === 200) {
        return true;
    }
    else {
        console.log(`request failed: ${JSON.stringify(response.data)}`);
        throw new Error(`request failed: ${JSON.stringify(response.data)}`);
    }
}

function sortDict(unsortedMessage) {
    return {
        chainId: unsortedMessage.chainId,
        receiver: unsortedMessage.receiver,
        sender: unsortedMessage.sender,
        timestamp: unsortedMessage.timestamp,
        amount: unsortedMessage.amount,
        asset: unsortedMessage.asset,
        transferNonce: unsortedMessage.transferNonce,
    };
}
