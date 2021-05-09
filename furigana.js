import wasm_init, { search_kanji } from "./kanji_collector.js";
import { zip, separateFromSorted, chunk } from "./utils.js";

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
    addToNodes(nodes) {
        let result = new DocumentFragment();
        for (const node of nodes) {
            const text = node.textContent;
            const swap_pairs = this.make(text);
            if (swap_pairs === undefined) {
                result.append(node.cloneNode(true));
            } else {
                const split_list = separateFromSorted(
                    text,
                    swap_pairs.map((item) => {
                        return item[0];
                    })
                );
                for (const [to_keep, to_change] of chunk(split_list, 2)) {
                    const first = document.createElement("span");
                    first.textContent = to_keep;
                    result.appendChild(first);

                    const ruby = document.createElement("ruby");
                    const base_text = document.createElement("rb");
                    base_text.textContent = to_change;
                    const furigana = document.createElement("rt");
                    const p = swap_pairs.find(
                        (element) => element[0] === to_change
                    );
                    if (p !== undefined && p[1].readings !== undefined) {
                        furigana.textContent = p[1].readings[0];
                    } else {
                        furigana.textContent = "";
                    }
                    ruby.appendChild(base_text);
                    ruby.appendChild(furigana);
                    result.appendChild(ruby);
                }
            }
        }

        return result;
    }
    addToText(message) {
        let swap_pairs = this.make(message);
        let result = new DocumentFragment();
        if (swap_pairs === undefined) {
            result.textContent = message;
        } else {
            console.log(swap_pairs);
            let copy = message;
            for (const pair of swap_pairs) {
                if (pair[1] !== "X") {
                    if (pair[1].alt === undefined) {
                        const index = copy.indexOf(pair[0]);
                        const len = pair[0].length;

                        let text = document.createElement("span");
                        text.textContent = copy.substring(0, index);
                        result.appendChild(text);
                        copy = copy.substring(index + len);

                        let ruby = document.createElement("ruby");
                        let base_text = document.createElement("rb");
                        base_text.textContent = pair[0];
                        let furigana = document.createElement("rt");
                        furigana.textContent = pair[1].readings[0];
                        ruby.appendChild(base_text);
                        ruby.appendChild(furigana);
                        result.appendChild(ruby);
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
            result.appendChild(text);
        }
        return result;
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
