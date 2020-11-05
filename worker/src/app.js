
function isEqualSwapData(l, r) {
    return l.chain_id === r.chain_id &&
        l.chain_type === r.chain_type &&
        l.address_to === r.address_to &&
        l.address_from === r.address_from &&
        l.tx_time === r.tx_time &&
        l.amount === r.amount &&
        l.asset === r.asset &&
        l.nonce === r.nonce;
}


class Worker {
    constructor(db) {
        this.db = db;
    }

    isValidSignature(data, signature, validator) {
        // TODO: implement
        return true;
    }

    async processSwapRequest(data, signature) {
        const targetChainConfig = global.gConfig[data.chain_id.toLowerCase()];
        data.chain_id = targetChainConfig.chain_id;
        const swapRequests = await this.db.getRequests(data.chain_id, data.nonce);
        var swapRequestId = null;
        if (swapRequests && swapRequests.length > 0) {
            if (swapRequests.length === 1 && isEqualSwapData(data, swapRequests[0])) {
                // common situation, some validator have already submitted it`s signature
                swapRequestId = swapRequests[0].id;
            }
            else {
                // weird situation when previous validators submitted signatures for a different data
                const matchingRequest = swapRequests.find(request => {
                    return isEqualSwapData(request, data);
                });
                if (matchingRequest) {
                    swapRequestId = matchingRequest.id;
                }
            }
        }
        // no swap request with such data -> insert new one
        if (!swapRequestId) {
            console.log(`insert swap request ${data.address_from} -> ${data.address_to}, value: ${data.amount}`);
            swapRequestId = await this.db.insertRequest(data);
        }

        const signatures = await this.db.getSignatures(swapRequestId);
        var numsigs = 0;
        if (signatures) {
            numsigs = signatures.length;
            const existingSig = signatures.find(s => { return s.validator === signature.validator; });
            if (existingSig) {
                // should not happen
                console.log(`already have a signature from this validator (${signature.validator}), old: ${existingSig.data}, new: ${signature.data}`);
                return;
            }
        }

        console.log(`insert signature ${signature.data} by ${signature.validator}, swap request id: ${swapRequestId}`);
        await this.db.insertSignature(swapRequestId, signature.validator, signature.data);
        if (numsigs + 1 >= targetChainConfig.signatureThreshold) {
            await this.db.setRequestCollected(swapRequestId);
        }
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
