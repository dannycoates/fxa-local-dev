'use strict';

define(
  [
    'jquery',
    'backbone',
    'views/intro',
    'views/sign_up',
    'views/confirm'
  ],
  function($, Backbone, IntroView, SignUpView, ConfirmView) {
    var Router = Backbone.Router.extend({
      routes: {
        '': 'showIntro',
        'signup': 'showSignUp',
        'confirm': 'showConfirm'
      },

      initialize: function() {
        this.$stage = $('#stage');
      },

      showIntro: function() {
        this.switch(new IntroView());
      },

      showSignUp: function() {
        this.switch(new SignUpView());
      },

      showConfirm: function() {
        this.switch(new ConfirmView());
      },

      switch: function(view) {
        if (this.currentView) {
          this.currentView.destroy();
        }

        this.currentView = view;

        this.$stage.html(this.currentView.render().el);
      }
    });

    // Singleton
    return new Router();
  }
);
