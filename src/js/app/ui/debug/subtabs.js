import { createTabSet } from '../tab-set.js';

export function createDebugSubtabs({ buttons, panels, onActivate }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'subtab',
    panelData: 'subtabPanel',
    defaultValue: 'encoding',
    setAriaPressed: false,
    onActivate,
  });
}
