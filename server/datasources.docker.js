var host = process.env.MONGO_HOST || 'localhost';
var port = process.env.MONGO_PORT || 27017;
var dbName = process.env.DB_NAME || 'commondb';
var ds = {
  'db': {
    'host': host,
    'port': port,
    'url': 'mongodb://' + host + ':' + port + '/' + dbName,
    'database': dbName,
    'password': 'admin',
    'name': 'db',
    'connector': 'mongodb',
    'user': 'admin',
    'connectionTimeout': 50000
  }
};
module.exports = ds;
