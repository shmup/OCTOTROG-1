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
      // strip colors
      message = this.stripColor(message);
      
      // check if rune or orb
      if (/found (an? (\w+) rune)?(the Orb)? of Zot/.test(message)) {
        message = this.addColor(message);
      // check if death
      } else if (/with \d+ points after \d+ turns/.test(message)) {
        message = this.addBold(message);
      // everything else gets ` `
      } else {
        message = "`" + message + "`";
      }

      this.hook.send(message);
    }
  },

  stripColor: function(item) {
    var re = /^{.*}/;
    return item.replace(re, "");
  },

  addColor: function(item) {
    return "```http\n" + item + "\n```";
  },

  addBold: function(item) {
    return "**" + item + "**";
  }
};
