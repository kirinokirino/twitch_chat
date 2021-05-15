'use strict'
import { chunks } from './utils.js'

export function parseEmotes (message, emotes) {
  if (!emotes) {
    return
  }

  const emote = []
  for (const [id, positions] of Object.entries(emotes)) {
    // Use only the first position to find out the emote key word
    const position = positions[0]
    const [start, end] = position.split('-')
    const stringToReplace = message.slice(
      Number.parseInt(start, 10),
      Number.parseInt(end, 10) + 1
    )
    const img = document.createElement('img')
    img.classList.add('aBitSmaller')
    img.src = `https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0`
    for (const position of positions) {
      const pos = {}
      const [start, end] = position.split('-')
      pos.idx = Number.parseInt(start, 10)
      pos.len = Number.parseInt(end - start + 1, 10)
      emote.push({
        img,
        name: stringToReplace,
        position: pos
      })
    }
  }

  emote.sort((a, b) => a.position.idx - b.position.idx)
  const textParts = chunks(message, emote)
  const result = new DocumentFragment()
  for (const [index, part] of textParts.entries()) {
    if (index % 2 === 0) {
      const s = document.createElement('span')
      s.textContent = part
      result.append(s)
    } else {
      result.append(emote.shift().img.cloneNode())
    }
  }

  return result.children
}
