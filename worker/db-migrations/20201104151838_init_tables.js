
exports.up = function(knex) {
    return knex.schema
        .createTable('request', table => {
            table.increments('id').primary()
            table.integer('chain_id').index()
            table.integer('chain_type')
            table.string('address_to')
            table.string('address_from')
            table.bigInteger('tx_time')
            table.bigInteger('amount')
            table.string('asset')
            table.bigInteger('nonce').index()
            table.string('transaction_hash')
            table.enu('status', [ 'collecting', 'collected', 'pending', 'finalized' ]).notNullable()
            table.unique(['chain_id', 'nonce']);
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
