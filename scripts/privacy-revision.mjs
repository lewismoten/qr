import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const GENERATED_LANGUAGE_MARKUP =
  /<!-- generated-guide-languages:start -->[\s\S]*?<!-- generated-guide-languages:end -->/g;

function visiblePrivacyText(source) {
  return source
    .replace(GENERATED_LANGUAGE_MARKUP, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|#38);/g, '&')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:lt|#60);/g, '<')
    .replace(/&(?:gt|#62);/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPrivacyContentHash(source) {
  return createHash('sha256').update(visiblePrivacyText(source)).digest('hex');
}

export async function updatePrivacyRevision({
  manifestFile = 'locales/manifest.json',
  now = () => new Date(),
  privacyFile = 'src/html/privacy.html',
} = {}) {
  const [manifestSource, privacySource] = await Promise.all([
    readFile(manifestFile, 'utf8'),
    readFile(privacyFile, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestSource);
  const previous = manifest.documents?.privacy || {};
  const contentHash = getPrivacyContentHash(privacySource);
  const changed = contentHash !== previous.contentHash;
  const lastUpdated =
    changed || !previous.lastUpdated
      ? now().toISOString()
      : previous.lastUpdated;

  manifest.documents = {
    ...manifest.documents,
    privacy: { contentHash, lastUpdated },
  };
  if (changed || !previous.lastUpdated) {
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return { changed, contentHash, lastUpdated };
}
