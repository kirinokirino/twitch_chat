import { fade_in, fade_out } from "./utils.js";
import { parseEmotes } from "./emotes.js";
import * as _ from "./tmi.js";

export class ChatClient {
    constructor(channels) {
        this.client = window.tmi.Client({
            connection: { reconnect: true },
            channels: channels,
        });
        this.client.connect();
        this.client.on("message", (channel, tags, message, self) => {
            add_chat_message(
                tags["display-name"],
                checkBlackList(message),
                tags.emotes
            );
        });
    }
}

const message_blacklist = ["wanna become famous"];
function checkBlackList(message) {
    for (const blacklisted_part of message_blacklist) {
        if (message.toLowerCase().includes(blacklisted_part)) {
            return "have a great day! :)";
        }
    }
    return message;
}

const coin = document.createElement("img");
coin.setAttribute("src", "coin.png");
let first_message_chatters = [""];

function add_chat_message(nick, message, emotes) {
    let li = document.createElement("li");
    let header = document.createElement("h4");
    let header_contents = "";
    if (!first_message_chatters.includes(nick)) {
        first_message_chatters.push(nick);
        header_contents += coin.outerHTML;
    }
    /* timestamp //
    const [hour, minute, second] = new Date()
        .toLocaleTimeString("en-GB")
        .split(/:| /);
    header_contents += "" + hour + ":" + minute;
    */
    header_contents += nick + ":";
    header.innerHTML = header_contents;
    let p = document.createElement("p");

    if (emotes) {
        parseEmotes(message, p, emotes);
        //add_furigana(p, , make_furigana(p.textContent));
    } else {
        //add_furigana(p, message, make_furigana(message));
        p.textContent = message;
    }
    li.appendChild(header);
    li.appendChild(p);
    setTimeout(function () {
        fade_in(li);
    }, 50);
    setTimeout(function () {
        fade_out(li);
    }, 15000);
    document.querySelector("ul").appendChild(li);
    document.querySelector("ul").scrollIntoView({ block: "end" });
}
