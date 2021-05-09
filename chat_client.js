import { fade_in, fade_out } from "./utils.js";
import { parseEmotes } from "./emotes.js";
import * as _ from "./tmi.js";

export class ChatClient {
    constructor(channels, furigana) {
        this.furigana = furigana;
        this.coin = document.createElement("img");
        this.coin.setAttribute("src", "coin.png");
        this.message_blacklist = ["wanna become famous"];
        this.first_message_chatters = [""];
        this.client = window.tmi.Client({
            connection: { reconnect: true },
            channels: channels,
        });
        this.client.connect();
        this.client.on("message", (channel, tags, message, self) => {
            this.add_chat_message(
                tags["display-name"],
                this.checkBlackList(message),
                tags.emotes
            );
        });
    }

    checkBlackList(message) {
        for (const blacklisted_part of this.message_blacklist) {
            if (message.toLowerCase().includes(blacklisted_part)) {
                return "have a great day! :)";
            }
        }
        return message;
    }

    add_chat_message(nick, message, emotes) {
        let li = document.createElement("li");
        let header = document.createElement("h4");
        let header_contents = "";
        if (!this.first_message_chatters.includes(nick)) {
            this.first_message_chatters.push(nick);
            header_contents += this.coin.outerHTML;
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
            p.append(this.furigana.addToNodes(parseEmotes(message, emotes)));
            //add_furigana(p, , make_furigana(p.textContent));
        } else {
            p.append(this.furigana.addToText(message));
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
}
