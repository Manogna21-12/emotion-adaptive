/**
 * Optional chart helpers for LazyChart (LazyComponents).
 * Extend when adding shared chart rendering.
 */
export function renderChart(container, _type, _data, _options) {
  if (container && typeof container.textContent === "string") {
    container.textContent = "";
  }
}
