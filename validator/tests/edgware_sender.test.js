const polkaAPI = require("@polkadot/api");
const { Keyring } = require("@polkadot/keyring");

const contractAPI = require("@polkadot/api-contract");
const polkaTypes = require("@polkadot/types");

const { blake2b } = require("blakejs");
const bs58 = require("bs58");
var assert = require("assert");
const sha3 = require("sha3");
const BN = require("bn.js");

require("dotenv").config();

const EdgewareSender = require("./../services/edgeware_sender");
console.log("EdgewareSender", EdgewareSender);

let bridgeContract = {};

let api, bridgeAbi, tokenAbi;

const keyring = new Keyring({ type: "sr25519" });
let registry = new polkaTypes.TypeRegistry();

function sleepAsync(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Bridge", function () {
  describe("Edgeware sender", function () {
    before(async function () {
      this.timeout(90000);
      bridgeAbi = require("././../build/metadata.json");
      tokenAbi = require("././../build/metadataERC20Token.json");
      const wsProvider = new polkaAPI.WsProvider(process.env.NODE_URL);
      api = await polkaAPI.ApiPromise.create({ provider: wsProvider });
      tokenContract = new contractAPI.ContractPromise(
        api,
        tokenAbi,
        process.env.TOKEN_ADDRESS
      );
      bridgeContract = new contractAPI.ContractPromise(
        api,
        bridgeAbi,
        process.env.BRIDGE_ADDRESS
      );
      this.timeout(50000);
      await sleepAsync(2000);
      let validators = [
        keyring.addFromUri("//Alice").address,
        keyring.addFromUri("//Bob").address,
        keyring.addFromUri("//Charlie").address,
        keyring.addFromUri("//Dave").address,
      ];
      for (let i = 0; i < validators.length; i++) {
        await sleepAsync(3000);
        let tx = await bridgeContract.tx.addValidator(0, -1, validators[i]);
        let _ = await tx.signAndSend(keyring.addFromUri("//Alice"));
        await sleepAsync(3000);
      }
    });
    it("Send harmony message to edgeware ", async function () {
      const edgewareSender = new EdgewareSender(bridgeContract);
      this.timeout(50000);
      let swapMessage = {
        chain_id: 0,
        receiver: keyring.addFromUri("//Ferdie").address,
        sender: "fooBar",
        timestamp: (Date.now() / 1000).toFixed(),
        amount: 1000000000000000000n,
        asset: "",
        transfer_nonce: 0,
      };
      // don't forget add token in bridge smart contract before
      await edgewareSender
        .sendHarmDataToEdgeware(swapMessage, keyring.addFromUri("//Bob"))
        .then(async (result) => {
          const hashedMessage = edgewareSender.getHashFromSwapMessage(
            swapMessage
          );
          await sleepAsync(6000);
          const res = await edgewareSender.checkHarmEventByHash(
            hashedMessage,
            keyring.addFromUri("//Bob").address
          );
          assert.strictEqual(res.toHuman().Ok.data, "0x0100");
        });
    });
  });
});
