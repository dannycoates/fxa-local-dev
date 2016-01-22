/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Middleware to take care of CSP. CSP headers are not sent unless config
// option 'csp.enabled' is set (default true in development), with a special
// exception for the /tests/index.html path, which are the frontend unit
// tests.

var config = require('./configuration');
var helmet = require('helmet');
var url = require('url');

var BLOB = 'blob:';
var CDN_URL = config.get('static_resource_url');
var DATA = 'data:';
var GRAVATAR = 'https://secure.gravatar.com';
var PUBLIC_URL = config.get('public_url');
var SELF = "'self'";

function addCdnRuleIfRequired(target) {
  if (CDN_URL !== PUBLIC_URL) {
    target.push(CDN_URL);
  }
  return target;
}

function isCspRequired(req) {
  // is the user running tests? No CSP.
  return req.path !== '/tests/index.html';
}

function getOrigin(link) {
  var parsed = url.parse(link);
  return parsed.protocol + '//' + parsed.host;
}

var cspMiddleware = helmet.csp({
  connectSrc: [
    SELF,
    getOrigin(config.get('fxaccount_url')),
    config.get('oauth_url'),
    config.get('profile_url'),
    config.get('marketing_email.api_url')
  ],
  defaultSrc: [SELF],
  fontSrc: addCdnRuleIfRequired([
    SELF
  ]),
  imgSrc: addCdnRuleIfRequired([
    SELF,
    DATA,
    GRAVATAR,
    config.get('profile_images_url')
  ]),
  mediaSrc: [BLOB],
  reportOnly: config.get('csp.reportOnly'),
  reportUri: config.get('csp.reportUri'),
  scriptSrc: addCdnRuleIfRequired([
    SELF
  ]),
  styleSrc: addCdnRuleIfRequired([
    SELF,
    // The sha of the embedded <style> tag in default-profile.svg.
    "'sha256-9n6ek6ecEYlqel7uDyKLy6fdGNo3vw/uScXSq9ooQlk='"
  ])
});

module.exports = function (req, res, next) {
  if (! isCspRequired(req)) {
    return next();
  }

  cspMiddleware(req, res, next);
};
