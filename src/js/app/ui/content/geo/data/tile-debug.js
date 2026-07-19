const coordinateText = (tile) => `z${tile.zoom}/${tile.x}/${tile.y}`;

export function setTileDebugCoordinates(element, { wanted, shown, fallback }) {
  const wantedText = coordinateText(wanted);
  const shownText = coordinateText(shown);
  element.dataset.wanted = wantedText;
  element.dataset.shown = shownText;
  element.dataset.overlay = fallback
    ? `want ${wantedText}\nshow ${shownText}`
    : shownText;
}
