try {
    const fs = require('fs');
    const pathLib = 'node_modules/@polkadot/api/node_modules/@polkadot/types/create/registry.js';
    const data = fs.readFileSync(pathLib, 'utf8');
    const pathContract = 'node_modules/@polkadot/api-contract/base/Contract.js';
    
    const dataContract = fs.readFileSync(pathContract, 'utf8');
    if (data.toString().includes('}) => this.register(types));')) {
        const newCode = `}) => {
            const keysTypes = Object.keys(types)
            if (keysTypes.includes('BlockNumber')) {
              const newItems = {
                BlockWeights: 'u32', ChainId: 'u32', ConsumedWeight: 'u32', DeletedContract: 'u32', DepositNonce: 'u32', ExitReason: 'u32', ProposalVotes: 'u32', Receipt: 'u32', ResourceId: 'u32', Transaction: 'u32', TransactionStatus: 'u32'
              }
              const newTypes = { ...types, ...newItems };
              return this.register(newTypes);
            } else {
              return this.register(types);
            }
            })`;
            const startString = '}\\) => this.register\\(types\\)\\);'
            const myRe = new RegExp(startString, "g");
        const ndxFile = data.toString().replace(myRe, newCode);
        fs.writeFile(pathLib, ndxFile, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
 
            try {
                const dataNew = fs.readFileSync(pathLib, 'utf8');
                const result4 = dataNew.toString().match(/const newTypes = { ...types, ...newItems };/g);
                console.log('result4', result4.length);
            } catch (err1) {
                console.log('err1 :', err1);
            }
        });
    }
   
    const goalString = `return gasLimit.lten(0) ? this.api.consts.system.maximumBlockWeight.muln(64).divn(100) : gasLimit;`;
    if (dataContract.includes(goalString)) {
        const newCode = `return gasLimit.lten(0) ? ((0, _util.bnToBn)(this.api.consts.system.blockWeights.maxBlock.toString())).muln(64).divn(100) : gasLimit;`        
        const ndxFile = dataContract.replace(goalString, newCode);
        fs.writeFile(pathContract, ndxFile, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;

            try {
                const dataNew = fs.readFileSync(pathContract, 'utf8');
                const result4 = dataNew.toString().match(/api.consts.system.blockWeights/g);
            } catch (err1) {
                console.log('*******************err1 :', err1);
            }
        });
    }

} catch (e) {
    console.log('Error:', e.stack);
}
