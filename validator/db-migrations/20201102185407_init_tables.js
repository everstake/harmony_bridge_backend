exports.up = knex => {
    return knex.schema
      .createTable('chain_info', table => {
        table.increments('id').primary()
        table.string('chain')
        table.integer('last_processed').unsigned()
      })
  }
  
  exports.down = knex => {
    return knex.schema
      .dropTableIfExists('chain_info')
  }