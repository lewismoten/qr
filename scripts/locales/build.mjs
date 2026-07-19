import { buildLocaleResources } from './resources.mjs';

const locales = await buildLocaleResources();
console.log(`Built ${locales.length} locale resources.`);
