const knex = require('knex');

const requestTable = 'request';
const harmonyValidatorPayloadTable = 'harmony_validator_payload';
const edgewareValidatorPayloadTable = 'edgeware_validator_payload';

class Db {
    constructor(host, user, password, database) {
        console.log('Connecting to ' + host + '/' + database + ' as ' + user);
        this.db = knex({
            client: 'pg',
            connection: {
                host     : host,
                user     : user,
                password : password,
                database : database
            }
        });
    }

    async getAllRequests() {
        return await this.db(requestTable).select('*');
    }

    async getAllSignatures() {
        return await this.db(harmonyValidatorPayloadTable).select('*');
    }

    async getRequests(chainId, nonce) {
        let requests = await this.db(requestTable)
            .select('*')
            .where({ chain_id: chainId, nonce: nonce });
        if (!requests || requests.length === 0) {
            return requests;
        }
        else if (requests.length > 1) {
            console.log(`Warning: multiple request records by chain (${chainId}) and nonce (${nonce})`);
        }

        return requests;
    }

    async getRequestsByStatus(status) {
        return await this.db(requestTable).select('*').where({ status: status });
    }

    async getHarmonySignatures(requestId) {
        let signatures = await this.db(harmonyValidatorPayloadTable)
            .select('*')
            .where({ request_id: requestId });
        return signatures;
    }

    async getEdgewareHashes(requestId) {
        let hashes = await this.db(edgewareValidatorPayloadTable)
            .select('*')
            .where({ request_id: requestId });
        return hashes;
    }

    async insertRequest(request) {
        let id = await this.db(requestTable)
            .insert({
                status: 'collecting',
                ...request
            })
            .returning('id')
            .onConflict(['chain_id', 'nonce'])
            .merge({
                chain_id: request.chain_id,
                nonce: request.nonce
            });
        return id[0];
    }

    async insertHarmonySignature(requestId, validator, signature) {
        let id = await this.db(harmonyValidatorPayloadTable).insert({
            request_id: requestId,
            validator: validator,
            signature: signature
        }).returning('id');
        return id[0];
    }

    async insertEdgewareHash(requestId, validator, hash) {
        let id = await this.db(edgewareValidatorPayloadTable).insert({
            request_id: requestId,
            validator: validator,
            block_hash: hash
        }).returning('id');
        return id[0];
    }

    async setRequestCollected(id) {
        await this.db(requestTable)
            .where({ id: id, status: 'collecting' })
            .update({ status: 'collected' });
    }

    async setRequestPending(id, txHash) {
        await this.db(requestTable)
            .where({ id: id, status: 'collected' })
            .update({ status: 'pending', transaction_hash: txHash });
    }

    async setRequestFinalized(id) {
        await this.db(requestTable)
            .where({ id: id, status: 'pending' })
            .update({ status: 'finalized' });
    }
}


class MockedDb {
    constructor() {
        this.requests = [];
        this.harmonySignatures = [];
        this.edgewareHashes = [];
    }

    async getAllRequests() {
        return this.requests;
    }

    async getAllSignatures() {
        return this.harmonySignatures;
    }

    async getRequests(chainId, nonce) {
        return this.requests.filter(req => { return req.chain_id === chainId && req.nonce === nonce; });
    }

    async getRequestsByStatus(status) {
        return this.requests.filter(req => { return req.status === status; });
    }

    async getHarmonySignatures(requestId) {
        return this.harmonySignatures.filter(sig => { return sig.request_id === requestId; });
    }

    async getEdgewareHashes(requestId) {
        return this.edgewareHashes.filter(hash => { return hash.request_id === requestId; });
    }

    async insertRequest(request) {
        let id = this.requests.length;
        this.requests.push({
            id: id,
            status: 'collecting',
            ...request
        });
        return id;
    }

    async insertHarmonySignature(requestId, validator, signature) {
        let id = this.harmonySignatures.length;
        this.harmonySignatures.push({
            id: id,
            request_id: requestId,
            validator: validator,
            signature: signature
        });
        return id;
    }

    async insertEdgewareHash(requestId, validator, hash) {
        let id = this.edgewareHashes.length;
        this.edgewareHashes.push({
            id: id,
            request_id: requestId,
            validator: validator,
            block_hash: hash
        });
        return id;
    }

    async setRequestCollected(id) {
        const index = this.requests.findIndex(req => { return req.id === id && req.status === 'collecting'; });
        if (index !== -1) {
            this.requests[index].status = 'collected';
        }
    }

    async setRequestPending(id, txHash) {
        const index = this.requests.findIndex(req => { return req.id === id && req.status === 'collected'; });
        if (index !== -1) {
            this.requests[index].status = 'pending';
            this.requests[index].transaction_hash = txHash;
        }
    }

    async setRequestFinalized(id) {
        const index = this.requests.findIndex(req => { return req.id === id && req.status === 'pending'; });
        if (index !== -1) {
            this.requests[index].status = 'finalized';
        }
    }
}


module.exports = {
    Db,
    MockedDb
}
