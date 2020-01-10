/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

/* eslint-disable */

// Atul : Oracle utility to create users with all the required permissions.
// This file should be run before CI/CD is started 
// This will create user based on CI_PROJECT_NAMESPACE (which is user name) and CI_PROJECT_NAME

// ORACLE_HOST
// ORACLE_SYSUSER
// ORACLE_SYSPASSWORD
// ORACLE_SID
// CI_PROJECT_NAMESPACE
// CI_PROJECT_NAME

var oracledb = require('oracledb');
var async = require('async');
var fs = require('fs');
var os = require('os');

var oracleHost = process.env.ORACLE_HOST || 'localhost';
var oraclePort = process.env.ORACLE_PORT ? parseInt(process.env.ORACLE_PORT) : 1521;
var oracleSID = process.env.ORACLE_SID || 'ORCLCDB';

var oracleConnectSettings = {
  'password': process.env.ORACLE_SYSPASSWORD || 'manager1',
  'user': process.env.ORACLE_SYSUSER || 'sys',
  'connectString': oracleHost + ':' + oraclePort + '/' + oracleSID
};

var namespace = process.env.CI_PROJECT_NAMESPACE ? process.env.CI_PROJECT_NAMESPACE.replace(/[^a-zA-Z0-9]/g, '') : 'oecloudio';
var name = process.env.CI_PROJECT_NAME ? process.env.CI_PROJECT_NAME.replace(/[^a-zA-Z0-9]/g, '') : 'oecloud';

var userName = namespace.toUpperCase() + '_' + name.toUpperCase();
var password = namespace.toLowerCase();

var grants = [
  'CREATE VIEW',
  'ALTER SESSION',
  'CREATE SESSION',
  'CREATE SEQUENCE',
  'CREATE SYNONYM',
  'CREATE TABLE',
  'UNLIMITED TABLESPACE',
  'CREATE PROCEDURE'
];

function createUser(connection, cb) {
  var alterSQL = 'alter session set "_ORACLE_SCRIPT"=true';
  connection.execute(alterSQL, function (alterErr, alterRes) {
    if (alterErr) {
      console.error('Ignoring error of alter session. UserName : ' + userName + ' Error :' + alterErr);
    }
    console.log(alterSQL, ' ......... ok');

    var createUserSQL = 'CREATE USER "' + userName + '" IDENTIFIED BY ' + password;
    connection.execute(createUserSQL, function (createErr, createRes) {
      if (createErr) {
        console.error(createErr);
        throw new Error('Unable to create user ' + userName);
      }
      console.log(createUserSQL, ' ......... ok');

      async.each(grants, function (g, callback) {
        var grantSQL = 'GRANT ' + g + ' to "' + userName + '"';
        connection.execute(grantSQL, function (grantErr, grantRes) {
          if (grantErr) {
            console.error(grantErr);
            throw new Error('Unable to execute grant ' + grantSQL);
          }
          console.log(grantSQL, ' ......... ok');
          return callback();
        });
      }, function (grantAsyncErr) {
        console.log('User ' + userName + ' Created successfully');
        return cb();
      });
    });
  });
}

function dropTables(cb) {
  var oracleUserConnectSettings = {
    'password': password,
    'user': userName,
    'connectString': oracleHost + ':' + oraclePort + '/' + oracleSID
  };

  oracledb.getConnection(oracleUserConnectSettings, function (userConnectionErr, connection) {
    if (userConnectionErr) {
      console.error(userConnectionErr);
      throw new Error('Unable to connect to Oracle Database ' + JSON.stringify(oracleUserConnectSettings));
    }

    var totalRows = 1000;
    var selectDropTableSQL = "select 'drop table \"' || table_name || '\"' from all_tables where owner = '" + userName + "'";
    connection.execute(selectDropTableSQL, {}, { maxRows: totalRows }, function (selectDropErr, selectDropRes) {
      if (selectDropErr) {
        console.error(selectDropErr);
        throw new Error('Unable to find tables ' + userName);
      }

      if (!selectDropRes || !selectDropRes.rows || selectDropRes.rows.length === 0) {
        return cb();
      }

      async.each(selectDropRes.rows, function (row, callback) {
        var dropTableSQL = row[0];
        connection.execute(dropTableSQL, function (dropTableErr, dropTableRes) {
          if (dropTableErr) {
            console.error(dropTableErr);
            throw new Error('Unable to drop table\nSQL: ' + sql);
          }
          console.log(dropTableSQL, ' ......... ok');
          return callback();
        });
      }, function (dropAsyncErr) {
        console.log('Tables of user ' + userName + ' dropped successfully');
        return cb();
      });
    });
  });
}

function generateUserBundle() {
  console.log("Generating oracle user details shell script");
  fs.writeFileSync('./oracle-user.sh', '#!/bin/sh' + os.EOL);
  fs.appendFileSync('./oracle-user.sh', 'export ORACLE_USERNAME=' + userName + os.EOL);
  fs.appendFileSync('./oracle-user.sh', 'export ORACLE_PASSWORD=' + password + os.EOL);
}

oracledb.getConnection(oracleConnectSettings, function (connectionErr, connection) {
  if (connectionErr) {
    console.error(connectionErr);
    throw new Error('Unable to connect to Oracle Database ' + JSON.stringify(oracleConnectSettings));
  }
  var sql = "select username, user_id from dba_users where username = '" + userName + "'";
  console.log(sql);
  connection.execute(sql, function (err, result) {
    if (err) {
      console.error(err); return;
    }
    if (!result.rows || result.rows.length == 0) {
      createUser(connection, function (err) {
        if (err) {
          return process.exit(1);
        }
        generateUserBundle();
        return process.exit();
      });
    } else {
      dropTables(function (err) {
        if (err) {
          return process.exit(1);
        }
        generateUserBundle();
        return process.exit();
      });
    }
  });
});
