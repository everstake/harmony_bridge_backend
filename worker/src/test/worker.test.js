const assert = require("assert");

const Worker = require('../app').Worker;
const Db = require('../services/db').MockedDb;

global.gConfig = {
    "harmony": {
        "chain_id": 0,
        "endpoint": "https://api.s0.b.hmny.io/",
        "contractAddress": "0x3CB363efd9e8C192aa59d134C9597978226C3e1A",
        "signatureThreshold": 2,
        "validators": [ "test-validator1", "test-validator2", "test-validator3" ]
    },
    "polka": {
        "chain_id": 1,
        "endpoint": "wss://beresheet1.edgewa.re",
        "contractAddress": "5GVy4KCvf1p4hcyk3rEvBHt3oGCcvFFzZez3NVqthkmoFEQq",
        "signatureThreshold": 2,
        "validators": [ "test-validator1", "test-validator2", "test-validator3" ]
    }
};

describe('Worker', function() {
    describe('Harmony', function() {
        it('should store signature to db', async function() {
            let db = new Db();
            let worker = new Worker(db);
            //worker.start();

            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator2',
                'signature': 'sig'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.deepStrictEqual(db.requests[0], {
                'id': 0,
                'status': 'collecting',
                'chain_id': 0,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });

            assert.strictEqual(db.harmonySignatures.length, 1);
            assert.deepStrictEqual(db.harmonySignatures[0], {
                'id': 0,
                'request_id': 0,
                'validator': 'test-validator2',
                'signature': 'sig'
            });
        });

        it('should store multiple signatures to db', async function() {
            let db = new Db();
            let worker = new Worker(db);
            //worker.start();

            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });
            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator3',
                'signature': 'sig3'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.deepStrictEqual(db.requests[0], {
                'id': 0,
                'status': 'collected',
                'chain_id': 0,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });

            assert.strictEqual(db.harmonySignatures.length, 3);
            assert.deepStrictEqual(db.harmonySignatures[0], {
                'id': 0,
                'request_id': 0,
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            assert.deepStrictEqual(db.harmonySignatures[1], {
                'id': 1,
                'request_id': 0,
                'validator': 'test-validator1',
                'signature': 'sig1'
            });
            assert.deepStrictEqual(db.harmonySignatures[2], {
                'id': 2,
                'request_id': 0,
                'validator': 'test-validator3',
                'signature': 'sig3'
            });
        });

        it('should update status when threshold is reached', async function() {
            let db = new Db();
            let worker = new Worker(db);
            //worker.start();

            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'collected');
            assert.strictEqual(db.harmonySignatures.length, 2);
            assert.deepStrictEqual(db.harmonySignatures[0], {
                'id': 0,
                'request_id': 0,
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            assert.deepStrictEqual(db.harmonySignatures[1], {
                'id': 1,
                'request_id': 0,
                'validator': 'test-validator1',
                'signature': 'sig1'
            });
        });

        it('should ignore signature from validator that has already submitted', async function() {
            let db = new Db();
            let worker = new Worker(db);
            //worker.start();

            await worker.processSwapRequest({
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator2',
                'signature': 'sig'
            });
            try {
                await worker.processSwapRequest({
                    'chain_id': 'harmony',
                    'chain_type': 0,
                    'address_to': '0xqwe',
                    'address_from': '0xasd',
                    'tx_time': 1234567890,
                    'amount': 9999,
                    'asset': 'ass et',
                    'nonce': 0
                }, {
                    'validator': 'test-validator2',
                    'signature': 'sig1'
                });
                assert.ok(false, 'processSwapRequest should throw when validator tries to insert signature twice');
            }
            catch (err) {
            }

            assert.strictEqual(db.requests.length, 1);
            assert.deepStrictEqual(db.requests[0], {
                'id': 0,
                'status': 'collecting',
                'chain_id': 0,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });

            assert.strictEqual(db.harmonySignatures.length, 1);
            assert.deepStrictEqual(db.harmonySignatures[0], {
                'id': 0,
                'request_id': 0,
                'validator': 'test-validator2',
                'signature': 'sig'
            });
        });
    });
});
