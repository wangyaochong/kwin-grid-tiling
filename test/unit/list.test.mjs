import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, clampDivider } from 'config.mjs';
import { List } from 'list.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('List', () => {
  beforeEach(setup);

  it('add 1 window should create 0 dividers', () => {
    const list = List();
    const w = createWindow();
    list.add(w);
    assert.equal(list.windows.length, 1);
    assert.equal(list.dividers.length, 0, 'BUG #1: first window should not create a divider');
  });

  it('add 3 windows should create 2 dividers', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    assert.equal(list.windows.length, 3);
    assert.equal(list.dividers.length, 2, '3 windows should have 2 dividers');
  });

  it('add 2 windows then remove first — divider alignment', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    list.add(w1);
    list.add(w2);
    assert.equal(list.dividers.length, 1);
    list.remove(w1);
    assert.equal(list.windows.length, 1);
    assert.equal(list.dividers.length, 0, '1 remaining window should have 0 dividers');
  });

  it('add 3 windows then remove first — divider shift', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    list.remove(w1);
    assert.equal(list.windows.length, 2);
    assert.equal(list.windows[0].windowIndex, 0);
    assert.equal(list.windows[1].windowIndex, 1);
    assert.equal(list.dividers.length, 1);
  });

  it('add 3 windows then remove last — splice correct', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    list.remove(w3);
    assert.equal(list.windows.length, 2);
    assert.equal(list.dividers.length, 1);
  });

  it('add 3 windows then remove middle — indices correct', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    list.remove(w2);
    assert.equal(list.windows.length, 2);
    assert.equal(list.windows[0].windowIndex, 0);
    assert.equal(list.windows[1].windowIndex, 1);
    assert.equal(list.dividers.length, 1);
  });

  it('swap(0, +1) with 3 windows', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    const result = list.swap(0, 1);
    assert.equal(list.windows[0], w2);
    assert.equal(list.windows[1], w1);
    assert.equal(w2.windowIndex, 0);
    assert.equal(w1.windowIndex, 1);
  });

  it('swap(2, +1) out of bounds — no-op', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    list.add(w1);
    list.add(w2);
    const result = list.swap(1, 1);
    assert.equal(result, undefined);
    assert.equal(list.windows[0], w1);
    assert.equal(list.windows[1], w2);
  });

  it('dividerPost/dividerPre clamp', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow();
    const w3 = createWindow();
    list.add(w1);
    list.add(w2);
    list.add(w3);
    list.dividerPost(0, 10);
    assert.ok(list.dividers[0] <= config.divider.bound);
    list.dividerPre(2, 10);
    assert.ok(list.dividers[1] >= -config.divider.bound);
  });

  it('render with minimized windows — skipped', () => {
    const list = List();
    const w1 = createWindow();
    const w2 = createWindow({ minimized: true });
    list.add(w1);
    list.add(w2);
    assert.doesNotThrow(() => list.render(0, 0, 800, 600));
  });

  it('sequential add/remove stress — indices never out of sync', () => {
    const list = List();
    const windows = [];
    for (let i = 0; i < 10; i++) {
      const w = createWindow();
      windows.push(w);
      list.add(w);
    }
    assert.equal(list.windows.length, 10);
    assert.equal(list.dividers.length, 9);

    for (let i = 0; i < 10; i += 2) {
      list.remove(windows[i]);
    }
    for (let i = 0; i < list.windows.length; i++) {
      assert.equal(list.windows[i].windowIndex, i);
    }
    assert.equal(list.dividers.length, list.windows.length - 1);
  });
});
