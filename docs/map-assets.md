# Local map assets

The dependency-free overview map is available as the reusable public asset
`/maps/world.svg`. Deeper local levels are built as Mapbox Vector Tiles inside
range-addressable PMTiles v3 archives. This avoids millions of individual files
while keeping map requests local:

```sh
npm run maps:download
npm run maps:build -- --maximum-zoom 19 --base-zoom 16 --max-tile-kib 64
npm run maps:generate -- --maximum-zoom 19 --base-zoom 16 --max-tile-kib 64
```

To fetch or refresh only the detailed USGS river source before a later build:

```sh
npm run maps:download -- --layers nhdMajorRivers,nhdLocalRivers
```

Natural Earth 5.1.2 supplies the global layers. GeoNames supplies progressively
ranked cities and towns from its CC BY 4.0 `cities1000` gazetteer extract.
Natural Earth's public-domain 1:50m urban polygons add generalized dense
settlement context from zooms 5 through 10. They stop before local detail to
avoid repeating broad, historical settlement polygons across millions of
high-zoom tiles. The U.S. Census Bureau's 2024 generalized 20M GeoJSON supplies
matching state, county, and county-equivalent boundaries. TIGERweb supplies
U.S. roads and railroads, while Natural Earth supplies global roads and water.

Generalized railroads appear at zooms 10-11, finer geometry appears at zooms
12-13, and a more precise query is used at zooms 14-16. Secondary roads follow
comparable detail tiers. Zooms 15-16 add Main Street segments. Zoom 16 also adds
a bounded subset of county, other-numbered, and long named roads while excluding
millions of shorter local streets. Zoom 17 adds a sparse 34,238-feature tier of
municipal roads between the existing length thresholds. The browser composites
these children over complete level 16 parents so unchanged layers are not
duplicated.

At zooms 9-16, the public-domain USGS NHDPlus High Resolution network adds U.S.
rivers ranked by stream order. The highest orders begin at zoom 9, with smaller
orders entering progressively through zoom 13. Zooms 14-16 supplement them with
non-overlapping 1:1,000,000-1:5,000,000 flowlines at stream order 6 or higher
and finer geometry. Explicit feature-count limits stop the download if an
upstream query grows beyond its expected size. These filters preserve
recognizable waterways, including both Shenandoah forks, without importing the
complete 27-million-feature network.

`maps:download` retrieves every configured raw source without rendering tiles.
Natural Earth also supplies U.S. National Park Service parks and protected lands
as area, line, and point features through zoom 16.

## Archive planning

`maps:generate` performs the complete reproducible build. It downloads every
source, removes unused source attributes, assigns feature zoom ranges, and asks
Tippecanoe to build PMTiles archives plus `build/maps/local.json`. Zooms 1-8 use
one world archive each. Beginning at `--shard-zoom 9`, the builder inspects the
actual size of every region from the preceding zoom. A region larger than
`--shard-target-mib 100` divides into four children for the next zoom. If four
children would still average more than the target, it divides directly into
16, 64, or another power-of-four count. Complete groups of sparse siblings
coalesce when their combined forecast fits the target, while dense areas
subdivide independently along exact Web Mercator tile boundaries.

Before each zoom is built, the planner forecasts growth from the two previous
zooms and features that are active at the new zoom. Both `minzoom` and
`maxzoom` are honored, so a level can shrink and coalesce when detailed layers
expire. A region is subdivided in advance when its forecast exceeds the shard
target, including multiple quadtree depths when one four-way split is
insufficient. The default 20% soft variance permits a forecast up to 120 MiB
before splitting a nominal 100 MiB region, avoiding unnecessary archives near
the boundary.

Use `--jobs 4` to build up to four shards from the same zoom concurrently.
Zoom levels remain ordered, and archive surplus or debt is reconciled between
parallel waves. Each job runs a separate Tippecanoe process, so choose a value
that leaves enough CPU, memory, and temporary storage for every active job.
By default, each active wave divides detected CPU concurrency evenly. A single
overview archive can therefore use every available thread, while four active
shards each receive one quarter. Override this dynamic allocation with
`--tippecanoe-threads` or
`TIPPECANOE_MAX_THREADS` when benchmarking job counts.

The vector pipeline ends broad Natural Earth land and lake polygons at zoom
10. The client overzooms those background layers beneath later roads, rails,
waterways, parks, places, and boundaries. Administrative polygons become line
geometry before tiling, avoiding interior tiles that only draw an outline.
The planner also stops after the highest zoom containing prepared geometry;
the map can continue to zoom 19 by overzooming the last available detail.

The default allocator gives zooms 1-9, 10-12, and 13-maximum 10%, 9%, and 81%
of the total. For 500 MiB, those tiers receive 50, 45, and 405 MiB. This keeps
the overview through zoom 9 at normal tile quality while reserving 450 MiB for
zooms 10-19. Within each tier, individual allowances grow by a relative weight
of 1.3 and retain a 128 KiB minimum. Every archive budget adds up to the
configured maximum. Lower maximum zooms redistribute the total among only the
active tiers. Sparse archives pass unused space to later shards and levels.

Level budgets are guidance rather than strict content ceilings. The builder
allows cumulative variance of `--archive-variance-percent 1`, equal to 5 MiB
for a 500 MiB collection, before trying to compact an archive. This headroom is
shared across each parallel wave and reduced by existing budget debt. If a
compaction retry saves less than 5%, the builder accepts the smallest result
and carries its overage instead of repeatedly lowering the per-tile limit.
Tile ceilings do not fall below 4 KiB. The first normal-limit result is stored
as `naturalBytes`; this value drives later density forecasts and subdivision,
while accepted bytes alone count against the final package budget. A retained
ratio below 50% emits a quality warning.

The final archive target and temporary workspace limit are independent.
Tippecanoe may need substantially more temporary space than the compressed
archive it ultimately emits, so `--max-working-mib` is enforced per active
archive without reducing it to that archive's final allowance. Parallel builds
can therefore consume up to this limit for each active job.

Completed archives record average stored tile bytes, the largest tile payload
found in the final PMTiles directories, and the count of stored tile payloads
over the configured tile limit. Tippecanoe's diagnostic detail is logged as
`reportedTippecanoeDetail`; build configuration uses `configuredDetail`.

## Reports and compaction

Every `maps:generate` and `maps:build` run writes a timestamped JSON Lines log
under `build/maps/logs`. Use `--log-file path` to choose another location. The
first record contains all normalized parameters. Later records include source
preparation, stage and archive durations, each pass's file size and budget,
addressed-tile, directory-entry, unique-content, and tile-data totals. Fatal
errors include the last 100 Tippecanoe stderr lines and temporary file size.
Repetitive Tippecanoe density and oversized tile messages are replaced by one
summary per pass.
Feature-count and percentage progress updates are also coalesced in the
terminal. The newest status appears at most once every 1.5 seconds, while
warnings, archive transitions, and summaries remain immediate.

Each level is validated independently. An over-budget level is rebuilt with a
tile-byte ceiling derived from its measured archive-to-budget ratio. Geometry
detail remains stable until the tile ceiling reaches its minimum. Unused bytes
roll into the next level. If a level cannot shrink enough at minimum settings,
its smallest valid archive is retained and its overage is recorded as debt.
Later unused space offsets that debt naturally.

If irreducible archives exceed the final target, the build reports and records
the exact overage but publishes the completed archive set. Tippecanoe exit status
100 during a stricter retry restores the last valid candidate instead of
aborting the build. If no constrained attempt can produce a candidate, one
recovery attempt omits the tile ceiling. When Tippecanoe reports its feature-gap
compaction limit, the builder immediately accepts the smallest valid candidate.

All temporary archives must pass before the manifest atomically publishes the
new set. Use `--budget-growth` and `--minimum-level-kib` to tune the curve.
Tippecanoe is a build-time tool; on macOS install it with
`brew install tippecanoe`.

Each validated shard is atomically promoted and recorded in a fingerprinted
`local.checkpoints.json` file. The fingerprint covers prepared input hashes,
encoding settings, sharding settings, and the Tippecanoe version. A restarted
run validates and reuses matching archives. Successful siblings are saved even
when another shard in their parallel wave fails.

Downloads are cached under `.cache/maps`. Normalized newline-delimited GeoJSON
is cached under `.cache/maps/vector-input`. The default 64 KiB limit applies to
each compressed MVT tile. Dense tiles are intentionally lossy: Tippecanoe drops
or simplifies the least-visible detail until the limit is met. Use
`--max-archive-mib` to change the whole-archive target and `--base-zoom` to
control when all point features become eligible to appear.

The default `--max-working-mib` watchdog terminates a build whose temporary
archive grows unexpectedly while preserving the live archive. The default
`--detail 11` retains 1/8-pixel coordinate precision at a tile's native
256-pixel display size while using less detail at overview levels.

## Legacy SVG pipeline

The former SVG pipeline remains available during migration:

```sh
npm run maps:build:svg -- --zoom 1-9 --jobs 8
npm run maps:generate:svg -- --jobs 8
```

Use `npm run maps:build -- --help` for all PMTiles options. Natural Earth and
USGS NHDPlus HR data are in the public domain, GeoNames is CC BY 4.0, and U.S.
Census data is a U.S. government work. PMTiles v3 and MVT 2.1 are open
specifications.
