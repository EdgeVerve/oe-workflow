var fs = require('fs');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var chai = require('chai');
var assert = chai.assert;

var mongoHost = process.env.MONGO_HOST || 'localhost';
var dbName = process.env.DB_NAME || 'commondb';


function uploadFile(fname) {
  var data = fs.readFileSync(path.resolve(fname), 'utf-8');
  if (data) {
    data = JSON.parse(data);
    var url = 'mongodb://' + mongoHost + ':27017/' + dbName;
    MongoClient.connect(url, function cb(err, db) {
      assert.notOk(err);
      Object.keys(data).forEach(function forEachModel(modelName) {
        data[modelName].forEach(function forEachRecord(rec) {
          if (rec._id) {
            rec._id = new ObjectID(rec._id);
          }
          if (rec.parentProcessInstanceId) {
            rec.parentProcessInstanceId = new ObjectID(rec.parentProcessInstanceId);
          }
          if (rec.workflowDefinitionId) {
            rec.workflowDefinitionId = new ObjectID(rec.workflowDefinitionId);
          }
          if (rec.workflowInstanceId) {
            rec.workflowInstanceId = new ObjectID(rec.workflowInstanceId);
          }
          if (rec.processDefinitionId) {
            rec.processDefinitionId = new ObjectID(rec.processDefinitionId);
          }
        });
        db.collection(modelName).insertMany(data[modelName], function insertCb(err, res) {
          assert.notOk(err);
        });
      });
    });
  } else {
    assert(true, 'Error reading file ', fname);
  }
}

module.exports = {
  uploadFile: uploadFile
};
