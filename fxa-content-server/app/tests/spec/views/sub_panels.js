/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'chai',
  'jquery',
  'sinon',
  'underscore',
  'cocktail',
  'views/sub_panels',
  'views/base',
  'views/mixins/modal-settings-panel-mixin',
  'views/mixins/settings-panel-mixin',
  '../../mocks/router',
  '../../lib/helpers',
  'lib/promise',
  'lib/metrics',
  'stache!templates/test_template',
],
function (chai, $, sinon, _, Cocktail, View, BaseView,
  ModalSettingsPanelMixin, SettingsPanelMixin, RouterMock, TestHelpers, p,
  Metrics, TestTemplate) {
  'use strict';

  var assert = chai.assert;

  var SETTINGS_PANEL_CLASSNAME = 'panel';
  var SettingsPanelView = BaseView.extend({
    template: TestTemplate,
    className: SETTINGS_PANEL_CLASSNAME
  });

  var SettingsPanelView2 = BaseView.extend({
    template: TestTemplate,
    className: 'panel2'
  });

  var ModalSettingsPanelView = BaseView.extend({
    template: TestTemplate,
    className: 'modal-panel'
  });

  Cocktail.mixin(SettingsPanelView, SettingsPanelMixin);
  Cocktail.mixin(SettingsPanelView2, SettingsPanelMixin);
  Cocktail.mixin(ModalSettingsPanelView, ModalSettingsPanelMixin);

  describe('views/sub-panels', function () {
    var view;
    var routerMock;
    var metrics;
    var panelViews;
    var initialSubView;
    var superView;

    function createView () {
      view = new View({
        router: routerMock,
        metrics: metrics,
        initialSubView: initialSubView,
        panelViews: panelViews,
        superView: superView
      });
    }

    beforeEach(function () {
      routerMock = new RouterMock();
      metrics = new Metrics();

      panelViews = [
        SettingsPanelView,
        SettingsPanelView2,
        ModalSettingsPanelView
      ];

      createView();
    });

    afterEach(function () {
      $(view.el).remove();
      view.destroy();
      view = null;
      routerMock = null;
    });

    describe('subviews', function () {
      it('shows subview if initialized with one', function () {
        initialSubView = SettingsPanelView;
        createView();
        sinon.stub(view, 'showSubView', function () {
          return p();
        });

        return view.render()
          .then(function () {
            $('#container').append(view.el);
            assert.isTrue(view.showSubView.calledWith(SettingsPanelView));
          });
      });

      it('renders non-modal subviews on render', function () {
        sinon.stub(routerMock, 'createSubView', function (View) {
          var subview = new View();
          return subview;
        });

        return view.render()
          .then(function () {
            assert.isTrue(routerMock.createSubView.calledTwice, 'is only called for the non-modal views');
            assert.equal(routerMock.createSubView.args[0][0], SettingsPanelView);
            assert.equal(routerMock.createSubView.args[1][0], SettingsPanelView2);
          });
      });

      it('showSubView with undeclared view returns', function () {
        var result = view.showSubView(BaseView);
        assert.isUndefined(result);
      });

      it('showSubView opens and logs', function () {
        sinon.stub(routerMock, 'createSubView', function (View) {
          var subview = new View();
          sinon.stub(subview, 'afterVisible', function () { });
          sinon.stub(subview, 'openPanel', function () { });
          sinon.stub(subview, 'logScreen', function () { });
          return subview;
        });
        var spy = sinon.spy(view, 'trackSubview');

        return view.showSubView(SettingsPanelView)
          .then(function () {
            var subView = routerMock.createSubView.returnValues[0];

            assert.isTrue(routerMock.createSubView.called);
            assert.equal(routerMock.createSubView.args[0][0], SettingsPanelView);
            assert.isTrue(routerMock.createSubView.args[0][1].el.hasClass(SETTINGS_PANEL_CLASSNAME));
            assert.isTrue(subView.afterVisible.called);
            assert.isTrue(subView.openPanel.called);
            assert.isTrue(subView.logScreen.called);
            assert.isTrue(spy.calledWith(subView));
          });
      });

      it('showSubView only creates view once', function () {
        sinon.stub(routerMock, 'createSubView', function (View) {
          var subview = new View();
          sinon.stub(subview, 'openPanel', function () { });
          sinon.stub(subview, 'logScreen', function () { });
          return subview;
        });
        var returnedView;

        return view.showSubView(SettingsPanelView)
          .then(function (subView) {
            returnedView = subView;
            return view.showSubView(SettingsPanelView);
          })
          .then(function (subView) {
            assert.equal(returnedView, subView);
            assert.isTrue(routerMock.createSubView.calledOnce);
          });
      });

      it('showSubView destroys subview if fails to render', function () {
        sinon.stub(routerMock, 'createSubView', function (View) {
          var subview = new View();
          sinon.stub(subview, 'afterVisible', function () { });
          sinon.stub(subview, 'destroy', function () { });
          sinon.stub(subview, 'render', function () {
            return p(false);
          });
          return subview;
        });

        return view.showSubView(SettingsPanelView)
          .then(function () {
            var subView = routerMock.createSubView.returnValues[0];
            assert.isTrue(routerMock.createSubView.called);
            assert.equal(routerMock.createSubView.args[0][0], SettingsPanelView);
            assert.isTrue(subView.render.called);
            assert.isTrue(subView.destroy.calledWith(true));
            assert.isFalse(subView.afterVisible.called);
          });
      });

      it('showSubView destroys previous modal view', function () {
        sinon.stub(routerMock, 'createSubView', function (View) {
          var subview = new View();
          sinon.stub(subview, 'openPanel', function () { });
          sinon.stub(subview, 'logScreen', function () { });
          return subview;
        });

        return view.showSubView(ModalSettingsPanelView)
          .then(function (subView) {
            sinon.stub(subView, 'closePanel', function () { });
            return view.showSubView(SettingsPanelView);
          })
          .then(function (subView) {
            assert.isTrue(routerMock.createSubView.returnValues[0].closePanel.called);
          });
      });
    });

  });
});
