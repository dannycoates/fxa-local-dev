/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'views/behaviors/null'
],
function (NullBehavior) {
  'use strict';

  describe('views/behaviors/null', function () {
    it('does nothing', function () {
      var nullBehavior = new NullBehavior();
      nullBehavior({});
    });
  });
});
