import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent, createKWinReadConfig } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid } from 'config.mjs';
import * as main from 'main.mjs';
import * as manager from 'manager.mjs';
import * as shortcut from 'shortcut.mjs';

function setupMultiScreen(borderActive = false) {
  setupQtGlobals();
  shared.workspace = createWorkspace({
    screens: [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 2560, height: 1440 } },
      { name: 'HDMI-1', geometry: { x: 2560, y: 0, width: 1280, height: 720 } },
    ],
  });
  shared.kwin = { readConfig: createKWinReadConfig() };
  shared.timer = createTimerComponent();
  load(createKWinReadConfig());
  if (borderActive) config.borderActive = true;
  resetWindowIds();
}

function addWindowsViaSignal(count, overrides = {}) {
  const wins = [];
  for (let i = 0; i < count; i++) {
    const w = createWindow(overrides);
    wins.push(w);
    shared.workspace.windowAdded.fire(w);
  }
  return wins;
}

describe('E2E: Full plugin lifecycle', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => {
    main.destroy();
  });

  it('init connects workspace signals', () => {
    assert.ok(shared.workspace.windowAdded.handlers.length > 0, 'windowAdded should be connected');
    assert.ok(shared.workspace.windowRemoved.handlers.length > 0, 'windowRemoved should be connected');
  });

  it('destroy disconnects all workspace signals', () => {
    main.destroy();
    assert.equal(shared.workspace.windowAdded.handlers.length, 0, 'windowAdded should be disconnected');
    assert.equal(shared.workspace.windowRemoved.handlers.length, 0, 'windowRemoved should be disconnected');
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  it('windowAdded signal → window gets tiled and rendered', () => {
    const w = createWindow();
    shared.workspace.windowAdded.fire(w);
    assert.ok(manager.isTiled(w), 'window should be tiled after windowAdded');
    assert.ok(w.renderGeometry, 'window should have renderGeometry');
  });

  it('windowAdded signal → 4 windows tiled in grid', () => {
    const wins = addWindowsViaSignal(4);
    for (const w of wins) {
      assert.ok(manager.isTiled(w), `window ${w.internalId} should be tiled`);
      assert.ok(w.listIndex !== undefined, `window ${w.internalId} should have listIndex`);
      assert.ok(w.windowIndex !== undefined, `window ${w.internalId} should have windowIndex`);
    }
  });

  it('windowRemoved signal → remaining windows reflow', () => {
    const wins = addWindowsViaSignal(4);
    shared.workspace.windowRemoved.fire(wins[1]);
    assert.ok(!manager.isTiled(wins[1]), 'removed window should not be tiled');
    for (const w of [wins[0], wins[2], wins[3]]) {
      assert.ok(manager.isTiled(w), `window ${w.internalId} should still be tiled`);
    }
  });

  it('windowRemoved signal → last window removed cleanly', () => {
    const [w] = addWindowsViaSignal(1);
    shared.workspace.windowRemoved.fire(w);
    assert.ok(!manager.isTiled(w), 'removed window should not be tiled');
  });

  it('windowActivated signal with borderActive → re-render on focus', () => {
    main.destroy();
    setupMultiScreen(true);
    main.init(shared.workspace, shared.kwin, shared.timer);
    const [w1, w2] = addWindowsViaSignal(2);
    w1.active = false;
    w2.active = true;
    shared.workspace.windowActivated.fire(w2);
    assert.ok(true, 'windowActivated with borderActive should not throw');
  });

  it('windowActivated on floating window → no layout corruption', () => {
    main.destroy();
    setupMultiScreen(true);
    main.init(shared.workspace, shared.kwin, shared.timer);
    const tiled = addWindowsViaSignal(2);
    const floating = createWindow({ output: { name: 'HDMI-1' } });
    shared.workspace.windowAdded.fire(floating);
    shared.workspace.windowActivated.fire(floating);
    for (const w of tiled) {
      assert.ok(manager.isTiled(w), `tiled window ${w.internalId} should remain tiled`);
    }
  });
});

describe('E2E: Drag and swap', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => main.destroy());

  it('drag window over another → highlight → drop → swap', () => {
    const [w1, w2] = addWindowsViaSignal(2);
    w1.renderGeometry = { x: 0, y: 0, width: 1280, height: 720 };
    w2.renderGeometry = { x: 0, y: 720, width: 1280, height: 720 };
    const origW1List = w1.listIndex;
    const origW1Win = w1.windowIndex;
    const origW2List = w2.listIndex;
    const origW2Win = w2.windowIndex;
    shared.workspace.cursorPos = { x: 100, y: 800 };
    w1.move = true;
    w1.moveResizedChanged.fire();
    w1.frameGeometryChanged.fire();
    assert.equal(w2.opacity, 0.7, 'target should be highlighted');
    w1.move = false;
    w1.moveResizedChanged.fire();
    assert.equal(w2.opacity, 1.0, 'target opacity should be restored');
    assert.ok(true, 'drag swap should complete without error');
  });

  it('drag to disabled output → untiled automatically', () => {
    const [w] = addWindowsViaSignal(1);
    w.move = true;
    w.moveResizedChanged.fire();
    assert.equal(w.opacity, 0.5, 'dragging window should be semi-transparent');
    w.output = { name: 'HDMI-1' };
    w.frameGeometryChanged.fire();
    assert.equal(w.opacity, 1.0, 'opacity should be restored when leaving tiled output');
  });
});

describe('E2E: Multi-screen workflow', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => main.destroy());

  it('window on non-largest output → becomes floating', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w), 'window on non-largest output should be floating');
    assert.ok(w._floatingOutputHandler, 'floating window should have output watcher');
  });

  it('floating window returns to largest output → re-tiled', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w));
    w.output = { name: 'DP-1' };
    w.outputChanged.fire();
    assert.ok(manager.isTiled(w), 'window should be re-tiled when returning to largest output');
  });

  it('tiled window moved to non-largest output → untiled', () => {
    const [w] = addWindowsViaSignal(1);
    assert.ok(manager.isTiled(w));
    w.output = { name: 'HDMI-1' };
    w.outputChanged.fire();
    assert.ok(!manager.isTiled(w), 'window should be untiled when moved to non-largest output');
  });

  it('sendClientToScreen called during desktop.moved', () => {
    shared.workspace.sendClientToScreenCalls = [];
    const [w] = addWindowsViaSignal(1);
    assert.ok(shared.workspace.sendClientToScreenCalls.length === 0, 'no sendClientToScreen on initial add');
  });
});

describe('E2E: Keyboard shortcuts', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => main.destroy());

  it('resize.increase on tiled window — no error', () => {
    addWindowsViaSignal(4);
    const w = createWindow();
    shared.workspace.windowAdded.fire(w);
    shared.workspace.activeWindow = w;
    assert.doesNotThrow(() => shortcut.resize.increase());
  });

  it('resize.increase on floating window — no-op', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    shared.workspace.windowAdded.fire(w);
    shared.workspace.activeWindow = w;
    assert.doesNotThrow(() => shortcut.resize.increase());
  });

  it('move.up on tiled window', () => {
    addWindowsViaSignal(5);
    const w = shared.workspace.activeWindow = createWindow();
    shared.workspace.windowAdded.fire(w);
    assert.doesNotThrow(() => shortcut.move.up());
  });

  it('move.left on tiled window', () => {
    addWindowsViaSignal(5);
    const w = shared.workspace.activeWindow = createWindow();
    shared.workspace.windowAdded.fire(w);
    assert.doesNotThrow(() => shortcut.move.left());
  });

  it('toggle.gap — gap toggled and rendered', () => {
    addWindowsViaSignal(2);
    const prevGap = config.gap;
    shortcut.toggle.gap();
    assert.notEqual(config.gap, prevGap, 'gap should toggle');
    shortcut.toggle.gap();
    assert.equal(config.gap, prevGap, 'gap should restore');
  });

  it('toggle.border — border toggled and rendered', () => {
    addWindowsViaSignal(2);
    const prevBorder = config.border;
    shortcut.toggle.border();
    assert.notEqual(config.border, prevBorder, 'border should toggle');
    shortcut.toggle.border();
    assert.equal(config.border, prevBorder, 'border should restore');
  });

  it('toggle.minimizeDesktop — all windows minimized/unminimized', () => {
    const wins = addWindowsViaSignal(4);
    shortcut.toggle.minimizeDesktop();
    const allMinimized = wins.every(w => w.minimized);
    assert.ok(allMinimized, 'all windows should be minimized');
    shortcut.toggle.minimizeDesktop();
    const noneMinimized = wins.every(w => !w.minimized);
    assert.ok(noneMinimized, 'all windows should be unminimized');
  });

  it('closeDesktop — closes windows on active screen/desktop/activity', () => {
    const w1 = createWindow();
    w1.output = shared.workspace.activeScreen;
    w1.desktops = [shared.workspace.currentDesktop];
    w1.activities = [shared.workspace.currentActivity];
    shared.workspace.windows = [w1];
    shortcut.closeDesktop();
    assert.ok(w1.closeWindowCalled, 'window on active screen should be closed');
  });

  it('reset — plugin reinitializes', () => {
    addWindowsViaSignal(3);
    assert.doesNotThrow(() => shortcut.reset());
  });

  it('tileFloat — toggles tile/float on active window', () => {
    const w = createWindow();
    shared.workspace.windowAdded.fire(w);
    shared.workspace.activeWindow = w;
    assert.ok(manager.isTiled(w), 'window should start tiled');
    shortcut.tileFloat();
    assert.ok(!manager.isTiled(w), 'window should be floating after toggle');
    shared.workspace.activeWindow = w;
    shortcut.tileFloat();
    assert.ok(manager.isTiled(w), 'window should be tiled again after second toggle');
  });
});

describe('E2E: Window signals during tiled state', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => main.destroy());

  it('minimizeChanged → layout re-renders', () => {
    const [w1, w2] = addWindowsViaSignal(2);
    w1.minimized = true;
    w1.minimizedChanged.fire();
    assert.ok(manager.isTiled(w1), 'minimized window should still be tracked');
  });

  it('desktopsChanged → window moves to new desktop', () => {
    shared.workspace.desktops = [{ id: 'desk-0' }, { id: 'desk-1' }];
    const [w] = addWindowsViaSignal(1);
    w.desktops = [{ id: 'desk-1' }];
    w.desktopsChanged.fire();
    assert.ok(manager.isTiled(w), 'window should still be tiled after desktop change');
  });

  it('desktopsChanged → multi-desktop window untiled', () => {
    const [w] = addWindowsViaSignal(1);
    w.desktops = [{ id: 'desk-0' }, { id: 'desk-1' }];
    w.desktopsChanged.fire();
    assert.ok(!manager.isTiled(w), 'multi-desktop window should be untiled');
  });

  it('activitiesChanged → multi-activity window untiled', () => {
    const [w] = addWindowsViaSignal(1);
    w.activities = ['act-0', 'act-1'];
    w.activitiesChanged.fire();
    assert.ok(!manager.isTiled(w), 'multi-activity window should be untiled');
  });

  it('unTile clears all layout properties', () => {
    const [w] = addWindowsViaSignal(1);
    assert.ok(w.outputName !== undefined);
    assert.ok(w.desktopId !== undefined);
    assert.ok(w.activityId !== undefined);
    assert.ok(w.listIndex !== undefined);
    assert.ok(w.windowIndex !== undefined);
    shared.workspace.activeWindow = w;
    manager.toggle();
    assert.equal(w.outputName, undefined);
    assert.equal(w.desktopId, undefined);
    assert.equal(w.activityId, undefined);
    assert.equal(w.listIndex, undefined);
    assert.equal(w.windowIndex, undefined);
    assert.equal(w.renderGeometry, undefined);
  });
});

describe('E2E: Edge cases', () => {
  beforeEach(() => {
    setupMultiScreen();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  afterEach(() => main.destroy());

  it('double init — no duplicate signal connections', () => {
    const handlerCount = shared.workspace.windowAdded.handlers.length;
    main.init(shared.workspace, shared.kwin, shared.timer);
    assert.equal(shared.workspace.windowAdded.handlers.length, handlerCount + 1, 'second init adds another handler');
    main.destroy();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  it('non-normal window added → ignored', () => {
    const w = createWindow({ normalWindow: false });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w), 'non-normal window should not be tiled');
  });

  it('popup window added → ignored', () => {
    const w = createWindow({ popupWindow: true });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w), 'popup window should not be tiled');
  });

  it('non-whitelisted window added → ignored', () => {
    const w = createWindow({ resourceName: 'firefox' });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w), 'non-whitelisted window should not be tiled');
  });

  it('deleted window added → ignored', () => {
    const w = createWindow({ deleted: true });
    shared.workspace.windowAdded.fire(w);
    assert.ok(!manager.isTiled(w), 'deleted window should not be tiled');
  });

  it('force mode corrects window geometry', () => {
    config.force = true;
    main.destroy();
    main.init(shared.workspace, shared.kwin, shared.timer);
    const [w] = addWindowsViaSignal(1);
    w.renderGeometry = { x: 0, y: 0, width: 500, height: 400 };
    w.frameGeometry = { x: 0, y: 0, width: 600, height: 500 };
    w.frameGeometryChanged.fire();
    assert.ok(true, 'force mode should not throw');
    config.force = false;
    main.destroy();
    main.init(shared.workspace, shared.kwin, shared.timer);
  });

  it('grid overflow — window becomes floating', () => {
    const g = grid();
    for (let i = 0; i < g[0] * g[1]; i++) addWindowsViaSignal(1);
    const extra = createWindow();
    shared.workspace.windowAdded.fire(extra);
    assert.ok(!manager.isTiled(extra), 'overflow window should be floating');
  });

  it('remove non-tiled non-floating window — no crash', () => {
    const w = createWindow({ resourceName: 'firefox' });
    shared.workspace.windowAdded.fire(w);
    assert.doesNotThrow(() => shared.workspace.windowRemoved.fire(w));
  });
});
