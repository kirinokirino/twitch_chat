'use strict'
import wasmInit, { search_kanji as separateKanji } from './kanji_collector.js'
import { zip, separateFromSorted, chunk, queryList } from './utils.js'

export class Furigana {
  async init () {
    await wasmInit()
    this.dictionary = await fetch('http://0.0.0.0:8080/jmdictObject.json')
      .then((response) => {
        return response.json()
      })
      .then(async (jsonData) => {
        return jsonData
      })
    this.separateKanji = separateKanji
  }

  addToNodes (nodes) {
    const result = new DocumentFragment()
    for (const node of nodes) {
      const text = node.textContent
      const swapPairs = this.make(text)
      if (swapPairs === undefined) {
        result.append(node.cloneNode(true))
      } else {
        const separated = separateFromSorted(
          text,
          swapPairs.map((item) => {
            return item[0]
          })
        )
        for (const [keep, swap] of chunk(separated, 2)) {
          const first = document.createElement('span')
          first.textContent = keep
          result.append(first)

          const ruby = document.createElement('ruby')
          const base = document.createElement('rb')
          base.textContent = swap
          const furigana = document.createElement('rt')
          const p = swapPairs.find((element) => element[0] === swap)
          if (p !== undefined && p[1] && p[1].readings !== undefined) {
            furigana.textContent = p[1].readings[0]
          } else {
            furigana.textContent = ''
          }

          ruby.append(base)
          ruby.append(furigana)
          result.append(ruby)
        }
      }
    }

    return result
  }

  addToText (message) {
    const swapPairs = this.make(message)
    const result = new DocumentFragment()
    if (swapPairs === undefined) {
      result.textContent = message
    } else {
      let copy = message
      for (const pair of swapPairs) {
        if (pair[1] !== 'X') {
          if (pair[1].alt === undefined) {
            const index = copy.indexOf(pair[0])
            const length = pair[0].length

            const text = document.createElement('span')
            text.textContent = copy.slice(0, Math.max(0, index))
            result.append(text)
            copy = copy.slice(Math.max(0, index + length))

            const ruby = document.createElement('ruby')
            const base = document.createElement('rb')
            base.textContent = pair[0]
            const furigana = document.createElement('rt')
            furigana.textContent = pair[1].readings[0]
            ruby.append(base)
            ruby.append(furigana)
            result.append(ruby)
          } else {
            // Multiple readings.
            continue
          }
        }
      }

      const text = document.createElement('span')
      text.textContent = copy
      result.append(text)
    }

    return result
  }

  make (message) {
    const kanjis = this.separateKanji(message).kanjis
    if (kanjis.length === 0) {
      return
    }

    const dictionaryResults = []
    for (let i = 0; i < kanjis.length; i++) {
      const index = message.indexOf(kanjis[i])
      const endIndex = kanjis[i].length + index
      dictionaryResults.push(this.lookUp(message.slice(index, endIndex + 4), endIndex-index))
    }

    return zip([kanjis, dictionaryResults])
  }

  lookUp (text, baseLength) {
    let found = 'X'
    const queries = queryList(text, baseLength)
    console.log(text, "   ", baseLength);
    for (const query of queries) {
      const check = this.dictionary[query]
      if (check) {
        found = check
        break
      }
    }

    return found
  }
}
