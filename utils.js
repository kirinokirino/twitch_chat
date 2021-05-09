export function zip(arrays) {
    return arrays[0].map(function (_, i) {
        return arrays.map(function (array) {
            return array[i];
        });
    });
}

export function fade_in(el) {
    el.classList.add("show");
    el.classList.remove("hide");
}

export function fade_out(el) {
    el.classList.add("hide");
    el.classList.remove("show");
}

export function chunks(txt, emotes) {
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
}

export function separateFromSorted(txt, list) {
    let parts = [];
    let last = 0;
    for (const item of list) {
        const index = txt.indexOf(item, last);
        const len = item.length;
        parts.push(txt.substring(last, index));
        parts.push(txt.substring(index, index + len));
        last = index + len;
    }
    parts.push(txt.substring(last));
    return parts;
}

export function chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0,
        length = array.length;
    while (i < length) {
        result.push(Array.prototype.slice.call(array, i, (i += count)));
    }
    return result;
}
