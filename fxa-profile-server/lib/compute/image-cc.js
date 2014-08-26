/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const gm = require('gm');

const config = require('../config');
const img = require('../img');
const logger = require('../logging').getLogger('fxa.compute.image-cc');
const P = require('../promise');

const HEIGHT = String(config.get('img.resize.height'));
const WIDTH = String(config.get('img.resize.width'));

logger.info('Worker starting up %:2j', config.get('img'));

function processImage(src) {
  logger.debug('Src %d bytes', src.length);
  return new P(function(resolve, reject) {
    // gm uses GraphicsMagick
    // for resizing images, we want to DOWN-size any image that has it's
    // width or height higher than our maximum, while keeping the aspect
    // ratio. Any image that has a lower value should NOT be UP-sized,
    // as that would just make a pixelated mess.
    //
    // The '>' modifier does this.
    // See more: http://www.graphicsmagick.org/GraphicsMagick.html
    gm(src)
      .resize(WIDTH, HEIGHT, '>')
      .noProfile()
      .toBuffer('png', function(err, buf) {
        if (err) {
          reject(err);
        } else {
          resolve(buf);
        }
      });
  });
}

function compute(msg, callback) {
  var id = msg.id;
  var src = Buffer(msg.payload);
  processImage(src).then(function(out) {
    logger.debug('Out %d bytes', out.length);
    return img.upload(id, out);
  }).done(function() {
    callback({ id: id });
  }, function(err) {
    callback({ id: id, error: err });
  });
}
exports.compute = compute;

function response(res) {
  process.send(res);
}

process.on('message', function onMessage(msg) {
  logger.debug('onMessage', msg.id);
  compute(msg, response);
});
