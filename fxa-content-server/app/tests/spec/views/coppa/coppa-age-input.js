/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'chai',
  'jquery',
  'lib/auth-errors',
  'lib/metrics',
  'models/form-prefill',
  'sinon',
  'views/coppa/coppa-age-input',
  '../../../lib/helpers'
],
function (chai, $, AuthErrors, Metrics, FormPrefill, sinon, View, TestHelpers) {
  'use strict';

  var assert = chai.assert;

  describe('views/coppa/coppa-age-input', function () {
    var view;
    var formPrefill;
    var metrics;

    function createView() {
      view = new View({
        formPrefill: formPrefill,
        metrics: metrics,
        viewName: 'signup'
      });
    }

    beforeEach(function () {
      formPrefill = new FormPrefill();
      metrics = new Metrics();
      createView();

      return view.render()
        .then(function () {
          $('#container').html(view.el);
        });
    });

    afterEach(function () {
      view.remove();
      view.destroy();

      view = null;
    });

    describe('render', function () {
      it('works', function () {
        createView();

        return view.render()
          .then(function () {
            assert.equal(view.$('#age').val(), '');
          });
      });
    });

    describe('onInput', function () {
      it('limits characters', function () {
        var age = $('#age');
        age.val('13123123123123');
        view.onInput();
        assert.equal(age.val(), '131');
      });
    });

    describe('isValid', function () {
      it('returns true if age is valid', function () {
        view.$('#age').val('14');
        assert.isTrue(view.isValid());
      });

      it('returns false if age is not valid ', function () {
        assert.isFalse(view.isValid());
        view.showValidationErrorsEnd();

        var yearError = AuthErrors.toError('AGE_REQUIRED');
        yearError.context = view.getViewName();
        assert.isTrue(TestHelpers.isErrorLogged(metrics, yearError));
      });
    });

    describe('showValidationErrorsEnd', function () {
      it('shows an error if no age is set', function () {
        sinon.spy(view, 'showValidationError');

        view.showValidationErrorsEnd();
        assert.isTrue(view.showValidationError.called);
      });

      it('does not show an error if age is set', function () {
        sinon.spy(view, 'showValidationError');
        view.$('#age').val('14');

        view.showValidationErrorsEnd();
        assert.isFalse(view.showValidationError.called);
      });
    });

    describe('submitOnEnter', function () {
      function testEnterKeyTriggersSubmit(element, done) {
        view.on('submit', function () {
          done();
        });

        // submit using the enter key
        var e = jQuery.Event('keydown', { which: 13 });
        $(element).trigger(e);
      }

      it('submits form if user presses enter on the age', function (done) {
        testEnterKeyTriggersSubmit('#age', done);
      });
    });

    describe('isUserOldEnough', function () {
      it('returns true if user is old enough', function () {
        view.$('#age').val('14');
        assert.isTrue(view.isUserOldEnough());
        view.$('#age').val('13');
        assert.isTrue(view.isUserOldEnough());
        view.$('#age').val('56');
        assert.isTrue(view.isUserOldEnough());
      });

      it('returns false if user is not old enough', function () {
        assert.isFalse(view.isUserOldEnough());
        view.$('#age').val('12');
        assert.isFalse(view.isUserOldEnough());
        view.$('#age').val('1');
        assert.isFalse(view.isUserOldEnough());
        view.$('#age').val('0');
        assert.isFalse(view.isUserOldEnough());
      });
    });

    describe('_selectPrefillAge', function () {
      it('recovers data from formPrefill', function () {
        formPrefill.set('age', '11');
        view._selectPrefillAge('age');
        assert.equal(view.$('#age').val(), '11');
      });
    });

    describe('destroy', function () {
      it('saves the form info to formPrefill', function () {
        view.$('#age').val('13');
        view.destroy();
        assert.equal(formPrefill.get('age'), '13');
      });
    });
  });
});
