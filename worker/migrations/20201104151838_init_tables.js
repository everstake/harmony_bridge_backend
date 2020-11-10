
exports.up = function(knex) {
    return knex.schema
        .createTable('request', table => {
            table.increments('id').primary()
            table.integer('chain_id').index()
            table.integer('chain_type')
            table.string('address_to')
            table.string('address_from')
            table.integer('tx_time')
            table.integer('amount')
            table.string('asset')
            table.integer('nonce').index()
            table.string('transaction_hash')
            table.enu('status', [ 'collecting', 'collected', 'pending', 'finalized' ]).notNullable()
        })
        .createTable('harmony_validator_payload', table => {
            table.increments('id').primary()
            table.integer('request_id').unsigned().references('id').inTable('request').onDelete('SET NULL').index()
            table.string('validator').index()
            table.string('signature')
        })
        .createTable('edgeware_validator_payload', table => {
            table.increments('id').primary()
            table.integer('request_id').unsigned().references('id').inTable('request').onDelete('SET NULL').index()
            table.string('validator').index()
            table.string('block_hash')
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('request')
        .dropTableIfExists('harmony_validator_payload')
        .dropTableIfExists('edgeware_validator_payload');
};
