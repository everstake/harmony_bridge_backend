// Update with your config settings.
let dotenv = require('dotenv');

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      database: 'db',
      user:     'user',
      password: 'pass'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db-migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'db',
      user:     'user',
      password: 'pass'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db-migrations'
    }
  },

};
