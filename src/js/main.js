import { setupExternalLinks } from './external-links.js';
import {
  initializeLanguage,
  isDebugLanguage,
  lookup,
  translateDocument,
} from './i18n/index.js';
import { getSavedLocale, setupLanguagePicker } from './i18n/picker.js';
import { loadFeatureStylesheet } from './stylesheets.js';

const bootProgress = document.getElementById('boot-loading-progress');
const bootPercent = document.getElementById('boot-loading-percent');
const completedMilestones = new Set();
let progressPaint = Promise.resolve();
const milestoneWeights = {
  stylesheet: 20,
  localization: 15,
  application: 35,
  render: 25,
};

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function completeMilestone(name) {
  if (completedMilestones.has(name)) return progressPaint;
  completedMilestones.add(name);
  const value =
    5 +
    [...completedMilestones].reduce(
      (total, milestone) => total + milestoneWeights[milestone],
      0,
    );
  progressPaint = progressPaint
    .then(nextPaint)
    .then(() => {
      if (bootProgress) bootProgress.value = value;
      if (bootPercent) bootPercent.value = `${value}%`;
    })
    .then(nextPaint);
  return progressPaint;
}

function waitForApplicationStyles() {
  const stylesheet = document.getElementById('app-styles');
  if (!stylesheet || stylesheet.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    stylesheet.addEventListener('load', resolve, { once: true });
    stylesheet.addEventListener('error', resolve, { once: true });
  });
}

let application;
let debugTooltip;
let debugTooltipInitialized = false;

async function ensureDebugTooltip() {
  if (!isDebugLanguage()) return;
  const [, module] = await Promise.all([
    loadFeatureStylesheet('i18n-debug').catch(console.error),
    debugTooltip
      ? Promise.resolve(debugTooltip)
      : import('./i18n/debug-tooltip.js'),
  ]);
  debugTooltip = module;
  if (!debugTooltipInitialized) {
    debugTooltip.setupTranslationDebugTooltip();
    debugTooltipInitialized = true;
  }
}

async function changeLocale(locale) {
  await initializeLanguage({ locale });
  translateDocument(document);
  document.dispatchEvent(new Event('languagechange'));
  await ensureDebugTooltip();
  await application?.refreshLanguage();
}

async function start() {
  const stylesReady = waitForApplicationStyles().then(() => {
    return completeMilestone('stylesheet');
  });
  await initializeLanguage({ locale: getSavedLocale() });
  await completeMilestone('localization');
  await ensureDebugTooltip();
  translateDocument(document);
  setupExternalLinks();
  setupLanguagePicker({ onLocaleChange: changeLocale });
  application = await import('./app/app-controller.js');
  await completeMilestone('application');
  await application.applicationReady;
  await completeMilestone('render');
  await stylesReady;
  await new Promise((resolve) => setTimeout(resolve, 160));
}

const bootLoading = document.getElementById('boot-loading');
start()
  .then(() => bootLoading?.remove())
  .catch((error) => {
    console.error(error);
    if (!bootLoading) return;
    bootLoading.classList.add('has-error');
    const label = bootLoading.querySelector('[data-i18n="common.loading"]');
    if (label) {
      label.textContent = lookup(
        'common.loadError',
        'Unable to load the QR Code Generator.',
      );
    }
  });
