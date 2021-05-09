import wasm_init, { search_kanji } from "./kanji_collector.js";
import { zip } from "./utils.js";

export class Furigana {
    constructor() {}
    async init() {
        await wasm_init();
        this.dictionary = await fetch("http://0.0.0.0:8080/jmdictObject.json")
            .then((response) => {
                return response.json();
            })
            .then(async (jsonData) => {
                return await jsonData;
            });
        this.search_kanji = search_kanji;
    }
    add(parent, message, swap_pairs) {
        console.log(swap_pairs);
        if (swap_pairs === undefined) {
            parent.textContent = message;
        } else {
            for (const child of parent.childNodes) {
                parent.removeChild(child);
            }
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

    make(message) {
        let kanjis = this.search_kanji(message).kanjis;
        if (kanjis.length < 1) return;
        let t = [];
        for (let i = 0; i < kanjis.length; i++) {
            let found = "X";
            if (this.dictionary[kanjis[i]] !== undefined) {
                found = this.dictionary[kanjis[i]];
                console.log(kanjis[i]);
            } else {
                let len = kanjis[i].length;
                let index = message.indexOf(kanjis[i]);
                let res = message.substr(index, len + 1);
                if (this.dictionary[res] !== undefined) {
                    found = this.dictionary[res];
                    kanjis[i] = res;
                } else {
                    res = message.substr(index - 1, len + 1);
                    if (this.dictionary[res] !== undefined) {
                        found = this.dictionary[res];
                        kanjis[i] = res;
                    } else {
                        res = message.substr(index - 1, len);
                        if (this.dictionary[res] !== undefined) {
                            found = this.dictionary[res];
                            kanjis[i] = res;
                        } else {
                            res = message.substr(index, len + 2);
                            if (this.dictionary[res] !== undefined) {
                                found = this.dictionary[res];
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
}
