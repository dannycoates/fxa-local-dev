/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
define(['../../components/sjcl/sjcl', '../../components/p/p'], function (sjcl, P) {
  'use strict';

  /**
   * @class pbkdf2
   * @constructor
   */
  var pbkdf2 = {
    /**
     * @method derive
     * @param  {bitArray} input The password hex buffer.
     * @param  {bitArray} salt The salt string buffer.
     * @return {bitArray} the derived key bit array.
     */
    derive: function(input, salt, iterations, len) {
      var result = sjcl.misc.pbkdf2(input, salt, iterations, len, sjcl.misc.hmac);
      return P(result);
    }
  };

  return pbkdf2;

});
