const EdgewareToken = artifacts.require("EdgewareToken");

module.exports = function(deployer, network, accounts) {

const name = process.env.NAME_TOKEN;
const symbol= process.env.SYMBOL_TOKEN;

deployer.then(function() {
  return deployer.deploy(EdgewareToken, name, symbol).then(function() {
    });
  });
};