try {
    const fs = require('fs');
    const pathLib = 'node_modules/@polkadot/api/node_modules/@polkadot/types/create/registry.js';
    //const dataMjs = fs.readFileSync(pathMjsLib, 'utf8');
    const data = fs.readFileSync(pathLib, 'utf8'); 
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

} catch (e) {
    console.log('Error:', e.stack);
}