// Update with your config settings.

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      host: 'postgres',
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
