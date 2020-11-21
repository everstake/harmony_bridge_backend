require('dotenv').config();

module.exports = {

  dev: {
    client: 'postgresql',
    connection: {
      host: 'bridge-worker-postgres',
      database: process.env.POSTGRES_DB,
      user:     process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db-migrations'
    }
  },

  prod: {
    client: 'postgresql',
    connection: {
      host: 'bridge-worker-postgres',
      database: process.env.POSTGRES_DB,
      user:     process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
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
