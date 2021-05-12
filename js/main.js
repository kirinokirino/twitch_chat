'use strict'
import { Furigana } from './furigana.js'
import { ChatClient } from './chat-client.js';

// Do not touch! PunOko
(async () => {
  const furigana = new Furigana()
  await furigana.init()
  console.log(
    furigana.make(
      'この建物は現代的に見える。君が知ってる人の中で誰が一番賢い？新潟'
    )
  )
  new ChatClient(['kirinokirino'], furigana) // eslint-disable-line no-new
})()
