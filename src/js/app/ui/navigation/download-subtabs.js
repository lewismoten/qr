import { createTabSet } from '../tab-set.js';

export function createDownloadSubtabs({ buttons, panels, onActivate }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'downloadSubtab',
    panelData: 'downloadSubtabPanel',
    defaultValue: 'image',
    onActivate,
  });
}
