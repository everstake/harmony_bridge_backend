require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { Db } = require('./services/db');
const config = require('./config/config');
const router = require('./routes');
const { Worker } = require('./app');

const db = new Db(global.gConfig.postgres.host,
                  process.env.POSTGRES_USER,
                  process.env.POSTGRES_PASSWORD,
                  global.gConfig.postgres.database);

const worker = new Worker(db);
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