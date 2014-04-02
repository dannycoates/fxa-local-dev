/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const mysql = require('mysql');

const encrypt = require('../encrypt');
const logger = require('../logging').getLogger('fxa.db.mysql');
const Promise = require('../promise');
const unique = require('../unique');

const SCHEMA = require('fs').readFileSync(__dirname + '/schema.sql').toString();

function MysqlStore(options) {
  this._connection = mysql.createConnection(options);
}

function createSchema(client, options) {
  logger.verbose('createSchema', options);

  var d = Promise.defer();
  var database = options.database;

  logger.verbose('createDatabase');
  client.query('CREATE DATABASE IF NOT EXISTS ' + database
    + ' CHARACTER SET utf8 COLLATE utf8_unicode_ci', function(err) {
      if (err) {
        logger.error('create database', err);
        return d.reject(err);
      }

      logger.verbose('changeUser');
      client.changeUser({
        user: options.user,
        password: options.password,
        database: database
      }, function(err) {
        if (err) {
          logger.error('changeUser', err);
          return d.reject(err);
        }
        logger.verbose('creatingSchema');

        client.query(SCHEMA, function(err) {
          if (err) {
            logger.error('creatingSchema', err);
            return d.reject(err);
          }
          d.resolve();
        });
      });
    });
  return d.promise;
}

MysqlStore.connect = function mysqlConnect(options) {
  options.multipleStatements = true;
  var store = new MysqlStore(options);
  if (options.createSchema) {
    return createSchema(store._connection, options).then(function() {
      return store;
    });
  }
  return Promise.resolve(store);
};

const QUERY_CLIENT_REGISTER =
  'INSERT INTO clients (id, name, imageUri, secret, redirectUri, whitelisted)' +
  'VALUES (?, ?, ?, ?, ?, ?);';
const QUERY_CLIENT_GET = 'SELECT * FROM clients WHERE id=?';
const QUERY_CODE_INSERT =
  'INSERT INTO codes (clientId, userId, scope, code) VALUES ' +
  '(?, ?, ?, ?)';
const QUERY_TOKEN_INSERT =
  'INSERT INTO tokens (clientId, userId, scope, type, token) VALUES ' +
  '(?, ?, ?, ?, ?)';
const QUERY_CODE_FIND = 'SELECT * FROM codes WHERE code=?';
const QUERY_CODE_DELETE = 'DELETE FROM codes WHERE code=?';

MysqlStore.prototype = {

  ping: function ping() {
    logger.debug('ping');
    var d = Promise.defer();
    this._connection.ping(function(err) {
      if (err) {
        logger.error('ping:', err);
        return d.reject(err);
      }
      d.resolve();
    });
    return d.promise;
  },

  registerClient: function registerClient(client) {
    var id;
    if (client.id) {
      logger.debug('registerClient: client already has ID?', client.id);
      id = Buffer(client.id, 'hex');
    } else {
      id = unique.id();
    }
    logger.debug('registerClient', client.name, id.toString('hex'));
    var d = Promise.defer();
    var hash = encrypt.hash(client.secret);
    this._connection.query(QUERY_CLIENT_REGISTER,
      [
        id,
        client.name,
        client.imageUri,
        hash,
        client.redirectUri,
        client.whitelisted
      ],
      function(err) {
        if (err) {
          logger.error('registerClient:', err);
          return d.reject(err);
        }
        logger.debug('registerClient: success [%s]', id.toString('hex'));
        client.id = id;
        d.resolve(client);
      });
    return d.promise;
  },
  getClient: function getClient(id) {
    var d = Promise.defer();
    logger.debug('getClient:', id);
    this._connection.query(QUERY_CLIENT_GET, [id], function(err, rows) {
      if (err) {
        logger.error('getClient:', err);
        return d.reject(err);
      }
      d.resolve(rows[0]);
    });
    return d.promise;
  },
  generateCode: function generateCode(clientId, userId, scope) {
    var code = unique.code();
    var hash = encrypt.hash(code);
    var d = Promise.defer();
    this._connection.query(QUERY_CODE_INSERT,
      [clientId, userId, scope.join(' '), hash],
      function(err) {
        if (err) {
          return d.reject(err);
        }
        d.resolve(code);
      });
    return d.promise;
  },
  getCode: function getCode(code) {
    logger.debug('getCode');
    var d = Promise.defer();
    var hash = encrypt.hash(code);
    this._connection.query(QUERY_CODE_FIND, [hash], function(err, rows) {
      if (err) {
        return d.reject(err);
      }
      var code = rows[0];
      if (code) {
        code.scope = code.scope.split(' ');
      }
      d.resolve(code);
    });
    return d.promise;
  },
  removeCode: function removeCode(id) {
    var d = Promise.defer();
    this._connection.query(QUERY_CODE_DELETE, [id], function(err) {
      if (err) {
        return d.reject(err);
      }
      d.resolve();
    });
    return d.promise;
  },
  generateToken: function generateToken(code) {
    var t = {
      clientId: code.clientId,
      userId: code.userId,
      scope: code.scope,
      type: 'bearer'
    };
    var _token = unique.token();
    var conn = this._connection;
    return this.removeCode(code.code).then(function() {
      var hash = encrypt.hash(_token);
      var d = Promise.defer();
      conn.query(QUERY_TOKEN_INSERT,
        [t.clientId, t.userId, t.scope.join(' '), t.type, hash],
        function(err) {
          if (err) {
            logger.error('generateToken:', err);
            return d.reject(err);
          }
          t.token = _token;
          d.resolve(t);
        });
      return d.promise;
    });
  }

};

module.exports = MysqlStore;
