const { Wallet, Account } = require('@harmony-js/account');
const { ChainID, ChainType, hexToNumber } = require('@harmony-js/utils');
const { Messenger, WSProvider, HttpProvider } = require('@harmony-js/network');
const { ContractFactory } = require('@harmony-js/contract');
const { Harmony } = require("@harmony-js/core");
const HarmonyAddress = require('@harmony-js/crypto');


const key = require("../config/keys.json");
const contractData = require("../config/harmony_contract.json");
const harmonyConf = require("../config/harmony_conf.json");

exports.accountAddress = function() {
    const account = Account.add(key.harmony_key2);
    console.log(account.bech32Address);
}

exports.convertAddress = function() {
    let addr = HarmonyAddress.getAddress('one1k3q3p9tqn094q5f9jtygp903xuc35xyru8pf2n');
    console.log(addr.basicHex);
}

exports.deployContract = function() {
  const wallet = new Wallet(
    new Messenger(
      new HttpProvider('https://api.s0.b.hmny.io'),
      ChainType.Harmony,
      ChainID.HmyTestnet,
    ),
  );
let factory = new ContractFactory(wallet);
let contract = factory.createContract(contractData.abi);
let options1 = { gasPrice: '0x3B9ACA00' }; // gas price in hex corresponds to 1 Gwei or 1000000000
let options2 = { gasPrice: 1000000000, gasLimit: 21000 }; // setting the default gas limit, but changing later based on estimate gas

let options3 = { data: "0x"+contractData.bytecode.object, arguments: [3, 10, 1, 1000]}

contract.wallet.addByPrivateKey(key.harmony_key2);

contract.methods.contractConstructor(options3).estimateGas(options1).then(gas => {
    options2 = {...options2, gasLimit: hexToNumber(gas)};
    contract.methods.contractConstructor(options3).send(options2).then(response => {
      console.log('contract deployed at ' + response.transaction.receipt.contractAddress);
    });
  });
}

exports.deployTestContract = function() {
  const wallet = new Wallet(
    new Messenger(
      new HttpProvider('https://api.s0.b.hmny.io'),
      ChainType.Harmony,
      ChainID.HmyTestnet,
    ),
  );
  const testContractData = require("../config/test_contract.json");

  let factory = new ContractFactory(wallet);
  let contract = factory.createContract(testContractData.abi);
  let options1 = { gasPrice: '0x3B9ACA00' }; // gas price in hex corresponds to 1 Gwei or 1000000000
  let options2 = { gasPrice: 1000000000, gasLimit: 21000 }; // setting the default gas limit, but changing later based on estimate gas
  // [3, 10, 1, 1000]
  let options3 = { data: "0x"+contractData.bytecode.object}

  contract.wallet.addByPrivateKey(key.harmony_key);

  contract.deploy(options3).estimateGas(options1).then(gas => {
      options2 = {...options2, gasLimit: hexToNumber(gas)};
      contract.deploy(options3).send(options2).then(response => {
        console.log('contract deployed at ' + response.transaction.receipt.contractAddress);
      });
    });
}

exports.interactWithContract = function() {
    const wallet = new Wallet(
        new Messenger(
          new HttpProvider('https://api.s0.b.hmny.io'),
          ChainType.Harmony,
          ChainID.HmyTestnet,
        ),
      );

    const factory = new ContractFactory(wallet);
    const contract = factory.createContract(contractData.abi, harmonyConf.contractAddress);

    contract.wallet.addByPrivateKey(key.harmony_key);

    const options1 = { gasPrice: '0x3B9ACA00' };
    let options2 = { gasPrice: 1000000000, gasLimit: 21000 };

    contract.methods.transferToken('receiverAddressInOtherChain', 5, 'one1rp5u4nxmxpw90z83v5xa8709yg2gut0kufvvmf').estimateGas(options1).then(gas => {
        options2 = {...options2, gasLimit: hexToNumber(gas)};
        contract.methods.transferToken('receiverAddressInOtherChain', 5, 'one1rp5u4nxmxpw90z83v5xa8709yg2gut0kufvvmf').send(options2).then(response => {
          console.log(response.transaction.receipt);
        });
      });
    // contract.methods.transferCoin('receiverAddressInOtherChain').estimateGas(options1).then(gas => {
    //   options2 = {...options2, gasLimit: hexToNumber(gas)};
    //   contract.methods.transferCoin('receiverAddressInOtherChain').send(options2).then(response => {
    //     console.log(response.transaction.receipt);
    //   });
    // });
}

exports.getData = async function() {
  const wallet = new Wallet(
    new Messenger(
      new HttpProvider('https://api.s0.b.hmny.io'),
      ChainType.Harmony,
      ChainID.HmyTestnet,
    ),
  );

  // const contractAddr = "0x478014034feddd212b2fe40e03caccc6cc07e40e";
  // const contractAddr = "0x2e9418da5579d91e1bcc5c6820138292d19b1897";
  // const contractAddr = "0xbe052fa94bb674d6073c3085edcc58022e9c0f87";

  const factory = new ContractFactory(wallet);
  const contract = factory.createContract(contractData.abi, harmonyConf.contractAddress);

  contract.wallet.addByPrivateKey(key.harmony_key);

  const options1 = { gasPrice: '0x3B9ACA00' };
  let options2 = { gasPrice: 1000000000, gasLimit: 21000 };

  // contract.methods.addValidator('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').estimateGas(options1).then(gas => {
  //   options2 = {...options2, gasLimit: hexToNumber(gas)};
  //   contract.methods.addValidator('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').send(options2).then(response => {
  //     console.log(response);
  //   });
  // });

  // console.log(contract.methods);

  contract.methods.tokenBalances('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').estimateGas(options1).then(gas => {
    options2 = {...options2, gasLimit: hexToNumber(gas)};
    contract.methods.tokenBalances('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').call(options2).then(validator => {
      console.log('Validators: ' + validator);
    }).catch(error => {
      console.log("Here is the error");
      console.log(error);
    });
  });

  // contract.methods.fee().estimateGas(options1).then(gas => {
  //   options2 = {...options2, gasLimit: hexToNumber(gas)};
  //   contract.methods.fee().call(options2).then(validator => {
  //     console.log('fee: ' + validator);
  //   }).catch(error => {
  //     console.log("Here is the error");
  //     console.log(error);
  //   });
  // });
}

exports.interactTestContract = function() {
  const wallet = new Wallet(
    new Messenger(
      new HttpProvider('https://api.s0.b.hmny.io'),
      ChainType.Harmony,
      ChainID.HmyTestnet,
    ),
  );

  const testContractData = require("../config/test_contract.json");

  const contractAddr = "0xb4411095609bcb50512592c88095f137311a1883";

  const factory = new ContractFactory(wallet);
  const contract = factory.createContract(testContractData.abi, contractAddr);

  contract.wallet.addByPrivateKey(key.harmony_key);

  const options1 = { gasPrice: '0x3B9ACA00' };
  let options2 = { gasPrice: 1000000000, gasLimit: 21000 };

  // contract.methods.addAddress('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').estimateGas(options1).then(gas => {
  // options2 = {...options2, gasLimit: hexToNumber(gas)};
  // contract.methods.addAddress('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').send(options2).then(response => {
  //   console.log(response);
  // });
  // });

  contract.methods.produceEvent('Event message').estimateGas(options1).then(gas => {
    options2 = {...options2, gasLimit: hexToNumber(gas)};
    contract.methods.produceEvent('Event message').send(options2).then(response => {
      console.log(response.transaction.receipt);
    });
    });

  // contract.methods.addressesSet('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').estimateGas(options1).then(gas => {
  //   options2 = {...options2, gasLimit: hexToNumber(gas)};
  //   contract.methods.addressesSet('one18acjncx9k5hdpsz0pgt5jmc5ws5aejhfzkmj8y').call(options2).then(addr => {
  //     console.log('Address: ' + addr);
  //   }).catch(error => {
  //     console.log("Here is the error");
  //     console.log(error);
  //   });
  // });
}

exports.transferMoney = function() {
  const hmy = new Harmony(
    'https://api.s0.b.hmny.io/',
    {
        chainType: ChainType.Harmony,
        chainId: ChainID.HmyTestnet,
    },
);
  const { TransactionFactory } = require('@harmony-js/transaction');
  const { Unit } = require('@harmony-js/utils');
  const factory = new TransactionFactory();

  const txn = hmy.transactions.newTx({
    to: 'one1nt43fqua2r8ega4d3vg6rp4dhyp2khatfwjx9w',
    value: new Unit(100).asOne().toWei(),
    // gas limit, you can use string
    gasLimit: '21000',
    // send token from shardID
    shardID: 0,
    // send token to toShardID
    toShardID: 0,
    // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
    gasPrice: new hmy.utils.Unit('1').asGwei().toWei(),
  });

  hmy.wallet.addByPrivateKey(key.harmony_key);

  hmy.wallet.signTransaction(txn).then((signedTxn) => {
    signedTxn.sendTransaction().then(([tx, hash]) => {
      console.log('tx hash: ' + hash);
      signedTxn.confirm(hash).then(response => {
        console.log(response.receipt);
      });
    });
  });
}