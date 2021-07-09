
function isEqualSwapData(l, r) {
    return l.chain_id === r.chain_id &&
        l.chain_type === r.chain_type &&
        l.address_to === r.address_to &&
        l.address_from === r.address_from &&
        l.tx_time == r.tx_time &&
        l.amount == r.amount &&
        l.asset === r.asset &&
        l.nonce == r.nonce;
}


class Worker {
    constructor(db, harmony, edgeware) {
        this.db = db;
        this.harmonyClient = harmony;
        this.edgewareClient = edgeware;
        this.pollInterval = 5000;
    }

    async storeHarmonySignature(swapRequestId, validatorPayload) {
        const signatures = await this.db.getHarmonySignatures(swapRequestId);
        var numsigs = 0;
        if (signatures) {
            numsigs = signatures.length;
            const existingSig = signatures.find(s => { return s.validator === validatorPayload.validator; });
            if (existingSig) {
                // should not happen
                throw new Error(`already have a signature from ${validatorPayload.validator}, old: ${existingSig.signature}, new: ${validatorPayload.signature}`);
            }
        }

        console.log(`insert signature ${validatorPayload.signature} by ${validatorPayload.validator}, swap request id: ${swapRequestId}`);
        await this.db.insertHarmonySignature(swapRequestId, validatorPayload.validator, validatorPayload.signature);
        return numsigs + 1;
    }

    async storeEdgewareHash(swapRequestId, validatorPayload) {
        if (!validatorPayload.hash) {
            throw new Error('block hash is missing from validator payload');
        }
        const hashes = await this.db.getEdgewareHashes(swapRequestId);
        var count = 0;
        if (hashes) {
            count = hashes.length;
            const existing = hashes.find(obj => { return obj.validator === validatorPayload.validator; });
            if (existing) {
                // should not happen
                throw new Error(`already have a hash from ${validatorPayload.validator}, old: ${existing.block_hash}, new: ${validatorPayload.hash}`);
            }
        }

        console.log(`insert block hash ${validatorPayload.hash} by ${validatorPayload.validator}, swap request id: ${swapRequestId}`);
        await this.db.insertEdgewareHash(swapRequestId, validatorPayload.validator, validatorPayload.hash);
        return count + 1;
    }

    async processSwapRequest(data, validatorPayload) {
        const targetChainConfig = global.gConfig[data.chain_id.toLowerCase()];
        data.chain_id = targetChainConfig.chain_id;
        const swapRequests = await this.db.getRequests(data.chain_id, data.nonce);
        var swapRequestId = null;
        var isCollected = false;
        if (swapRequests && swapRequests.length > 0) {
            if (swapRequests.length === 1 && isEqualSwapData(data, swapRequests[0])) {
                // common situation, some validator have already submitted it`s signature
                swapRequestId = swapRequests[0].id;
                isCollected = swapRequests[0].status !== 'collecting';
            }
            else {
                // weird situation when previous validators submitted signatures for a different data
                console.log(`requests with the same chain and nonce: ${swapRequests.map(req => req.id)}`);
                const matchingRequest = swapRequests.find(request => {
                    return isEqualSwapData(request, data);
                });
                if (matchingRequest) {
                    swapRequestId = matchingRequest.id;
                    isCollected = matchingRequest.status !== 'collecting';
                }
            }
        }
        // no swap request with such data -> insert new one
        if (swapRequestId === null) {
            console.log(`insert swap request ${data.address_from} -> ${data.address_to}, value: ${data.amount}`);
            swapRequestId = await this.db.insertRequest(data);
            console.log(`swap request id=${swapRequestId}`);
        }

        var count = 0;

        if (data.chain_id === global.gConfig.harmony.chain_id) {
            count = await this.storeHarmonySignature(swapRequestId, validatorPayload);
        }
        else if (data.chain_id === global.gConfig.polka.chain_id) {
            count = await this.storeEdgewareHash(swapRequestId, validatorPayload);
        }
        else {
            console.log('Unknown chain id');
            return false;
        }

        if (!isCollected && count >= targetChainConfig.signatureThreshold) {
            console.log(`request ${swapRequestId} reached threshold`);
            await this.db.setRequestCollected(swapRequestId);
        }
        return true;
    }

    async processCollecting() {
        const requests = await this.db.getRequestsByStatus('collecting');
        if (requests && requests.length > 0) {
            console.log(`found ${requests.length} swap requests not reached threshold`);
        }
        for (var i = 0; i < requests.length; i++) {
            const request = requests[i];
            console.log("🚀 ~ file: app.js ~ line 117 ~ Worker ~ processCollecting ~ request", request)
            let collected = false;
            if (request.chain_id === global.gConfig.harmony.chain_id) {
                const count = await this.db.countHarmonySignatures(request.id);
                collected = count >= global.gConfig.harmony.signatureThreshold;
            }
            else if (request.chain_id === global.gConfig.polka.chain_id) {
                const count = await this.db.countEdgewareHashes(request.id);
                collected = count >= global.gConfig.polka.signatureThreshold;
            }
            if (collected) {
                console.log(`collected enough signatures for request ${request.id}`);
                try {
                    await this.db.setRequestCollected(request.id);
                }
                catch (err) {
                    console.log(`failed to update request (${request.id}) status to 'collected': ${err.message}`);
                }
            }
        }
    }

    async processCollected() {
        const requests = await this.db.getRequestsByStatus('collected');
        if (requests && requests.length > 0) {
            console.log(`found ${requests.length} swap requests ready to be sent to contract`);
        }
        for (var i = 0; i < requests.length; i++) {
            const request = requests[i];
            var txHash = '';
            try {
                if (request.chain_id === global.gConfig.polka.chain_id) {
                    // do nothing
                } else {
                    const signatures = await this.db.getHarmonySignatures(request.id);
                    console.log(`sending ${signatures.length} signatures to contract`);
                    txHash = await this.harmonyClient.sendSignatures({
                        chId: request.chain_type,
                        receiver: request.address_to,
                        sender: request.address_from,
                        timestamp: request.tx_time,
                        amount: request.amount,
                        asset: request.asset,
                        transferNonce: request.nonce
                    }, signatures.map(sig => {
                        return sig.signature;
                    }));
                    console.log("🚀 ~ file: app.js ~ line 163 ~ Worker ~ processCollected ~ txHash", txHash)
                    console.log(`execute swap request ${request.address_from} -> ${request.address_to}, value: ${request.amount}, txhash: ${txHash}`);
                }
                await this.db.setRequestPending(request.id, txHash);
            }
            catch (err) {
                console.log(`failed to process collected signatures for request ${request.id}: ${err}`);
            }
        }
    }

    async processPending() {
        const requests = await this.db.getRequestsByStatus('pending');
        if (requests && requests.length > 0) {
            console.log(`found ${requests.length} swap requests sent to blockchain`);
        }
        for (var i = 0; i < requests.length; i++) {
            const request = requests[i];
            var confirmed = false;
            if (request.chain_id === global.gConfig.harmony.chain_id) {
                console.log(`checking Harmony finalization of tx ${request.transaction_hash}`);
                confirmed = await this.harmonyClient.isTxConfirmed(request.transaction_hash);
                console.log(`isConfirmed: ${confirmed}`);
            }
            else if (request.chain_id === global.gConfig.polka.chain_id) {
                // TODO: check if all blocks are finalized
                const hashes = await this.db.getEdgewareHashes(request.id);
                var numFinalized = 0;
                for (var j = 0; j < hashes.length; j++) {
                    console.log('hashes[j].block_hash :>> ', hashes[j].block_hash);
                    if (await this.edgewareClient.isBlockFinalized(hashes[j].block_hash)) {
                        numFinalized++;
                    }
                }
                if (numFinalized >= global.gConfig.polka.signatureThreshold) {
                    confirmed = true;
                }
            }

            if (confirmed) {
                await this.db.setRequestFinalized(request.id);
            }
        }
    }

    start() {
        const handler1 = () => {
            this.processCollecting()
                .then(() => { setTimeout(handler1, this.pollInterval); })
                .catch(err => {
                    console.log(`error while processing signatures not reached threshold: ${err.message}`);
                    setTimeout(handler1, this.pollInterval);
                });
        };
        const handler2 = () => {
            this.processCollected()
                .then(() => { setTimeout(handler2, this.pollInterval); })
                .catch(err => {
                    console.log(`error while processing collected signatures: ${err.message}`);
                    setTimeout(handler2, this.pollInterval);
                });
        };
        const handler3 = () => {
            this.processPending()
                .then(() => { setTimeout(handler3, this.pollInterval); })
                .catch(err => {
                    console.log(`error while processing confirmed swap requests: ${err.message}`);
                    setTimeout(handler3, this.pollInterval);
                });
        };

        setTimeout(handler1, this.pollInterval);
        setTimeout(handler2, this.pollInterval);
        setTimeout(handler3, this.pollInterval);
    }

    async dump() {
        const requests = await this.db.getAllRequests();
        const signatures = await this.db.getAllSignatures();
        console.log(`DB dump ${requests.length} ${signatures.length} :`);
        requests.forEach(req => {
            console.log('Request:', req);
        });
        signatures.forEach(sig => {
            console.log('Signature:', sig);
        });
    }
}

module.exports = {
    Worker
}
