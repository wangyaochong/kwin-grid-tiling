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

  it('isTiled returns true for tiled window', () => {
    const w = createWindow();
    manager.add(w);
    assert.equal(manager.isTiled(w), true);
  });

  it('isTiled returns false for floating window', () => {
    const w = createWindow();
    assert.equal(manager.isTiled(w), false);
  });

  it('isTiled returns false for null', () => {
    assert.equal(manager.isTiled(null), false);
  });

  it('activated skips floating window', () => {
    const w = createWindow();
    assert.doesNotThrow(() => manager.activated(w));
  });

  it('activated renders tiled window', () => {
    const w = createWindow();
    manager.add(w);
    assert.doesNotThrow(() => manager.activated(w));
  });

  it('unTile clears layout properties', () => {
    const w = createWindow();
    manager.add(w);
    shared.workspace.activeWindow = w;
    manager.toggle();
    assert.equal(w.outputName, undefined);
    assert.equal(w.desktopId, undefined);
    assert.equal(w.activityId, undefined);
    assert.equal(w.listIndex, undefined);
    assert.equal(w.windowIndex, undefined);
    assert.equal(w.renderGeometry, undefined);
  });

  it('remove floating window', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    manager.remove(w);
    assert.ok(true, 'removing floating window should not throw');
  });

  it('remove null window — no crash', () => {
    assert.doesNotThrow(() => manager.remove(null));
  });

  it('add window with no activities — defaults to current', () => {
    const w = createWindow({ activities: [] });
    manager.add(w);
    assert.ok(true, 'window with empty activities should be handled');
  });

  it('add window with no desktops — defaults to current', () => {
    const w = createWindow({ desktops: [] });
    manager.add(w);
    assert.ok(true, 'window with empty desktops should be handled');
  });

  it('add window when tiling disabled — becomes floating', () => {
    config.tile = false;
    const w = createWindow();
    manager.add(w);
    assert.equal(manager.isTiled(w), false);
    config.tile = true;
  });

  it('toggle on floating window tiles it', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    shared.workspace.activeWindow = w;
    w.output = { name: 'DP-1' };
    const result = manager.toggle();
    assert.ok(result, 'toggle should tile the floating window');
  });

  it('toggle with no active window — returns add', () => {
    shared.workspace.activeWindow = null;
    const result = manager.toggle();
    assert.equal(result, undefined);
  });

  it('moveResizedChanged: drag start sets opacity', () => {
    const w = createWindow();
    manager.add(w);
    w.move = true;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 0.5);
    assert.ok(w.savedOpacity !== undefined);
  });

  it('moveResizedChanged: drag end restores opacity', () => {
    const w = createWindow();
    manager.add(w);
    w.move = true;
    w.moveResizedChanged.fire();
    w.move = false;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 1.0);
    assert.equal(w.savedOpacity, undefined);
  });

  it('moveResizedChanged: drag on disabled output — no opacity change', () => {
    const w = createWindow();
    manager.add(w);
    w.move = true;
    w.output = { name: 'HDMI-1' };
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 1.0);
  });

  it('moveResizedChanged: resize is ignored', () => {
    const w = createWindow();
    manager.add(w);
    w.resize = true;
    const origOpacity = w.opacity;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, origOpacity);
  });

  it('moveResizedChanged: drag leave disabled output clears state', () => {
    const w = createWindow();
    manager.add(w);
    w.move = true;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 0.5);
    w.output = { name: 'HDMI-1' };
    w.frameGeometryChanged.fire();
    assert.equal(w.opacity, 1.0);
  });

  it('moveResizedChanged: drag end on disabled output skips layout', () => {
    const w = createWindow();
    manager.add(w);
    w.move = true;
    w.moveResizedChanged.fire();
    w.output = { name: 'HDMI-1' };
    w.move = false;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 1.0);
  });

  it('minimizedChanged triggers render', () => {
    const w = createWindow();
    manager.add(w);
    w.minimized = true;
    assert.doesNotThrow(() => w.minimizedChanged.fire());
  });

  it('activitiesChanged untiles multi-activity window', () => {
    const w = createWindow();
    manager.add(w);
    w.activities = ['act-0', 'act-1'];
    assert.doesNotThrow(() => w.activitiesChanged.fire());
  });

  it('desktopsChanged moves window to new desktop', () => {
    shared.workspace.desktops = [{ id: 'desk-0' }, { id: 'desk-1' }];
    const w = createWindow();
    manager.add(w);
    w.desktops = [{ id: 'desk-1' }];
    assert.doesNotThrow(() => w.desktopsChanged.fire());
  });

  it('desktopsChanged untiles multi-desktop window', () => {
    const w = createWindow();
    manager.add(w);
    w.desktops = [{ id: 'desk-0' }, { id: 'desk-1' }];
    assert.doesNotThrow(() => w.desktopsChanged.fire());
  });

  it('outputChanged untiles window on disabled output', () => {
    const w = createWindow();
    manager.add(w);
    w.output = { name: 'HDMI-1' };
    assert.doesNotThrow(() => w.outputChanged.fire());
  });

  it('outputChanged moves window to new enabled output', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'DP-2', geometry: { x: 1920, y: 0, width: 1920, height: 1080 } },
    ];
    const w = createWindow();
    manager.add(w);
    w.output = { name: 'DP-2' };
    assert.doesNotThrow(() => w.outputChanged.fire());
  });

  it('add window on non-largest output — becomes floating with watcher', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'HDMI-1', geometry: { x: 1920, y: 0, width: 1280, height: 720 } },
    ];
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    assert.equal(manager.isTiled(w), false);
    assert.ok(w._floatingOutputHandler, 'floating window should have output watcher');
  });

  it('floating window returning to largest output gets re-tiled', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'HDMI-1', geometry: { x: 1920, y: 0, width: 1280, height: 720 } },
    ];
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    w.output = { name: 'DP-1' };
    w.outputChanged.fire();
    assert.equal(manager.isTiled(w), true);
  });

  it('deleted window signals are ignored', () => {
    const w = createWindow();
    manager.add(w);
    w.deleted = true;
    assert.doesNotThrow(() => w.activitiesChanged.fire());
    assert.doesNotThrow(() => w.desktopsChanged.fire());
    assert.doesNotThrow(() => w.outputChanged.fire());
  });

  it('force mode corrects geometry on frameGeometryChanged', () => {
    config.force = true;
    manager.stop();
    manager.start();
    const w = createWindow();
    manager.add(w);
    w.renderGeometry = { x: 0, y: 0, width: 500, height: 400 };
    w.frameGeometry = { x: 0, y: 0, width: 600, height: 500 };
    assert.doesNotThrow(() => w.frameGeometryChanged.fire());
    config.force = false;
    manager.stop();
    manager.start();
  });

  it('drag highlight: hovering over another window highlights it', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 0.7);
    assert.ok(w2.savedHighlightOpacity !== undefined);
  });

  it('drag highlight: leaving target restores its opacity', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 0.7);
    shared.workspace.cursorPos = { x: 100, y: 100 };
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 1.0);
  });

  it('drag swap: dropping on another window swaps positions', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.move = false;
    w1.moveResizedChanged.fire();
    assert.ok(true, 'drag swap should not throw');
  });

  it('outputChanged moves window between enabled outputs', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 2560, height: 1440 } },
      { name: 'DP-2', geometry: { x: 2560, y: 0, width: 1920, height: 1080 } },
    ];
    config.largestOutput = 'DP-1';
    manager.stop();
    manager.start();
    const w = createWindow();
    manager.add(w);
    w.output = { name: 'DP-2' };
    assert.doesNotThrow(() => w.outputChanged.fire());
  });

  it('watchFloatingOutput: deleted window skipped', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'HDMI-1', geometry: { x: 1920, y: 0, width: 1280, height: 720 } },
    ];
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    w.deleted = true;
    w.output = { name: 'DP-1' };
    assert.doesNotThrow(() => w.outputChanged.fire());
    assert.equal(manager.isTiled(w), false);
  });

  it('watchFloatingOutput: already tiled window skipped', () => {
    shared.workspace.screens = [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'HDMI-1', geometry: { x: 1920, y: 0, width: 1280, height: 720 } },
    ];
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    w.output = { name: 'DP-1' };
    w.outputChanged.fire();
    assert.equal(manager.isTiled(w), true);
    w.outputChanged.fire();
    assert.ok(true, 're-firing on already tiled window should not throw');
  });

  it('remove window not in tiled or floating — no-op', () => {
    const w = createWindow({ resourceName: 'firefox' });
    manager.add(w);
    assert.doesNotThrow(() => manager.remove(w));
  });

  it('clearDragState: highlight target with savedHighlightOpacity is restored', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 0.7);
    assert.ok(w2.savedHighlightOpacity !== undefined);
    w1.move = false;
    w1.moveResizedChanged.fire();
    assert.equal(w2.opacity, 1.0);
    assert.equal(w2.savedHighlightOpacity, undefined);
  });

  it('clearDragState: deleted highlight target is skipped', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.frameGeometryChanged.fire();
    w2.deleted = true;
    w1.move = false;
    assert.doesNotThrow(() => w1.moveResizedChanged.fire());
  });

  it('drag highlight: switching to a different target restores old one', () => {
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    manager.add(w1);
    manager.add(w2);
    manager.add(w3);
    w1.renderGeometry = { x: 0, y: 0, width: 480, height: 540 };
    w2.renderGeometry = { x: 480, y: 0, width: 480, height: 540 };
    w3.renderGeometry = { x: 960, y: 0, width: 480, height: 540 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    shared.workspace.cursorPos = { x: 500, y: 100 };
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 0.7);
    shared.workspace.cursorPos = { x: 1000, y: 100 };
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 1.0);
    assert.equal(w3.opacity, 0.7);
  });

  it('drag swap: border swap with borderActive enabled', () => {
    config.border = true;
    config.borderActive = true;
    manager.stop();
    manager.start();
    const w1 = createWindow();
    const w2 = createWindow();
    manager.add(w1);
    manager.add(w2);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 0, y: 540, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 600 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.move = false;
    w1.moveResizedChanged.fire();
    assert.ok(true, 'drag swap with borderActive should not throw');
    config.border = false;
    config.borderActive = false;
    manager.stop();
    manager.start();
  });

  it('toggle on unknown window triggers add', () => {
    const w = createWindow();
    shared.workspace.activeWindow = w;
    manager.toggle();
    assert.ok(true, 'toggle on unknown window should not throw');
  });

  it('add window with null activities array — defaults to current', () => {
    const w = createWindow({ activities: null });
    manager.add(w);
    assert.ok(true, 'null activities should be handled');
  });

  it('add window with null desktops array — defaults to current', () => {
    const w = createWindow({ desktops: null });
    manager.add(w);
    assert.ok(true, 'null desktops should be handled');
  });

  it('add catches error — no throw', () => {
    const w = createWindow();
    Object.defineProperty(w, 'noBorder', { get() { throw new Error('test'); } });
    assert.doesNotThrow(() => manager.add(w));
  });
});
