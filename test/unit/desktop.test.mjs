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

  it('moved across screens — window relocated', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 2560, height: 1440 } },
      { name: 'DP-2', geometry: { x: 2560, y: 0, width: 1920, height: 1080 } },
    ];
    config.largestOutput = 'DP-1';
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    assert.equal(w.outputName, 'DP-1');
    w.output = { name: 'DP-2' };
    const result = desktop.moved(w);
    assert.equal(result, w);
  });

  it('moved with no direction — unchanged', () => {
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    const result = desktop.moved(w);
    assert.equal(result, w);
  });

  it('moved to disabled output — no relocation', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'HDMI-1', geometry: { x: 1920, y: 0, width: 1280, height: 720 } },
    ];
    const desktop = Desktop();
    const w = createWindow({ output: { name: 'DP-1' } });
    desktop.add(w, 'desk-0');
    w.output = { name: 'HDMI-1' };
    const result = desktop.moved(w);
    assert.equal(result, w);
  });

  it('render with multiple enabled outputs', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'DP-2', geometry: { x: 1920, y: 0, width: 1920, height: 1080 } },
    ];
    config.largestOutput = 'DP-1';
    const desktop = Desktop();
    const w1 = createWindow();
    desktop.add(w1, 'desk-0');
    assert.doesNotThrow(() => desktop.render({ id: 'desk-0' }));
  });

  it('moved skips disabled outputs and wraps around', () => {
    shared.workspace.screens = [
      { name: 'HDMI-1', geometry: { x: 0, y: 0, width: 1280, height: 720 } },
      { name: 'DP-1', geometry: { x: 1280, y: 0, width: 2560, height: 1440 } },
    ];
    config.largestOutput = 'DP-1';
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    assert.equal(w.outputName, 'DP-1');
    w.output = { name: 'HDMI-1' };
    const result = desktop.moved(w);
    assert.equal(result, w);
  });

  it('moved to full output — no relocation possible', () => {
    const desktop = Desktop();
    const g = grid();
    for (let col = 0; col < g[1]; col++) {
      for (let row = 0; row < g[0]; row++) {
        desktop.add(createWindow(), 'desk-0');
      }
    }
    const w = desktop.outputs['DP-1'].lists[0].windows[0];
    w.output = { name: 'HDMI-1' };
    const result = desktop.moved(w);
    assert.equal(result, w);
  });

  it('moved across screens — save/restore and remove from old output', () => {
    shared.workspace.screens = [
      { name: 'HDMI-1', geometry: { x: 0, y: 0, width: 1280, height: 720 } },
      { name: 'DP-1', geometry: { x: 1280, y: 0, width: 2560, height: 1440 } },
    ];
    config.largestOutput = 'DP-1';
    const desktop = Desktop();
    const w = createWindow();
    desktop.add(w, 'desk-0');
    assert.equal(w.outputName, 'DP-1');
    assert.ok(desktop.outputs['DP-1']);
    w.output = { name: 'HDMI-1' };
    const result = desktop.moved(w);
    assert.equal(result, w);
    assert.equal(w.outputName, 'DP-1');
  });

  it('moved to another enabled output — relocated via moved()', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 2560, height: 1440 } },
      { name: 'DP-2', geometry: { x: 2560, y: 0, width: 3840, height: 2160 } },
    ];
    load((key, def) => def);
    assert.equal(config.largestOutput, 'DP-2');
    const desktop = Desktop();
    const w = createWindow({ output: { name: 'DP-2' } });
    desktop.add(w, 'desk-0');
    assert.ok(desktop.outputs['DP-2'], 'window added to DP-2 output');
    assert.equal(w.outputName, 'DP-2');
    config.largestOutput = 'DP-1';
    w.output = { name: 'DP-1' };
    const result = desktop.moved(w);
    assert.equal(result, w);
    assert.equal(w.outputName, 'DP-1', 'outputName should be updated to DP-1');
    assert.ok(shared.workspace.sendClientToScreenCalls.length > 0, 'sendClientToScreen should be called');
  });
});
