"use strict";
var discord = require('discord.js');

module.exports = {
  name: 'discord',

  init: function() {
    this.hook = new discord.WebhookClient(this.config.id, this.config.token);
  },

  destroy: function() {
  },

  listeners: {
    'discord:say': function(evt, message) {
      this.hook.send(message);
    }
  }
};
