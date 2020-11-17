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
    return new Promise(async (resolve, reject) => {
      const tx = await this.bridgeContract.tx.requestSwap(
        0,
        -1,
        swapHarmMessage
      );

      await tx.signAndSend(validator, ({ status, events }) => {
        if (status.isInBlock) {
          resolve(status.asInBlock.toHex());
        } else if (status.isInBlock || status.isFinalized) {
          events
            // find/filter for failed events
            .filter(
              ({ event: { section, method } }) =>
                section === "system" && method === "ExtrinsicFailed"
            )
            // we know that data for system.ExtrinsicFailed is
            // (DispatchError, DispatchInfo)
            .forEach(({ data: [error, info] }) => {
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = api.registry.findMetaError(error.asModule);
                const { documentation, method, section } = decoded;

                reject(`${section}.${method}: ${documentation.join(" ")}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                reject(error.toString());
              }
            });
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
