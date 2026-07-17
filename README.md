# qr

Simple QR Code Builder

## Build

Install the pinned development dependency and build the deployable assets:

```sh
npm install
npm run build
```

The JavaScript entry point is `src/js/main.js` and the CSS entry point is
`src/css/main.css`. Browser code is organized under `src/js/app` and the native
encoder under `src/js/qr`; add feature modules or component styles through
those entry points. The build emits minified `dist/app.min.js` and
`dist/app.min.css` files, plus external source maps for each. `index.html`
references only these compiled assets.

During development, rebuild automatically when JavaScript or CSS changes:

```sh
npm run build:watch
```

Run the QR encoder tests and a production build together with:

```sh
npm run verify
```

## First-party QR encoder

QR generation now runs through the first-party implementation in
`src/js/qr`.
It includes version-aware mixed segmentation, numeric, alphanumeric, UTF-8 byte
and Shift JIS Kanji encoding, versions 1-40, all four error-correction levels,
Reed-Solomon block generation and interleaving, functional patterns, data
placement, all masks, and automatic mask scoring. No third-party QR runtime or
QR CDN request is required.

Run the structural, mode and capacity suite with:

```sh
node qr-native.test.js
```

For independent matrix parity, download the former pinned reference bundles and
run the parity suite. These development-only files stay outside the project:

```sh
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js \
  -o /tmp/qrcode-1.5.0.min.js
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.tosjis.min.js \
  -o /tmp/qrcode-1.5.0.tosjis.min.js
node qr-native.parity.test.js
```

## FILE chunked transport

Files use a readable `FILE` transport. When the complete transfer stream fits in
one QR, the compact single-frame form omits assembly information:

```text
FILE:1:S:M:<data>
FILE:1:S:-:<extension>:<data>
```

`S` means the frame is self-contained. A reader obtains the total byte count from
the decoded data length, so a transfer ID, offset, and declared total would be
redundant. When `manifest` is `M`, the embedded filename and MIME type also make an
outer extension redundant. Without a manifest, the extension remains as a type
hint.

When more than one QR is required, every QR uses the same selected QR version and
the random-order chunk form:

```text
FILE:1:C:<manifest>:<transfer-id>:<extension>:<offset>:<total-bytes>:<data>
```

- `FILE` is the recognizable protocol name and `1` is its plain-text version.
- `S` identifies a complete single frame; `C` identifies one frame of a chunked
  transfer.
- `manifest` is `M` when the stream begins with a manifest or `-` when it contains
  only file bytes.
- In the chunk form, `transfer-id` is 16 random bytes represented by 22 unpadded
  base64url characters.
- `extension` is a plain-text uppercase file extension used as an immediate hint.
  It is present in every chunk frame and only in manifest-free single frames.
- In the chunk form, `offset` and `total-bytes` are plain decimal byte counts. The
  offset is padded with leading zeroes to the width of `total-bytes`, keeping every
  header the same size without changing its numeric meaning.
- `data` is the only encoded content: an unpadded base64url slice of the transfer
  stream. Base64url is required because arbitrary binary file bytes cannot safely
  appear directly in QR scanner text.

Chunk frames may arrive in any order. Decode `data`, place the resulting bytes at
`offset`, and group frames by `transfer-id`. A receiver has the complete transfer
when every byte in `[0, total-bytes)` is covered. Duplicate frames with identical
bytes are harmless; overlapping frames with different bytes must be rejected.

### Transfer stream

The stream is an optional binary manifest followed immediately by the transferred
file bytes. The manifest may cross QR boundaries and is not a special first frame.
When the manifest is omitted, the stream contains only the original file bytes and
the extension in each frame is the only file-type hint.

The manifest has this 10-byte header. All integers are unsigned and big-endian.

| Offset | Size | Value |
| ---: | ---: | --- |
| 0 | 4 | ASCII `FILE` manifest marker |
| 4 | 1 | Manifest version, currently `1` |
| 5 | 1 | Transfer flags |
| 6 | 4 | Total manifest byte length |

Manifest flags:

| Bit | Mask | Meaning |
| ---: | ---: | --- |
| 0 | `0x01` | File payload is gzip-compressed for transfer |
| 1-7 | | Reserved; writers set to zero and readers ignore |

The header is followed by zero or more TLV fields. Each field is encoded as a
one-byte type, a two-byte value length, and exactly that many value bytes. A field
can therefore contain at most 65,535 bytes.
Readers must skip unknown field types using their length so the manifest can be
extended without changing the frame protocol.

| Type | Name | Value encoding |
| ---: | --- | --- |
| 1 | Filename | UTF-8 |
| 2 | MIME type | UTF-8 |
| 3 | Modified date | 8-byte Unix time in milliseconds |
| 4 | Original file size | 8-byte integer |
| 5 | Validation type | UTF-8, currently `SHA-256` |
| 6 | Validation value | Algorithm-specific bytes; 32 bytes for SHA-256 |
| 8 | Custom metadata | UTF-8 JSON |

Fields are optional and may appear in any order. Types 5 and 6 are paired: a
reader that does not recognize the validation type must not interpret its value.
When flag bit 0 is set, restore the original file by gzip-decompressing the bytes
after the manifest. Custom metadata may contain any valid JSON value and
applications should ignore properties they do not know.

The file payload begins at the manifest length stored at byte 6. For any stream
offset at or beyond that boundary, its payload offset is
`stream offset - manifest length`.

For SHA-256, replace the type 6 value with zero bytes of the same length, serialize
the otherwise unchanged manifest, append the transferred file bytes, and hash the
result. Verify this digest before decompressing. After decompression, verify the
resulting byte count against type 4. SHA-256 detects modified metadata or payload
data, but it does not authenticate the sender; sender legitimacy requires a trusted
digital-signature extension.
