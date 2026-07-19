import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadFeatureStylesheet } from '../../src/js/stylesheets.js';

class Link extends EventTarget {
  dataset = {};
  removed = false;

  remove() {
    this.removed = true;
  }
}

function createDocument(path, styleSheets = []) {
  const links = [];
  return {
    baseURI: `https://example.test/${path}/`,
    styleSheets,
    links,
    head: {
      appendChild(link) {
        links.push(link);
      },
    },
    createElement(name) {
      assert.equal(name, 'link');
      return new Link();
    },
  };
}

describe('lazy feature stylesheets', () => {
  test('does nothing when a document head is unavailable', async () => {
    await loadFeatureStylesheet('missing', { document: null });
    await loadFeatureStylesheet('missing', { document: {} });
  });

  test('recognizes an existing stylesheet', async () => {
    const href = 'https://example.test/existing/dist/chunks/geo-map.min.css';
    const document = createDocument('existing', [{ href }]);
    await loadFeatureStylesheet('geo-map', { document });
    assert.equal(document.links.length, 0);
  });

  test('deduplicates concurrent stylesheet requests', async () => {
    const document = createDocument('deduplicate');
    const first = loadFeatureStylesheet('download', { document });
    const second = loadFeatureStylesheet('download', { document });
    assert.strictEqual(first, second);
    assert.equal(document.links.length, 1);
    assert.equal(document.links[0].rel, 'stylesheet');
    assert.equal(document.links[0].dataset.featureStylesheet, 'download');
    document.links[0].dispatchEvent(new Event('load'));
    await first;
  });

  test('removes failed links and permits a retry', async () => {
    const document = createDocument('retry');
    const failed = loadFeatureStylesheet('debug-mask', { document });
    const firstLink = document.links[0];
    firstLink.dispatchEvent(new Event('error'));
    await assert.rejects(failed, /Unable to load stylesheet/);
    assert.equal(firstLink.removed, true);

    const retry = loadFeatureStylesheet('debug-mask', { document });
    assert.equal(document.links.length, 2);
    document.links[1].dispatchEvent(new Event('load'));
    await retry;
  });
});
