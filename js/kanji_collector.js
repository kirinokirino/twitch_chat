let wasm;

const cachedTextDecoder = new TextDecoder('utf-8', {
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

const cachedTextEncoder = new TextEncoder('utf-8');

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

async function load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (error) {
        if (module.headers.get('Content-Type') != 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            error
          );
        } else {
          throw error;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  }

  const instance = await WebAssembly.instantiate(module, imports);

  if (instance instanceof WebAssembly.Instance) {
    return {instance, module};
  }

  return instance;
}

async function init(input) {
  if (typeof input === 'undefined') {
    input = new URL('kanji_collector_bg.wasm', import.meta.url);
  }

  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_json_parse = function (arg0, arg1) {
    const returnValue = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(returnValue);
  };

  if (
    typeof input === 'string' ||
    (typeof Request === 'function' && input instanceof Request) ||
    (typeof URL === 'function' && input instanceof URL)
  ) {
    input = fetch(input);
  }

  const {instance, module} = await load(await input, imports);

  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;

  return wasm;
}

export default init;
