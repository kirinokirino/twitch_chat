import init, { search_kanji } from "./kanji_collector.js";

let dict;
async function run() {
    await init();
    dict = await fetch("http://0.0.0.0:8080/jmdictObject.json")
        .then((response) => {
            return response.json();
        })
        .then(async (jsonData) => {
            return await jsonData;
        });
    console.log(Object.keys(dict).includes("天衣無縫"));
    console.log(Object.keys(dict).includes("天"));
    console.log(Object.keys(dict).includes("衣"));
    console.log(Object.keys(dict).includes("無"));
    console.log(Object.keys(dict).includes("縫"));
    console.log(
        make_furigana(
            "この建物は現代的に見える。君が知ってる人の中で誰が一番賢い？"
        )
    );
}
run();

const client = new tmi.Client({
    connection: { reconnect: true },
    channels: ["kirinokirino"],
});

client.connect();

client.on("message", (channel, tags, message, self) => {
    add_chat_message(
        tags["display-name"],
        checkBlackList(message),
        tags.emotes
    );
});

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
    } else {
        add_furigana(p, message, make_furigana(message));
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

function parseEmotes(message, parent, emotes) {
    if (!emotes) return;
    let emote = [];
    Object.entries(emotes).forEach(([id, positions]) => {
        // use only the first position to find out the emote key word
        const position = positions[0];
        const [start, end] = position.split("-");
        const stringToReplace = message.substring(
            parseInt(start, 10),
            parseInt(end, 10) + 1
        );
        const img = document.createElement("img");
        img.classList.add("aBitSmaller");
        img.src = `https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0`;
        for (const position of positions) {
            let pos = {};
            const [start, end] = position.split("-");
            pos.idx = parseInt(start);
            pos.len = parseInt(end - start + 1);
            emote.push({
                img: img,
                name: stringToReplace,
                position: pos,
            });
        }
    });

    emote.sort((a, b) => a.position.idx - b.position.idx);
    let textParts = chunks(message, emote);
    textParts.forEach((part, index) => {
        if (index % 2 === 0) {
            let s = document.createElement("span");
            s.textContent = part;
            parent.appendChild(s);
        } else {
            parent.appendChild(emote.shift().img.cloneNode());
        }
    });
}

let chunks = (txt, emotes) => {
    let tmpEmotes = [];
    emotes.forEach((e) => {
        tmpEmotes.push({ name: e.name, pos: e.position });
    });

    let parts = [];
    let idx = 0;
    tmpEmotes.sort((a, b) => a.pos.idx - b.pos.idx);
    tmpEmotes.forEach((e) => {
        parts.push(txt.substr(idx, e.pos.idx - idx));
        parts.push(txt.substr(e.pos.idx, e.pos.len));
        idx = e.pos.idx + e.pos.len;
    });
    parts.push(txt.substr(idx, txt.length - idx));
    return parts;
};

function add_furigana(parent, message, swap_pairs) {
    console.log(swap_pairs);
    if (swap_pairs === undefined) {
        parent.textContent = message;
    } else {
        let copy = message;
        let ending = "";
        for (const pair of swap_pairs) {
            if (pair[1] !== "X") {
                if (pair[1].alt === undefined) {
                    const index = copy.indexOf(pair[0]);
                    const len = pair[0].length;

                    let text = document.createElement("span");
                    text.textContent = copy.substring(0, index);
                    parent.appendChild(text);
                    copy = copy.substring(index + len);

                    let ruby = document.createElement("ruby");
                    let base_text = document.createElement("rb");
                    base_text.textContent = pair[0];
                    let furigana = document.createElement("rt");
                    furigana.textContent = pair[1].readings[0];
                    ruby.appendChild(base_text);
                    ruby.appendChild(furigana);
                    parent.appendChild(ruby);
                } else {
                    // multiple readings.
                    continue;
                }
            } else {
                // no readings found.
                continue;
            }
        }
        let text = document.createElement("span");
        text.textContent = copy;
        parent.appendChild(text);
    }
}

function zip(arrays) {
    return arrays[0].map(function (_, i) {
        return arrays.map(function (array) {
            return array[i];
        });
    });
}

function make_furigana(message) {
    let kanjis = search_kanji(message).kanjis;
    if (kanjis.length < 1) return;
    let t = [];
    for (let i = 0; i < kanjis.length; i++) {
        let found = "X";
        if (dict[kanjis[i]] !== undefined) {
            found = dict[kanjis[i]];
            console.log(kanjis[i]);
        } else {
            let len = kanjis[i].length;
            let index = message.indexOf(kanjis[i]);
            let res = message.substr(index, len + 1);
            if (dict[res] !== undefined) {
                found = dict[res];
                kanjis[i] = res;
            } else {
                res = message.substr(index - 1, len + 1);
                if (dict[res] !== undefined) {
                    found = dict[res];
                    kanjis[i] = res;
                } else {
                    res = message.substr(index - 1, len);
                    if (dict[res] !== undefined) {
                        found = dict[res];
                        kanjis[i] = res;
                    } else {
                        res = message.substr(index, len + 2);
                        if (dict[res] !== undefined) {
                            found = dict[res];
                            kanjis[i] = res;
                        }
                    }
                }
            }
        }
        t.push(found);
    }
    return zip([kanjis, t]);
}

function fade_in(el) {
    el.classList.add("show");
    el.classList.remove("hide");
}

function fade_out(el) {
    el.classList.add("hide");
    el.classList.remove("show");
}
