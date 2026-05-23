import { shared } from 'shared.mjs';

export const config = {};

function regex(data) {
  if (data) return RegExp(data);
}

export function setGap() {
  config.gap = config.gapShow ? config.gapValue : 0;
}

function parseWhitelist(data) {
  if (!data) return [];
  return data.split(',').map((item) => {
    const trimmed = item.trim();
    return regex(trimmed);
  }).filter(Boolean);
}

export function load(read) {
  config.grid = {
    rows: read('rows', 2),
    columns: read('columns', 4),
  };

  config.gapShow = read('gapShow', true);
  config.gapValue = read('gapValue', 16);
  setGap();

  config.divider = {
    bound: read('dividerBound', 0.4),
    step: read('dividerStep', 0.05),
  };

  config.tile = read('tile', true);

  config.border = read('border', false);
  config.borderActive = read('borderActive', false);
  config.force = read('force', false);

  config.delay = read('delay', 10);

  config.margin = {
    t: read('marginT', 0),
    b: read('marginB', 0),
    l: read('marginL', 0),
    r: read('marginR', 0),
  };

  var whitelistRaw = read('whitelist', 'konsole|dolphin');
  config.whitelist = parseWhitelist(whitelistRaw);

  let largest = null;
  let maxPixels = 0;
  let largestGeo = null;
  for (const screen of shared.workspace.screens) {
    const geo = screen.geometry;
    const pixels = geo.width * geo.height;
    if (pixels > maxPixels) {
      maxPixels = pixels;
      largest = screen.name;
      largestGeo = geo;
    }
  }
  config.largestOutput = largest;
  config.monitorInfo = largest && largestGeo
    ? largest + ': ' + largestGeo.width + 'x' + largestGeo.height
    : '';
}

export function grid() {
  return [config.grid.rows, config.grid.columns];
}

export function isOutputEnabled(outputName) {
  if (!outputName) return true;
  return outputName === config.largestOutput;
}

export function isWindowTiled(resourceName) {
  if (!config.whitelist || config.whitelist.length === 0) return false;
  return config.whitelist.some((r) => r.test(resourceName || ''));
}

export function clampDivider(value) {
  return Math.min(Math.max(-config.divider.bound, value), config.divider.bound);
}

export const calc = {
  x: (start) => start + config.margin.l + config.gap,
  y: (start) => start + config.margin.t + config.gap,
  width: (total, n) => (total - config.margin.l - config.margin.r - (n + 1) * config.gap) / n,
  height: (total, n) => (total - config.margin.t - config.margin.b - (n + 1) * config.gap) / n,
};
