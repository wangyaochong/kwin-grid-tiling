import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid, isOutputEnabled, isWindowTiled, clampDivider, calc, setGap } from 'config.mjs';

function setupEnv(screenOverrides = {}) {
  setupQtGlobals();
  shared.workspace = createWorkspace(screenOverrides);
  shared.kwin = {};
  shared.timer = createTimerComponent();
}

describe('Config', () => {
  beforeEach(() => {
    setupEnv();
    load((key, def) => def);
  });

  it('default config values', () => {
    assert.equal(config.grid.rows, 2);
    assert.equal(config.grid.columns, 4);
    assert.equal(config.gapShow, true);
    assert.equal(config.gapValue, 16);
    assert.equal(config.gap, 16);
    assert.equal(config.tile, true);
    assert.equal(config.border, false);
    assert.equal(config.borderActive, false);
    assert.equal(config.force, false);
    assert.equal(config.delay, 10);
    assert.equal(config.divider.bound, 0.4);
    assert.equal(config.divider.step, 0.05);
    assert.equal(config.margin.t, 0);
    assert.equal(config.margin.b, 0);
    assert.equal(config.margin.l, 0);
    assert.equal(config.margin.r, 0);
  });

  it('custom config values via read function', () => {
    const custom = { rows: 3, columns: 6, gapValue: 24, border: true };
    load((key, def) => custom[key] !== undefined ? custom[key] : def);
    assert.equal(config.grid.rows, 3);
    assert.equal(config.grid.columns, 6);
    assert.equal(config.gapValue, 24);
    assert.equal(config.border, true);
  });

  it('empty whitelist — no windows tiled', () => {
    load((key, def) => key === 'whitelist' ? '' : def);
    assert.equal(config.whitelist.length, 0);
    assert.equal(isWindowTiled('konsole'), false);
  });

  it('single whitelist pattern', () => {
    load((key, def) => key === 'whitelist' ? 'konsole' : def);
    assert.equal(isWindowTiled('konsole'), true);
    assert.equal(isWindowTiled('dolphin'), false);
  });

  it('comma-separated whitelist parsing', () => {
    load((key, def) => key === 'whitelist' ? 'konsole|dolphin,code|vscode' : def);
    assert.equal(config.whitelist.length, 2);
    assert.equal(isWindowTiled('konsole'), true);
    assert.equal(isWindowTiled('code'), true);
    assert.equal(isWindowTiled('firefox'), false);
  });

  it('default whitelist konsole|dolphin', () => {
    load((key, def) => def);
    assert.ok(isWindowTiled('konsole'));
    assert.ok(isWindowTiled('dolphin'));
    assert.equal(isWindowTiled('firefox'), false);
  });

  it('isWindowTiled with null resourceName', () => {
    load((key, def) => def);
    assert.equal(isWindowTiled(null), false);
    assert.equal(isWindowTiled(undefined), false);
  });

  it('isOutputEnabled with null/undefined — true', () => {
    assert.equal(isOutputEnabled(null), true);
    assert.equal(isOutputEnabled(undefined), true);
  });

  it('isOutputEnabled with largest output — true', () => {
    assert.equal(isOutputEnabled('DP-1'), true);
  });

  it('isOutputEnabled with non-largest — false', () => {
    assert.equal(isOutputEnabled('HDMI-1'), false);
  });

  it('clampDivider within bounds', () => {
    assert.equal(clampDivider(0.1), 0.1);
    assert.equal(clampDivider(-0.1), -0.1);
    assert.equal(clampDivider(0), 0);
  });

  it('clampDivider exceeds bounds', () => {
    assert.equal(clampDivider(1.0), 0.4);
    assert.equal(clampDivider(-1.0), -0.4);
  });

  it('calc.width/height with margins', () => {
    load((key, def) => key === 'marginL' ? 100 : key === 'marginR' ? 100 : def);
    const w = calc.width(1920, 2);
    assert.ok(w < 960, 'width should account for margins');
  });

  it('setGap toggle', () => {
    load((key, def) => def);
    assert.equal(config.gap, 16);
    config.gapShow = false;
    setGap();
    assert.equal(config.gap, 0);
    config.gapShow = true;
    setGap();
    assert.equal(config.gap, 16);
  });

  it('largest output detection', () => {
    setupEnv({
      screens: [
        { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
        { name: 'HDMI-1', geometry: { x: 0, y: 0, width: 1280, height: 720 } },
      ],
    });
    load((key, def) => def);
    assert.equal(config.largestOutput, 'DP-1');
    assert.equal(isOutputEnabled('DP-1'), true);
    assert.equal(isOutputEnabled('HDMI-1'), false);
  });

  it('grid() returns [rows, columns]', () => {
    load((key, def) => def);
    assert.deepEqual(grid(), [2, 4]);
  });
});
