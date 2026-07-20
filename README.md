# qr

Simple QR Code Builder

## Source

Browse the canonical repository at
[git.lewismoten.com/lewismoten/qr](https://git.lewismoten.com/lewismoten/qr),
or clone it directly:

```sh
git clone https://git.lewismoten.com/lewismoten/qr.git
```

## Build

Install the pinned development dependency and build the deployable assets:

```sh
npm install
npm run build
```

The JavaScript entry point is `src/js/main.js` and the CSS entry point is
`src/css/main.css`. Browser code is organized under `src/js/app` and the QR
encoder under `src/js/qr`; add feature modules or component styles through
those entry points. The build emits minified `dist/app.min.js`,
`dist/qr.min.js`, and `dist/app.min.css` files, plus external source maps.

`dist/qr.min.js` is a stable, self-contained ES module. The application reuses
that file rather than embedding the encoder in a hashed application chunk. It
can also be downloaded or imported independently:

```js
import QRCode, { create } from "./dist/qr.min.js";

const qr = create("https://qr.lewismoten.com");
const sameQr = QRCode.create("https://qr.lewismoten.com");
```

During development, rebuild automatically when JavaScript or CSS changes:

```sh
npm run build:watch
```

Run linting, tests with coverage thresholds, and a production build together
with:

```sh
npm run verify
```

`verify` runs source linting, tests and the production build. Run only the
JavaScript, CSS, HTML, JSON, Markdown, sitemap and robots checks with:

```sh
npm run lint
```

Authored JavaScript is formatted to an 80-column target and limited to 300
physical lines per module. URLs, regular expressions and indivisible translated
strings may exceed the column target without weakening the module-size limit.

## Local map assets

The dependency-free overview map is available as the reusable public asset
`/maps/world.svg`. Deeper local levels are built as Mapbox Vector Tiles inside
one range-addressable PMTiles v3 archive. This avoids millions of individual
files while keeping map requests local:

```sh
npm run maps:download
npm run maps:build -- --maximum-zoom 17 --base-zoom 16 --max-tile-kib 16
npm run maps:generate -- --maximum-zoom 17 --base-zoom 16 --max-tile-kib 16
```

To fetch or refresh only the detailed USGS river source before a later build:

```sh
npm run maps:download -- --layers nhdMajorRivers,nhdLocalRivers
```

Natural Earth 5.1.2 supplies the global layers. GeoNames supplies progressively
ranked cities and towns from its CC BY 4.0 `cities1000` gazetteer extract.
Natural Earth's public-domain 1:50m urban polygons add generalized dense
settlement context from zoom 5 through the complete zoom 16 base. The
U.S. Census Bureau's 2024 generalized 20M GeoJSON supplies matching state,
county, and county-equivalent boundaries. TIGERweb supplies U.S. roads and
railroads, while Natural Earth supplies global roads and water. Generalized
railroads appear at zooms 10–11, finer geometry appears at zooms 12–13, and a
more precise query is used at zooms 14–16. Secondary roads follow comparable
detail tiers. Zooms 15–16 add Main Street segments. Zoom 16 also adds a bounded
subset of county, other-numbered, and long named roads while excluding millions
of shorter local streets. Zoom 17 adds a sparse 34,238-feature tier of municipal
roads between the existing length thresholds. The browser composites these
children over complete level 16 parents so unchanged layers are not duplicated.
At zooms 9–16,
the public-domain USGS NHDPlus High Resolution network adds
U.S. rivers ranked for display at approximately 1:5,000,000 and larger scales.
Zooms 14–16 supplement it with non-overlapping 1:1,000,000–1:5,000,000
flowlines at stream order 6 or higher and finer geometry. Explicit feature-count
limits stop the download if an upstream query grows beyond its expected size.
These filters preserve recognizable waterways, including both Shenandoah forks,
without importing the complete 27-million-feature network.
`maps:download` retrieves every configured raw source without rendering tiles.
Natural Earth also supplies U.S. National Park Service parks and protected
lands as area, line, and point features through zoom 16.

`maps:generate` performs the complete reproducible build. It downloads every
source, removes unused source attributes, assigns feature zoom ranges, and asks
Tippecanoe to build `build/maps/local.pmtiles`. The build uses a variable-depth
pyramid, so areas stop subdividing when an existing parent tile can be safely
enlarged. A temporary archive is validated against the default 500 MiB total
budget before it atomically replaces the working map. Tippecanoe is a
build-time tool; on macOS install it with `brew install tippecanoe`.

Downloads are cached under `.cache/maps`. Normalized newline-delimited GeoJSON
is cached under `.cache/maps/vector-input`. The default 16 KiB limit applies to
each compressed MVT tile. Dense tiles are intentionally lossy: Tippecanoe drops
or simplifies the least-visible detail until the limit is met.
Use `--max-archive-mib` to change the separate whole-archive budget and
`--base-zoom` to control when all point features become eligible to appear. A
separate `--max-working-mib` watchdog (1,000 MiB by default) terminates a build
whose temporary archive grows unexpectedly while preserving the live archive.
The default `--detail 11` retains 1/8-pixel coordinate precision at the tile's
native 256-pixel display size while using less detail at overview levels.

The former SVG pipeline remains available during migration:

```sh
npm run maps:build:svg -- --zoom 1-9 --jobs 8
npm run maps:generate:svg -- --jobs 8
```

Use `npm run maps:build -- --help` for all PMTiles options. Natural Earth and
USGS NHDPlus HR data are in the public domain, GeoNames is CC BY 4.0, and U.S.
Census data is a U.S. government work. PMTiles v3 and MVT 2.1 are open
specifications.

## Testing

Tests run on Node's built-in test platform. It discovers every
`tests/**/*.test.js` file and isolates test files from one another. Run the fast
suite once or keep it active while editing:

```sh
npm test
npm run test:watch
```

Generate the native V8 coverage report with:

```sh
npm run test:coverage
```

Coverage includes exercised modules under `src/js`, excluding the browser entry
point and specification-page scripts. The command fails below 95% line, 96%
branch, or 95% function coverage. These conservative repository-wide floors
protect the current baseline. It also requires every included file to exceed
95% line, branch, and function coverage. Every module under `src/js/qr` must
appear in the report and maintain 100% for all three metrics. `npm run verify`
enforces the same coverage thresholds.

## Security

Run the focused security and module-boundary tests with:

```sh
npm run test:security
```

These checks exercise oversized and hostile QR input, prototype-polluted
options, allocation boundaries, and script-like payloads. They also prevent QR
modules from importing application code and reject executable-string or HTML
injection sinks in browser source.

Check the locked dependency tree against npm's current advisories separately:

```sh
npm run audit:dependencies
```

The advisory check requires network access, so it is intentionally not part of
the offline `verify` command.

## Performance

Run the QR speed and memory benchmarks with exposed garbage collection:

```sh
npm run benchmark
npm run benchmark:quick
```

The narrow report ranks scenarios from slowest to fastest and highlights sampled
QR functions with the highest self-time over a fixed workload. It covers
representative QR versions,
fixed and automatic masks, mixed segmentation, and Kanji. Metrics include median
and 95th-percentile generation time, throughput, estimated peak heap per
operation, retained heap, and one-time Kanji initialization. Pass `--no-profile`
to skip function-level CPU sampling.

Save a machine-specific baseline and compare later runs against it:

```sh
npm run benchmark -- --save=benchmark-results/qr.json
npm run benchmark -- \
  --baseline=benchmark-results/qr.json \
  --threshold=20
```

Regression checks compare median time and peak heap. Keep comparisons on similar
hardware and runtime versions; timing and garbage collection vary across systems.

## Locales

Locale sources live in `locales` and are listed in `locales/manifest.json`.
Root locale files hold top-level values. Each subfolder becomes an object key,
so `locales/content/en-US.json` supplies the value of `content`. Subfolders work
recursively; `locales/content/email/es.json` supplies `content.email` for
Spanish. Fragment files contain the value itself, without repeating the folder
key.

Build complete browser resources or split additional object keys with:

```sh
npm run locales:build
npm run locales:split -- content.email
```

The production build assembles fragments into `build/locales/{locale}.json`
before deployment. Locale source JSON is limited to 300 lines by the test suite.

A locale can inherit another locale by adding an `extends` property to its root
file. Only values that differ from the parent need to be stored:

```json
{
  "extends": "en-US",
  "fields": {
    "organization": "organisation"
  }
}
```

Parent and child objects are merged recursively, with child values taking
precedence. Inheritance can contain multiple levels; circular inheritance is
rejected and the normal default-locale fallback is used instead. Placeholder tags
such as `{count}` must remain unchanged in translated values.

The `en-XA` pseudo-locale sets `"$debug": true`. In this mode every translated
value is replaced by its lookup key, making missing or incorrectly assigned keys
visible throughout the interface, including lazy-loaded panels.

## First-party QR encoder

QR generation now runs through the first-party implementation in
`src/js/qr`.
It includes version-aware mixed segmentation, numeric, alphanumeric, UTF-8 byte
and opt-in Shift JIS Kanji encoding, versions 1-40, all four error-correction levels,
Reed-Solomon block generation and interleaving, functional patterns, data
placement, all masks, and automatic mask scoring. No third-party QR runtime or
QR CDN request is required.

Run the structural, mode and capacity suite with:

```sh
node tests/qr/qr.test.js
```

For independent matrix parity, download the former pinned reference bundles and
run the parity suite. These development-only files stay outside the project:

```sh
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js \
  -o /tmp/qrcode-1.5.0.min.js
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.tosjis.min.js \
  -o /tmp/qrcode-1.5.0.tosjis.min.js
npm test
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

| Offset | Size | Value                           |
| -----: | ---: | ------------------------------- |
|      0 |    4 | ASCII `FILE` manifest marker    |
|      4 |    1 | Manifest version, currently `1` |
|      5 |    1 | Transfer flags                  |
|      6 |    4 | Total manifest byte length      |

Manifest flags:

| Bit |   Mask | Meaning                                          |
| --: | -----: | ------------------------------------------------ |
|   0 | `0x01` | File payload is gzip-compressed for transfer     |
| 1-7 |        | Reserved; writers set to zero and readers ignore |

The header is followed by zero or more TLV fields. Each field is encoded as a
one-byte type, a two-byte value length, and exactly that many value bytes. A field
can therefore contain at most 65,535 bytes.
Readers must skip unknown field types using their length so the manifest can be
extended without changing the frame protocol.

| Type | Name               | Value encoding                                 |
| ---: | ------------------ | ---------------------------------------------- |
|    1 | Filename           | UTF-8                                          |
|    2 | MIME type          | UTF-8                                          |
|    3 | Modified date      | 8-byte Unix time in milliseconds               |
|    4 | Original file size | 8-byte integer                                 |
|    5 | Validation type    | UTF-8, currently `SHA-256`                     |
|    6 | Validation value   | Algorithm-specific bytes; 32 bytes for SHA-256 |
|    8 | Custom metadata    | UTF-8 JSON                                     |

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
