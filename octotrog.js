#!/usr/bin/env node
"use strict";

var Octobot = require('octobot');
var secrets = require('./secrets.js');
var OCTOTROG = new Octobot();

OCTOTROG
.load('logger', {
  logdir: './logs',
  logfiles: {
    'octotrog.log': {
      levels: ['debug', 'irc', 'log']
    }
  }
})
.load('main')
.load('database')
.load('irc', {
  nick: 'OCTOXOM',
  nick_alt: 'OCTOXOM_',
  userName: 'OCTOXOM',
  realName: 'doot doot doot',
  port: 6667,
  channels: ['#crap'],
  server: 'moo.slashnet.org'
})
.load('dictionary')
.load('crawl.data')
.load('crawl.watchlist')
.load('crawl', {
  relay_nick: 'OCTOXOM',
  relay_server: 'irc.freenode.net',
  relay_from: ['##crawl', '#octolog'],
  relay_to: ['#crap'],
  irc: {
    userName: 'OCTOXOM',
    realName: 'doot doot doot',
    showErrors: true,
    stripColors: false,
    floodProtection: true
  }
})
.load('crawl.www')
.load('crawl.discord', {
  id: secrets.discord.id,
  token: secrets.discord.token
})
.start();
