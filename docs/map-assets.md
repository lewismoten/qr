# Local map assets

The dependency-free overview map is available as the reusable public asset
`/maps/world.svg`. Deeper local levels are built as Mapbox Vector Tiles inside
range-addressable PMTiles v3 archives. This avoids millions of individual files
while keeping map requests local:

```sh
npm run maps:download
npm run maps:build -- --maximum-zoom 19 --base-zoom 16 --max-tile-kib 16
npm run maps:generate -- --maximum-zoom 19 --base-zoom 16 --max-tile-kib 16
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
rivers ranked for display at approximately 1:5,000,000 and larger scales. Zooms
14-16 supplement it with non-overlapping 1:1,000,000-1:5,000,000 flowlines at
stream order 6 or higher and finer geometry. Explicit feature-count limits stop
the download if an upstream query grows beyond its expected size. These filters
preserve recognizable waterways, including both Shenandoah forks, without
importing the complete 27-million-feature network.

`maps:download` retrieves every configured raw source without rendering tiles.
Natural Earth also supplies U.S. National Park Service parks and protected lands
as area, line, and point features through zoom 16.

## Archive planning

`maps:generate` performs the complete reproducible build. It downloads every
source, removes unused source attributes, assigns feature zoom ranges, and asks
Tippecanoe to build PMTiles archives plus `build/maps/local.json`. Zooms 1-8 use
one world archive each. Beginning at `--shard-zoom 9`, the builder inspects the
actual size of every region from the preceding zoom. A region larger than
`--shard-target-mib 10` divides into four children for the next zoom. If four
children would still average more than the target, it divides directly into
16, 64, or another power-of-four count. Sparse regions retain their existing
bounds while dense areas subdivide independently along exact Web Mercator tile
boundaries.

Use `--jobs 4` to build up to four shards from the same zoom concurrently.
Zoom levels remain ordered, and archive surplus or debt is reconciled between
parallel waves. Each job runs a separate Tippecanoe process, so choose a value
that leaves enough CPU, memory, and temporary storage for every active job.

The default allocator gives zooms 1-8, 9-12, and 13-maximum 1%, 9%, and 90% of
the total. For 500 MiB, those tiers receive 5, 45, and 450 MiB. Within each tier,
individual level allowances grow by a relative weight of 1.3 and retain a 128
KiB minimum. Every archive budget adds up to exactly the configured maximum.
Lower maximum zooms redistribute the total among only the active tiers. Sparse
shard archives pass unused space to later shards and levels.

Level budgets are guidance rather than strict content ceilings. The builder
allows cumulative variance of `--archive-variance-percent 1`, equal to 5 MiB
for a 500 MiB collection, before trying to compact an archive. This headroom is
shared across each parallel wave and reduced by existing budget debt. If a
compaction retry saves less than 5%, the builder accepts the smallest result
and carries its overage instead of repeatedly lowering the per-tile limit.

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
zoom and quadrant, carry or debt, tile limits, geometry detail, and PMTiles
addressed-tile, directory-entry, unique-content, and tile-data totals. Fatal
errors are written before exit. Repetitive Tippecanoe density and oversized
tile messages are replaced by one summary per pass.

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

Downloads are cached under `.cache/maps`. Normalized newline-delimited GeoJSON
is cached under `.cache/maps/vector-input`. The default 16 KiB limit applies to
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
