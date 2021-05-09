import { chunks } from "./utils.js";

export function parseEmotes(message, emotes) {
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
    let result = new DocumentFragment();
    textParts.forEach((part, index) => {
        if (index % 2 === 0) {
            let s = document.createElement("span");
            s.textContent = part;
            result.appendChild(s);
        } else {
            result.appendChild(emote.shift().img.cloneNode());
        }
    });
    return result;
}
