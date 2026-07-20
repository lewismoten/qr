import { createTabSet } from '../tab-set.js';

export function createStyleSubtabs({ buttons, panels, onActivate }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'styleSubtab',
    panelData: 'styleSubtabPanel',
    defaultValue: 'size',
    onActivate,
  });
}
