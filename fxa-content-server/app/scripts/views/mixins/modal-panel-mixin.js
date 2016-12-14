/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Convert a view into a modal panel. A `modal-cancel` event
 * will be triggered if the user clicks on the background area.
 *
 * Any navigation will cause the panel to close.
 */

define(function (require, exports, module) {
  'use strict';

  const $ = require('jquery');

  module.exports = {
    isModal: true,

    /**
     * Open the panel.
     */
    openPanel () {
      this.$el.modal({
        clickClose: false, // we take care of closing on the background ourselves.
        opacity: 0.75,
        showClose: false,
        zIndex: 999
      });

      this.$el.on($.modal.AFTER_CLOSE, () => this.onAfterClose());

      this._boundBlockerClick = this.onBlockerClick.bind(this);
      $('.blocker').on('click', this._boundBlockerClick);
    },

    /**
     * Close the panel.
     */
    closePanel () {
      if ($.modal.isActive()) {
        $.modal.close();
      }
    },

    onBlockerClick (event) {
      // We take care of closing the panel ourselves so that we can
      // trigger `modal-cancel` IFF the user clicks on the black area
      // outside of the content. Clicks on this area are often handled
      // differently to either the "cancel" or "back" buttons, and
      // listening directly on `AFTER_CLOSE` causes listeners to
      // be called on every close.
      if (event.target === event.currentTarget) {
        this.closePanel();

        /**
         * Triggered if the user clicks the black background area of the modal.
         *
         * @event modal-cancel
         */
        this.trigger('modal-cancel');
      }
    },

    onAfterClose () {
      this.destroy(true);
      $('.blocker').off('click', this._boundBlockerClick);
    },

    /**
     * Wrap the navigate function to close the panel. If the next view
     * is also a modal, a new modal will immediately be created.
     */
    navigate () {
      this.closePanel();
    }
  };
});
