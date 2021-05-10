import {fadeIn, fadeOut} from './utils.js';
import {parseEmotes} from './emotes.js';
import './tmi.js'; // eslint-disable-line import/no-unassigned-import

export class ChatClient {
  constructor(channels, furigana) {
    this.furigana = furigana;
    this.coin = document.createElement('img');
    this.coin.setAttribute('src', 'coin.png');
    this.blacklist = ['wanna become famous'];
    this.chatters = [''];
    this.client = window.tmi.client({
      connection: {reconnect: true},
      channels
    });
    this.client.connect();
    this.client.on('message', (_channel, tags, message) => {
      this.appendToChat(
        tags['display-name'],
        this.checkBlackList(message),
        tags.emotes
      );
    });
  }

  checkBlackList(message) {
    for (const blacklistedItem of this.blacklist) {
      if (message.toLowerCase().includes(blacklistedItem)) {
        return 'have a great day! :)';
      }
    }

    return message;
  }

  appendToChat(nick, message, emotes) {
    const li = document.createElement('li');
    let headerText = '';
    if (!this.chatters.includes(nick)) {
      this.chatters.push(nick);
      headerText += this.coin.outerHTML;
    }

    headerText += nick + ':';
    const headerElement = document.createElement('h4');
    headerElement.innerHTML = headerText;
    const p = document.createElement('p');

    if (emotes) {
      p.append(this.furigana.addToNodes(parseEmotes(message, emotes)));
      // Add_furigana(p, , make_furigana(p.textContent));
    } else {
      p.append(this.furigana.addToText(message));
    }

    li.append(headerElement);
    li.append(p);
    setTimeout(() => {
      fadeIn(li);
    }, 50);
    setTimeout(() => {
      fadeOut(li);
    }, 15 * 1000);
    document.querySelector('ul').append(li);
    document.querySelector('ul').scrollIntoView({block: 'end'});
  }
}
