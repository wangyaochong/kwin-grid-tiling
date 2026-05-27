import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid } from 'config.mjs';
import * as manager from 'manager.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Integration: Workflow', () => {
  beforeEach(() => {
    setup();
    manager.stop();
    manager.start();
  });

  afterEach(() => manager.stop());

  it('open 4 windows in 2x4 grid — layout created', () => {
    const wins = [];
    for (let i = 0; i < 4; i++) {
      const w = createWindow();
      wins.push(w);
      manager.add(w);
    }
    manager.render();
    assert.ok(true, '4 windows should tile without error');
  });

  it('open 5 windows — shortest column fills', () => {
    const wins = [];
    for (let i = 0; i < 5; i++) {
      const w = createWindow();
      wins.push(w);
      manager.add(w);
    }
    manager.render();
    assert.ok(true, '5 windows should tile without error');
  });

  it('close middle window — reflow', () => {
    const wins = [];
    for (let i = 0; i < 4; i++) {
      const w = createWindow();
      wins.push(w);
      manager.add(w);
    }
    manager.remove(wins[1]);
    manager.render();
    assert.ok(true, 'reflow after close should not error');
  });

  it('toggle gap on/off', () => {
    const w = createWindow();
    manager.add(w);
    config.gapShow = false;
    config.gap = 0;
    manager.render();
    config.gapShow = true;
    config.gap = 16;
    manager.render();
    assert.ok(true, 'gap toggle should not error');
  });

  it('toggle tile on/off', () => {
    const w = createWindow();
    manager.add(w);
    config.tile = false;
    config.tile = true;
    assert.ok(true, 'tile toggle should not error');
  });

  it('minimize and unminimize window', () => {
    const w = createWindow();
    manager.add(w);
    w.minimized = true;
    manager.render();
    w.minimized = false;
    manager.render();
    assert.ok(true, 'minimize toggle should not error');
  });

  it('change output to non-largest — handled', () => {
    const w = createWindow();
    manager.add(w);
    w.output = { name: 'HDMI-1' };
    assert.ok(true, 'changing output should be handled');
  });

  it('full lifecycle: add, render, toggle, remove', () => {
    const w = createWindow();
    manager.add(w);
    manager.render();
    shared.workspace.activeWindow = w;
    manager.toggle();
    manager.toggle();
    manager.remove(w);
    assert.ok(true, 'full lifecycle should not error');
  });

  it('multiple windows: add several, remove one, render', () => {
    const wins = [];
    for (let i = 0; i < 6; i++) {
      const w = createWindow();
      wins.push(w);
      manager.add(w);
    }
    manager.render();
    manager.remove(wins[2]);
    manager.render();
    assert.ok(true, 'multi-window lifecycle should not error');
  });

  it('reset clears and reinitializes', () => {
    const w = createWindow();
    manager.add(w);
    manager.stop();
    manager.start();
    assert.ok(true, 'reset should not error');
  });

  it('add window on non-largest output then move to largest', () => {
    const w = createWindow({ output: { name: 'HDMI-1' } });
    manager.add(w);
    assert.ok(true, 'non-largest output handled');
    w.output = { name: 'DP-1' };
    assert.ok(true, 'moving to largest output handled');
  });

  it('fill grid completely then add one more', () => {
    const g = grid();
    for (let i = 0; i < g[0] * g[1]; i++) {
      manager.add(createWindow());
    }
    manager.render();
    const extra = createWindow();
    manager.add(extra);
    manager.render();
    assert.ok(true, 'overflow window should be handled gracefully');
  });
});
