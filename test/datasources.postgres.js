/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
var postgresHost = process.env.POSTGRES_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'oe-workflow-test';
module.exports =
{
  'memdb': {
    'name': 'memdb',
    'connector': 'memory'
  },
  'transient': {
    'name': 'transient',
    'connector': 'transient'
  },

  'db': {
    'host': postgresHost,
    'port': 5432,
    'url': 'postgres://postgres:postgres@' + postgresHost + ':5432/' + dbName,
    'database': dbName,
    'password': 'postgres',
    'name': 'db',
    'connector': 'oe-connector-postgresql',
    'user': 'postgres',
    'max': 50,
    'connectionTimeout': 50000
  }
};
