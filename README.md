# qr

![QR Code Generator](./docs/social-preview.jpg)

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
import QRCode, { create } from './dist/qr.min.js';

const qr = create('https://qr.lewismoten.com');
const sameQr = QRCode.create('https://qr.lewismoten.com');
```

During development, rebuild automatically when JavaScript or CSS changes:

```sh
npm run build:watch
```

Run linting, tests with coverage thresholds, and a production build together:

```sh
npm run verify
```

`verify` runs source linting, tests, the production build, and asset-budget
checks. Run only the JavaScript, CSS, HTML, JSON, Markdown, sitemap and robots
checks with:

```sh
npm run lint
```

### Asset budgets

Run the built-site size audit independently after `npm run build`:

```sh
npm run test:size
```

The audit measures raw artifact sizes and estimates transferred HTML, CSS, and
JavaScript using the same Brotli quality as the local server. It checks the
initial application, every configured app tab or content route, every generated
localized HTML page, every lazy JavaScript entry and chunk, CSS, PMTiles tile
ranges, individual map archives, and the total map set. Shared JavaScript chunks
are counted once per route.

The universal raw-payload target is 64 KiB. The report separately estimates
Brotli transfer size and aggregates every cold-start request, including locale
files, the controller graph, shared chunks, and the QR library. Current hard
regression ceilings live in `config/asset-budgets.json`; known target misses
remain visible even when inside those temporary ceilings. Lower the ceilings as
assets are optimized rather than raising them to hide regressions.

Authored JavaScript and Markdown files are limited to 300 physical lines.
Authored JavaScript also uses an 80-column target. URLs, regular expressions,
and indivisible translated strings may exceed the column target without
weakening the module-size limit.

New HTML sources are also limited to 300 lines. The migration and shared
print/PDF/ePub composition design are documented in
[Long-form HTML documents](docs/html-documents.md).

## Local map assets

The reproducible PMTiles sources, budgets, compaction behavior, reports, and
legacy SVG commands are documented in [Local map assets](docs/map-assets.md).

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

The narrow report ranks scenarios from slowest to fastest and highlights
sampled QR functions with the highest self-time over a fixed workload. It
covers representative QR versions, fixed and automatic masks, mixed
segmentation, and Kanji. Metrics include median and 95th-percentile generation
time, throughput, estimated peak heap per operation, retained heap, and one-time
Kanji initialization. Pass `--no-profile` to skip function-level CPU sampling.

Save a machine-specific baseline and compare later runs against it:

```sh
npm run benchmark -- --save=benchmark-results/qr.json
npm run benchmark -- \
  --baseline=benchmark-results/qr.json \
  --threshold=20
```

Regression checks compare median time and peak heap. Keep comparisons on
similar hardware and runtime versions; timing and garbage collection vary
across systems.

## Locales

Locale sources live in `locales` and are listed in `locales/manifest.json`.
Root locale files hold top-level values. Each subfolder becomes an object key,
so `locales/content/content-en-US.json` supplies the value of `content`.
Subfolders work recursively; `locales/content/email/content-email-es.json`
supplies `content.email` for Spanish. The namespace in each filename keeps it
unique across the repository. Fragment files contain the value itself, without
repeating the folder key.

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
rejected and the normal default-locale fallback is used instead. Placeholder
tags such as `{count}` must remain unchanged in translated values.

The `en-XA` pseudo-locale sets `"$debug": true`. In this mode every translated
value is replaced by its lookup key, making missing or incorrectly assigned
keys visible throughout the interface, including lazy-loaded panels.

## First-party QR encoder

QR generation runs through the first-party implementation in `src/js/qr`. It
includes version-aware mixed segmentation, numeric, alphanumeric, UTF-8 byte
and opt-in Shift JIS Kanji encoding, versions 1-40, all four error-correction
levels, Reed-Solomon block generation and interleaving, functional patterns,
data placement, all masks, and automatic mask scoring. No third-party QR
runtime or QR CDN request is required.

Run the structural, mode and capacity suite with:

```sh
node tests/qr/qr.test.js
```

For independent matrix parity, download the former pinned reference bundles
and run the parity suite. These development-only files stay outside the project:

```sh
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js \
  -o /tmp/qrcode-1.5.0.min.js
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.tosjis.min.js \
  -o /tmp/qrcode-1.5.0.tosjis.min.js
npm test
```

## FILE chunked transport

The random-order frame syntax, binary manifest, validation fields, and assembly
rules are documented in [FILE chunked transport](docs/file-transport.md).

![QR Code Generator](./docs/logo.jpg)

