const sha3 = require("sha3");
const polkaTypes = require("@polkadot/types");

/**
 * Class for intreracting with Bridge smart-contract
 *
 * @class EdgewareSender
 */
class EdgewareSender {
  constructor(_bridgeContract) {
    this.bridgeContract = _bridgeContract;
  }

  /**
   * send Harmony data for saving in Bridge deployed in Edgeware
   * and get hash of bock 
   *
   * @param {*} swapHarmMessage - Harmony message for saving in Bridge
   * @param {*} validator - address of validator
   * @returns hash of success tx or error trace
   */
  sendHarmDataToEdgewareAndGetHashBlock(swapHarmMessage, validator) {
    swapHarmMessage.amount = BigInt(swapHarmMessage.amount);
    return new Promise(async (resolve, reject) => {
      const tx = await this.bridgeContract.tx.requestSwap(
        0,
        -1,
        swapHarmMessage
      );

      await tx.signAndSend(validator, ({ status, events }) => {
        console.log(`Status: ${JSON.stringify(status)}`);
        console.log(`Events: ${events.length}`);
        events.forEach(({ event: { section, method } }) => {
          if (section === "system" && method === "ExtrinsicFailed") {
            reject(new Error('extrinsic failed'));
          }
        });
        if (status.isInBlock) {
          resolve(status.asInBlock.toHex());
        }
      });
    });
  }

  /**
   * Check of Harmony data saved in Bridge by hash of the data
   *
   * @param {*} hashedMessage - hashed message of the Harmony data
   * @param {*} validatorAddress - address of validator
   * @returns  {{metaTypeDefs: [] }, isOk: [Getter],  asOk: [Getter],  isErr: [Getter],  asErr: [Getter]}
   */
  async checkHarmEventByHash(hashedMessage, validatorAddress) {
    const { result } = await this.bridgeContract.query.getCountOfApprovals(
      validatorAddress,
      0,
      -1,
      hashedMessage
    );
    return result;
  }

  /**
   * Get hash of a Harmony message
   *
   * @param {*} swap data -  Harmony message for saving
   * @returns hash of the data
   */
  getHashFromSwapMessage(swap_data) {
    let registry = new polkaTypes.TypeRegistry();

    const CustomType = polkaTypes.Struct.with({
      chain_id: polkaTypes.u8,
      receiver: polkaTypes.GenericAccountId,
      sender: polkaTypes.Text,
      timestamp: polkaTypes.u64,
      amount: polkaTypes.u128,
      asset: polkaTypes.GenericAccountId,
      transfer_nonce: polkaTypes.u128,
    });

    const tmp = new CustomType(registry, swap_data);

    const hash = new sha3.SHA3(256);
    hash.update(Buffer.from(tmp.toU8a()));
    return hash.digest().toJSON().data;
  }
}

module.exports = EdgewareSender;