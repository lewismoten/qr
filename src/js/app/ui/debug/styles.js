import { QR_STREAM_GROUP, QR_STREAM_ROLE } from '../../qr/qr-stream.js';

const CODEWORD_OPACITY = {
  default: 0.7,
  header: 0.9,
  padding: 0.75,
  remainder: 0.78,
};

export function createDebugStyles({ colors, getContrastingHex, getCategory }) {
  const getGroupBaseColor = (group) => {
    const rolePriority = [
      ['version', colors.version.value],
      ['format', colors.format.value],
      [QR_STREAM_ROLE.errorCorrection, colors.errorCorrection.value],
      [QR_STREAM_ROLE.terminator, colors.terminator.value],
      [QR_STREAM_ROLE.characterCount, colors.charCount.value],
      [QR_STREAM_ROLE.mode, colors.mode.value],
      [QR_STREAM_ROLE.payload, colors.data.value],
      [QR_STREAM_ROLE.byteAlignment, colors.padding.value],
      [QR_STREAM_ROLE.paddingCodeword, colors.padding.value],
      [QR_STREAM_ROLE.remainder, colors.remainder.value],
    ];
    for (const [role, color] of rolePriority) {
      if (group.roles?.includes(role)) return color;
    }

    switch (group.kind) {
      case QR_STREAM_ROLE.errorCorrection:
        return colors.errorCorrection.value;
      case 'metadata':
        return colors.format.value;
      case QR_STREAM_ROLE.remainder:
        return colors.remainder.value;
      case QR_STREAM_GROUP.padding:
      case QR_STREAM_ROLE.paddingCodeword:
        return colors.padding.value;
      case QR_STREAM_GROUP.header:
        return colors.mode.value;
      case QR_STREAM_GROUP.data:
      default:
        return colors.data.value;
    }
  };

  const getCodewordStyle = (group) => {
    const color = getGroupBaseColor(group);
    let opacity = CODEWORD_OPACITY.default;
    if (group.kind === QR_STREAM_GROUP.header) {
      opacity = CODEWORD_OPACITY.header;
    } else if (
      group.kind === QR_STREAM_GROUP.padding ||
      group.kind === QR_STREAM_ROLE.paddingCodeword
    ) {
      opacity = CODEWORD_OPACITY.padding;
    } else if (group.kind === QR_STREAM_ROLE.remainder) {
      opacity = CODEWORD_OPACITY.remainder;
    }
    return { color, strokeColor: getContrastingHex(color), opacity };
  };

  const getCategoryOverlayColor = (category) => {
    const colorByCategory = {
      mode: colors.mode,
      charCount: colors.charCount,
      ecLevel: colors.ecLevel,
      mask: colors.mask,
      errorCorrection: colors.errorCorrection,
      padding: colors.padding,
      remainder: colors.remainder,
      terminator: colors.terminator,
      finder: colors.finder,
      alignment: colors.alignment,
      timing: colors.timing,
      darkModule: colors.darkModule,
      format: colors.format,
      version: colors.version,
      data: colors.data,
    };
    return (colorByCategory[category] || colors.data).value;
  };

  const getContrastColor = (module, qrDefinition, debugModel) => {
    const category = getCategory(
      module.row,
      module.column,
      qrDefinition,
      debugModel,
      'overlay',
    );
    return getContrastingHex(getCategoryOverlayColor(category));
  };

  return { getCodewordStyle, getContrastColor };
}
