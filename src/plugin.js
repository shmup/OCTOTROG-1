// Plugin prototype
"use strict";
var util = require('util');
var events = require('events');
var extend = require('extend');
var foreach = require('foreach');
var Promise = require('bluebird');

var Plugin = module.exports = function(bot, plugin_obj, options) {
  extend(this, plugin_obj, options, {
    command_map: {},
    channels: {},
    bot: bot,
    debug: bot.debug
  });

  this.log = bot.log.attach(this, '[' + (this.name || '???') + ']');
  events.EventEmitter.call(this);
  this.create_command_map();
  this.init();
  var self = this;
  foreach(extend({}, Listeners, this.listeners), function(l, n) {
    self.addListener(n, l);
  });
};

util.inherits(Plugin, events.EventEmitter);

// To be extended by plugin module
extend(Plugin.prototype, {
  name: 'plugin-base',
  prefix: '',
  init: function() {},
  listeners: {},

  destroy: function() {
    this.removeAllListeners();
  },

  create_command_map: function() {
    var command_map = this.command_map = {};
    var prefix = this.prefix || '';
    foreach(this.commands || {}, function(c, n) {
      var trigger = prefix + n;
      if (!c.no_space) trigger += ' ';
      if (typeof c.response === 'function') command_map[trigger] = c;
    });
  },

  bind_channels: function(channels) {
    if (typeof channels === 'string') channels = [channels];
    if (!Array.isArray(channels)) return;
    channels.forEach(function(e) {
      this.channels[e] = true;
    }, this);
  },

  // Emit an event to self, returning a promise
  // Emitted events receive a PromiseResolver as first argument
  // This is also used by bot's .dispatch()
  emitP: function(event) {
    var deferred = Promise.defer();
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(event, deferred);
    this.emit.apply(this, args);
    return deferred.promise.bind(this);
  },

  // Return a promise that resolves when a data object passes the validator
  queueExpect: function(name, validator) {
    this.expect_queue = this.expect_queue || {};
    var deferred = Promise.defer();
    if (!Array.isArray(this.expect_queue[name])) {
      this.expect_queue[name] = [];
    }
    this.expect_queue[name].push({
      deferred: deferred,
      validator: validator
    });
    this.log.debug('Expecting:', name);
    return deferred.promise.bind(this);
  },

  queueExpectKeys: function(name, data, keys) {
    return this.queueExpect(name, function(test) {
      return keys.every(function(k) {
        return (data[k] === test[k]);
      });
    });
  },

  // See if the supplied data matches an item in the queue
  queueResolve: function(name, data) {
    if (!this.expect_queue || !this.expect_queue[name]) return;
    var out_queue = [];
    var resolved = 0, pending = 0, pruned = 0;
    this.expect_queue[name].forEach(function(e) {
      if (e && e.deferred && e.deferred.resolve && e.deferred.promise.isPending()) {
        if (e.validator(data)) {
          // Resolve it
          e.deferred.resolve(data);
          resolved++;
        } else {
          // Not yet resolved, keep in queue
          out_queue.push(e);
          pending++;
        }
      } else {
        pruned++;
      }
    });
    this.expect_queue[name] = out_queue;
    if (resolved) this.log.debug('Queue', name, 'Resolved:', resolved, 'Pending:', pending, 'Pruned:', pruned);
    return resolved;
  },

  // Wrappers for bot functions... surely there's a better way to do this
  // The idea is that plugins should never have to access the bot object
  say: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('');
    foreach(this.channels, function(v, c) {
      args[0] = c;
      this.bot.say.apply(this.bot, args);
    }, this);
  },

  say_phrase: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('');
    foreach(this.channels, function(v, c) {
      args[0] = c;
      this.bot.say_phrase.apply(this.bot, args);
    }, this);
  },

  dispatch: function(event) {
    this.log.debug('Event dispatched:', event);
    return this.bot.dispatch.apply(this.bot, arguments).bind(this);
  }

});

var Listeners = {
  'message': function(deferred, opt) {
    // Look for a command handler
    var input = opt.text + ' ';
    if (!(opt.privmsg || this.channels[opt.to])) return; // Not-bound channel
    if (!Object.keys(this.command_map).some(function(c) {
      if (input.indexOf(c) === 0) {
        // Found a match
        var msg = opt.text.substr(c.length).trim();
        var params = msg.split(' ');
        if (params[0] === '') params = [];
        opt = extend({}, opt, {
          handler: this.command_map[c],
          command: c.trim(),
          msg: opt.text.substr(c.length).trim(),
          params: params,
        });
        if (opt.handler.response) {
          // Execute handler
          deferred.resolve(opt.handler.response.call(this, opt));
        }
        return true;
      }
    }, this)) {
      // Couldn't find handler
      deferred.reject();
    }
  },
  'error': function(e) {
    this.log.error('Plugin listener error', e);
  }
};
