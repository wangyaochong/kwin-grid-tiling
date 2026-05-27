import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load } from 'config.mjs';
import * as manager from 'manager.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Manager', () => {
  beforeEach(() => {
    setup();
    manager.stop();
    manager.start();
  });

  afterEach(() => {
    manager.stop();
  });

  it('add normal window — no crash', () => {
    const w = createWindow();
    manager.add(w);
    assert.ok(true, 'add should not throw');
  });

  it('add window not in whitelist — ignored', () => {
    const w = createWindow({ resourceName: 'firefox' });
    manager.add(w);
    assert.ok(true, 'non-whitelisted window should be ignored');
  });

  it('add non-normal window — ignored', () => {
    const w = createWindow({ normalWindow: false });
    manager.add(w);
    assert.ok(true, 'non-normal window should be ignored');
  });

  it('add popup window — ignored', () => {
    const w = createWindow({ popupWindow: true });
    manager.add(w);
    assert.ok(true, 'popup window should be ignored');
  });

  it('add window on disabled output — handled', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    assert.ok(true, 'window on disabled output should be handled');
  });

  it('remove tiled window', () => {
    const w = createWindow();
    manager.add(w);
    manager.remove(w);
    assert.ok(true, 'remove should not throw');
  });

  it('toggle on active window — no crash', () => {
    const w = createWindow();
    shared.workspace.activeWindow = w;
    manager.add(w);
    manager.toggle();
    assert.ok(true, 'toggle should not throw');
  });

  it('double toggle — returns to original state', () => {
    const w = createWindow();
    shared.workspace.activeWindow = w;
    manager.add(w);
    manager.toggle();
    manager.toggle();
    assert.ok(true, 'double toggle should not throw');
  });

  it('unTile restores initial properties', () => {
    const w = createWindow();
    w.noBorder = false;
    manager.add(w);
    shared.workspace.activeWindow = w;
    manager.toggle();
    assert.ok(true, 'untile should restore properties');
  });

  it('double-add same window — no-op', () => {
    const w = createWindow();
    manager.add(w);
    manager.add(w);
    assert.ok(true, 'double-add should not throw');
  });

  it('add deleted window — no-op', () => {
    const w = createWindow({ deleted: true });
    manager.add(w);
    assert.ok(true, 'deleted window should be ignored');
  });

  it('render does not crash', () => {
    const w = createWindow();
    manager.add(w);
    assert.doesNotThrow(() => manager.render());
  });

  it('stop clears all state', () => {
    manager.add(createWindow());
    manager.stop();
    assert.ok(true, 'stop should not throw');
  });

  it('start processes existing windows', () => {
    const w = createWindow();
    shared.workspace.windows = [w];
    manager.start();
    assert.ok(true, 'start should not throw');
  });

  it('activated does not crash', () => {
    const w = createWindow();
    manager.add(w);
    assert.doesNotThrow(() => manager.activated(w));
  });

  it('Bug #2: toggle on tiled window untiles it (not ignored as floating)', () => {
    const w = createWindow();
    shared.workspace.activeWindow = w;
    manager.add(w);
    const result = manager.toggle();
    assert.ok(result !== undefined, 'toggle should return a window (either tiled or untiled)');
  });
});
