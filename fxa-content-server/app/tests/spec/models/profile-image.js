/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'chai',
  'sinon',
  'lib/promise',
  'lib/profile-errors',
  'models/profile-image'
],
function (chai, sinon, p, ProfileErrors, ProfileImage) {
  var assert = chai.assert;

  describe('models/profile-image', function () {
    var pngSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQYV2P4DwABAQEAWk1v8QAAAABJRU5ErkJggg==';
    var profileImage;

    afterEach(function () {
      profileImage = null;
    });

    describe('isDefault', function () {
      it('isDefault without url', function () {
        profileImage = new ProfileImage({ id: 'foo', img: 'img' });
        assert.isTrue(profileImage.isDefault());
      });
      it('isDefault without id', function () {
        profileImage = new ProfileImage({ url: 'foo', img: 'img' });
        assert.isTrue(profileImage.isDefault());
      });
      it('isDefault without img', function () {
        profileImage = new ProfileImage({ url: 'foo', id: 'id' });
        assert.isTrue(profileImage.isDefault());
      });
      it('isDefault is false with url, id, and img', function () {
        profileImage = new ProfileImage({ url: 'foo', id: 'id', img: 'img' });
        assert.isFalse(profileImage.isDefault());
      });
    });

    describe('fetch', function () {
      beforeEach(function () {
        profileImage = new ProfileImage({ url: pngSrc, id: 'id' });
      });

      it('fetches', function () {
        return profileImage.fetch()
          .then(function () {
            assert.isTrue(profileImage.has('img'));
            assert.isFalse(profileImage.isDefault());
          });
      });

      it('does not fetch when missing url', function () {
        profileImage.clear('url');
        return profileImage.fetch()
          .then(function () {
            assert.isFalse(profileImage.has('img'));
          });
      });

      it('image error when url does not load', function () {
        profileImage.set('url', 'bad url');
        return profileImage.fetch()
          .then(function () {
            assert.fail('unexpected success');
          }, function (err) {
            assert.isTrue(ProfileErrors.is(err, 'IMAGE_LOAD_ERROR'));
            assert.equal(err.context, 'bad url');
            assert.isFalse(profileImage.has('img'));
          });
      });

    });

  });
});
