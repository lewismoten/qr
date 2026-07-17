import { createTabSet } from '../tab-set.js';

export function createStyleSubtabs({ buttons, panels }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'styleSubtab',
    panelData: 'styleSubtabPanel',
    defaultValue: 'size',
  });
}
