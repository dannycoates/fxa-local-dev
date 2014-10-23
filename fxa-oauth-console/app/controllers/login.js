/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Ember from 'ember';
import config from '../config/environment';

export default Ember.Controller.extend({
  server: config.servers.oauth.replace('https://', '').replace('http://', '')
});
