const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@edgeware/node-types');


class EdgewareClient {
    constructor(endpoint) {
        this.wsProvider = new WsProvider(endpoint);
        ApiPromise.create({ provider: this.wsProvider, ...spec })
            .then(api => { this.api = api; })
            .catch(err => { console.log(err.message); });
    }

    async isBlockFinalized(hash) {
        const block = await this.api.rpc.chain.getBlock(hash);
        return !!block.block;
    }
}

module.exports = {
    EdgewareClient
}
