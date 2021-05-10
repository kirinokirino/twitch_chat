import * as wasm from './kanji_collector_bg.wasm';

const lTextDecoder =
  typeof TextDecoder === 'undefined'
    ? (0, module.require)('util').TextDecoder
    : TextDecoder;

const cachedTextDecoder = new lTextDecoder('utf-8', {
  ignoreBOM: true,
  fatal: true
});

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }

  return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, length) {
  return cachedTextDecoder.decode(
    getUint8Memory0().subarray(ptr, ptr + length)
  );
}

const heap = Array.from({length: 32}).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(object) {
  if (heap_next === heap.length) {
    heap.push(heap.length + 1);
  }

  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = object;
  return idx;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder =
  typeof TextEncoder === 'undefined'
    ? (0, module.require)('util').TextEncoder
    : TextEncoder;

const cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString =
  typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length
        };
      };

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length);
    getUint8Memory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let length = arg.length;
  let ptr = malloc(length);

  const mem = getUint8Memory0();

  let offset = 0;

  for (; offset < length; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) {
      break;
    }

    mem[ptr + offset] = code;
  }

  if (offset !== length) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }

    ptr = realloc(ptr, length, (length = offset + arg.length * 3));
    const view = getUint8Memory0().subarray(ptr + offset, ptr + length);
    const returnValue = encodeString(arg, view);

    offset += returnValue.written;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function getObject(idx) {
  return heap[idx];
}

function dropObject(idx) {
  if (idx < 36) {
    return;
  }

  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const returnValue = getObject(idx);
  dropObject(idx);
  return returnValue;
}

/**
 * @param {string} line
 * @returns {any}
 */
export function search_kanji(line) {
  const ptr0 = passStringToWasm0(
    line,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc
  );
  const length0 = WASM_VECTOR_LEN;
  const returnValue = wasm.search_kanji(ptr0, length0);
  return takeObject(returnValue);
}

export const __wbindgen_json_parse = function (arg0, arg1) {
  const returnValue = JSON.parse(getStringFromWasm0(arg0, arg1));
  return addHeapObject(returnValue);
};
