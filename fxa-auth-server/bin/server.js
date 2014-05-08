/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const config = require('../lib/config').root();
const db = require('../lib/db');
const logger = require('../lib/logging').getLogger('fxa.bin.server');
const server = require('../lib/server').create();

logger.debug('Starting with config: %:2j', config);
db.ping().done(function() {
  server.start(function() {
    logger.info('Server started at:', server.info.uri);
  });
}, function(err) {
  logger.critical('DB ping error', err);
});
