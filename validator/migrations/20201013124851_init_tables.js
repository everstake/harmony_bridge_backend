exports.up = knex => {
    return knex.schema
      .createTable('harmony_polka_transaction', table => {
        table.increments('id').primary()
        table.integer('chain_id')
        table.string('address_to')
        table.string('address_from')
        table.bigInteger('tx_time')
        table.integer('amount')
        table.string('asset')
        table.integer('uniq_id')
        table.string('transaction_hash')
        table.string('block_hash')
      })
      .createTable('polka_harmony_transaction', table => {
        table.increments('id').primary()
        table.integer('chain_id')
        table.string('address_to')
        table.string('address_from')
        table.bigInteger('tx_time')
        table.integer('amount')
        table.string('asset')
        table.integer('uniq_id')
        table.string('transaction_hash')
        table.string('block_hash')
      })
      .createTable('harmony_polka_transaction_status', table => {
        table.increments('id').primary()
        table
            .integer('transaction_id')
            .unsigned()
            .references('id')
            .inTable('harmony_polka_transaction')
            .onDelete('SET NULL')
            .index()
        table.string('status')
      })
      .createTable('polka_harmony_transaction_status', table => {
        table.increments('id').primary()
        table
            .integer('transaction_id')
            .unsigned()
            .references('id')
            .inTable('polka_harmony_transaction')
            .onDelete('SET NULL')
            .index()
        table.string('status')
      })
  }
  
  exports.down = knex => {
    return knex.schema
      .dropTableIfExists('harmony_polka_transaction')
      .dropTableIfExists('polka_harmony_transaction')
      .dropTableIfExists('harmony_polka_transaction_status')
      .dropTableIfExists('polka_harmony_transaction_status')
  }