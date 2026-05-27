import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid } from 'config.mjs';
import { Desktop } from 'desktop.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Desktop', () => {
  beforeEach(setup);

  it('add window to enabled output', () => {
    const desktop = Desktop();
    const w = createWindow();
    const result = desktop.add(w, 'desk-0');
    assert.equal(result, w);
    assert.equal(w.outputName, 'DP-1');
  });

  it('add window to disabled output — rejected', () => {
    const desktop = Desktop();
    const w = createWindow({ output: { name: 'HDMI-1' } });
    const result = desktop.add(w, 'desk-0');
    assert.equal(result, undefined);
    assert.equal(desktop.count(), 0);
  });

  it('add multiple windows to same output', () => {
    const desktop = Desktop();
    const w1 = createWindow();
    const w2 = createWindow();
    desktop.add(w1, 'desk-0');
    desktop.add(w2, 'desk-0');
    assert.equal(desktop.count(), 2);
  });

  it('remove window — output cleaned up when empty', () => {
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    const result = desktop.remove(w);
    assert.equal(result, w);
    assert.equal(Object.keys(desktop.outputs).length, 0);
  });

  it('remove window — output persists when other windows remain', () => {
    const desktop = Desktop();
    const w1 = createWindow();
    const w2 = createWindow();
    desktop.add(w1, 'desk-0');
    desktop.add(w2, 'desk-0');
    desktop.remove(w1);
    assert.equal(Object.keys(desktop.outputs).length, 1);
    assert.equal(desktop.count(), 1);
  });

  it('remove non-existent window — no crash', () => {
    const desktop = Desktop();
    const w = createWindow();
    assert.equal(desktop.remove(w), undefined);
  });

  it('count returns 0 for empty desktop', () => {
    const desktop = Desktop();
    assert.equal(desktop.count(), 0);
  });

  it('count across multiple outputs', () => {
    const desktop = Desktop();
    const w1 = createWindow();
    desktop.add(w1, 'desk-0');
    assert.equal(desktop.count(), 1);
  });

  it('render only enabled outputs — no crash', () => {
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    assert.doesNotThrow(() => desktop.render({ id: 'desk-0' }));
  });

  it('render empty desktop — no crash', () => {
    const desktop = Desktop();
    assert.doesNotThrow(() => desktop.render({ id: 'desk-0' }));
  });

  it('moved with no direction — returns window unchanged', () => {
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    const result = desktop.moved(w);
    assert.equal(result, w);
    assert.equal(w.outputName, 'DP-1');
  });

  it('add returns undefined when output grid is full', () => {
    const desktop = Desktop();
    const g = grid();
    for (let col = 0; col < g[1]; col++) {
      for (let row = 0; row < g[0]; row++) {
        desktop.add(createWindow(), 'desk-0');
      }
    }
    const extra = createWindow();
    const result = desktop.add(extra, 'desk-0');
    assert.equal(result, undefined);
  });
});
