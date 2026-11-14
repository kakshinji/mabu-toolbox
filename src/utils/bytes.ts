/** 把任意 Uint8Array（可能由 SharedArrayBuffer 支撑）复制成标准 ArrayBuffer，便于构造 Blob */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

/** 由字节数组构造 Blob */
export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([toArrayBuffer(bytes)], { type });
}

/** 把字符串转成 Blob（指定 MIME） */
export function textToBlob(text: string, type = 'text/plain;charset=utf-8'): Blob {
  return new Blob([text], { type });
}
