const keccak256 = require("keccak256");

const assert = require("assert");
const HarmonyAddress = require("@harmony-js/crypto");
const signer = require("./../../validator/services/signer");

const HarmonyBridge = artifacts.require("Bridge");
const HarmonyClient = require("./../src/services/harmony").HarmonyClient;

const currentTime = (Date.now() / 1000).toFixed();

const Worker = require("./../src/app").Worker;
const Db = require("./../src/services/db").MockedDb;

class EdgewareClient {
  async isBlockFinalized(hash) {
    return true;
  }
}

global.gConfig = {
  harmony: {
    chain_id: 2,
    endpoint: "https://api.s0.b.hmny.io/",
    contractAddress: "0xe2e463190457e95f5fb79738737aac18f730597c",
    signatureThreshold: 3,
    validators: [
      "0x1d39c64eec4bc279063a0fd69ff0d9c82fa7b41f",
      "0x47195694e991256753a8b48606b5f2f1db2ddb60",
      "0xc08feb099ce2f4778c69ed7d3fe50d3138939123",
      "0x2cfbce3af057d0d16ce15a518602262a0038725a",
    ],
  },
  polka: {
    chain_id: 1,
    endpoint: "wss://beresheet1.edgewa.re",
    contractAddress: "5GVy4KCvf1p4hcyk3rEvBHt3oGCcvFFzZez3NVqthkmoFEQq",
    signatureThreshold: 2,
    validators: ["test-validator1", "test-validator2", "test-validator3"],
  },
};

contract("HarmonyBridge", async (accounts) => {
  contract("Submit signatures", async (accounts) => {
    it("should success when send message by HarmonyClient", async function () {
      // this.timeout(60000);
      // const tokenAddress = process.env.TESTNET_TOKEN_ADDRESS;
      // const addrToken = HarmonyAddress.getAddress(tokenAddress);
      // console.log("tokenAddress -> ", addrToken.basicHex);
      // const endpoint = "https://api.s0.b.hmny.io";
      // const isMainnet = false;
      // const contractAbi = HarmonyBridge;
      // const contractAddr = process.env.TESTNET_BRIDGE_ADDRESS;
      // const addrContr = HarmonyAddress.getAddress(contractAddr);
      // console.log("contractAddr -> ", addrContr.basicHex);
      // console.log("contractAddr", contractAddr);
      // const workerKey = process.env.TESTNET_WORKER_PK;
      // let recieverAddress = "one1guv4d98fjyjkw5agkjrqdd0j78djmkmqeaxltk";
      // const addReceiver = HarmonyAddress.getAddress(recieverAddress);
      // recieverAddress = addReceiver.basicHex;
      // console.log("addReceiver -> ", recieverAddress);
      // let harmony = new HarmonyClient(
      //   endpoint,
      //   isMainnet,
      //   contractAbi.abi,
      //   contractAddr,
      //   workerKey
      // );
      // let message = getSwapMessage(recieverAddress);
      // console.log("message", message);
      // const hashSign = hashMessage(message);
      // console.log("hashSign", hashSign);
      // let signatures = signSwapMessage(hashSign, 4);
      // console.log("signatures", signatures);
      // const res = await harmony.sendSignatures(message, signatures);
      // const isSuccessTx = await harmony.isTxConfirmed(res);
      // assert.strictEqual(isSuccessTx, true);
    });
    it("should success when send message by Worker", async function () {
      this.timeout(60000);
      const countOfSignatures = 4;
      const tokenAddress = process.env.TESTNET_TOKEN_ADDRESS;
      const addrToken = HarmonyAddress.getAddress(tokenAddress);
      console.log("tokenAddress -> ", addrToken.basicHex);
      const endpoint = "https://api.s0.b.hmny.io";
      const isMainnet = false;
      const contractAbi = HarmonyBridge;
      const contractAddr = process.env.TESTNET_BRIDGE_ADDRESS;
      const addrContr = HarmonyAddress.getAddress(contractAddr);
      // console.log("contractAddr -> ", addrContr.basicHex);
      // console.log("contractAddr", contractAddr);
      const workerKey = process.env.TESTNET_WORKER_PK;
      let recieverAddress = "one1guv4d98fjyjkw5agkjrqdd0j78djmkmqeaxltk";
      const addReceiver = HarmonyAddress.getAddress(recieverAddress);
      recieverAddress = addReceiver.basicHex;
      // console.log("addReceiver -> ", recieverAddress);

      let harmony = new HarmonyClient(
        endpoint,
        isMainnet,
        contractAbi.abi,
        contractAddr,
        workerKey
      );

      let message = getSwapMessage(recieverAddress);
      // console.log("message", message);
      const hashSign = hashMessage(message);
      // console.log("hashSign", hashSign);
      let signatures = signSwapMessage(hashSign, countOfSignatures);
      // console.log("signatures", signatures);
      let db = new Db();
      let edgeware = new EdgewareClient();
      let worker = new Worker(db, harmony, edgeware);

      let keys = Object.keys(validators);

      try {
        for (let i = 0; i < countOfSignatures; i++) {
          const addr = HarmonyAddress.getAddress(keys[i]);
          // console.log(i, " -> ", addr.basicHex);
          const sigObj = signer.signMessageForHarmony(
            hashSign,
            validators[keys[i]]
          );
          const request = {
            chain_id: message.chainId,
            chain_type: 0,
            address_to: message.receiver,
            address_from: message.sender,
            tx_time: message.timestamp,
            amount: message.amount,
            asset: message.asset,
            nonce: message.transferNonce,
          };
          const options = {
            validator: keys[i],
            signature: sigObj,
          };

          await worker.processSwapRequest(request, options);
        }
        const res = await worker.processCollected();
        await worker.processPending();
        const r1 = await worker.db.getRequests(0, message.transferNonce);
        const result = await worker.db.getRequestsByStatus("finalized");
        const finalizedTx = result.find(
          (tx) => tx.tx_time === message.timestamp
        );
        assert.strictEqual(finalizedTx.status, "finalized");
      } catch (err) {
        console.log("err", err);
      }
    });
  });
});

const validators = {
  one1r5uuvnhvf0p8jp36pltfluxeeqh60dql9c9fqf:
    "0x49c1e2d20babfa6b5b0364c22603558ea70a65e81558e0981b7dc32e59eaa2bf",
  one1guv4d98fjyjkw5agkjrqdd0j78djmkmqeaxltk:
    "0x851adb388a61e5085b24f19e0cc33fd8f244f184c6ff83cd70f361ae40e6ee21",
  one1cz87kzvuut680rrfa47nlegdxyuf8yfra8pwpy:
    "0xe54d1ed160100f5ee30aeb8ee50fee88a598264f61e00a402b43b91f32192be9",
  one19nauuwhs2lgdzm8ptfgcvq3x9gqrsuj68hl7f2:
    "0x9c3e76a6d62dde5e339e16eac63c90c1489f6a784bd61f0c62034ba698b82510",
};

function getSwapMessage(receiverAccount) {
  let swapMessage = {
    chainId: 2,
    receiver: receiverAccount,
    sender: "one1r5uuvnhvf0p8jp36pltfluxeeqh60dql9c9fqf",
    timestamp: currentTime,
    amount: 3,
    asset: "0x410dd7602f45ecb64e7f0fa28f1e054aa0c568d7",
    transferNonce: 1,
  };
  return swapMessage;
}

function hashMessage(message) {
  let abiMessage = web3.eth.abi.encodeParameters(
    [
      "uint256",
      "address",
      "string",
      "uint256",
      "uint256",
      "address",
      "uint256",
    ],
    [
      message.chainId,
      message.receiver,
      message.sender,
      message.timestamp,
      message.amount,
      message.asset,
      message.transferNonce,
    ]
  );
  return "0x" + keccak256(abiMessage).toString("hex");
}

function signSwapMessage(message, countOfSignatures) {
  let signatures = [];
  let keys = Object.keys(validators);

  for (let i = 0; i < countOfSignatures; i++) {
    const addr = HarmonyAddress.getAddress(keys[i]);
    // console.log(i, " -> ", addr.basicHex);
    const sigObj = signer.signMessageForHarmony(message, validators[keys[i]]);

    signatures.push(sigObj);
  }
  return signatures;
}
