import { createLoadingIndicator } from '../loading-indicator.js';

export function createLazySection({ region, load, create }) {
  const loading = createLoadingIndicator({ region });
  let controller = null;
  let request = null;

  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = loading
        .track(load())
        .then((module) => {
          controller = create(module);
          return controller;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };

  return {
    ensure,
    get: () => controller,
    run(method, ...args) {
      return ensure().then((section) => section[method](...args));
    },
  };
}
