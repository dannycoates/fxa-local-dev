/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  './intern'
], function (intern, functional) {
  'use strict';

  intern.functionalSuites = [
    'tests/functional/firefox/functional_firefox'
  ];

  intern.environments = [
    // these tests can only run in Firefox
    { browserName: 'firefox', version: '31' }
  ];

  return intern;
});
