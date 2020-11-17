const { Harmony } = require('@harmony-js/core');
const { ContractFactory } = require('@harmony-js/contract');
const { Wallet } = require('@harmony-js/account');
const { Messenger, WSProvider, HttpProvider } = require('@harmony-js/network');
const { ChainID, ChainType, hexToNumber } = require('@harmony-js/utils');


class HarmonyClient {
    constructor(endpoint, isMainnet, abi, contractAddr, workerKey) {
        const provider = new HttpProvider(endpoint);
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
        this.contract.wallet.addByPrivateKey(workerKey);
    }

    async sendSignatures(data, signatures) {
        const options1 = { gasPrice: '0x3B9ACA00' }; // gas price in hex corresponds to 1 Gwei or 1000000000
        let options2 = { gasPrice: 1000000000, gasLimit: 21000 };

        const gas = await this.contract.methods.requestSwap(data, signatures).estimateGas(options1);
        options2 = {...options2, gasLimit: hexToNumber(gas)};
        const response = await this.contract.methods.requestSwap(data, signatures).send(options2);
        console.log(response.transaction.receipt);
        return response.transaction.id;
    }

    async isTxConfirmed(hash) {
        const response = await this.hmy.blockchain.getTransactionByHash({ txnHash: hash });
        if (!response.result) {
            return false;
        }
        return response.result.status === '0x1' || response.result.status === 1;
    }
}

module.exports = {
    HarmonyClient
}
