const config = require('./config.json');

const environment = process.env.NODE_ENV || 'dev';
const environmentConfig = config[environment];

global.gConfig = environmentConfig;
console.log(`global.gConfig: ${JSON.stringify(global.gConfig)}`);
