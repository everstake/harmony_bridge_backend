const HarmonyAddress = require('@harmony-js/crypto');

exports.convertAddress = function(address) {
    let addr = HarmonyAddress.getAddress(address);
    console.log(addr.basicHex);
}