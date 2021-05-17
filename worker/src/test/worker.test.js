const assert = require("assert");

const Worker = require('../app').Worker;
const Db = require('../services/db').MockedDb;

class HarmonyClient {
    async sendSignatures(data, signatures) {
        return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }

    async isTxConfirmed(hash) {
        return true;
    }
}

class EdgewareClient {
    async isBlockFinalized(hash) {
        return true;
    }
}


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
    describe('Common', function() {
        it('should throw on invalid chain_id', async function() {
            let db = new Db();
            let worker = new Worker(db);

            try {
                await worker.processSwapRequest({
                    'chain_id': 'qwe', // invalid
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
                assert.ok(false, 'should throw');
            }
            catch (err) {
            }
        });

        it('should throw on empty data', async function() {
            let db = new Db();
            let worker = new Worker(db);

            try {
                await worker.processSwapRequest({}, {
                    'validator': 'test-validator2',
                    'signature': 'sig'
                });
                assert.ok(false, 'should throw');
            }
            catch (err) {
            }
        });

        it('should set status to \'collected\' if threshold is reached but somehow didn`t updated immediately', async function() {
            let db = new Db();
            db.insertRequest({
                'chain_id': 0,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });
            db.insertRequest({
                'chain_id': 1,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });
            db.insertHarmonySignature(0, 'test-validator1', 'sig1');
            db.insertHarmonySignature(0, 'test-validator2', 'sig2');
            db.insertEdgewareHash(1, 'test-validator1', 'sig1');
            db.insertEdgewareHash(1, 'test-validator2', 'sig2');
            db.insertEdgewareHash(1, 'test-validator3', 'sig3');

            assert.strictEqual(db.harmonySignatures.length, 2);
            assert.strictEqual(db.edgewareHashes.length, 3);

            let worker = new Worker(db);
            await worker.processCollecting();

            assert.strictEqual(db.requests.length, 2);
            assert.strictEqual(db.requests[0].status, 'collected');
            assert.strictEqual(db.requests[1].status, 'collected');
        });
    });

    describe('Harmony', function() {
        it('should store signature to db', async function() {
            let db = new Db();
            let worker = new Worker(db);

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

            const request = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });
            await worker.processSwapRequest(Object.assign({}, request), {
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

            const request = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'collecting');

            await worker.processSwapRequest(Object.assign({}, request), {
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

        it('should send collected signatures and update status', async function() {
            let db = new Db();
            let harmony = new HarmonyClient();
            let worker = new Worker(db, harmony);

            const request = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processCollected();

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'pending');
        });

        it('should update status when transaction is finalized', async function() {
            let db = new Db();
            let harmony = new HarmonyClient();
            let worker = new Worker(db, harmony);

            const request = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processCollected();
            await worker.processPending();

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'finalized');
        });

        it('should update status for multiple requests', async function() {
            let db = new Db();
            let harmony = new HarmonyClient();
            let worker = new Worker(db, harmony);

            const request1 = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };
            var request2 = Object.assign({}, request1);
            request2.amount = 1;
            request2.nonce = 1;
            var request3 = Object.assign({}, request1);
            request3.tx_time = 2333444555;
            request3.amount = 100;
            request3.nonce = 2;

            await worker.processSwapRequest(Object.assign({}, request1), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request1), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processSwapRequest(Object.assign({}, request2), {
                'validator': 'test-validator3',
                'signature': 'sig3'
            });
            await worker.processSwapRequest(Object.assign({}, request2), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processSwapRequest(Object.assign({}, request3), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request3), {
                'validator': 'test-validator3',
                'signature': 'sig3'
            });

            assert.strictEqual(db.harmonySignatures.length, 6);

            await worker.processCollected();

            assert.strictEqual(db.requests.length, 3);
            assert.strictEqual(db.requests[0].status, 'pending');
            assert.strictEqual(db.requests[1].status, 'pending');
            assert.strictEqual(db.requests[2].status, 'pending');

            await worker.processPending();

            assert.strictEqual(db.requests.length, 3);
            assert.strictEqual(db.requests[0].status, 'finalized');
            assert.strictEqual(db.requests[1].status, 'finalized');
            assert.strictEqual(db.requests[2].status, 'finalized');
        });

        it('should ignore signature from validator that has already submitted', async function() {
            let db = new Db();
            let worker = new Worker(db);

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

        it('shouldn`t set status to collected when status is already pending or finalized', async function() {
            let db = new Db();
            let harmony = new HarmonyClient();
            let worker = new Worker(db, harmony);

            const request1 = {
                'chain_id': 'harmony',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };
            var request2 = Object.assign({}, request1);
            request2.amount = 1;
            request2.nonce = 1;

            await worker.processSwapRequest(Object.assign({}, request1), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });
            await worker.processSwapRequest(Object.assign({}, request1), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processCollected();

            await worker.processSwapRequest(Object.assign({}, request2), {
                'validator': 'test-validator3',
                'signature': 'sig3'
            });
            await worker.processSwapRequest(Object.assign({}, request2), {
                'validator': 'test-validator1',
                'signature': 'sig1'
            });

            await worker.processPending();
            await worker.processCollected();

            assert.strictEqual(db.requests.length, 2);
            assert.strictEqual(db.requests[0].status, 'finalized');
            assert.strictEqual(db.requests[1].status, 'pending');

            // new signatures shouldn`t update status if threshold is already reached
            await worker.processSwapRequest(Object.assign({}, request1), {
                'validator': 'test-validator3',
                'signature': 'sig3'
            });
            await worker.processSwapRequest(Object.assign({}, request2), {
                'validator': 'test-validator2',
                'signature': 'sig2'
            });

            assert.strictEqual(db.requests.length, 2);
            assert.strictEqual(db.requests[0].status, 'finalized');
            assert.strictEqual(db.requests[1].status, 'pending');
        });

        it('should throw on missing signature', async function() {
            let db = new Db();
            let worker = new Worker(db);

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
                    'validator': 'test-validator2'
                });
                assert.ok(false, 'should throw');
            }
            catch (err) {
            }
        });
    });

    describe('Edgeware', function() {
        it('should add edgeware validator payload', async function() {
            let db = new Db();
            let edgeware = new EdgewareClient();
            let worker = new Worker(db, null, edgeware);

            await worker.processSwapRequest({
                'chain_id': 'polka',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            }, {
                'validator': 'test-validator2',
                'hash': 'hash'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.deepStrictEqual(db.requests[0], {
                'id': 0,
                'status': 'collecting',
                'chain_id': 1,
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            });

            assert.strictEqual(db.edgewareHashes.length, 1);
            assert.deepStrictEqual(db.edgewareHashes[0], {
                'id': 0,
                'request_id': 0,
                'validator': 'test-validator2',
                'block_hash': 'hash'
            });
        });

        it('should update status for edgeware request', async function() {
            let db = new Db();
            let edgeware = new EdgewareClient();
            let worker = new Worker(db, null, edgeware);

            const request = {
                'chain_id': 'polka',
                'chain_type': 0,
                'address_to': '0xqwe',
                'address_from': '0xasd',
                'tx_time': 1234567890,
                'amount': 9999,
                'asset': 'ass et',
                'nonce': 0
            };

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator1',
                'hash': 'hash1'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'collecting');

            await worker.processSwapRequest(Object.assign({}, request), {
                'validator': 'test-validator2',
                'hash': 'hash2'
            });

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'collected');

            await worker.processCollected();

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'pending');

            await worker.processPending();

            assert.strictEqual(db.requests.length, 1);
            assert.strictEqual(db.requests[0].status, 'finalized');
        });

        it('should throw on missing block hash', async function() {
            let db = new Db();
            let worker = new Worker(db);

            try {
                await worker.processSwapRequest({
                    'chain_id': 'edgeware',
                    'chain_type': 0,
                    'address_to': '0xqwe',
                    'address_from': '0xasd',
                    'tx_time': 1234567890,
                    'amount': 9999,
                    'asset': 'ass et',
                    'nonce': 0
                }, {
                    'validator': 'test-validator2'
                });
                assert.ok(false, 'should throw');
            }
            catch (err) {
            }
        });
    });
});
