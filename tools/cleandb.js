var Server = require('mongodb').Server;
var Db = require('mongodb').Db;

var mongoHost = process.env.MONGO_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'commondb';
var mongoPort = process.env.MONGO_PORT || 27017;

var db = new Db(dbName, new Server(mongoHost, mongoPort));
db.open(function (err, db) {
    if (err) {
        console.log("Error connecting to database", err);
    } else {
        db.dropDatabase(function(err, result) {
            if (err) {
                console.log("Error dropping database", err);
            } else {
                console.log("Database " + dbName + " has been dropped");
                db.close();
            }
        });
    }
});