/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function (require, exports, module) {
  'use strict';

  const _ = require('underscore');
  const UAParser = require('ua-parser-js');

  const UserAgent = function (userAgent) {
    const uap = UAParser(userAgent);

    _.extend(uap, {
      /**
       * Check if the OS is Android.
       *
       * @returns {Boolean}
       */
      isAndroid () {
        return this.os.name === 'Android';
      },

      /**
       * Check if the OS is iOS.
       *
       * @returns {Boolean}
       */
      isIos () {
        return this.os.name === 'iOS';
      },

      /**
       * Check if the browser is Mobile Safari.
       *
       * @returns {Boolean}
       */
      isMobileSafari () {
        return this.browser.name === 'Mobile Safari';
      },

      /**
       * Check if the browser is Firefox
       *
       * @returns {Boolean}
       */
      isFirefox () {
        return this.browser.name === 'Firefox';
      },

      /**
       * Check if the browser is Firefox for Android
       *
       * @returns {Boolean}
       */
      isFirefoxAndroid () {
        return this.isFirefox() && this.isAndroid();
      },

      /**
       * Check if the browser is Firefox for iOS
       *
       * @returns {Boolean}
       */
      isFirefoxIos () {
        return this.isFirefox() && this.isIos();
      },

      /**
       * Check if the browser is Firefox desktop
       *
       * @returns {Boolean}
       */
      isFirefoxDesktop () {
        return this.isFirefox() && ! this.isFirefoxIos() && ! this.isFirefoxAndroid();
      },

      /**
       * Parse uap.browser.version into an object with
       * `major`, `minor`, and `patch`
       *
       * @returns {Object}
       */
      parseVersion () {
        const browserVersion = this.browser.version.split('.');
        return {
          major: parseInt(browserVersion[0] || 0, 10),
          minor: parseInt(browserVersion[1] || 0, 10),
          patch: parseInt(browserVersion[2] || 0, 10)
        };
      }
    });

    return uap;
  };

  /**
   * Simplifies user agent operating system names (50+) to generic popular names (~6)
   *
   * @param {String} os Operating System name from
   * @returns {String} generic operating system name
   */
  UserAgent.toGenericOSName = function toGenericOSName (os) {
    if (/^Windows/.test(os)) {
      return 'Windows';
    }

    if (/^Android/.test(os)) {
      return 'Android';
    }

    if (/^Mac OS/.test(os)) {
      return 'macOS';
    }

    if (/^iOS/.test(os)) {
      return 'iOS';
    }

    if (/^Ubuntu/.test(os) || /^Linux/.test(os) || /^Fedora/.test(os)
      || /^Red Hat/.test(os) || /^Debian/.test(os)) {
      return 'Linux';
    }

    return 'Unknown';
  };

  module.exports = UserAgent;

});
