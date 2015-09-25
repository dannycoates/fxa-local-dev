/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'backbone',
  './environment',
  'jquery',
  './promise',
  './storage',
  'underscore',
  '../views/base',
  '../views/cannot_create_account',
  '../views/clear_storage',
  '../views/complete_account_unlock',
  '../views/complete_reset_password',
  '../views/complete_sign_up',
  '../views/confirm',
  '../views/confirm_account_unlock',
  '../views/confirm_reset_password',
  '../views/cookies_disabled',
  '../views/force_auth',
  '../views/legal',
  '../views/openid/login',
  '../views/openid/start',
  '../views/permissions',
  '../views/pp',
  '../views/ready',
  '../views/reset_password',
  '../views/settings',
  '../views/settings/avatar_camera',
  '../views/settings/avatar_change',
  '../views/settings/avatar_crop',
  '../views/settings/avatar_gravatar',
  '../views/settings/change_password',
  '../views/settings/communication_preferences',
  '../views/settings/delete_account',
  '../views/settings/display_name',
  '../views/settings/gravatar_permissions',
  '../views/sign_in',
  '../views/sign_up',
  '../views/tos',
  '../views/unexpected_error'
],
function (
  Backbone,
  Environment,
  $,
  p,
  Storage,
  _,
  BaseView,
  CannotCreateAccountView,
  ClearStorageView,
  CompleteAccountUnlockView,
  CompleteResetPasswordView,
  CompleteSignUpView,
  ConfirmView,
  ConfirmAccountUnlockView,
  ConfirmResetPasswordView,
  CookiesDisabledView,
  ForceAuthView,
  LegalView,
  OpenIdLoginView,
  OpenIdStartView,
  PermissionsView,
  PpView,
  ReadyView,
  ResetPasswordView,
  SettingsView,
  AvatarCameraView,
  AvatarChangeView,
  AvatarCropView,
  AvatarGravatarView,
  ChangePasswordView,
  CommunicationPreferencesView,
  DeleteAccountView,
  DisplayNameView,
  GravatarPermissionsView,
  SignInView,
  SignUpView,
  TosView,
  UnexpectedErrorView
) {
  'use strict';

  function showView(View, options) {
    return function () {
      // If the current view is an instance of View, that means we're
      // navigating from a subview of the current view
      if (this.currentView instanceof View) {
        this.trigger(this.NAVIGATE_FROM_SUBVIEW, options);
        this.setDocumentTitle(this.currentView.titleFromView());
      } else {
        this.createAndShowView(View, options);
      }
    };
  }

  // Show a sub-view, creating and initializing the SuperView if needed.
  function showSubView(SuperView, options) {
    return function () {
      var self = this;
      // If currentView is of the SuperView type, simply show the subView
      if (self.currentView instanceof SuperView) {
        self.showSubView(options);
      } else {
        // Create the SuperView; its initialization method should handle the subView option.
        self.createAndShowView(SuperView, options)
          .then(function () {
            self.showSubView(options);
          });
      }
    };
  }

  var Router = Backbone.Router.extend({
    NAVIGATE_FROM_SUBVIEW: 'navigate-from-subview',

    routes: {
      '(/)': 'redirectToSignupOrSettings',
      'account_unlock_complete(/)': showView(ReadyView, { type: 'account_unlock' }),
      'cannot_create_account(/)': showView(CannotCreateAccountView),
      'clear(/)': showView(ClearStorageView),
      'complete_reset_password(/)': showView(CompleteResetPasswordView),
      'complete_unlock_account(/)': showView(CompleteAccountUnlockView),
      'confirm(/)': showView(ConfirmView),
      'confirm_account_unlock(/)': showView(ConfirmAccountUnlockView),
      'confirm_reset_password(/)': showView(ConfirmResetPasswordView),
      'cookies_disabled(/)': showView(CookiesDisabledView),
      'force_auth(/)': showView(ForceAuthView),
      'legal(/)': showView(LegalView),
      'legal/privacy(/)': showView(PpView),
      'legal/terms(/)': showView(TosView),
      'oauth(/)': 'redirectToBestOAuthChoice',
      'oauth/force_auth(/)': showView(ForceAuthView),
      'oauth/signin(/)': showView(SignInView),
      'oauth/signup(/)': showView(SignUpView),
      'openid/login(/)': showView(OpenIdLoginView),
      'openid/start(/)': showView(OpenIdStartView),
      'reset_password(/)': showView(ResetPasswordView),
      'reset_password_complete(/)': showView(ReadyView, { type: 'reset_password' }),
      'settings(/)': showView(SettingsView),
      'settings/avatar/camera(/)': showSubView(SettingsView, { subView: AvatarCameraView }),
      'settings/avatar/change(/)': showSubView(SettingsView, { subView: AvatarChangeView }),
      'settings/avatar/crop(/)': showSubView(SettingsView, { subView: AvatarCropView }),
      'settings/avatar/gravatar(/)': showSubView(SettingsView, { subView: AvatarGravatarView }),
      'settings/avatar/gravatar_permissions(/)': showSubView(SettingsView, { subView: GravatarPermissionsView }),
      'settings/change_password(/)': showSubView(SettingsView, { subView: ChangePasswordView }),
      'settings/communication_preferences(/)': showSubView(SettingsView, { subView: CommunicationPreferencesView }),
      'settings/delete_account(/)': showSubView(SettingsView, { subView: DeleteAccountView }),
      'settings/display_name(/)': showSubView(SettingsView, { subView: DisplayNameView }),
      'signin(/)': showView(SignInView),
      'signin_permissions(/)': showView(PermissionsView, { type: 'sign_in' }),
      'signup(/)': showView(SignUpView),
      'signup_complete(/)': showView(ReadyView, { type: 'sign_up' }),
      'signup_permissions(/)': showView(PermissionsView, { type: 'sign_up' }),
      'unexpected_error(/)': showView(UnexpectedErrorView),
      'verify_email(/)': showView(CompleteSignUpView)
    },

    initialize: function (options) {
      options = options || {};

      this.able = options.able;
      this.broker = options.broker;
      this.formPrefill = options.formPrefill;
      this.fxaClient = options.fxaClient;
      this.interTabChannel = options.interTabChannel;
      this.language = options.language;
      this.metrics = options.metrics;
      this.notifications = options.notifications;
      this.relier = options.relier;
      this.sentryMetrics = options.sentryMetrics;
      this.user = options.user;
      this.window = options.window || window;

      this.environment = options.environment || new Environment(this.window);
      this.storage = Storage.factory('sessionStorage', this.window);

      this.watchAnchors();
    },

    navigate: function (url, options) {
      // Only add search parameters if they do not already exist.
      // Search parameters are added to the URLs because they are sometimes
      // used to pass state from the browser to the screens. Perhaps we should
      // take the search parameters on startup, toss them into Session, and
      // forget about this malarky?
      if (! /\?/.test(url)) {
        url = url + this.window.location.search;
      }

      options = options || { trigger: true };
      return Backbone.Router.prototype.navigate.call(this, url, options);
    },

    redirectToSignupOrSettings: function () {
      var url = this.user.getSignedInAccount().get('sessionToken') ?
                  '/settings' : '/signup';
      this.navigate(url, { trigger: true, replace: true });
    },

    /**
     * Redirect the user to the best suitable OAuth flow
     */
    redirectToBestOAuthChoice: function () {
      var account = this.user.getChooserAccount();
      var route = '/oauth/signin';

      if (account.isDefault()) {
        route = '/oauth/signup';
      }

      return this.navigate(route, { trigger: true, replace: true });
    },

    createAndShowView: function (View, options) {
      var self = this;
      var view;
      return p().then(function () {
        view = self.createView(View, options);
        return self.showView(view);
      })
      .fail(function (err) {
        view = view || self.currentView || new BaseView({
          router: self
        });
        // The router's navigate method doesn't set ephemeral messages,
        // so use the view's higher level navigate method.
        return view.navigate('unexpected_error', {
          error: err
        });
      });
    },

    createView: function (View, options) {
      // passed in options block can override
      // default options.
      var viewOptions = _.extend({
        able: this.able,
        broker: this.broker,
        // back is enabled after the first view is rendered or
        // if the user is re-starts the app.
        canGoBack: this.storage.get('canGoBack') || false,
        formPrefill: this.formPrefill,
        fxaClient: this.fxaClient,
        interTabChannel: this.interTabChannel,
        language: this.language,
        metrics: this.metrics,
        notifications: this.notifications,
        profileClient: this.profileClient,
        relier: this.relier,
        router: this,
        screenName: this.fragmentToScreenName(Backbone.history.fragment),
        sentryMetrics: this.sentryMetrics,
        user: this.user,
        window: this.window
      }, options || {});

      return new View(viewOptions);
    },

    createSubView: function (SubView, options) {
      options.superView = this.currentView;
      return this.createView(SubView, options);
    },

    _checkForRefresh: function () {
      var refreshMetrics = this.storage.get('last_page_loaded');
      var currentView = this.currentView;
      var screenName = currentView.getScreenName();

      if (refreshMetrics && refreshMetrics.view === screenName && this.metrics) {
        currentView.logScreenEvent('refresh');
      }

      refreshMetrics = {
        timestamp: Date.now(),
        view: screenName
      };

      this.storage.set('last_page_loaded', refreshMetrics);
    },

    showView: function (viewToShow) {
      if (this.currentView) {
        this.currentView.destroy();
      }

      this.currentView = viewToShow;

      // render will return false if the view could not be
      // rendered for any reason, including if the view was
      // automatically redirected.
      var self = this;

      viewToShow.logScreen();
      return viewToShow.render()
        .then(function (isShown) {
          if (! isShown) {
            return;
          }

          self.setDocumentTitle(viewToShow.titleFromView());

          // Render the new view while stage is invisible then fade it in using css animations
          // catch problems with an explicit opacity rule after class is added.
          $('#stage').html(viewToShow.el).addClass('fade-in-forward').css('opacity', 1);
          viewToShow.afterVisible();

          // The user may be scrolled part way down the page
          // on screen transition. Force them to the top of the page.
          self.window.scrollTo(0, 0);

          $('#fox-logo').addClass('fade-in-forward').css('opacity', 1);

          // if the first view errors, the fail branch of the promise will be
          // followed. The view will navigate to `unexpected_error`, which will
          // eventually find its way here. `_hasFirstViewRendered` will still be
          // false, so broker.afterLoaded will be called. See
          // https://github.com/mozilla/fxa-content-server/pull/2147#issuecomment-76155999
          if (! self._hasFirstViewRendered) {
            self._afterFirstViewHasRendered();
          }
          self._checkForRefresh();
        });
    },

    _hasFirstViewRendered: false,
    _afterFirstViewHasRendered: function () {
      var self = this;
      self._hasFirstViewRendered = true;

      // afterLoaded lets the relier know when the first screen has been
      // loaded. It does not expect a response, so no error handler
      // is attached and the promise is not returned.
      self.broker.afterLoaded();

      // `loaded` is used to determine how long until the
      // first screen is rendered and the user can interact
      // with FxA. Similar to window.onload, but FxA specific.
      self.metrics.logEvent('loaded');

      // back is enabled after the first view is rendered or
      // if the user re-starts the app.
      self.storage.set('canGoBack', true);
    },

    renderSubView: function (viewToShow) {
      return viewToShow.render()
        .then(function (shown) {
          if (! shown) {
            viewToShow.destroy(true);
            return;
          }

          viewToShow.afterVisible();

          return viewToShow;
        });
    },

    showSubView: function (options) {
      var self = this;
      return self.currentView.showSubView(options.subView, options)
        .then(function (viewToShow) {
          // Use the super view's title as the base title
          var title = viewToShow.titleFromView(self.currentView.titleFromView());
          self.setDocumentTitle(title);
          viewToShow.logScreen();
        });
    },

    watchAnchors: function () {
      $(document).on('click', 'a[href^="/"]', this.onAnchorClick.bind(this));
    },

    onAnchorClick: function (event) {
      // if someone killed this event, or the user is holding a modifier
      // key, ignore the event.
      if (event.isDefaultPrevented() ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey) {
        return;
      }

      event.preventDefault();

      // Remove leading slashes
      var url = $(event.currentTarget).attr('href').replace(/^\//, '');
      if (this.environment.isFramed() && url.indexOf('legal') > -1) {
        this.window.open(url, '_blank');
        return;
      }
      // Instruct Backbone to trigger routing events
      this.navigate(url);
    },

    getCurrentPage: function () {
      return Backbone.history.fragment;
    },

    fragmentToScreenName: function (fragment) {
      fragment = fragment || '';
      // strip leading /
      return fragment.replace(/^\//, '')
                // strip trailing /
                .replace(/\/$/, '')
                // any other slashes get converted to '.'
                .replace(/\//g, '.')
                // search params can contain sensitive info
                .replace(/\?.*/, '')
                // replace _ with -
                .replace(/_/g, '-');
    },

    setDocumentTitle: function (title) {
      this.window.document.title = title;
    }
  });

  return Router;
});
