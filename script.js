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
        p.textContent = message;
    }
    li.appendChild(header);
    li.appendChild(p);
    setTimeout(function () {
        fade_in(li);
    }, 50);
    setTimeout(function () {
        fade_out(li);
    }, 10000);
    document.querySelector("ul").appendChild(li);
    document.querySelector("ul").scrollIntoView({ block: "end" });
}

function parseEmotes(message, parent, emotes) {
    if (!emotes) return;
    let emotesArray = [];
    let instances = [];
    let replacementsArray = [];
    Object.entries(emotes).forEach(([id, positions]) => {
        // use only the first position to find out the emote key word
        const position = positions[0];
        const [start, end] = position.split("-");
        const stringToReplace = message.substring(
            parseInt(start, 10),
            parseInt(end, 10) + 1
        );
        instances.push(positions.length);
        replacementsArray.push(stringToReplace);
        emotesArray.push(id);
    });

    let images = [];
    emotesArray.forEach((emote, index) => {
        const img = document.createElement("img");
        img.classList.add("aBitSmaller");
        img.src = `https://static-cdn.jtvnw.net/emoticons/v1/${emote}/2.0`;
        for (let i = 0; i < instances[index]; i++) {
            images.push(img.cloneNode());
            console.log(images);
            message = message.replace(replacementsArray[index], "🚓");
        }
    });

    textParts = message.split("🚓");
    images.forEach((img, index) => {
        let s = document.createElement("span");
        s.textContent = textParts[index];
        parent.appendChild(s);
        parent.appendChild(img);
    });
    let s = document.createElement("span");
    s.textContent = textParts[textParts.length - 1];
    parent.appendChild(s);
}

function fade_in(el) {
    el.classList.add("show");
    el.classList.remove("hide");
}

function fade_out(el) {
    el.classList.add("hide");
    el.classList.remove("show");
}
