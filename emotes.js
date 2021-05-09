export function parseEmotes(message, parent, emotes) {
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
