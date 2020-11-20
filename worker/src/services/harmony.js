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

        this.requestSwap();
    }

    requestSwap() {
        let options2 = { gasPrice: 100000000000, gasLimit: 2100000 };

        let message = {
            chId: 1,
            receiver: '0xb0ef75b1ba14c62f410c2a412707d8e8682100cf',
            sender: '5DkRiGYEXXwLjkWFoYenRdf6bV5maj8HRPmc84i2cxwWmo7s',
            timestamp: 1605899268,
            amount: 1000000000000,
            asset: '0x181080625b084cdf3c7588adfb24bc618dafce9a',
            transferNonce: 24
        }
        let signatures = ['0x6a2909ac2f19d4ab3ea5e0b245abe1998be80a49ab6bd6100fd4c69f3e3c11e619df102c7bca619a3eb45298c62d6ab3eb7e07d443c5574abf684973dfe3c0671c',
            '0x124c0cd072c60e8a48746f8ae537cef613b1470a665f67c8a0c56418cd02786651c6246e10e036b3ef5f22695595555ccf6ebe5710f080d336c3f7a5a25db1fe1c',
            '0xca8df43bcf71a83cca5a5e6787e2eeebaa2d0d171c2ef2335645855647f0503b50c7e2c98f64be7d6c38f85fdaf8623bbe48814f47020d5193e5195efdfbc0071c']


        this.contract.methods.requestSwap(message, signatures).send(options2).then(response => {
            console.log(response.transaction.receipt);
        });
    }

    async sendSignatures(data, signatures) {
        let options = { gasPrice: 10000000000, gasLimit: 2100000 };
        data.timestamp = parseInt(data.timestamp);
        data.amount = parseInt(data.amount);
        data.transferNonce = parseInt(data.transferNonce);
        console.log(data);
        console.log(signatures);
        const response = await this.contract.methods.requestSwap(data, signatures).send(options);
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
        return response.result.status === '0x1' || response.result.status === 1;
    }
}

module.exports = {
    HarmonyClient
}
