/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

require.config({
  paths: {
    jquery: '../bower_components/jquery/jquery',
    backbone: '../bower_components/backbone/backbone',
    underscore: '../bower_components/underscore/underscore',
    gherkin: '../bower_components/fxa-js-client-old/web/bundle',
    text: '../bower_components/requirejs-text/text',
    mustache: '../bower_components/mustache/mustache',
    stache: '../bower_components/requirejs-mustache/stache',
    transit: '../bower_components/jquery.transit/jquery.transit',
    modernizr: '../bower_components/modernizr/modernizr'
  },
  shim: {
    underscore: {
      exports: '_'
    },
    backbone: {
      deps: [
        'underscore',
        'jquery'
      ],
      exports: 'Backbone'
    },
    transit: {
      deps: [
        'jquery'
      ],
      exports: 'jQuery.fn.transition'
    }
  },
  stache: {
    extension: '.mustache'
  }
});

require([
  // polyfill is defined first in case any browsers need something filled.
  'lib/polyfills',
  'backbone',
  'router',
  'lib/translator'
],
function (Polyfills, Backbone, Router, Translator) {
  // A few globals
  window.router = new Router();
  window.translator = new Translator(window.navigator.language);

  // Don't start backbone until we have our translations
  translator.fetch(function() {
    // Get the party started
    Backbone.history.start({ pushState: true });
  });
});


