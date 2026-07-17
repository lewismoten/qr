import { createTabSet } from './tab-set.js';

export function createPrimaryTabs({ buttons, panels, onActivate }) {
  return createTabSet({
    buttons,
    panels,
    buttonData: 'tab',
    panelData: 'tabPanel',
    defaultValue: 'content',
    setAriaPressed: false,
    onActivate,
  });
}
