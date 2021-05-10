export function zip(arrays) {
  return arrays[0].map((_, i) => {
    return arrays.map((array) => {
      return array[i];
    });
  });
}

export function fadeIn(element) {
  element.classList.add('show');
  element.classList.remove('hide');
}

export function fadeOut(element) {
  element.classList.add('hide');
  element.classList.remove('show');
}

export function chunks(txt, emotes) {
  const temporaryEmotes = [];
  for (const emote of emotes) {
    temporaryEmotes.push({name: emote.name, pos: emote.position});
  }

  const parts = [];
  let idx = 0;
  temporaryEmotes.sort((a, b) => a.pos.idx - b.pos.idx);
  for (const emote of temporaryEmotes) {
    parts.push(
      txt.substr(idx, emote.pos.idx - idx),
      txt.substr(emote.pos.idx, emote.pos.len)
    );
    idx = emote.pos.idx + emote.pos.len;
  }

  parts.push(txt.substr(idx, txt.length - idx));
  return parts;
}

export function separateFromSorted(text, list) {
  const parts = [];
  let last = 0;
  for (const item of list) {
    const index = text.indexOf(item, last);
    const length = item.length;
    parts.push(text.slice(last, index), text.slice(index, index + length));
    last = index + length;
  }

  parts.push(text.slice(Math.max(0, last)));
  return parts;
}

export function chunk(array, count) {
  if (count === null || count < 1) {
    return [];
  }

  const result = [];
  let index = 0;
  const length = array.length;
  while (index < length) {
    result.push(Array.prototype.slice.call(array, index, (index += count)));
  }

  return result;
}
