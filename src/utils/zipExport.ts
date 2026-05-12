// Minimal ZIP file creator (store-only, no compression — fine for PNGs which are already compressed)

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeU16(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xFF;
  buf[offset + 1] = (val >> 8) & 0xFF;
}

function writeU32(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xFF;
  buf[offset + 1] = (val >> 8) & 0xFF;
  buf[offset + 2] = (val >> 16) & 0xFF;
  buf[offset + 3] = (val >> 24) & 0xFF;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header (30 bytes + name + data)
    const local = new Uint8Array(30 + nameBytes.length);
    writeU32(local, 0, 0x04034B50);  // signature
    writeU16(local, 4, 20);           // version needed
    writeU16(local, 6, 0);            // flags
    writeU16(local, 8, 0);            // compression: store
    writeU16(local, 10, 0);           // mod time
    writeU16(local, 12, 0);           // mod date
    writeU32(local, 14, crc);
    writeU32(local, 18, size);        // compressed
    writeU32(local, 22, size);        // uncompressed
    writeU16(local, 26, nameBytes.length);
    writeU16(local, 28, 0);           // extra field length
    local.set(nameBytes, 30);
    localHeaders.push(local);

    // Central directory header (46 bytes + name)
    const central = new Uint8Array(46 + nameBytes.length);
    writeU32(central, 0, 0x02014B50); // signature
    writeU16(central, 4, 20);          // version made by
    writeU16(central, 6, 20);          // version needed
    writeU16(central, 8, 0);           // flags
    writeU16(central, 10, 0);          // compression: store
    writeU16(central, 12, 0);          // mod time
    writeU16(central, 14, 0);          // mod date
    writeU32(central, 16, crc);
    writeU32(central, 20, size);       // compressed
    writeU32(central, 24, size);       // uncompressed
    writeU16(central, 28, nameBytes.length);
    writeU16(central, 30, 0);          // extra field length
    writeU16(central, 32, 0);          // comment length
    writeU16(central, 34, 0);          // disk number start
    writeU16(central, 36, 0);          // internal file attributes
    writeU32(central, 38, 0);          // external file attributes
    writeU32(central, 42, offset);     // local header offset
    central.set(nameBytes, 46);
    centralHeaders.push(central);

    offset += local.length + size;
  }

  // End of central directory (22 bytes)
  const centralDirSize = centralHeaders.reduce((s, h) => s + h.length, 0);
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, 0x06054B50);
  writeU16(eocd, 4, 0);                // disk number
  writeU16(eocd, 6, 0);                // central dir disk
  writeU16(eocd, 8, entries.length);    // entries on this disk
  writeU16(eocd, 10, entries.length);   // total entries
  writeU32(eocd, 12, centralDirSize);
  writeU32(eocd, 16, offset);          // central dir offset
  writeU16(eocd, 20, 0);               // comment length

  const parts: BlobPart[] = [];
  for (let i = 0; i < entries.length; i++) {
    parts.push(localHeaders[i]);
    parts.push(entries[i].data);
  }
  for (const h of centralHeaders) parts.push(h);
  parts.push(eocd);

  return new Blob(parts, { type: 'application/zip' });
}

export function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) { resolve(new Uint8Array(0)); return; }
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
}
