import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPmtilesArchiveSet,
  findArchiveForTile,
} from '../../../../src/js/app/ui/content/geo/pmtiles/archive-set.js';

test('selects a tile-aligned geographic quadrant', () => {
  const archives = ['north-west', 'north-east', 'south-west', 'south-east'].map(
    (shard) => ({
      shard,
      minimumZoom: 9,
      maximumZoom: 9,
    }),
  );
  assert.equal(findArchiveForTile(archives, 9, 10, 10).shard, 'north-west');
  assert.equal(findArchiveForTile(archives, 9, 300, 10).shard, 'north-east');
  assert.equal(findArchiveForTile(archives, 9, 10, 300).shard, 'south-west');
  assert.equal(findArchiveForTile(archives, 9, 300, 300).shard, 'south-east');
  assert.equal(findArchiveForTile(archives, 8, 10, 10), undefined);
});

test('selects a tile from a deeper four-by-four archive grid', () => {
  const archives = Array.from({ length: 16 }, (_, index) => ({
    shard: `grid-${index}`,
    shardGrid: 4,
    shardColumn: index % 4,
    shardRow: Math.floor(index / 4),
    minimumZoom: 13,
    maximumZoom: 13,
  }));

  assert.equal(findArchiveForTile(archives, 13, 0, 0).shard, 'grid-0');
  assert.equal(findArchiveForTile(archives, 13, 4096, 6144).shard, 'grid-14');
  assert.equal(findArchiveForTile(archives, 13, 8191, 8191).shard, 'grid-15');
});

test('routes zooms across a budgeted PMTiles archive set', async () => {
  const requests = [];
  const manifest = {
    version: 1,
    minimumZoom: 1,
    maximumZoom: 17,
    archives: [
      { minimumZoom: 7, maximumZoom: 7, file: 'z07.pmtiles' },
      {
        minimumZoom: 13,
        maximumZoom: 13,
        shard: 'north-west',
        file: 'z13-north-west.pmtiles',
      },
      {
        minimumZoom: 13,
        maximumZoom: 13,
        shard: 'south-east',
        file: 'z13-south-east.pmtiles',
      },
    ],
  };
  const source = await createPmtilesArchiveSet('/maps/local.json', {
    fetcher: async () => new Response(JSON.stringify(manifest)),
    sourceFactory: (url) => ({
      async getTile(zoom) {
        requests.push(`${url}:${zoom}`);
        return new Uint8Array([zoom]);
      },
    }),
  });
  assert.deepEqual(await source.getHeader(), {
    minimumZoom: 1,
    maximumZoom: 17,
  });
  assert.deepEqual(await source.getTile(7, 0, 0), new Uint8Array([7]));
  assert.deepEqual(await source.getTile(13, 0, 0), new Uint8Array([13]));
  assert.deepEqual(await source.getTile(13, 8191, 8191), new Uint8Array([13]));
  assert.deepEqual(requests, [
    'http://localhost/maps/z07.pmtiles:7',
    'http://localhost/maps/z13-north-west.pmtiles:13',
    'http://localhost/maps/z13-south-east.pmtiles:13',
  ]);
});
