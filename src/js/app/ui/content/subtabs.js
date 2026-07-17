import { createTabSet } from '../tab-set.js';

export function createContentSubtabs({ buttons, panels, onActivate }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'contentSubtab',
    panelData: 'contentSubtabPanel',
    defaultValue: 'data',
    onActivate,
  });
}
