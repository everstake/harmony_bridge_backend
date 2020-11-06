require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { Db } = require('./services/db');
const { HarmonyClient } = require('./services/harmony');
const config = require('./config/config');
const harmonyCountract = require('./config/harmony_contract.json');
const router = require('./routes');
const { Worker } = require('./app');

const db = new Db(global.gConfig.postgres.host,
                  process.env.POSTGRES_USER,
                  process.env.POSTGRES_PASSWORD,
                  global.gConfig.postgres.database);

const harmony = new HarmonyClient(global.gConfig.harmony.endpoint,
                                  process.env.NODE_ENV === 'prod',
                                  harmonyCountract.abi,
                                  global.gConfig.harmony.contractAddress,
                                  process.env.HARMONY_KEY);
harmony.sendSignatures({
    chainId: 0,
    receiver: '0x61f49cD62Cb1DcA4EBc5d2AeD4A8bc7518D5eB50',
    sender: '0x61f49cD62Cb1DcA4EBc5d2AeD4A8bc7518D5eB50',
    timestamp: 1234567890,
    amount: 1,
    asset: '0xF74c13C1bFd82fc3f6a39527b13e7C2643D662e9',
    transferNonce: 0
}, [ '0xabac' ]);

const worker = new Worker(db, harmony);
worker.dump();
worker.startSending();

const app = express();
app.use(cors());
app.use(express.json());
app.set('worker', worker);

app.use('/v1/api', router);
app.get('/health', function (req, res) {
    res.send('OK');
});
app.use('*', function(req, res, next) {
    res.status(404).send('Sorry cant find that!');
});
app.listen(global.gConfig.port, () => {
    console.log(`Application is running on port ${global.gConfig.port}`);
});