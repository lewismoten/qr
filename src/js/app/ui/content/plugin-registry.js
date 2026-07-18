import { lookup } from '../../../i18n/index.js';

export function createContentPluginRegistry({ format, initial, loaders }) {
  const plugins = new Map(Object.entries(initial));
  const requests = new Map();

  const ensure = (name = format.value) => {
    if (plugins.has(name)) return Promise.resolve(plugins.get(name));
    if (!loaders[name]) return Promise.resolve(null);
    if (!requests.has(name)) {
      requests.set(
        name,
        Promise.resolve()
          .then(loaders[name])
          .then((plugin) => {
            plugins.set(name, plugin);
            return plugin;
          })
          .catch((error) => {
            requests.delete(name);
            throw error;
          }),
      );
    }
    return requests.get(name);
  };

  const build = async () => {
    const plugin = await ensure();
    return plugin?.build() ?? '';
  };
  const preview = () =>
    plugins.get(format.value)?.preview() ??
    lookup(
      'content.preview.loading',
      '[Content preview loads after selecting this format]',
    );

  return {
    build,
    ensure,
    get: (name = format.value) => plugins.get(name) ?? null,
    preview,
  };
}
