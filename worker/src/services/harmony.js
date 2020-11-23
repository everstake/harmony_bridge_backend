const { Harmony } = require('@harmony-js/core');
const { ContractFactory } = require('@harmony-js/contract');
const { Wallet } = require('@harmony-js/account');
const { Messenger, WSProvider, HttpProvider } = require('@harmony-js/network');
const { ChainID, ChainType, hexToNumber } = require('@harmony-js/utils');


class HarmonyClient {
    constructor(endpoint, isMainnet, abi, contractAddr, workerKey) {
        const provider = new HttpProvider(endpoint);
        const chainId = isMainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet;
        const wallet = new Wallet(new Messenger(
            provider,
            ChainType.Harmony,
            isMainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet,
        ));
        this.hmy = new Harmony(
            endpoint,
            {
                chainType: ChainType.Harmony,
                chainId: isMainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet,
            },
        );

        const factory = new ContractFactory(wallet);
        this.contract = factory.createContract(abi, contractAddr);
        console.log(`Add Harmony private key to worker wallet: ${workerKey}`);
        this.contract.wallet.addByPrivateKey(workerKey);
    }

    async sendSignatures(data, signatures) {
        let options = { gasPrice: 1000000000, gasLimit: 2100000 };
        data.timestamp = parseInt(data.timestamp);
        data.amount = parseInt(data.amount);
        data.transferNonce = parseInt(data.transferNonce);
        console.log(data);
        console.log(signatures);
        try {
            var response = await this.contract.methods.requestSwap(data, signatures).send(options);
        }
        catch (err) {
            console.log(`error from contract call: ${err.message}`);
            throw err;
        }
        console.log(response.transaction.receipt);
        console.log(response.transaction);
        console.log(response.transaction.getTxStatus());
        if (response.transaction.isRejected()) {
            throw new Error(`swap with nonce ${data.transferNonce} was rejected`);
        }
        return response.transaction.id;
    }

    async isTxConfirmed(hash) {
        const response = await this.hmy.blockchain.getTransactionByHash({ txnHash: hash });
        if (!response.result) {
            return false;
        }
        return !!response.result.blockNumber;
        //return response.result.status === '0x1' || response.result.status === 1;
    }
}

module.exports = {
    HarmonyClient
}
