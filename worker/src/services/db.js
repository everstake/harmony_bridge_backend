const knex = require('knex');

const requestTable = 'request';
const signatureTable = 'signature';

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
        return await this.db(signatureTable).select('*');
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

    async getSignatures(requestId) {
        let signatures = await this.db(signatureTable)
            .select('*')
            .where({ request_id: requestId });
        return signatures;
    }

    async insertRequest(request) {
        let id = await this.db(requestTable).insert({
            status: 'collecting',
            ...request
        }).returning('id');
        return id[0];
    }

    async insertSignature(requestId, validator, signature) {
        let id = await this.db(signatureTable).insert({
            request_id: requestId,
            validator: validator,
            data: signature
        }).returning('id');
        return id[0];
    }

    async setRequestCollected(id) {
        await this.db(requestTable)
            .where({ id: id })
            .update({ status: 'collected' });
    }

    async setRequestPending(id, txHash) {
        await this.db(requestTable)
            .where({ id: id })
            .update({ status: 'pending', transaction_hash: txHash });
    }

    async test() {
        return await this.db(requestTable).select('*');
    }
}

module.exports = {
    Db
}
