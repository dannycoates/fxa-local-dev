#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
   Check that we are still using the same list of supported locales
   that fxa-content-server supports.
*/

const CONTENT_SERVER_CONFIG = 'https://raw.githubusercontent.com/mozilla/fxa-content-server/master/server/config/production-locales.json'

const assert = require('assert')
const request = require('request')
const config = require('../config')

function diffLists(first, second) {
  var langs = {}

  first.forEach(function(lang) {
    langs[lang] = 1
  })

  second.forEach(function(lang) {
    if (langs[lang]) {
      langs[lang] += 1
    } else {
      langs[lang] = 1
    }
  })

  return Object.keys(langs).filter(function(key) {
    return langs[key] !== 2
  })
}

function main() {
  var options = {
    url: CONTENT_SERVER_CONFIG,
    timeout: 3000, // don't block
    json: true
  }

  request.get(options, function(err, res, body) {
    // Don't get worried about a transient problem with github.
    if (err || res.statusCode !== 200) {
      console.log('Could not fetch content server config:', err || res.statusCode)
      console.log('Better luck next time.')
      return
    }

    var actual = config.get('i18n').supportedLanguages
    var expect = body.i18n.supportedLanguages

    try {
      assert.deepEqual(actual, expect)
      console.log('OK: List of supported languages match content server config')
    } catch(e) {
      var different = diffLists(actual, expect).join(',')
      console.log('****************************************************************************')
      console.log('* FIXME! List of supported languages not in synch with content server config')
      console.log('*   They differ on: %s', different)
      console.log('****************************************************************************')
    }
  })
}

main()
