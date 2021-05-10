(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          const c = typeof require === 'function' && require;
          if (!f && c) {
            return c(i, !0);
          }

          if (u) {
            return u(i, !0);
          }

          const a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = 'MODULE_NOT_FOUND'), a);
        }

        const p = (n[i] = {exports: {}});
        e[i][0].call(
          p.exports,
          (r) => {
            const n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }

      return n[i].exports;
    }

    for (
      var u = typeof require === 'function' && require, i = 0;
      i < t.length;
      i++
    ) {
      o(t[i]);
    }

    return o;
  }

  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        const client = require('./lib/client');

        module.exports = {
          client,
          Client: client
        };
      },
      {'./lib/client': 3}
    ],
    2: [
      function (require, module, exports) {
        const fetch = require('node-fetch');

        const _ = require('./utils');

        const api = function api(options, callback) {
          // Set the url to options.uri or options.url..
          var url = options.url !== undefined ? options.url : options.uri; // Make sure it is a valid url..

          if (!_.isURL(url)) {
            url = 'https://api.twitch.tv/kraken'.concat(
              url[0] === '/' ? url : '/'.concat(url)
            );
          } // We are inside a Node application, so we can use the node-fetch module..

          if (_.isNode()) {
            var options_ = _.merge(
              {
                method: 'GET',
                json: true
              },
              options,
              {
                url
              }
            );

            var url = options_.url;

            if (options_.qs) {
              const qs = new URLSearchParams(options_.qs);
              url += '?'.concat(qs);
            }

            let response = {};
            /** @type {ReturnType<import('node-fetch')['default']>} */

            const fetchPromise = fetch(url, {
              method: options_.method,
              headers: options_.headers,
              body: options_.body
            });
            fetchPromise
              .then((res) => {
                response = {
                  statusCode: res.status,
                  headers: res.headers
                };
                return options_.json ? res.json() : res.text();
              })
              .then(
                (data) => {
                  return callback(null, response, data);
                },
                (error) => {
                  return callback(error, response, null);
                }
              );
          } // Web application, extension, React Native etc.
          else {
            var options_ = _.merge(
              {
                method: 'GET',
                headers: {}
              },
              options,
              {
                url
              }
            ); // Prepare request

            const xhr = new XMLHttpRequest();
            xhr.open(options_.method, options_.url, true);

            for (const name in options_.headers) {
              xhr.setRequestHeader(name, options_.headers[name]);
            }

            xhr.responseType = 'json'; // Set request handler

            xhr.addEventListener('load', (ev) => {
              if (xhr.readyState == 4) {
                if (xhr.status != 200) {
                  callback(xhr.status, null, null);
                } else {
                  callback(null, null, xhr.response);
                }
              }
            }); // Submit

            xhr.send();
          }
        };

        module.exports = api;
      },
      {'./utils': 9, 'node-fetch': 10}
    ],
    3: [
      function (require, module, exports) {
        (function (global) {
          (function () {
            const api = require('./api');

            const commands = require('./commands');

            const EventEmitter = require('./events').EventEmitter;

            const logger = require('./logger');

            const parse = require('./parser');

            const timer = require('./timer');

            const _global =
              typeof global !== 'undefined'
                ? global
                : typeof window !== 'undefined'
                ? window
                : {};

            const _WebSocket = _global.WebSocket || require('ws');

            const _ = require('./utils'); // Client instance..

            const client = function client(options) {
              if (this instanceof client === false) {
                return new client(options);
              }

              this.opts = _.get(options, {});
              this.opts.channels = this.opts.channels || [];
              this.opts.connection = this.opts.connection || {};
              this.opts.identity = this.opts.identity || {};
              this.opts.options = this.opts.options || {};
              this.clientId = _.get(this.opts.options.clientId, null);
              this._globalDefaultChannel = _.channel(
                _.get(this.opts.options.globalDefaultChannel, '#tmijs')
              );
              this.maxReconnectAttempts = _.get(
                this.opts.connection.maxReconnectAttempts,
                Number.POSITIVE_INFINITY
              );
              this.maxReconnectInterval = _.get(
                this.opts.connection.maxReconnectInterval,
                30_000
              );
              this.reconnect = _.get(this.opts.connection.reconnect, false);
              this.reconnectDecay = _.get(
                this.opts.connection.reconnectDecay,
                1.5
              );
              this.reconnectInterval = _.get(
                this.opts.connection.reconnectInterval,
                1000
              );
              this.reconnecting = false;
              this.reconnections = 0;
              this.reconnectTimer = this.reconnectInterval;
              this.secure = _.get(
                this.opts.connection.secure,
                !this.opts.connection.server && !this.opts.connection.port
              ); // Raw data and object for emote-sets..

              this.emotes = '';
              this.emotesets = {};
              this.channels = [];
              this.currentLatency = 0;
              this.globaluserstate = {};
              this.lastJoined = '';
              this.latency = new Date();
              this.moderators = {};
              this.pingLoop = null;
              this.pingTimeout = null;
              this.reason = '';
              this.username = '';
              this.userstate = {};
              this.wasCloseCalled = false;
              this.ws = null; // Create the logger..

              let level = 'error';

              if (this.opts.options.debug) {
                level = 'info';
              }

              this.log = this.opts.logger || logger;

              try {
                logger.setLevel(level);
              } catch {}

              // Format the channel names..

              this.opts.channels.forEach((part, index, theArray) => {
                theArray[index] = _.channel(part);
              });
              EventEmitter.call(this);
              this.setMaxListeners(0);
            };

            _.inherits(client, EventEmitter); // Emit multiple events..

            client.prototype.emits = function emits(types, values) {
              for (const [i, type] of types.entries()) {
                const value =
                  i < values.length ? values[i] : values[values.length - 1];
                this.emit.apply(this, [type].concat(value));
              }
            };

            client.prototype.off = client.prototype.removeListener;
            client.prototype.api = api; // Put all commands in prototype..

            for (const methodName in commands) {
              client.prototype[methodName] = commands[methodName];
            } // Handle parsed chat server message..

            client.prototype.handleMessage = function handleMessage(message) {
              const _this = this;

              if (_.isNull(message)) {
                return;
              }

              if (this.listenerCount('raw_message')) {
                this.emit(
                  'raw_message',
                  JSON.parse(JSON.stringify(message)),
                  message
                );
              }

              const channel = _.channel(_.get(message.params[0], null));

              let message_ = _.get(message.params[1], null);

              const msgid = _.get(message.tags['msg-id'], null); // Parse badges, badge-info and emotes..

              const tags = (message.tags = parse.badges(
                parse.badgeInfo(parse.emotes(message.tags))
              )); // Transform IRCv3 tags..

              for (const key in tags) {
                if (
                  key === 'emote-sets' ||
                  key === 'ban-duration' ||
                  key === 'bits'
                ) {
                  continue;
                }

                let value = tags[key];

                if (_.isBoolean(value)) {
                  value = null;
                } else if (value === '1') {
                  value = true;
                } else if (value === '0') {
                  value = false;
                } else if (_.isString(value)) {
                  value = _.unescapeIRC(value);
                }

                tags[key] = value;
              } // Messages with no prefix..

              if (_.isNull(message.prefix)) {
                switch (message.command) {
                  // Received PING from server..
                  case 'PING':
                    this.emit('ping');

                    if (this._isConnected()) {
                      this.ws.send('PONG');
                    }

                    break;
                  // Received PONG from server, return current latency..

                  case 'PONG':
                    var currDate = new Date();
                    this.currentLatency =
                      (currDate.getTime() - this.latency.getTime()) / 1000;
                    this.emits(
                      ['pong', '_promisePing'],
                      [[this.currentLatency]]
                    );
                    clearTimeout(this.pingTimeout);
                    break;

                  default:
                    this.log.warn(
                      'Could not parse message with no prefix:\n'.concat(
                        JSON.stringify(message, null, 4)
                      )
                    );
                    break;
                }
              } // Messages with "tmi.twitch.tv" as a prefix..
              else if (message.prefix === 'tmi.twitch.tv') {
                switch (message.command) {
                  case '002':
                  case '003':
                  case '004':
                  case '375':
                  case '376':
                  case 'CAP':
                    break;
                  // Retrieve username from server..

                  case '001':
                    this.username = message.params[0];
                    break;
                  // Connected to server..

                  case '372':
                    this.log.info('Connected to server.');
                    this.userstate[this._globalDefaultChannel] = {};
                    this.emits(
                      ['connected', '_promiseConnect'],
                      [[this.server, this.port], [null]]
                    );
                    this.reconnections = 0;
                    this.reconnectTimer = this.reconnectInterval; // Set an internal ping timeout check interval..

                    this.pingLoop = setInterval(() => {
                      // Make sure the connection is opened before sending the message..
                      if (_this._isConnected()) {
                        _this.ws.send('PING');
                      }

                      _this.latency = new Date();
                      _this.pingTimeout = setTimeout(() => {
                        if (!_.isNull(_this.ws)) {
                          _this.wasCloseCalled = false;

                          _this.log.error('Ping timeout.');

                          _this.ws.close();

                          clearInterval(_this.pingLoop);
                          clearTimeout(_this.pingTimeout);
                        }
                      }, _.get(_this.opts.connection.timeout, 9999));
                    }, 60_000); // Join all the channels from the config with an interval..

                    var joinInterval = _.get(
                      this.opts.options.joinInterval,
                      2000
                    );

                    if (joinInterval < 300) {
                      joinInterval = 300;
                    }

                    var joinQueue = new timer.queue(joinInterval);

                    var joinChannels = _.union(
                      this.opts.channels,
                      this.channels
                    );

                    this.channels = [];

                    var _loop = function _loop() {
                      const channel = joinChannels[i];
                      joinQueue.add(() => {
                        if (_this._isConnected()) {
                          _this.join(channel).catch((error) => {
                            return _this.log.error(error);
                          });
                        }
                      });
                    };

                    for (var i = 0; i < joinChannels.length; i++) {
                      _loop();
                    }

                    joinQueue.run();
                    break;
                  // https://github.com/justintv/Twitch-API/blob/master/chat/capabilities.md#notice

                  case 'NOTICE':
                    var nullArray = [null];
                    var noticeArray = [channel, msgid, message_];
                    var msgidArray = [msgid];
                    var channelTrueArray = [channel, true];
                    var channelFalseArray = [channel, false];
                    var noticeAndNull = [noticeArray, nullArray];
                    var noticeAndMsgid = [noticeArray, msgidArray];
                    var basicLog = '['.concat(channel, '] ').concat(message_);

                    switch (msgid) {
                      // This room is now in subscribers-only mode.
                      case 'subs_on':
                        this.log.info(
                          '['.concat(
                            channel,
                            '] This room is now in subscribers-only mode.'
                          )
                        );
                        this.emits(
                          ['subscriber', 'subscribers', '_promiseSubscribers'],
                          [channelTrueArray, channelTrueArray, nullArray]
                        );
                        break;
                      // This room is no longer in subscribers-only mode.

                      case 'subs_off':
                        this.log.info(
                          '['.concat(
                            channel,
                            '] This room is no longer in subscribers-only mode.'
                          )
                        );
                        this.emits(
                          [
                            'subscriber',
                            'subscribers',
                            '_promiseSubscribersoff'
                          ],
                          [channelFalseArray, channelFalseArray, nullArray]
                        );
                        break;
                      // This room is now in emote-only mode.

                      case 'emote_only_on':
                        this.log.info(
                          '['.concat(
                            channel,
                            '] This room is now in emote-only mode.'
                          )
                        );
                        this.emits(
                          ['emoteonly', '_promiseEmoteonly'],
                          [channelTrueArray, nullArray]
                        );
                        break;
                      // This room is no longer in emote-only mode.

                      case 'emote_only_off':
                        this.log.info(
                          '['.concat(
                            channel,
                            '] This room is no longer in emote-only mode.'
                          )
                        );
                        this.emits(
                          ['emoteonly', '_promiseEmoteonlyoff'],
                          [channelFalseArray, nullArray]
                        );
                        break;
                      // Do not handle slow_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.

                      case 'slow_on':
                      case 'slow_off':
                        break;
                      // Do not handle followers_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.

                      case 'followers_on_zero':
                      case 'followers_on':
                      case 'followers_off':
                        break;
                      // This room is now in r9k mode.

                      case 'r9k_on':
                        this.log.info(
                          '['.concat(channel, '] This room is now in r9k mode.')
                        );
                        this.emits(
                          ['r9kmode', 'r9kbeta', '_promiseR9kbeta'],
                          [channelTrueArray, channelTrueArray, nullArray]
                        );
                        break;
                      // This room is no longer in r9k mode.

                      case 'r9k_off':
                        this.log.info(
                          '['.concat(
                            channel,
                            '] This room is no longer in r9k mode.'
                          )
                        );
                        this.emits(
                          ['r9kmode', 'r9kbeta', '_promiseR9kbetaoff'],
                          [channelFalseArray, channelFalseArray, nullArray]
                        );
                        break;
                      // The moderators of this room are: [..., ...]

                      case 'room_mods':
                        var mods = message_
                          .split(': ')[1]
                          .toLowerCase()
                          .split(', ')
                          .filter((n) => {
                            return n;
                          });
                        this.emits(
                          ['_promiseMods', 'mods'],
                          [
                            [null, mods],
                            [channel, mods]
                          ]
                        );
                        break;
                      // There are no moderators for this room.

                      case 'no_mods':
                        this.emits(
                          ['_promiseMods', 'mods'],
                          [
                            [null, []],
                            [channel, []]
                          ]
                        );
                        break;
                      // The VIPs of this channel are: [..., ...]

                      case 'vips_success':
                        if (message_.endsWith('.')) {
                          message_ = message_.slice(0, -1);
                        }

                        var vips = message_
                          .split(': ')[1]
                          .toLowerCase()
                          .split(', ')
                          .filter((n) => {
                            return n;
                          });
                        this.emits(
                          ['_promiseVips', 'vips'],
                          [
                            [null, vips],
                            [channel, vips]
                          ]
                        );
                        break;
                      // There are no VIPs for this room.

                      case 'no_vips':
                        this.emits(
                          ['_promiseVips', 'vips'],
                          [
                            [null, []],
                            [channel, []]
                          ]
                        );
                        break;
                      // Ban command failed..

                      case 'already_banned':
                      case 'bad_ban_admin':
                      case 'bad_ban_broadcaster':
                      case 'bad_ban_global_mod':
                      case 'bad_ban_self':
                      case 'bad_ban_staff':
                      case 'usage_ban':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseBan'], noticeAndMsgid);
                        break;
                      // Ban command success..

                      case 'ban_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseBan'], noticeAndNull);
                        break;
                      // Clear command failed..

                      case 'usage_clear':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseClear'], noticeAndMsgid);
                        break;
                      // Mods command failed..

                      case 'usage_mods':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseMods'],
                          [noticeArray, [msgid, []]]
                        );
                        break;
                      // Mod command success..

                      case 'mod_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseMod'], noticeAndNull);
                        break;
                      // VIPs command failed..

                      case 'usage_vips':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseVips'],
                          [noticeArray, [msgid, []]]
                        );
                        break;
                      // VIP command failed..

                      case 'usage_vip':
                      case 'bad_vip_grantee_banned':
                      case 'bad_vip_grantee_already_vip':
                      case 'bad_vip_max_vips_reached':
                      case 'bad_vip_achievement_incomplete':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseVip'],
                          [noticeArray, [msgid, []]]
                        );
                        break;
                      // VIP command success..

                      case 'vip_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseVip'], noticeAndNull);
                        break;
                      // Mod command failed..

                      case 'usage_mod':
                      case 'bad_mod_banned':
                      case 'bad_mod_mod':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseMod'], noticeAndMsgid);
                        break;
                      // Unmod command success..

                      case 'unmod_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnmod'], noticeAndNull);
                        break;
                      // Unvip command success...

                      case 'unvip_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnvip'], noticeAndNull);
                        break;
                      // Unmod command failed..

                      case 'usage_unmod':
                      case 'bad_unmod_mod':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnmod'], noticeAndMsgid);
                        break;
                      // Unvip command failed..

                      case 'usage_unvip':
                      case 'bad_unvip_grantee_not_vip':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnvip'], noticeAndMsgid);
                        break;
                      // Color command success..

                      case 'color_changed':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseColor'], noticeAndNull);
                        break;
                      // Color command failed..

                      case 'usage_color':
                      case 'turbo_only_color':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseColor'], noticeAndMsgid);
                        break;
                      // Commercial command success..

                      case 'commercial_success':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseCommercial'],
                          noticeAndNull
                        );
                        break;
                      // Commercial command failed..

                      case 'usage_commercial':
                      case 'bad_commercial_error':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseCommercial'],
                          noticeAndMsgid
                        );
                        break;
                      // Host command success..

                      case 'hosts_remaining':
                        this.log.info(basicLog);
                        var remainingHost = !isNaN(message_[0])
                          ? Number.parseInt(message_[0])
                          : 0;
                        this.emits(
                          ['notice', '_promiseHost'],
                          [noticeArray, [null, Math.trunc(remainingHost)]]
                        );
                        break;
                      // Host command failed..

                      case 'bad_host_hosting':
                      case 'bad_host_rate_exceeded':
                      case 'bad_host_error':
                      case 'usage_host':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseHost'],
                          [noticeArray, [msgid, null]]
                        );
                        break;
                      // R9kbeta command failed..

                      case 'already_r9k_on':
                      case 'usage_r9k_on':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseR9kbeta'],
                          noticeAndMsgid
                        );
                        break;
                      // R9kbetaoff command failed..

                      case 'already_r9k_off':
                      case 'usage_r9k_off':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseR9kbetaoff'],
                          noticeAndMsgid
                        );
                        break;
                      // Timeout command success..

                      case 'timeout_success':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseTimeout'],
                          noticeAndNull
                        );
                        break;

                      case 'delete_message_success':
                        this.log.info(
                          '['.concat(channel, ' ').concat(message_, ']')
                        );
                        this.emits(
                          ['notice', '_promiseDeletemessage'],
                          noticeAndNull
                        );
                      // Subscribersoff command failed..

                      case 'already_subs_off':
                      case 'usage_subs_off':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseSubscribersoff'],
                          noticeAndMsgid
                        );
                        break;
                      // Subscribers command failed..

                      case 'already_subs_on':
                      case 'usage_subs_on':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseSubscribers'],
                          noticeAndMsgid
                        );
                        break;
                      // Emoteonlyoff command failed..

                      case 'already_emote_only_off':
                      case 'usage_emote_only_off':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseEmoteonlyoff'],
                          noticeAndMsgid
                        );
                        break;
                      // Emoteonly command failed..

                      case 'already_emote_only_on':
                      case 'usage_emote_only_on':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseEmoteonly'],
                          noticeAndMsgid
                        );
                        break;
                      // Slow command failed..

                      case 'usage_slow_on':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseSlow'], noticeAndMsgid);
                        break;
                      // Slowoff command failed..

                      case 'usage_slow_off':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseSlowoff'],
                          noticeAndMsgid
                        );
                        break;
                      // Timeout command failed..

                      case 'usage_timeout':
                      case 'bad_timeout_admin':
                      case 'bad_timeout_broadcaster':
                      case 'bad_timeout_duration':
                      case 'bad_timeout_global_mod':
                      case 'bad_timeout_self':
                      case 'bad_timeout_staff':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseTimeout'],
                          noticeAndMsgid
                        );
                        break;
                      // Unban command success..
                      // Unban can also be used to cancel an active timeout.

                      case 'untimeout_success':
                      case 'unban_success':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnban'], noticeAndNull);
                        break;
                      // Unban command failed..

                      case 'usage_unban':
                      case 'bad_unban_no_ban':
                        this.log.info(basicLog);
                        this.emits(['notice', '_promiseUnban'], noticeAndMsgid);
                        break;
                      // Delete command failed..

                      case 'usage_delete':
                      case 'bad_delete_message_error':
                      case 'bad_delete_message_broadcaster':
                      case 'bad_delete_message_mod':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseDeletemessage'],
                          noticeAndMsgid
                        );
                        break;
                      // Unhost command failed..

                      case 'usage_unhost':
                      case 'not_hosting':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseUnhost'],
                          noticeAndMsgid
                        );
                        break;
                      // Whisper command failed..

                      case 'whisper_invalid_login':
                      case 'whisper_invalid_self':
                      case 'whisper_limit_per_min':
                      case 'whisper_limit_per_sec':
                      case 'whisper_restricted':
                      case 'whisper_restricted_recipient':
                        this.log.info(basicLog);
                        this.emits(
                          ['notice', '_promiseWhisper'],
                          noticeAndMsgid
                        );
                        break;
                      // Permission error..

                      case 'no_permission':
                      case 'msg_banned':
                      case 'msg_room_not_found':
                      case 'msg_channel_suspended':
                      case 'tos_ban':
                      case 'invalid_user':
                        this.log.info(basicLog);
                        this.emits(
                          [
                            'notice',
                            '_promiseBan',
                            '_promiseClear',
                            '_promiseUnban',
                            '_promiseTimeout',
                            '_promiseDeletemessage',
                            '_promiseMods',
                            '_promiseMod',
                            '_promiseUnmod',
                            '_promiseVips',
                            '_promiseVip',
                            '_promiseUnvip',
                            '_promiseCommercial',
                            '_promiseHost',
                            '_promiseUnhost',
                            '_promiseJoin',
                            '_promisePart',
                            '_promiseR9kbeta',
                            '_promiseR9kbetaoff',
                            '_promiseSlow',
                            '_promiseSlowoff',
                            '_promiseFollowers',
                            '_promiseFollowersoff',
                            '_promiseSubscribers',
                            '_promiseSubscribersoff',
                            '_promiseEmoteonly',
                            '_promiseEmoteonlyoff',
                            '_promiseWhisper'
                          ],
                          [noticeArray, [msgid, channel]]
                        );
                        break;
                      // Automod-related..

                      case 'msg_rejected':
                      case 'msg_rejected_mandatory':
                        this.log.info(basicLog);
                        this.emit('automod', channel, msgid, message_);
                        break;
                      // Unrecognized command..

                      case 'unrecognized_cmd':
                        this.log.info(basicLog);
                        this.emit('notice', channel, msgid, message_);
                        break;
                      // Send the following msg-ids to the notice event listener..

                      case 'cmds_available':
                      case 'host_target_went_offline':
                      case 'msg_censored_broadcaster':
                      case 'msg_duplicate':
                      case 'msg_emoteonly':
                      case 'msg_verified_email':
                      case 'msg_ratelimit':
                      case 'msg_subsonly':
                      case 'msg_timedout':
                      case 'msg_bad_characters':
                      case 'msg_channel_blocked':
                      case 'msg_facebook':
                      case 'msg_followersonly':
                      case 'msg_followersonly_followed':
                      case 'msg_followersonly_zero':
                      case 'msg_slowmode':
                      case 'msg_suspended':
                      case 'no_help':
                      case 'usage_disconnect':
                      case 'usage_help':
                      case 'usage_me':
                      case 'unavailable_command':
                        this.log.info(basicLog);
                        this.emit('notice', channel, msgid, message_);
                        break;
                      // Ignore this because we are already listening to HOSTTARGET..

                      case 'host_on':
                      case 'host_off':
                        break;

                      default:
                        if (
                          message_.includes('Login unsuccessful') ||
                          message_.includes('Login authentication failed')
                        ) {
                          this.wasCloseCalled = false;
                          this.reconnect = false;
                          this.reason = message_;
                          this.log.error(this.reason);
                          this.ws.close();
                        } else if (
                          message_.includes('Error logging in') ||
                          message_.includes('Improperly formatted auth')
                        ) {
                          this.wasCloseCalled = false;
                          this.reconnect = false;
                          this.reason = message_;
                          this.log.error(this.reason);
                          this.ws.close();
                        } else if (message_.includes('Invalid NICK')) {
                          this.wasCloseCalled = false;
                          this.reconnect = false;
                          this.reason = 'Invalid NICK.';
                          this.log.error(this.reason);
                          this.ws.close();
                        } else {
                          this.log.warn(
                            'Could not parse NOTICE from tmi.twitch.tv:\n'.concat(
                              JSON.stringify(message, null, 4)
                            )
                          );
                          this.emit('notice', channel, msgid, message_);
                        }

                        break;
                    }

                    break;
                  // Handle subanniversary / resub..

                  case 'USERNOTICE':
                    var username = tags['display-name'] || tags.login;
                    var plan = tags['msg-param-sub-plan'] || '';
                    var planName =
                      _.unescapeIRC(
                        _.get(tags['msg-param-sub-plan-name'], '')
                      ) || null;
                    var prime = plan.includes('Prime');
                    var methods = {
                      prime,
                      plan,
                      planName
                    };
                    var streakMonths = Math.trunc(
                      tags['msg-param-streak-months'] || 0
                    );
                    var recipient =
                      tags['msg-param-recipient-display-name'] ||
                      tags['msg-param-recipient-user-name'];
                    var giftSubCount = Math.trunc(
                      tags['msg-param-mass-gift-count']
                    );
                    tags['message-type'] = msgid;

                    switch (msgid) {
                      // Handle resub
                      case 'resub':
                        this.emits(
                          ['resub', 'subanniversary'],
                          [
                            [
                              channel,
                              username,
                              streakMonths,
                              message_,
                              tags,
                              methods
                            ]
                          ]
                        );
                        break;
                      // Handle sub

                      case 'sub':
                        this.emit(
                          'subscription',
                          channel,
                          username,
                          methods,
                          message_,
                          tags
                        );
                        break;
                      // Handle gift sub

                      case 'subgift':
                        this.emit(
                          'subgift',
                          channel,
                          username,
                          streakMonths,
                          recipient,
                          methods,
                          tags
                        );
                        break;
                      // Handle anonymous gift sub
                      // Need proof that this event occur

                      case 'anonsubgift':
                        this.emit(
                          'anonsubgift',
                          channel,
                          streakMonths,
                          recipient,
                          methods,
                          tags
                        );
                        break;
                      // Handle random gift subs

                      case 'submysterygift':
                        this.emit(
                          'submysterygift',
                          channel,
                          username,
                          giftSubCount,
                          methods,
                          tags
                        );
                        break;
                      // Handle anonymous random gift subs
                      // Need proof that this event occur

                      case 'anonsubmysterygift':
                        this.emit(
                          'anonsubmysterygift',
                          channel,
                          giftSubCount,
                          methods,
                          tags
                        );
                        break;
                      // Handle user upgrading from Prime to a normal tier sub

                      case 'primepaidupgrade':
                        this.emit(
                          'primepaidupgrade',
                          channel,
                          username,
                          methods,
                          tags
                        );
                        break;
                      // Handle user upgrading from a gifted sub

                      case 'giftpaidupgrade':
                        var sender =
                          tags['msg-param-sender-name'] ||
                          tags['msg-param-sender-login'];
                        this.emit(
                          'giftpaidupgrade',
                          channel,
                          username,
                          sender,
                          tags
                        );
                        break;
                      // Handle user upgrading from an anonymous gifted sub

                      case 'anongiftpaidupgrade':
                        this.emit(
                          'anongiftpaidupgrade',
                          channel,
                          username,
                          tags
                        );
                        break;
                      // Handle raid

                      case 'raid':
                        var username =
                          tags['msg-param-displayName'] ||
                          tags['msg-param-login'];
                        var viewers = Number(tags['msg-param-viewerCount']);
                        this.emit('raided', channel, username, viewers, tags);
                        break;
                      // Handle ritual

                      case 'ritual':
                        var ritualName = tags['msg-param-ritual-name'];

                        switch (ritualName) {
                          // Handle new chatter ritual
                          case 'new_chatter':
                            this.emit(
                              'newchatter',
                              channel,
                              username,
                              tags,
                              message_
                            );
                            break;
                          // All unknown rituals should be passed through

                          default:
                            this.emit(
                              'ritual',
                              ritualName,
                              channel,
                              username,
                              tags,
                              message_
                            );
                            break;
                        }

                        break;
                      // All other msgid events should be emitted under a usernotice event
                      // until it comes up and needs to be added..

                      default:
                        this.emit('usernotice', msgid, channel, tags, message_);
                        break;
                    }

                    break;
                  // Channel is now hosting another channel or exited host mode..

                  case 'HOSTTARGET':
                    var messageSplit = message_.split(' ');
                    var viewers = Math.trunc(messageSplit[1]) || 0; // Stopped hosting..

                    if (messageSplit[0] === '-') {
                      this.log.info('['.concat(channel, '] Exited host mode.'));
                      this.emits(
                        ['unhost', '_promiseUnhost'],
                        [[channel, viewers], [null]]
                      );
                    } // Now hosting..
                    else {
                      this.log.info(
                        '['
                          .concat(channel, '] Now hosting ')
                          .concat(messageSplit[0], ' for ')
                          .concat(viewers, ' viewer(s).')
                      );
                      this.emit('hosting', channel, messageSplit[0], viewers);
                    }

                    break;
                  // Someone has been timed out or chat has been cleared by a moderator..

                  case 'CLEARCHAT':
                    // User has been banned / timed out by a moderator..
                    if (message.params.length > 1) {
                      // Duration returns null if it's a ban, otherwise it's a timeout..
                      const duration = _.get(
                        message.tags['ban-duration'],
                        null
                      );

                      if (_.isNull(duration)) {
                        this.log.info(
                          '['
                            .concat(channel, '] ')
                            .concat(message_, ' has been banned.')
                        );
                        this.emit('ban', channel, message_, null, message.tags);
                      } else {
                        this.log.info(
                          '['
                            .concat(channel, '] ')
                            .concat(message_, ' has been timed out for ')
                            .concat(duration, ' seconds.')
                        );
                        this.emit(
                          'timeout',
                          channel,
                          message_,
                          null,
                          Math.trunc(duration),
                          message.tags
                        );
                      }
                    } // Chat was cleared by a moderator..
                    else {
                      this.log.info(
                        '['.concat(
                          channel,
                          '] Chat was cleared by a moderator.'
                        )
                      );
                      this.emits(
                        ['clearchat', '_promiseClear'],
                        [[channel], [null]]
                      );
                    }

                    break;
                  // Someone's message has been deleted

                  case 'CLEARMSG':
                    if (message.params.length > 1) {
                      const deletedMessage = message_;
                      var username = tags.login;
                      tags['message-type'] = 'messagedeleted';
                      this.log.info(
                        '['
                          .concat(channel, '] ')
                          .concat(username, "'s message has been deleted.")
                      );
                      this.emit(
                        'messagedeleted',
                        channel,
                        username,
                        deletedMessage,
                        tags
                      );
                    }

                    break;
                  // Received a reconnection request from the server..

                  case 'RECONNECT':
                    this.log.info('Received RECONNECT request from Twitch..');
                    this.log.info(
                      'Disconnecting and reconnecting in '.concat(
                        Math.round(this.reconnectTimer / 1000),
                        ' seconds..'
                      )
                    );
                    this.disconnect().catch((error) => {
                      return _this.log.error(error);
                    });
                    setTimeout(() => {
                      return _this.connect().catch((error) => {
                        return _this.log.error(error);
                      });
                    }, this.reconnectTimer);
                    break;
                  // Received when joining a channel and every time you send a PRIVMSG to a channel.

                  case 'USERSTATE':
                    message.tags.username = this.username; // Add the client to the moderators of this room..

                    if (message.tags['user-type'] === 'mod') {
                      if (!this.moderators[channel]) {
                        this.moderators[channel] = [];
                      }

                      if (!this.moderators[channel].includes(this.username)) {
                        this.moderators[channel].push(this.username);
                      }
                    } // Logged in and username doesn't start with justinfan..

                    if (
                      !_.isJustinfan(this.getUsername()) &&
                      !this.userstate[channel]
                    ) {
                      this.userstate[channel] = tags;
                      this.lastJoined = channel;
                      this.channels.push(channel);
                      this.log.info('Joined '.concat(channel));
                      this.emit(
                        'join',
                        channel,
                        _.username(this.getUsername()),
                        true
                      );
                    } // Emote-sets has changed, update it..

                    if (message.tags['emote-sets'] !== this.emotes) {
                      this._updateEmoteset(message.tags['emote-sets']);
                    }

                    this.userstate[channel] = tags;
                    break;
                  // Describe non-channel-specific state informations..

                  case 'GLOBALUSERSTATE':
                    this.globaluserstate = tags; // Received emote-sets..

                    if (typeof message.tags['emote-sets'] !== 'undefined') {
                      this._updateEmoteset(message.tags['emote-sets']);
                    }

                    break;
                  // Received when joining a channel and every time one of the chat room settings, like slow mode, change.
                  // The message on join contains all room settings.

                  case 'ROOMSTATE':
                    // We use this notice to know if we successfully joined a channel..
                    if (_.channel(this.lastJoined) === channel) {
                      this.emit('_promiseJoin', null, channel);
                    } // Provide the channel name in the tags before emitting it..

                    message.tags.channel = channel;
                    this.emit('roomstate', channel, message.tags);

                    if (!message.tags.hasOwnProperty('subs-only')) {
                      // Handle slow mode here instead of the slow_on/off notice..
                      // This room is now in slow mode. You may send messages every slow_duration seconds.
                      if (message.tags.hasOwnProperty('slow')) {
                        if (
                          typeof message.tags.slow === 'boolean' &&
                          !message.tags.slow
                        ) {
                          var disabled = [channel, false, 0];
                          this.log.info(
                            '['.concat(
                              channel,
                              '] This room is no longer in slow mode.'
                            )
                          );
                          this.emits(
                            ['slow', 'slowmode', '_promiseSlowoff'],
                            [disabled, disabled, [null]]
                          );
                        } else {
                          const seconds = Math.trunc(message.tags.slow);
                          var enabled = [channel, true, seconds];
                          this.log.info(
                            '['.concat(
                              channel,
                              '] This room is now in slow mode.'
                            )
                          );
                          this.emits(
                            ['slow', 'slowmode', '_promiseSlow'],
                            [enabled, enabled, [null]]
                          );
                        }
                      } // Handle followers only mode here instead of the followers_on/off notice..
                      // This room is now in follower-only mode.
                      // This room is now in <duration> followers-only mode.
                      // This room is no longer in followers-only mode.
                      // duration is in minutes (string)
                      // -1 when /followersoff (string)
                      // false when /followers with no duration (boolean)

                      if (message.tags.hasOwnProperty('followers-only')) {
                        if (message.tags['followers-only'] === '-1') {
                          var disabled = [channel, false, 0];
                          this.log.info(
                            '['.concat(
                              channel,
                              '] This room is no longer in followers-only mode.'
                            )
                          );
                          this.emits(
                            [
                              'followersonly',
                              'followersmode',
                              '_promiseFollowersoff'
                            ],
                            [disabled, disabled, [null]]
                          );
                        } else {
                          const minutes = Math.trunc(
                            message.tags['followers-only']
                          );
                          var enabled = [channel, true, minutes];
                          this.log.info(
                            '['.concat(
                              channel,
                              '] This room is now in follower-only mode.'
                            )
                          );
                          this.emits(
                            [
                              'followersonly',
                              'followersmode',
                              '_promiseFollowers'
                            ],
                            [enabled, enabled, [null]]
                          );
                        }
                      }
                    }

                    break;
                  // Wrong cluster..

                  case 'SERVERCHANGE':
                    break;

                  default:
                    this.log.warn(
                      'Could not parse message from tmi.twitch.tv:\n'.concat(
                        JSON.stringify(message, null, 4)
                      )
                    );
                    break;
                }
              } // Messages from jtv..
              else if (message.prefix === 'jtv') {
                switch (message.command) {
                  case 'MODE':
                    if (message_ === '+o') {
                      // Add username to the moderators..
                      if (!this.moderators[channel]) {
                        this.moderators[channel] = [];
                      }

                      if (
                        !this.moderators[channel].includes(message.params[2])
                      ) {
                        this.moderators[channel].push(message.params[2]);
                      }

                      this.emit('mod', channel, message.params[2]);
                    } else if (message_ === '-o') {
                      // Remove username from the moderators..
                      if (!this.moderators[channel]) {
                        this.moderators[channel] = [];
                      }

                      this.moderators[channel].filter((value) => {
                        return value != message.params[2];
                      });
                      this.emit('unmod', channel, message.params[2]);
                    }

                    break;

                  default:
                    this.log.warn(
                      'Could not parse message from jtv:\n'.concat(
                        JSON.stringify(message, null, 4)
                      )
                    );
                    break;
                }
              } // Anything else..
              else {
                switch (message.command) {
                  case '353':
                    this.emit(
                      'names',
                      message.params[2],
                      message.params[3].split(' ')
                    );
                    break;

                  case '366':
                    break;
                  // Someone has joined the channel..

                  case 'JOIN':
                    var nick = message.prefix.split('!')[0]; // Joined a channel as a justinfan (anonymous) user..

                    if (
                      _.isJustinfan(this.getUsername()) &&
                      this.username === nick
                    ) {
                      this.lastJoined = channel;
                      this.channels.push(channel);
                      this.log.info('Joined '.concat(channel));
                      this.emit('join', channel, nick, true);
                    } // Someone else joined the channel, just emit the join event..

                    if (this.username !== nick) {
                      this.emit('join', channel, nick, false);
                    }

                    break;
                  // Someone has left the channel..

                  case 'PART':
                    var isSelf = false;
                    var nick = message.prefix.split('!')[0]; // Client left a channel..

                    if (this.username === nick) {
                      isSelf = true;

                      if (this.userstate[channel]) {
                        delete this.userstate[channel];
                      }

                      var index = this.channels.indexOf(channel);

                      if (index !== -1) {
                        this.channels.splice(index, 1);
                      }

                      var index = this.opts.channels.indexOf(channel);

                      if (index !== -1) {
                        this.opts.channels.splice(index, 1);
                      }

                      this.log.info('Left '.concat(channel));
                      this.emit('_promisePart', null);
                    } // Client or someone else left the channel, emit the part event..

                    this.emit('part', channel, nick, isSelf);
                    break;
                  // Received a whisper..

                  case 'WHISPER':
                    var nick = message.prefix.split('!')[0];
                    this.log.info(
                      '[WHISPER] <'.concat(nick, '>: ').concat(message_)
                    ); // Update the tags to provide the username..

                    if (!message.tags.hasOwnProperty('username')) {
                      message.tags.username = nick;
                    }

                    message.tags['message-type'] = 'whisper';

                    var from = _.channel(message.tags.username); // Emit for both, whisper and message..

                    this.emits(
                      ['whisper', 'message'],
                      [[from, message.tags, message_, false]]
                    );
                    break;

                  case 'PRIVMSG':
                    // Add username (lowercase) to the tags..
                    message.tags.username = message.prefix.split('!')[0]; // Message from JTV..

                    if (message.tags.username === 'jtv') {
                      const name = _.username(message_.split(' ')[0]);

                      const autohost = message_.includes('auto'); // Someone is hosting the channel and the message contains how many viewers..

                      if (message_.includes('hosting you for')) {
                        const count = _.extractNumber(message_);

                        this.emit('hosted', channel, name, count, autohost);
                      } // Some is hosting the channel, but no viewer(s) count provided in the message..
                      else if (message_.includes('hosting you')) {
                        this.emit('hosted', channel, name, 0, autohost);
                      }
                    } else {
                      const messagesLogLevel = _.get(
                        this.opts.options.messagesLogLevel,
                        'info'
                      ); // Message is an action (/me <message>)..

                      const actionMessage = _.actionMessage(message_);

                      message.tags['message-type'] = actionMessage
                        ? 'action'
                        : 'chat';
                      message_ = actionMessage ? actionMessage[1] : message_; // Check for Bits prior to actions message

                      if (message.tags.hasOwnProperty('bits')) {
                        this.emit('cheer', channel, message.tags, message_);
                      } else {
                        // Handle Channel Point Redemptions (Require's Text Input)
                        if (message.tags.hasOwnProperty('msg-id')) {
                          if (
                            message.tags['msg-id'] === 'highlighted-message'
                          ) {
                            var rewardtype = message.tags['msg-id'];
                            this.emit(
                              'redeem',
                              channel,
                              message.tags.username,
                              rewardtype,
                              message.tags,
                              message_
                            );
                          } else if (
                            message.tags['msg-id'] === 'skip-subs-mode-message'
                          ) {
                            var rewardtype = message.tags['msg-id'];
                            this.emit(
                              'redeem',
                              channel,
                              message.tags.username,
                              rewardtype,
                              message.tags,
                              message_
                            );
                          }
                        } else if (
                          message.tags.hasOwnProperty('custom-reward-id')
                        ) {
                          var rewardtype = message.tags['custom-reward-id'];
                          this.emit(
                            'redeem',
                            channel,
                            message.tags.username,
                            rewardtype,
                            message.tags,
                            message_
                          );
                        }

                        if (actionMessage) {
                          this.log[messagesLogLevel](
                            '['
                              .concat(channel, '] *<')
                              .concat(message.tags.username, '>: ')
                              .concat(message_)
                          );
                          this.emits(
                            ['action', 'message'],
                            [[channel, message.tags, message_, false]]
                          );
                        } // Message is a regular chat message..
                        else {
                          this.log[messagesLogLevel](
                            '['
                              .concat(channel, '] <')
                              .concat(message.tags.username, '>: ')
                              .concat(message_)
                          );
                          this.emits(
                            ['chat', 'message'],
                            [[channel, message.tags, message_, false]]
                          );
                        }
                      }
                    }

                    break;

                  default:
                    this.log.warn(
                      'Could not parse message:\n'.concat(
                        JSON.stringify(message, null, 4)
                      )
                    );
                    break;
                }
              }
            }; // Connect to server..

            client.prototype.connect = function connect() {
              const _this2 = this;

              return new Promise((resolve, reject) => {
                _this2.server = _.get(
                  _this2.opts.connection.server,
                  'irc-ws.chat.twitch.tv'
                );
                _this2.port = _.get(_this2.opts.connection.port, 80); // Override port if using a secure connection..

                if (_this2.secure) {
                  _this2.port = 443;
                }

                if (_this2.port === 443) {
                  _this2.secure = true;
                }

                _this2.reconnectTimer *= _this2.reconnectDecay;

                if (_this2.reconnectTimer >= _this2.maxReconnectInterval) {
                  _this2.reconnectTimer = _this2.maxReconnectInterval;
                } // Connect to server from configuration..

                _this2._openConnection();

                _this2.once('_promiseConnect', (error) => {
                  if (!error) {
                    resolve([_this2.server, Math.trunc(_this2.port)]);
                  } else {
                    reject(error);
                  }
                });
              });
            }; // Open a connection..

            client.prototype._openConnection = function _openConnection() {
              this.ws = new _WebSocket(
                ''
                  .concat(this.secure ? 'wss' : 'ws', '://')
                  .concat(this.server, ':')
                  .concat(this.port, '/'),
                'irc'
              );
              this.ws.onmessage = this._onMessage.bind(this);
              this.ws.addEventListener('error', this._onError.bind(this));
              this.ws.onclose = this._onClose.bind(this);
              this.ws.addEventListener('open', this._onOpen.bind(this));
            }; // Called when the WebSocket connection's readyState changes to OPEN.
            // Indicates that the connection is ready to send and receive data..

            client.prototype._onOpen = function _onOpen() {
              const _this3 = this;

              if (_.isNull(this.ws) || this.ws.readyState !== 1) {
                return;
              } // Emitting "connecting" event..

              this.log.info(
                'Connecting to '
                  .concat(this.server, ' on port ')
                  .concat(this.port, '..')
              );
              this.emit('connecting', this.server, Math.trunc(this.port));
              this.username = _.get(this.opts.identity.username, _.justinfan());

              this._getToken()
                .then((token) => {
                  const password = _.password(token); // Emitting "logon" event..

                  _this3.log.info('Sending authentication to server..');

                  _this3.emit('logon'); // Authentication..

                  _this3.ws.send(
                    'CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership'
                  );

                  if (password) {
                    _this3.ws.send('PASS '.concat(password));
                  } else if (_.isJustinfan(_this3.username)) {
                    _this3.ws.send('PASS SCHMOOPIIE');
                  }

                  _this3.ws.send('NICK '.concat(_this3.username));
                })
                .catch((error) => {
                  _this3.emits(
                    ['_promiseConnect', 'disconnected'],
                    [[error], ['Could not get a token.']]
                  );
                });
            }; // Fetches a token from the option.

            client.prototype._getToken = function _getPassword() {
              const passwordOption = this.opts.identity.password;
              let password;

              if (typeof passwordOption === 'function') {
                password = passwordOption();

                if (password instanceof Promise) {
                  return password;
                }

                return Promise.resolve(password);
              }

              return Promise.resolve(passwordOption);
            }; // Called when a message is received from the server..

            client.prototype._onMessage = function _onMessage(event) {
              const _this4 = this;

              const parts = event.data.split('\r\n');
              for (const string of parts) {
                if (!_.isNull(string)) {
                  _this4.handleMessage(parse.msg(string));
                }
              }
            }; // Called when an error occurs..

            client.prototype._onError = function _onError() {
              const _this5 = this;

              this.moderators = {};
              this.userstate = {};
              this.globaluserstate = {}; // Stop the internal ping timeout check interval..

              clearInterval(this.pingLoop);
              clearTimeout(this.pingTimeout);
              this.reason = !_.isNull(this.ws)
                ? 'Unable to connect.'
                : 'Connection closed.';
              this.emits(['_promiseConnect', 'disconnected'], [[this.reason]]); // Reconnect to server..

              if (
                this.reconnect &&
                this.reconnections === this.maxReconnectAttempts
              ) {
                this.emit('maxreconnect');
                this.log.error('Maximum reconnection attempts reached.');
              }

              if (
                this.reconnect &&
                !this.reconnecting &&
                this.reconnections <= this.maxReconnectAttempts - 1
              ) {
                this.reconnecting = true;
                this.reconnections += 1;
                this.log.error(
                  'Reconnecting in '.concat(
                    Math.round(this.reconnectTimer / 1000),
                    ' seconds..'
                  )
                );
                this.emit('reconnect');
                setTimeout(() => {
                  _this5.reconnecting = false;

                  _this5.connect().catch((error) => {
                    return _this5.log.error(error);
                  });
                }, this.reconnectTimer);
              }

              this.ws = null;
            }; // Called when the WebSocket connection's readyState changes to CLOSED..

            client.prototype._onClose = function _onClose() {
              const _this6 = this;

              this.moderators = {};
              this.userstate = {};
              this.globaluserstate = {}; // Stop the internal ping timeout check interval..

              clearInterval(this.pingLoop);
              clearTimeout(this.pingTimeout); // User called .disconnect(), don't try to reconnect.

              if (this.wasCloseCalled) {
                this.wasCloseCalled = false;
                this.reason = 'Connection closed.';
                this.log.info(this.reason);
                this.emits(
                  ['_promiseConnect', '_promiseDisconnect', 'disconnected'],
                  [[this.reason], [null], [this.reason]]
                );
              } // Got disconnected from server..
              else {
                this.emits(
                  ['_promiseConnect', 'disconnected'],
                  [[this.reason]]
                ); // Reconnect to server..

                if (
                  this.reconnect &&
                  this.reconnections === this.maxReconnectAttempts
                ) {
                  this.emit('maxreconnect');
                  this.log.error('Maximum reconnection attempts reached.');
                }

                if (
                  this.reconnect &&
                  !this.reconnecting &&
                  this.reconnections <= this.maxReconnectAttempts - 1
                ) {
                  this.reconnecting = true;
                  this.reconnections += 1;
                  this.log.error(
                    'Could not connect to server. Reconnecting in '.concat(
                      Math.round(this.reconnectTimer / 1000),
                      ' seconds..'
                    )
                  );
                  this.emit('reconnect');
                  setTimeout(() => {
                    _this6.reconnecting = false;

                    _this6.connect().catch((error) => {
                      return _this6.log.error(error);
                    });
                  }, this.reconnectTimer);
                }
              }

              this.ws = null;
            }; // Minimum of 600ms for command promises, if current latency exceeds, add 100ms to it to make sure it doesn't get timed out..

            client.prototype._getPromiseDelay = function _getPromiseDelay() {
              if (this.currentLatency <= 600) {
                return 600;
              }

              return this.currentLatency + 100;
            }; // Send command to server or channel..

            client.prototype._sendCommand = function _sendCommand(
              delay,
              channel,
              command,
              fn
            ) {
              const _this7 = this;

              // Race promise against delay..
              return new Promise((resolve, reject) => {
                // Make sure the socket is opened..
                if (_.isNull(_this7.ws) || _this7.ws.readyState !== 1) {
                  // Disconnected from server..
                  return reject('Not connected to server.');
                }

                if (typeof delay === 'number') {
                  _.promiseDelay(delay).then(() => {
                    return reject('No response from Twitch.');
                  });
                } // Executing a command on a channel..

                if (!_.isNull(channel)) {
                  const chan = _.channel(channel);

                  _this7.log.info(
                    '['.concat(chan, '] Executing command: ').concat(command)
                  );

                  _this7.ws.send('PRIVMSG '.concat(chan, ' :').concat(command));
                } // Executing a raw command..
                else {
                  _this7.log.info('Executing command: '.concat(command));

                  _this7.ws.send(command);
                }

                if (typeof fn === 'function') {
                  fn(resolve, reject);
                } else {
                  resolve();
                }
              });
            }; // Send a message to channel..

            client.prototype._sendMessage = function _sendMessage(
              delay,
              channel,
              message,
              fn
            ) {
              const _this8 = this;

              // Promise a result..
              return new Promise((resolve, reject) => {
                // Make sure the socket is opened and not logged in as a justinfan user..
                if (_.isNull(_this8.ws) || _this8.ws.readyState !== 1) {
                  return reject('Not connected to server.');
                }

                if (_.isJustinfan(_this8.getUsername())) {
                  return reject('Cannot send anonymous messages.');
                }

                const chan = _.channel(channel);

                if (!_this8.userstate[chan]) {
                  _this8.userstate[chan] = {};
                } // Split long lines otherwise they will be eaten by the server..

                if (message.length >= 500) {
                  const message_ = _.splitLine(message, 500);

                  message = message_[0];
                  setTimeout(() => {
                    _this8._sendMessage(delay, channel, message_[1], () => {});
                  }, 350);
                }

                _this8.ws.send('PRIVMSG '.concat(chan, ' :').concat(message));

                const emotes = {}; // Parse regex and string emotes..

                for (const id of Object.keys(_this8.emotesets)) {
                  for (const emote of _this8.emotesets[id]) {
                    const emoteFunc = _.isRegex(emote.code)
                      ? parse.emoteRegex
                      : parse.emoteString;
                    emoteFunc(message, emote.code, emote.id, emotes);
                    continue;
                  }

                  continue;
                } // Merge userstate with parsed emotes..

                const userstate = _.merge(
                  _this8.userstate[chan],
                  parse.emotes({
                    emotes: parse.transformEmotes(emotes) || null
                  })
                );

                const messagesLogLevel = _.get(
                  _this8.opts.options.messagesLogLevel,
                  'info'
                ); // Message is an action (/me <message>)..

                const actionMessage = _.actionMessage(message);

                if (actionMessage) {
                  userstate['message-type'] = 'action';

                  _this8.log[messagesLogLevel](
                    '['
                      .concat(chan, '] *<')
                      .concat(_this8.getUsername(), '>: ')
                      .concat(actionMessage[1])
                  );

                  _this8.emits(
                    ['action', 'message'],
                    [[chan, userstate, actionMessage[1], true]]
                  );
                } // Message is a regular chat message..
                else {
                  userstate['message-type'] = 'chat';

                  _this8.log[messagesLogLevel](
                    '['
                      .concat(chan, '] <')
                      .concat(_this8.getUsername(), '>: ')
                      .concat(message)
                  );

                  _this8.emits(
                    ['chat', 'message'],
                    [[chan, userstate, message, true]]
                  );
                }

                if (typeof fn === 'function') {
                  fn(resolve, reject);
                } else {
                  resolve();
                }
              });
            }; // Grab the emote-sets object from the API..

            client.prototype._updateEmoteset = function _updateEmoteset(sets) {
              const _this9 = this;

              this.emotes = sets;

              this._getToken()
                .then((token) => {
                  return _this9.api(
                    {
                      url: '/chat/emoticon_images?emotesets='.concat(sets),
                      headers: {
                        Authorization: 'OAuth '.concat(_.token(token)),
                        'Client-ID': _this9.clientId
                      }
                    },
                    (error, res, body) => {
                      if (!error) {
                        _this9.emotesets = body.emoticon_sets || {};
                        return _this9.emit('emotesets', sets, _this9.emotesets);
                      }

                      setTimeout(() => {
                        return _this9._updateEmoteset(sets);
                      }, 60_000);
                    }
                  );
                })
                .catch(() => {
                  return setTimeout(() => {
                    return _this9._updateEmoteset(sets);
                  }, 60_000);
                });
            }; // Get current username..

            client.prototype.getUsername = function getUsername() {
              return this.username;
            }; // Get current options..

            client.prototype.getOptions = function getOptions() {
              return this.opts;
            }; // Get current channels..

            client.prototype.getChannels = function getChannels() {
              return this.channels;
            }; // Check if username is a moderator on a channel..

            client.prototype.isMod = function isMod(channel, username) {
              const chan = _.channel(channel);

              if (!this.moderators[chan]) {
                this.moderators[chan] = [];
              }

              return this.moderators[chan].includes(_.username(username));
            }; // Get readyState..

            client.prototype.readyState = function readyState() {
              if (_.isNull(this.ws)) {
                return 'CLOSED';
              }

              return ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][
                this.ws.readyState
              ];
            }; // Determine if the client has a WebSocket and it's open..

            client.prototype._isConnected = function _isConnected() {
              return this.ws !== null && this.ws.readyState === 1;
            }; // Disconnect from server..

            client.prototype.disconnect = function disconnect() {
              const _this10 = this;

              return new Promise((resolve, reject) => {
                if (!_.isNull(_this10.ws) && _this10.ws.readyState !== 3) {
                  _this10.wasCloseCalled = true;

                  _this10.log.info('Disconnecting from server..');

                  _this10.ws.close();

                  _this10.once('_promiseDisconnect', () => {
                    return resolve([_this10.server, Math.trunc(_this10.port)]);
                  });
                } else {
                  _this10.log.error(
                    'Cannot disconnect from server. Socket is not opened or connection is already closing.'
                  );

                  reject(
                    'Cannot disconnect from server. Socket is not opened or connection is already closing.'
                  );
                }
              });
            }; // Expose everything, for browser and Node..

            if (typeof module !== 'undefined' && module.exports) {
              module.exports = client;
            }

            if (typeof window !== 'undefined') {
              window.tmi = {};
              window.tmi.client = client;
              window.tmi.Client = client;
            }
          }.call(this));
        }.call(
          this,
          typeof global !== 'undefined'
            ? global
            : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
            ? window
            : {}
        ));
      },
      {
        './api': 2,
        './commands': 4,
        './events': 5,
        './logger': 6,
        './parser': 7,
        './timer': 8,
        './utils': 9,
        ws: 10
      }
    ],
    4: [
      function (require, module, exports) {
        const _ = require('./utils'); // Enable followers-only mode on a channel..

        function followersonly(channel, minutes) {
          const _this = this;

          channel = _.channel(channel);
          minutes = _.get(minutes, 30); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/followers '.concat(minutes),
            (resolve, reject) => {
              // Received _promiseFollowers event, resolve or reject..
              _this.once('_promiseFollowers', (error) => {
                if (!error) {
                  resolve([channel, Math.trunc(minutes)]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Disable followers-only mode on a channel..

        function followersonlyoff(channel) {
          const _this2 = this;

          channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/followersoff',
            (resolve, reject) => {
              // Received _promiseFollowersoff event, resolve or reject..
              _this2.once('_promiseFollowersoff', (error) => {
                if (!error) {
                  resolve([channel]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Leave a channel..

        function part(channel) {
          const _this3 = this;

          channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            null,
            'PART '.concat(channel),
            (resolve, reject) => {
              // Received _promisePart event, resolve or reject..
              _this3.once('_promisePart', (error) => {
                if (!error) {
                  resolve([channel]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Enable R9KBeta mode on a channel..

        function r9kbeta(channel) {
          const _this4 = this;

          channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/r9kbeta',
            (resolve, reject) => {
              // Received _promiseR9kbeta event, resolve or reject..
              _this4.once('_promiseR9kbeta', (error) => {
                if (!error) {
                  resolve([channel]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Disable R9KBeta mode on a channel..

        function r9kbetaoff(channel) {
          const _this5 = this;

          channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/r9kbetaoff',
            (resolve, reject) => {
              // Received _promiseR9kbetaoff event, resolve or reject..
              _this5.once('_promiseR9kbetaoff', (error) => {
                if (!error) {
                  resolve([channel]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Enable slow mode on a channel..

        function slow(channel, seconds) {
          const _this6 = this;

          channel = _.channel(channel);
          seconds = _.get(seconds, 300); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/slow '.concat(seconds),
            (resolve, reject) => {
              // Received _promiseSlow event, resolve or reject..
              _this6.once('_promiseSlow', (error) => {
                if (!error) {
                  resolve([channel, Math.trunc(seconds)]);
                } else {
                  reject(error);
                }
              });
            }
          );
        } // Disable slow mode on a channel..

        function slowoff(channel) {
          const _this7 = this;

          channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

          return this._sendCommand(
            this._getPromiseDelay(),
            channel,
            '/slowoff',
            (resolve, reject) => {
              // Received _promiseSlowoff event, resolve or reject..
              _this7.once('_promiseSlowoff', (error) => {
                if (!error) {
                  resolve([channel]);
                } else {
                  reject(error);
                }
              });
            }
          );
        }

        module.exports = {
          // Send action message (/me <message>) on a channel..
          action: function action(channel, message) {
            channel = _.channel(channel);
            message = '\u0001ACTION '.concat(message, '\u0001'); // Send the command to the server and race the Promise against a delay..

            return this._sendMessage(
              this._getPromiseDelay(),
              channel,
              message,
              (resolve, reject) => {
                // At this time, there is no possible way to detect if a message has been sent has been eaten
                // by the server, so we can only resolve the Promise.
                resolve([channel, message]);
              }
            );
          },
          // Ban username on channel..
          ban: function ban(channel, username, reason) {
            const _this8 = this;

            channel = _.channel(channel);
            username = _.username(username);
            reason = _.get(reason, ''); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/ban '.concat(username, ' ').concat(reason),
              (resolve, reject) => {
                // Received _promiseBan event, resolve or reject..
                _this8.once('_promiseBan', (error) => {
                  if (!error) {
                    resolve([channel, username, reason]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Clear all messages on a channel..
          clear: function clear(channel) {
            const _this9 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/clear',
              (resolve, reject) => {
                // Received _promiseClear event, resolve or reject..
                _this9.once('_promiseClear', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Change the color of your username..
          color: function color(channel, newColor) {
            const _this10 = this;

            newColor = _.get(newColor, channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              '#tmijs',
              '/color '.concat(newColor),
              (resolve, reject) => {
                // Received _promiseColor event, resolve or reject..
                _this10.once('_promiseColor', (error) => {
                  if (!error) {
                    resolve([newColor]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Run commercial on a channel for X seconds..
          commercial: function commercial(channel, seconds) {
            const _this11 = this;

            channel = _.channel(channel);
            seconds = _.get(seconds, 30); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/commercial '.concat(seconds),
              (resolve, reject) => {
                // Received _promiseCommercial event, resolve or reject..
                _this11.once('_promiseCommercial', (error) => {
                  if (!error) {
                    resolve([channel, Math.trunc(seconds)]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Delete a specific message on a channel
          deletemessage: function deletemessage(channel, messageUUID) {
            const _this12 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/delete '.concat(messageUUID),
              (resolve, reject) => {
                // Received _promiseDeletemessage event, resolve or reject..
                _this12.once('_promiseDeletemessage', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Enable emote-only mode on a channel..
          emoteonly: function emoteonly(channel) {
            const _this13 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/emoteonly',
              (resolve, reject) => {
                // Received _promiseEmoteonly event, resolve or reject..
                _this13.once('_promiseEmoteonly', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Disable emote-only mode on a channel..
          emoteonlyoff: function emoteonlyoff(channel) {
            const _this14 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/emoteonlyoff',
              (resolve, reject) => {
                // Received _promiseEmoteonlyoff event, resolve or reject..
                _this14.once('_promiseEmoteonlyoff', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Enable followers-only mode on a channel..
          followersonly,
          // Alias for followersonly()..
          followersmode: followersonly,
          // Disable followers-only mode on a channel..
          followersonlyoff,
          // Alias for followersonlyoff()..
          followersmodeoff: followersonlyoff,
          // Host a channel..
          host: function host(channel, target) {
            const _this15 = this;

            channel = _.channel(channel);
            target = _.username(target); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              2000,
              channel,
              '/host '.concat(target),
              (resolve, reject) => {
                // Received _promiseHost event, resolve or reject..
                _this15.once('_promiseHost', (error, remaining) => {
                  if (!error) {
                    resolve([channel, target, Math.trunc(remaining)]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Join a channel..
          join: function join(channel) {
            const _this16 = this;

            channel = _.channel(channel); // Send the command to the server ..

            return this._sendCommand(
              null,
              null,
              'JOIN '.concat(channel),
              (resolve, reject) => {
                const eventName = '_promiseJoin';
                let hasFulfilled = false;

                const listener = function listener(error, joinedChannel) {
                  if (channel === _.channel(joinedChannel)) {
                    // Received _promiseJoin event for the target channel, resolve or reject..
                    _this16.removeListener(eventName, listener);

                    hasFulfilled = true;

                    if (!error) {
                      resolve([channel]);
                    } else {
                      reject(error);
                    }
                  }
                };

                _this16.on(eventName, listener); // Race the Promise against a delay..

                const delay = _this16._getPromiseDelay();

                _.promiseDelay(delay).then(() => {
                  if (!hasFulfilled) {
                    _this16.emit(
                      eventName,
                      'No response from Twitch.',
                      channel
                    );
                  }
                });
              }
            );
          },
          // Mod username on channel..
          mod: function mod(channel, username) {
            const _this17 = this;

            channel = _.channel(channel);
            username = _.username(username); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/mod '.concat(username),
              (resolve, reject) => {
                // Received _promiseMod event, resolve or reject..
                _this17.once('_promiseMod', (error) => {
                  if (!error) {
                    resolve([channel, username]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Get list of mods on a channel..
          mods: function mods(channel) {
            const _this18 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/mods',
              (resolve, reject) => {
                // Received _promiseMods event, resolve or reject..
                _this18.once('_promiseMods', (error, mods) => {
                  if (!error) {
                    // Update the internal list of moderators..
                    for (const username of mods) {
                      if (!_this18.moderators[channel]) {
                        _this18.moderators[channel] = [];
                      }

                      if (!_this18.moderators[channel].includes(username)) {
                        _this18.moderators[channel].push(username);
                      }
                    }

                    resolve(mods);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Leave a channel..
          part,
          // Alias for part()..
          leave: part,
          // Send a ping to the server..
          ping: function ping() {
            const _this19 = this;

            // Send the command to the server and race the Promise against a delay..
            return this._sendCommand(
              this._getPromiseDelay(),
              null,
              'PING',
              (resolve, reject) => {
                // Update the internal ping timeout check interval..
                _this19.latency = new Date();
                _this19.pingTimeout = setTimeout(() => {
                  if (_this19.ws !== null) {
                    _this19.wasCloseCalled = false;

                    _this19.log.error('Ping timeout.');

                    _this19.ws.close();

                    clearInterval(_this19.pingLoop);
                    clearTimeout(_this19.pingTimeout);
                  }
                }, _.get(_this19.opts.connection.timeout, 9999)); // Received _promisePing event, resolve or reject..

                _this19.once('_promisePing', (latency) => {
                  return resolve([Number.parseFloat(latency)]);
                });
              }
            );
          },
          // Enable R9KBeta mode on a channel..
          r9kbeta,
          // Alias for r9kbeta()..
          r9kmode: r9kbeta,
          // Disable R9KBeta mode on a channel..
          r9kbetaoff,
          // Alias for r9kbetaoff()..
          r9kmodeoff: r9kbetaoff,
          // Send a raw message to the server..
          raw: function raw(message) {
            // Send the command to the server and race the Promise against a delay..
            return this._sendCommand(
              this._getPromiseDelay(),
              null,
              message,
              (resolve, reject) => {
                resolve([message]);
              }
            );
          },
          // Send a message on a channel..
          say: function say(channel, message) {
            channel = _.channel(channel);

            if (
              (message.startsWith('.') && !message.startsWith('..')) ||
              message.startsWith('/') ||
              message.startsWith('\\')
            ) {
              // Check if the message is an action message..
              if (message.slice(1, 4) === 'me ') {
                return this.action(channel, message.slice(4));
              }

              // Send the command to the server and race the Promise against a delay..
              return this._sendCommand(
                this._getPromiseDelay(),
                channel,
                message,
                (resolve, reject) => {
                  // At this time, there is no possible way to detect if a message has been sent has been eaten
                  // by the server, so we can only resolve the Promise.
                  resolve([channel, message]);
                }
              );
            } // Send the command to the server and race the Promise against a delay..

            return this._sendMessage(
              this._getPromiseDelay(),
              channel,
              message,
              (resolve, reject) => {
                // At this time, there is no possible way to detect if a message has been sent has been eaten
                // by the server, so we can only resolve the Promise.
                resolve([channel, message]);
              }
            );
          },
          // Enable slow mode on a channel..
          slow,
          // Alias for slow()..
          slowmode: slow,
          // Disable slow mode on a channel..
          slowoff,
          // Alias for slowoff()..
          slowmodeoff: slowoff,
          // Enable subscribers mode on a channel..
          subscribers: function subscribers(channel) {
            const _this20 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/subscribers',
              (resolve, reject) => {
                // Received _promiseSubscribers event, resolve or reject..
                _this20.once('_promiseSubscribers', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Disable subscribers mode on a channel..
          subscribersoff: function subscribersoff(channel) {
            const _this21 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/subscribersoff',
              (resolve, reject) => {
                // Received _promiseSubscribersoff event, resolve or reject..
                _this21.once('_promiseSubscribersoff', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Timeout username on channel for X seconds..
          timeout: function timeout(channel, username, seconds, reason) {
            const _this22 = this;

            channel = _.channel(channel);
            username = _.username(username);

            if (!_.isNull(seconds) && !_.isInteger(seconds)) {
              reason = seconds;
              seconds = 300;
            }

            seconds = _.get(seconds, 300);
            reason = _.get(reason, ''); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/timeout '
                .concat(username, ' ')
                .concat(seconds, ' ')
                .concat(reason),
              (resolve, reject) => {
                // Received _promiseTimeout event, resolve or reject..
                _this22.once('_promiseTimeout', (error) => {
                  if (!error) {
                    resolve([channel, username, Math.trunc(seconds), reason]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Unban username on channel..
          unban: function unban(channel, username) {
            const _this23 = this;

            channel = _.channel(channel);
            username = _.username(username); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/unban '.concat(username),
              (resolve, reject) => {
                // Received _promiseUnban event, resolve or reject..
                _this23.once('_promiseUnban', (error) => {
                  if (!error) {
                    resolve([channel, username]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // End the current hosting..
          unhost: function unhost(channel) {
            const _this24 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              2000,
              channel,
              '/unhost',
              (resolve, reject) => {
                // Received _promiseUnhost event, resolve or reject..
                _this24.once('_promiseUnhost', (error) => {
                  if (!error) {
                    resolve([channel]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Unmod username on channel..
          unmod: function unmod(channel, username) {
            const _this25 = this;

            channel = _.channel(channel);
            username = _.username(username); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/unmod '.concat(username),
              (resolve, reject) => {
                // Received _promiseUnmod event, resolve or reject..
                _this25.once('_promiseUnmod', (error) => {
                  if (!error) {
                    resolve([channel, username]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Unvip username on channel..
          unvip: function unvip(channel, username) {
            const _this26 = this;

            channel = _.channel(channel);
            username = _.username(username); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/unvip '.concat(username),
              (resolve, reject) => {
                // Received _promiseUnvip event, resolve or reject..
                _this26.once('_promiseUnvip', (error) => {
                  if (!error) {
                    resolve([channel, username]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Add username to VIP list on channel..
          vip: function vip(channel, username) {
            const _this27 = this;

            channel = _.channel(channel);
            username = _.username(username); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/vip '.concat(username),
              (resolve, reject) => {
                // Received _promiseVip event, resolve or reject..
                _this27.once('_promiseVip', (error) => {
                  if (!error) {
                    resolve([channel, username]);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Get list of VIPs on a channel..
          vips: function vips(channel) {
            const _this28 = this;

            channel = _.channel(channel); // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              channel,
              '/vips',
              (resolve, reject) => {
                // Received _promiseVips event, resolve or reject..
                _this28.once('_promiseVips', (error, vips) => {
                  if (!error) {
                    resolve(vips);
                  } else {
                    reject(error);
                  }
                });
              }
            );
          },
          // Send an whisper message to a user..
          whisper: function whisper(username, message) {
            const _this29 = this;

            username = _.username(username); // The server will not send a whisper to the account that sent it.

            if (username === this.getUsername()) {
              return Promise.reject(
                'Cannot send a whisper to the same account.'
              );
            } // Send the command to the server and race the Promise against a delay..

            return this._sendCommand(
              this._getPromiseDelay(),
              '#tmijs',
              '/w '.concat(username, ' ').concat(message),
              (resolve, reject) => {
                _this29.once('_promiseWhisper', (error) => {
                  if (error) {
                    reject(error);
                  }
                });
              }
            ).catch((error) => {
              // Either an "actual" error occured or the timeout triggered
              // the latter means no errors have occured and we can resolve
              // else just elevate the error
              if (
                error &&
                typeof error === 'string' &&
                error.indexOf('No response from Twitch.') !== 0
              ) {
                throw error;
              }

              const from = _.channel(username);
              const userstate = _.merge(
                {
                  'message-type': 'whisper',
                  'message-id': null,
                  'thread-id': null,
                  username: _this29.getUsername()
                },
                _this29.globaluserstate
              ); // Emit for both, whisper and message..

              _this29.emits(
                ['whisper', 'message'],
                [
                  [from, userstate, message, true],
                  [from, userstate, message, true]
                ]
              );

              return [username, message];
            });
          }
        };
      },
      {'./utils': 9}
    ],
    5: [
      function (require, module, exports) {
        function _typeof(object) {
          '@babel/helpers - typeof';
          _typeof =
            typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
              ? function _typeof(object_) {
                  return typeof object_;
                }
              : function _typeof(object_) {
                  return object_ &&
                    typeof Symbol === 'function' &&
                    object_.constructor === Symbol &&
                    object_ !== Symbol.prototype
                    ? 'symbol'
                    : typeof object_;
                };

          return _typeof(object);
        }

        /*
         * Copyright Joyent, Inc. and other Node contributors.
         *
         * Permission is hereby granted, free of charge, to any person obtaining a
         * copy of this software and associated documentation files (the
         * "Software"), to deal in the Software without restriction, including
         * without limitation the rights to use, copy, modify, merge, publish,
         * distribute, sublicense, and/or sell copies of the Software, and to permit
         * persons to whom the Software is furnished to do so, subject to the
         * following conditions:
         *
         * The above copyright notice and this permission notice shall be included
         * in all copies or substantial portions of the Software.
         *
         * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
         * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
         * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
         * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
         * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
         * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
         * USE OR OTHER DEALINGS IN THE SOFTWARE.
         */
        function EventEmitter() {
          this._events = this._events || {};
          this._maxListeners = this._maxListeners || undefined;
        }

        module.exports = EventEmitter; // Backwards-compat with node 0.10.x

        EventEmitter.EventEmitter = EventEmitter;
        EventEmitter.prototype._events = undefined;
        EventEmitter.prototype._maxListeners = undefined; // By default EventEmitters will print a warning if more than 10 listeners are
        // added to it. This is a useful default which helps finding memory leaks.

        EventEmitter.defaultMaxListeners = 10; // Obviously not all Emitters should be limited to 10. This function allows
        // that to be increased. Set to zero for unlimited.

        EventEmitter.prototype.setMaxListeners = function (n) {
          if (!isNumber(n) || n < 0 || isNaN(n)) {
            throw new TypeError('n must be a positive number');
          }

          this._maxListeners = n;
          return this;
        };

        EventEmitter.prototype.emit = function (type) {
          let er;
          let handler;
          let length;
          let args;
          let i;
          let listeners;

          if (!this._events) {
            this._events = {};
          } // If there is no 'error' event listener then throw.

          if (
            type === 'error' &&
            (!this._events.error ||
              (isObject(this._events.error) && this._events.error.length === 0))
          ) {
            er = arguments[1];

            if (er instanceof Error) {
              throw er;
            }

            throw new TypeError('Uncaught, unspecified "error" event.');
          }

          handler = this._events[type];

          if (isUndefined(handler)) {
            return false;
          }

          if (isFunction(handler)) {
            switch (arguments.length) {
              // Fast cases
              case 1:
                handler.call(this);
                break;

              case 2:
                handler.call(this, arguments[1]);
                break;

              case 3:
                handler.call(this, arguments[1], arguments[2]);
                break;
              // Slower

              default:
                args = Array.prototype.slice.call(arguments, 1);
                handler.apply(this, args);
            }
          } else if (isObject(handler)) {
            args = Array.prototype.slice.call(arguments, 1);
            listeners = handler.slice();
            length = listeners.length;

            for (i = 0; i < length; i++) {
              listeners[i].apply(this, args);
            }
          }

          return true;
        };

        EventEmitter.prototype.addListener = function (type, listener) {
          let m;

          if (!isFunction(listener)) {
            throw new TypeError('listener must be a function');
          }

          if (!this._events) {
            this._events = {};
          } // To avoid recursion in the case that type === "newListener"! Before
          // adding it to the listeners, first emit "newListener".

          if (this._events.newListener) {
            this.emit(
              'newListener',
              type,
              isFunction(listener.listener) ? listener.listener : listener
            );
          } // Optimize the case of one listener. Don't need the extra array object.

          if (!this._events[type]) {
            this._events[type] = listener;
          } // If we've already got an array, just append.
          else if (isObject(this._events[type])) {
            this._events[type].push(listener);
          } // Adding the second element, need to change to array.
          else {
            this._events[type] = [this._events[type], listener];
          } // Check for listener leak

          if (isObject(this._events[type]) && !this._events[type].warned) {
            m = !isUndefined(this._maxListeners)
              ? this._maxListeners
              : EventEmitter.defaultMaxListeners;

            if (m && m > 0 && this._events[type].length > m) {
              this._events[type].warned = true;
              console.error(
                '(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.',
                this._events[type].length
              ); // Not supported in IE 10

              if (typeof console.trace === 'function') {
                console.trace();
              }
            }
          }

          return this;
        };

        EventEmitter.prototype.on = EventEmitter.prototype.addListener; // Modified to support multiple calls..

        EventEmitter.prototype.once = function (type, listener) {
          if (!isFunction(listener)) {
            throw new TypeError('listener must be a function');
          }

          let fired = false;

          if (this._events.hasOwnProperty(type) && type.charAt(0) === '_') {
            let count = 1;
            const searchFor = type;

            for (const k in this._events) {
              if (this._events.hasOwnProperty(k) && k.startsWith(searchFor)) {
                count++;
              }
            }

            type += count;
          }

          function g() {
            if (type.charAt(0) === '_' && !isNaN(type.slice(-1))) {
              type = type.slice(0, Math.max(0, type.length - 1));
            }

            this.removeListener(type, g);

            if (!fired) {
              fired = true;
              Reflect.apply(listener, this, arguments);
            }
          }

          g.listener = listener;
          this.on(type, g);
          return this;
        }; // Emits a "removeListener" event if the listener was removed..
        // Modified to support multiple calls from .once()..

        EventEmitter.prototype.removeListener = function (type, listener) {
          let list;
          let position;
          let length;
          let i;

          if (!isFunction(listener)) {
            throw new TypeError('listener must be a function');
          }

          if (!this._events || !this._events[type]) {
            return this;
          }

          list = this._events[type];
          length = list.length;
          position = -1;

          if (
            list === listener ||
            (isFunction(list.listener) && list.listener === listener)
          ) {
            delete this._events[type];

            if (
              this._events.hasOwnProperty(type + '2') &&
              type.charAt(0) === '_'
            ) {
              const searchFor = type;

              for (const k in this._events) {
                if (
                  this._events.hasOwnProperty(k) &&
                  k.startsWith(searchFor) &&
                  !isNaN(Number.parseInt(k.slice(-1)))
                ) {
                  this._events[type + Number.parseInt(k.slice(-1) - 1)] =
                    this._events[k];
                  delete this._events[k];
                }
              }

              this._events[type] = this._events[type + '1'];
              delete this._events[type + '1'];
            }

            if (this._events.removeListener) {
              this.emit('removeListener', type, listener);
            }
          } else if (isObject(list)) {
            for (i = length; i-- > 0; ) {
              if (
                list[i] === listener ||
                (list[i].listener && list[i].listener === listener)
              ) {
                position = i;
                break;
              }
            }

            if (position < 0) {
              return this;
            }

            if (list.length === 1) {
              list.length = 0;
              delete this._events[type];
            } else {
              list.splice(position, 1);
            }

            if (this._events.removeListener) {
              this.emit('removeListener', type, listener);
            }
          }

          return this;
        };

        EventEmitter.prototype.removeAllListeners = function (type) {
          let key;
          let listeners;

          if (!this._events) {
            return this;
          } // Not listening for removeListener, no need to emit

          if (!this._events.removeListener) {
            if (arguments.length === 0) {
              this._events = {};
            } else if (this._events[type]) {
              delete this._events[type];
            }

            return this;
          } // Emit removeListener for all listeners on all events

          if (arguments.length === 0) {
            for (key in this._events) {
              if (key === 'removeListener') {
                continue;
              }

              this.removeAllListeners(key);
            }

            this.removeAllListeners('removeListener');
            this._events = {};
            return this;
          }

          listeners = this._events[type];

          if (isFunction(listeners)) {
            this.removeListener(type, listeners);
          } else if (listeners) {
            while (listeners.length > 0) {
              this.removeListener(type, listeners[listeners.length - 1]);
            }
          }

          delete this._events[type];
          return this;
        };

        EventEmitter.prototype.listeners = function (type) {
          let returnValue;

          if (!this._events || !this._events[type]) {
            returnValue = [];
          } else if (isFunction(this._events[type])) {
            returnValue = [this._events[type]];
          } else {
            returnValue = this._events[type].slice();
          }

          return returnValue;
        };

        EventEmitter.prototype.listenerCount = function (type) {
          if (this._events) {
            const evlistener = this._events[type];

            if (isFunction(evlistener)) {
              return 1;
            }

            if (evlistener) {
              return evlistener.length;
            }
          }

          return 0;
        };

        EventEmitter.listenerCount = function (emitter, type) {
          return emitter.listenerCount(type);
        };

        function isFunction(arg) {
          return typeof arg === 'function';
        }

        function isNumber(arg) {
          return typeof arg === 'number';
        }

        function isObject(arg) {
          return _typeof(arg) === 'object' && arg !== null;
        }

        function isUndefined(arg) {
          return arg === void 0;
        }
      },
      {}
    ],
    6: [
      function (require, module, exports) {
        const _ = require('./utils');

        let currentLevel = 'info';
        const levels = {
          trace: 0,
          debug: 1,
          info: 2,
          warn: 3,
          error: 4,
          fatal: 5
        }; // Logger implementation..

        function log(level) {
          // Return a console message depending on the logging level..
          return function (message) {
            if (levels[level] >= levels[currentLevel]) {
              console.log(
                '['
                  .concat(_.formatDate(new Date()), '] ')
                  .concat(level, ': ')
                  .concat(message)
              );
            }
          };
        }

        module.exports = {
          // Change the current logging level..
          setLevel: function setLevel(level) {
            currentLevel = level;
          },
          trace: log('trace'),
          debug: log('debug'),
          info: log('info'),
          warn: log('warn'),
          error: log('error'),
          fatal: log('fatal')
        };
      },
      {'./utils': 9}
    ],
    7: [
      function (require, module, exports) {
        /*
	Copyright (c) 2013-2015, Fionn Kelleher All rights reserved.

	Redistribution and use in source and binary forms, with or without modification,
	are permitted provided that the following conditions are met:

		Redistributions of source code must retain the above copyright notice,
		this list of conditions and the following disclaimer.

		Redistributions in binary form must reproduce the above copyright notice,
		this list of conditions and the following disclaimer in the documentation and/or other materials
		provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
	IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
	INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
	ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
	OF SUCH DAMAGE.
*/
        const _ = require('./utils');

        const nonspaceRegex = /\S+/g;

        function parseComplexTag(tags, tagKey) {
          const splA =
            arguments.length > 2 && arguments[2] !== undefined
              ? arguments[2]
              : ',';
          const splB =
            arguments.length > 3 && arguments[3] !== undefined
              ? arguments[3]
              : '/';
          const splC = arguments.length > 4 ? arguments[4] : undefined;
          const raw = tags[tagKey];

          if (raw === undefined) {
            return tags;
          }

          const tagIsString = _.isString(raw);

          tags[tagKey + '-raw'] = tagIsString ? raw : null;

          if (raw === true) {
            tags[tagKey] = null;
            return tags;
          }

          tags[tagKey] = {};

          if (tagIsString) {
            const spl = raw.split(splA);

            for (const element of spl) {
              const parts = element.split(splB);
              let value = parts[1];

              if (splC !== undefined && value) {
                value = value.split(splC);
              }

              tags[tagKey][parts[0]] = value || null;
            }
          }

          return tags;
        }

        module.exports = {
          // Parse Twitch badges..
          badges: function badges(tags) {
            return parseComplexTag(tags, 'badges');
          },
          // Parse Twitch badge-info..
          badgeInfo: function badgeInfo(tags) {
            return parseComplexTag(tags, 'badge-info');
          },
          // Parse Twitch emotes..
          emotes: function emotes(tags) {
            return parseComplexTag(tags, 'emotes', '/', ':', ',');
          },
          // Parse regex emotes..
          emoteRegex: function emoteRegex(message, code, id, object) {
            nonspaceRegex.lastIndex = 0;
            const regex = new RegExp(
              '(\\b|^|s)' + _.unescapeHtml(code) + '(\\b|$|s)'
            );
            let match; // Check if emote code matches using RegExp and push it to the object..

            while ((match = nonspaceRegex.exec(message)) !== null) {
              if (regex.test(match[0])) {
                object[id] = object[id] || [];
                object[id].push([match.index, nonspaceRegex.lastIndex - 1]);
              }
            }
          },
          // Parse string emotes..
          emoteString: function emoteString(message, code, id, object) {
            nonspaceRegex.lastIndex = 0;
            let match; // Check if emote code matches and push it to the object..

            while ((match = nonspaceRegex.exec(message)) !== null) {
              if (match[0] === _.unescapeHtml(code)) {
                object[id] = object[id] || [];
                object[id].push([match.index, nonspaceRegex.lastIndex - 1]);
              }
            }
          },
          // Transform the emotes object to a string with the following format..
          // emote_id:first_index-last_index,another_first-another_last/another_emote_id:first_index-last_index
          transformEmotes: function transformEmotes(emotes) {
            let transformed = '';
            for (const id of Object.keys(emotes)) {
              transformed = ''.concat(transformed + id, ':');
              for (const index of emotes[id]) {
                transformed = ''.concat(transformed + index.join('-'), ',');
                continue;
              }

              transformed = ''.concat(transformed.slice(0, -1), '/');
            }

            return transformed.slice(0, -1);
          },
          formTags: function formTags(tags) {
            const result = [];

            for (const key in tags) {
              const value = _.escapeIRC(tags[key]);

              result.push(''.concat(key, '=').concat(value));
            }

            return '@'.concat(result.join(';'));
          },
          // Parse Twitch messages..
          msg: function message(data) {
            const message = {
              raw: data,
              tags: {},
              prefix: null,
              command: null,
              params: []
            }; // Position and nextspace are used by the parser as a reference..

            let position = 0;
            var nextspace = 0; // The first thing we check for is IRCv3.2 message tags.
            // http://ircv3.atheme.org/specification/message-tags-3.2

            if (data.charCodeAt(0) === 64) {
              var nextspace = data.indexOf(' '); // Malformed IRC message..

              if (nextspace === -1) {
                return null;
              } // Tags are split by a semi colon..

              const rawTags = data.slice(1, nextspace).split(';');

              for (const tag of rawTags) {
                // Tags delimited by an equals sign are key=value tags.
                // If there's no equals, we assign the tag a value of true.
                const pair = tag.split('=');
                message.tags[pair[0]] =
                  tag.slice(Math.max(0, tag.indexOf('=') + 1)) || true;
              }

              position = nextspace + 1;
            } // Skip any trailing whitespace..

            while (data.charCodeAt(position) === 32) {
              position++;
            } // Extract the message's prefix if present. Prefixes are prepended with a colon..

            if (data.charCodeAt(position) === 58) {
              nextspace = data.indexOf(' ', position); // If there's nothing after the prefix, deem this message to be malformed.

              if (nextspace === -1) {
                return null;
              }

              message.prefix = data.slice(position + 1, nextspace);
              position = nextspace + 1; // Skip any trailing whitespace..

              while (data.charCodeAt(position) === 32) {
                position++;
              }
            }

            nextspace = data.indexOf(' ', position); // If there's no more whitespace left, extract everything from the
            // current position to the end of the string as the command..

            if (nextspace === -1) {
              if (data.length > position) {
                message.command = data.slice(position);
                return message;
              }

              return null;
            } // Else, the command is the current position up to the next space. After
            // that, we expect some parameters.

            message.command = data.slice(position, nextspace);
            position = nextspace + 1; // Skip any trailing whitespace..

            while (data.charCodeAt(position) === 32) {
              position++;
            }

            while (position < data.length) {
              nextspace = data.indexOf(' ', position); // If the character is a colon, we've got a trailing parameter.
              // At this point, there are no extra params, so we push everything
              // from after the colon to the end of the string, to the params array
              // and break out of the loop.

              if (data.charCodeAt(position) === 58) {
                message.params.push(data.slice(position + 1));
                break;
              } // If we still have some whitespace...

              if (nextspace !== -1) {
                // Push whatever's between the current position and the next
                // space to the params array.
                message.params.push(data.slice(position, nextspace));
                position = nextspace + 1; // Skip any trailing whitespace and continue looping.

                while (data.charCodeAt(position) === 32) {
                  position++;
                }

                continue;
              } // If we don't have any more whitespace and the param isn't trailing,
              // push everything remaining to the params array.

              if (nextspace === -1) {
                message.params.push(data.slice(position));
                break;
              }
            }

            return message;
          }
        };
      },
      {'./utils': 9}
    ],
    8: [
      function (require, module, exports) {
        // Initialize the queue with a specific delay..
        function queue(defaultDelay) {
          this.queue = [];
          this.index = 0;
          this.defaultDelay = defaultDelay || 3000;
        } // Add a new function to the queue..

        queue.prototype.add = function add(fn, delay) {
          this.queue.push({
            fn,
            delay
          });
        }; // Run the current queue..

        queue.prototype.run = function run(index) {
          (index || index === 0) && (this.index = index);
          this.next();
        }; // Go to the next in queue..

        queue.prototype.next = function next() {
          const _this = this;

          const i = this.index++;
          const at = this.queue[i];
          const next = this.queue[this.index];

          if (!at) {
            return;
          }

          at.fn();
          next &&
            setTimeout(() => {
              _this.next();
            }, next.delay || this.defaultDelay);
        }; // Reset the queue..

        queue.prototype.reset = function reset() {
          this.index = 0;
        }; // Clear the queue..

        queue.prototype.clear = function clear() {
          this.index = 0;
          this.queue = [];
        };

        exports.queue = queue;
      },
      {}
    ],
    9: [
      function (require, module, exports) {
        (function (process) {
          (function () {
            function _toConsumableArray(array) {
              return (
                _arrayWithoutHoles(array) ||
                _iterableToArray(array) ||
                _unsupportedIterableToArray(array) ||
                _nonIterableSpread()
              );
            }

            function _nonIterableSpread() {
              throw new TypeError(
                'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
              );
            }

            function _unsupportedIterableToArray(o, minLength) {
              if (!o) {
                return;
              }

              if (typeof o === 'string') {
                return _arrayLikeToArray(o, minLength);
              }

              let n = Object.prototype.toString.call(o).slice(8, -1);
              if (n === 'Object' && o.constructor) {
                n = o.constructor.name;
              }

              if (n === 'Map' || n === 'Set') {
                return Array.from(o);
              }

              if (
                n === 'Arguments' ||
                /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
              ) {
                return _arrayLikeToArray(o, minLength);
              }
            }

            function _iterableToArray(iter) {
              if (
                typeof Symbol !== 'undefined' &&
                Symbol.iterator in new Object(iter)
              ) {
                return Array.from(iter);
              }
            }

            function _arrayWithoutHoles(array) {
              if (Array.isArray(array)) {
                return _arrayLikeToArray(array);
              }
            }

            function _arrayLikeToArray(array, length) {
              if (length == null || length > array.length) {
                length = array.length;
              }

              for (var i = 0, array2 = new Array(length); i < length; i++) {
                array2[i] = array[i];
              }

              return array2;
            }

            function _typeof(object) {
              '@babel/helpers - typeof';
              _typeof =
                typeof Symbol === 'function' &&
                typeof Symbol.iterator === 'symbol'
                  ? function _typeof(object_) {
                      return typeof object_;
                    }
                  : function _typeof(object_) {
                      return object_ &&
                        typeof Symbol === 'function' &&
                        object_.constructor === Symbol &&
                        object_ !== Symbol.prototype
                        ? 'symbol'
                        : typeof object_;
                    };

              return _typeof(object);
            }

            const actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
            const justinFanRegex = /^(justinfan)(\d+$)/;
            const unescapeIRCRegex = /\\([sn:r\\])/g;
            const escapeIRCRegex = /([ \n;\r\\])/g;
            const ircEscapedChars = {
              s: ' ',
              n: '',
              ':': ';',
              r: ''
            };
            const ircUnescapedChars = {
              ' ': 's',
              '\n': 'n',
              ';': ':',
              '\r': 'r'
            };
            var self = (module.exports = {
              // Return the second value if the first value is undefined..
              get: function get(object1, object2) {
                return typeof object1 === 'undefined' ? object2 : object1;
              },
              // Value is a boolean..
              isBoolean: function isBoolean(object) {
                return typeof object === 'boolean';
              },
              // Value is a finite number..
              isFinite: (function (_isFinite) {
                function isFinite(_x) {
                  return Reflect.apply(_isFinite, this, arguments);
                }

                isFinite.toString = function () {
                  return _isFinite.toString();
                };

                return isFinite;
              })((_int) => {
                return isFinite(_int) && !isNaN(Number.parseFloat(_int));
              }),
              // Value is an integer..
              isInteger: function isInteger(_int2) {
                return !isNaN(self.toNumber(_int2, 0));
              },
              // Username is a justinfan username..
              isJustinfan: function isJustinfan(username) {
                return justinFanRegex.test(username);
              },
              // Value is null..
              isNull: function isNull(object) {
                return object === null;
              },
              // Value is a regex..
              isRegex: function isRegex(string) {
                return /[|\\^$*+?:#]/.test(string);
              },
              // Value is a string..
              isString: function isString(string) {
                return typeof string === 'string';
              },
              // Value is a valid url..
              isURL: function isURL(string) {
                return new RegExp(
                  '^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$',
                  'i'
                ).test(string);
              },
              // Return a random justinfan username..
              justinfan: function justinfan() {
                return 'justinfan'.concat(
                  Math.floor(Math.random() * 80_000 + 1000)
                );
              },
              // Return a valid token..
              token: function token(string) {
                return string ? string.toLowerCase().replace('oauth:', '') : '';
              },
              // Return a valid password..
              password: function password(string) {
                const token = self.token(string);
                return token ? 'oauth:'.concat(token) : '';
              },
              // Race a promise against a delay..
              promiseDelay: function promiseDelay(time) {
                return new Promise((resolve) => {
                  return setTimeout(resolve, time);
                });
              },
              // Replace all occurences of a string using an object..
              replaceAll: function replaceAll(string, object) {
                if (string === null || typeof string === 'undefined') {
                  return null;
                }

                for (const x in object) {
                  string = string.replace(new RegExp(x, 'g'), object[x]);
                }

                return string;
              },
              unescapeHtml: function unescapeHtml(safe) {
                return safe
                  .replace(/\\&amp\\;/g, '&')
                  .replace(/\\&lt\\;/g, '<')
                  .replace(/\\&gt\\;/g, '>')
                  .replace(/\\&quot\\;/g, '"')
                  .replace(/\\&#039\\;/g, "'");
              },
              // Escaping values:
              // http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
              unescapeIRC: function unescapeIRC(message) {
                return !message || !message.includes('\\')
                  ? message
                  : message.replace(unescapeIRCRegex, (m, p) => {
                      return p in ircEscapedChars ? ircEscapedChars[p] : p;
                    });
              },
              escapeIRC: function escapeIRC(message) {
                return !message
                  ? message
                  : message.replace(escapeIRCRegex, (m, p) => {
                      return p in ircUnescapedChars
                        ? '\\'.concat(ircUnescapedChars[p])
                        : p;
                    });
              },
              actionMessage: function actionMessage(message) {
                return message.match(actionMessageRegex);
              },
              // Add word to a string..
              addWord: function addWord(line, word) {
                return line.length > 0 ? line + ' ' + word : line + word;
              },
              // Return a valid channel name..
              channel: function channel(string) {
                const channel = (string ? string : '').toLowerCase();
                return channel[0] === '#' ? channel : '#' + channel;
              },
              // Extract a number from a string..
              extractNumber: function extractNumber(string) {
                const parts = string.split(' ');

                for (const part of parts) {
                  if (self.isInteger(part)) {
                    return Math.trunc(part);
                  }
                }

                return 0;
              },
              // Format the date..
              formatDate: function formatDate(date) {
                let hours = date.getHours();
                let mins = date.getMinutes();
                hours = (hours < 10 ? '0' : '') + hours;
                mins = (mins < 10 ? '0' : '') + mins;
                return ''.concat(hours, ':').concat(mins);
              },
              // Inherit the prototype methods from one constructor into another..
              inherits: function inherits(ctor, superCtor) {
                ctor.super_ = superCtor;

                const TemporaryCtor = function TemporaryCtor_() {};

                TemporaryCtor.prototype = superCtor.prototype;
                ctor.prototype = new TemporaryCtor();
                ctor.prototype.constructor = ctor;
              },
              // Return whether inside a Node application or not..
              isNode: function isNode() {
                try {
                  return (
                    (typeof process === 'undefined'
                      ? 'undefined'
                      : _typeof(process)) === 'object' &&
                    Object.prototype.toString.call(process) ===
                      '[object process]'
                  );
                } catch {}

                return false;
              },
              // Merge two objects..
              merge: Object.assign,
              // Split a line but try not to cut a word in half..
              splitLine: function splitLine(input, length) {
                let lastSpace = input
                  .slice(0, Math.max(0, length))
                  .lastIndexOf(' '); // No spaces found, split at the very end to avoid a loop..

                if (lastSpace === -1) {
                  lastSpace = length - 1;
                }

                return [
                  input.slice(0, Math.max(0, lastSpace)),
                  input.slice(Math.max(0, lastSpace + 1))
                ];
              },
              // Parse string to number. Returns NaN if string can't be parsed to number..
              toNumber: function toNumber(number, precision) {
                if (number === null) {
                  return 0;
                }

                const factor = 10 ** (self.isFinite(precision) ? precision : 0);
                return Math.round(number * factor) / factor;
              },
              // Merge two arrays..
              union: function union(a, b) {
                return _toConsumableArray(
                  new Set(
                    [].concat(_toConsumableArray(a), _toConsumableArray(b))
                  )
                );
              },
              // Return a valid username..
              username: function username(string) {
                const username = (string ? string : '').toLowerCase();
                return username[0] === '#' ? username.slice(1) : username;
              }
            });
          }.call(this));
        }.call(this, require('_process')));
      },
      {_process: 11}
    ],
    10: [function (require, module, exports) {}, {}],
    11: [
      function (require, module, exports) {
        // Shim for using process in browser
        const process = (module.exports = {});

        // Cached from whatever global is present so that test runners that stub it
        // don't break things.  But we need to wrap it in a try catch in case it is
        // wrapped in strict mode code which doesn't define any globals.  It's inside a
        // function because try/catches deoptimize in certain engines.

        let cachedSetTimeout;
        let cachedClearTimeout;

        function defaultSetTimout() {
          throw new Error('setTimeout has not been defined');
        }

        function defaultClearTimeout() {
          throw new Error('clearTimeout has not been defined');
        }

        (function () {
          try {
            cachedSetTimeout =
              typeof setTimeout === 'function' ? setTimeout : defaultSetTimout;
          } catch {
            cachedSetTimeout = defaultSetTimout;
          }

          try {
            cachedClearTimeout =
              typeof clearTimeout === 'function'
                ? clearTimeout
                : defaultClearTimeout;
          } catch {
            cachedClearTimeout = defaultClearTimeout;
          }
        })();

        function runTimeout(fun) {
          if (cachedSetTimeout === setTimeout) {
            // Normal enviroments in sane situations
            return setTimeout(fun, 0);
          }

          // If setTimeout wasn't available but was latter defined
          if (
            (cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) &&
            setTimeout
          ) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
          }

          try {
            // When when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
          } catch {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
            } catch {
              // Same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
            }
          }
        }

        function runClearTimeout(marker) {
          if (cachedClearTimeout === clearTimeout) {
            // Normal enviroments in sane situations
            return clearTimeout(marker);
          }

          // If clearTimeout wasn't available but was latter defined
          if (
            (cachedClearTimeout === defaultClearTimeout ||
              !cachedClearTimeout) &&
            clearTimeout
          ) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
          }

          try {
            // When when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
          } catch {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
            } catch {
              // Same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
            }
          }
        }

        let queue = [];
        let draining = false;
        let currentQueue;
        let queueIndex = -1;

        function cleanUpNextTick() {
          if (!draining || !currentQueue) {
            return;
          }

          draining = false;
          if (currentQueue.length > 0) {
            queue = currentQueue.concat(queue);
          } else {
            queueIndex = -1;
          }

          if (queue.length > 0) {
            drainQueue();
          }
        }

        function drainQueue() {
          if (draining) {
            return;
          }

          const timeout = runTimeout(cleanUpNextTick);
          draining = true;

          let length = queue.length;
          while (length) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < length) {
              if (currentQueue) {
                currentQueue[queueIndex].run();
              }
            }

            queueIndex = -1;
            length = queue.length;
          }

          currentQueue = null;
          draining = false;
          runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
          const args = new Array(arguments.length - 1);
          if (arguments.length > 1) {
            for (let i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
            }
          }

          queue.push(new Item(fun, args));
          if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
          }
        };

        // V8 likes predictible objects
        function Item(fun, array) {
          this.fun = fun;
          this.array = array;
        }

        Item.prototype.run = function () {
          this.fun.apply(null, this.array);
        };

        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // Empty string to avoid regexp issues
        process.versions = {};

        function noop() {}

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) {
          return [];
        };

        process.binding = function (name) {
          throw new Error('process.binding is not supported');
        };

        process.cwd = function () {
          return '/';
        };

        process.chdir = function (dir) {
          throw new Error('process.chdir is not supported');
        };

        process.umask = function () {
          return 0;
        };
      },
      {}
    ]
  },
  {},
  [1]
);
