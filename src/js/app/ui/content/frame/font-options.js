const FONT_WEIGHT_BOLD = 700;
const FONT_WEIGHT_EXTRA_BOLD = 800;

export const FRAME_FONT_OPTIONS = Object.freeze([
  {
    value: 'sans',
    key: 'frame.sans',
    label: 'Sans',
    family: '"Avenir Next", "Segoe UI", sans-serif',
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'rounded',
    key: 'frame.round',
    label: 'Round',
    family: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'serif',
    key: 'frame.serif',
    label: 'Serif',
    family: 'Georgia, "Times New Roman", serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'mono',
    key: 'frame.monospace',
    label: 'Monospace',
    family: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'arial',
    label: 'Arial',
    family: 'Arial, Helvetica, sans-serif',
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'verdana',
    label: 'Verdana',
    family: 'Verdana, Geneva, sans-serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'trebuchet',
    label: 'Trebuchet MS',
    family: '"Trebuchet MS", sans-serif',
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'times',
    label: 'Times New Roman',
    family: '"Times New Roman", Times, serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'palatino',
    label: 'Palatino',
    family: 'Palatino, "Palatino Linotype", serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'courier',
    label: 'Courier New',
    family: '"Courier New", Courier, monospace',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'impact',
    label: 'Impact',
    family: 'Impact, Haettenschweiler, sans-serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'cursive',
    label: 'Comic Sans MS',
    family: '"Comic Sans MS", "Bradley Hand", cursive',
    weight: FONT_WEIGHT_BOLD,
  },
]);

export function getFrameFontOption(value) {
  return (
    FRAME_FONT_OPTIONS.find((option) => option.value === value) ||
    FRAME_FONT_OPTIONS[0]
  );
}

export function getFrameFont(value, size) {
  const option = getFrameFontOption(value);
  return `${option.weight} ${size}px ${option.family}`;
}
