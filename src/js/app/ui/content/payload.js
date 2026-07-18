import { lookup } from '../../../i18n/index.js';

export function createContentPayload({ bulk, plugins }) {
  const build = async () => {
    if (bulk.isMode()) return bulk.build();
    return plugins.build();
  };

  const preview = () => {
    if (bulk.isMode()) {
      return lookup('content.preview.bulkRow', '[Imported data row]');
    }
    return plugins.preview();
  };

  return { build, preview };
}
