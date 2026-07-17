export function createDebugStyles({ colors, getContrastingHex, getCategory }) {
  const getGroupBaseColor = (group) => {
    const rolePriority = [
      ['version', colors.version.value],
      ['format', colors.format.value],
      ['errorCorrection', colors.errorCorrection.value],
      ['terminator', colors.terminator.value],
      ['charCount', colors.charCount.value],
      ['mode', colors.mode.value],
      ['payload', colors.data.value],
      ['bytePad', colors.padding.value],
      ['padByte', colors.padding.value],
      ['remainder', colors.remainder.value],
    ];
    for (const [role, color] of rolePriority) {
      if (group.roles?.includes(role)) return color;
    }

    switch (group.kind) {
      case 'errorCorrection':
        return colors.errorCorrection.value;
      case 'metadata':
        return colors.format.value;
      case 'remainder':
        return colors.remainder.value;
      case 'padding':
      case 'padByte':
        return colors.padding.value;
      case 'header':
        return colors.mode.value;
      case 'data':
      default:
        return colors.data.value;
    }
  };

  const getCodewordStyle = (group) => {
    const color = getGroupBaseColor(group);
    let opacity = 0.7;
    if (group.kind === 'header') opacity = 0.9;
    else if (group.kind === 'padding' || group.kind === 'padByte')
      opacity = 0.75;
    else if (group.kind === 'remainder') opacity = 0.78;
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

  const getModuleContrastColor = (module, qrDefinition, debugModel) => {
    const category = getCategory(
      module.row,
      module.column,
      qrDefinition,
      debugModel,
      'overlay',
    );
    return getContrastingHex(getCategoryOverlayColor(category));
  };

  return { getCodewordStyle, getModuleContrastColor };
}
