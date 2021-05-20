require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { Db } = require('./services/db');
const { HarmonyClient } = require('./services/harmony');
const { EdgewareClient } = require('./services/edgeware');
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
let edgeware = null;
try{
    edgeware = new EdgewareClient(global.gConfig.polka.endpoint);
} catch (e) {
    console.log('error new EdgewareClient :>> ', e);
}


const worker = new Worker(db, harmony, edgeware);
worker.dump();
try{
    console.log('worker starting :>> ');
    worker.start();
} catch (err) {
    console.log('worker.start err :>> ', err);
}


const app = express();
app.use(cors());
app.use(express.json());
app.set('worker', worker);

app.use('/v1/api', router);
app.get('/health', function (req, res) {
    res.send('OK');
});
app.use('*', function (req, res, next) {
    res.status(404).send('Sorry cant find that!');
});
app.listen(global.gConfig.port, () => {
    console.log(`Application is running on port ${global.gConfig.port}`);
});
