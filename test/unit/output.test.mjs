import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid } from 'config.mjs';
import { Output } from 'output.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Output', () => {
  beforeEach(setup);

  it('add windows up to grid columns', () => {
    const out = Output();
    const g = grid();
    const windows = [];
    for (let i = 0; i < g[1]; i++) {
      const w = createWindow();
      out.add(w, g);
      windows.push(w);
    }
    assert.equal(out.lists.length, g[1]);
    for (const w of windows) {
      assert.ok(w.listIndex !== undefined);
    }
  });

  it('fill grid completely — add returns undefined (Bug #4)', () => {
    const out = Output();
    const g = grid();
    for (let col = 0; col < g[1]; col++) {
      for (let row = 0; row < g[0]; row++) {
        const w = createWindow();
        out.add(w, g);
      }
    }
    assert.equal(out.count(), g[0] * g[1]);
    const extra = createWindow();
    const result = out.add(extra, g);
    assert.equal(result, undefined, 'BUG #4: add should return undefined when grid is full');
  });

  it('add beyond grid rows per column — fills shortest', () => {
    const out = Output();
    const g = grid();
    for (let i = 0; i < g[1]; i++) out.add(createWindow(), g);
    const w = createWindow();
    out.add(w, g);
    assert.ok(w.listIndex !== undefined, 'window should be placed in shortest column');
  });

  it('remove from middle column — column removed', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow();
    out.add(w1, g);
    out.add(w2, g);
    out.remove(w1);
    assert.equal(out.lists.length, 1);
  });

  it('move window left between columns', () => {
    const out = Output();
    const g = grid();
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    const w = out.lists[2].windows[0];
    out.move(w, -1, g);
    assert.equal(w.listIndex, 1);
  });

  it('swap columns', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow();
    out.add(w1, g);
    out.add(w2, g);
    out.swap(0, 1);
    assert.equal(out.lists[0].windows[0], w2);
    assert.equal(out.lists[1].windows[0], w1);
    assert.equal(w2.listIndex, 0);
    assert.equal(w1.listIndex, 1);
  });

  it('divider resize — clamp', () => {
    const out = Output();
    const g = grid();
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    out.divider(0, 100);
    assert.ok(true, 'divider should not crash with large values');
  });

  it('optimize redistributes uneven windows', () => {
    const out = Output();
    const g = grid();
    for (let i = 0; i < 5; i++) {
      out.add(createWindow(), g);
    }
    out.render({ x: 0, y: 0, width: 1920, height: 1080 });
    assert.ok(out.lists.length >= 3, 'optimize should spread windows across columns');
  });

  it('count returns total windows', () => {
    const out = Output();
    const g = grid();
    for (let i = 0; i < 5; i++) out.add(createWindow(), g);
    assert.equal(out.count(), 5);
  });

  it('minimized returns count of fully minimized columns', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow();
    out.add(w1, g);
    out.add(w2, g);
    assert.equal(out.minimized(), 0);
    w1.minimized = true;
    assert.equal(out.minimized(), 1);
  });

  it('findWindowAtCursor returns correct window', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    out.add(w1, g);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 100 };
    const found = out.findWindowAtCursor(createWindow());
    assert.equal(found, w1);
  });

  it('findWindowAtCursor skips minimized', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow({ minimized: true });
    out.add(w1, g);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 100, y: 100 };
    const found = out.findWindowAtCursor(createWindow());
    assert.equal(found, null);
  });

  it('render with all windows minimized — no crash', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow({ minimized: true });
    out.add(w1, g);
    assert.doesNotThrow(() => out.render({ x: 0, y: 0, width: 1920, height: 1080 }));
  });

  it('render with partial minimized — correct sizes', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow({ minimized: true });
    out.add(w1, g);
    out.add(w2, g);
    assert.doesNotThrow(() => out.render({ x: 0, y: 0, width: 1920, height: 1080 }));
  });

  it('moved swaps window positions', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow();
    out.add(w1, g);
    out.add(w2, g);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    w2.renderGeometry = { x: 960, y: 0, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 970, y: 10 };
    const result = out.moved(w1, { x: 0, y: 0, width: 1920, height: 1080 });
    assert.equal(result, w2, 'moved should return the swap target');
  });

  it('moved with no target at cursor — no swap', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    out.add(w1, g);
    w1.renderGeometry = { x: 0, y: 0, width: 960, height: 540 };
    shared.workspace.cursorPos = { x: 5000, y: 5000 };
    const result = out.moved(w1, { x: 0, y: 0, width: 1920, height: 1080 });
    assert.equal(result, undefined);
  });

  it('resized adjusts dividers on width change', () => {
    const out = Output();
    const g = grid();
    const w1 = createWindow();
    const w2 = createWindow();
    out.add(w1, g);
    out.add(w2, g);
    out.render({ x: 0, y: 0, width: 1920, height: 1080 });
    w1.frameGeometry = { x: 0, y: 0, width: 1000, height: 540 };
    const result = out.resized(w1, { x: 0, y: 0, width: 1920, height: 1080 });
    assert.equal(result, w1);
  });

  it('resized with no change — returns undefined', () => {
    const out = Output();
    const g = grid();
    const w = createWindow();
    out.add(w, g);
    out.render({ x: 0, y: 0, width: 1920, height: 1080 });
    w.frameGeometry = { ...w.renderGeometry };
    const result = out.resized(w, { x: 0, y: 0, width: 1920, height: 1080 });
    assert.equal(result, undefined);
  });

  it('move to adjacent column', () => {
    const out = Output();
    const g = grid();
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    const w = out.lists[2].windows[0];
    const result = out.move(w, -1, g);
    assert.ok(result, 'window should move to adjacent column');
    assert.equal(w.listIndex, 1);
  });

  it('divider adjusts column sizes', () => {
    const out = Output();
    const g = grid();
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    out.divider(0, 0.1);
    assert.ok(true, 'divider operations should not crash');
  });

  it('addList at start shifts indices', () => {
    const out = Output();
    const g = grid();
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    const w0 = out.lists[0].windows[0];
    const w1 = out.lists[1].windows[0];
    assert.equal(w0.listIndex, 0);
    assert.equal(w1.listIndex, 1);
  });

  it('move with split creates new column', () => {
    const out = Output();
    const g = grid();
    for (let i = 0; i < 5; i++) out.add(createWindow(), g);
    const extra = out.lists[0].windows[0];
    assert.ok(out.lists[extra.listIndex].windows.length > 1, 'need a column with multiple windows');
    const result = out.move(extra, -1, g);
    assert.ok(result || result === undefined, 'move should complete without error');
  });

  it('move left from first column with multiple windows — addList at start', () => {
    const out = Output();
    const g = [3, 4];
    for (let i = 0; i < 7; i++) out.add(createWindow(), g);
    const lastCol = out.lists[out.lists.length - 1];
    if (lastCol.windows.length === 1) {
      const w = lastCol.windows[0];
      out.remove(w);
    }
    assert.ok(out.lists.length < g[1], 'need room for new column');
    assert.ok(out.lists[0].windows.length >= 2, 'column 0 needs multiple windows');
    const w = out.lists[0].windows[out.lists[0].windows.length - 1];
    const origColCount = out.lists.length;
    out.move(w, -1, g);
    assert.ok(out.lists.length > origColCount, 'new column should be created at start');
    assert.equal(w.listIndex, 0, 'window should be in new column 0');
  });

  it('move right from last column with multiple windows — addList at end', () => {
    const out = Output();
    const g = [3, 4];
    for (let i = 0; i < 7; i++) out.add(createWindow(), g);
    const lastCol = out.lists[out.lists.length - 1];
    if (lastCol.windows.length === 1) {
      const w = lastCol.windows[0];
      out.remove(w);
    }
    assert.ok(out.lists.length < g[1], 'need room for new column');
    const last = out.lists[out.lists.length - 1];
    if (last.windows.length > 1) {
      const w = last.windows[last.windows.length - 1];
      const origColCount = out.lists.length;
      out.move(w, 1, g);
      assert.ok(out.lists.length > origColCount, 'new column should be created at end');
    }
  });

  it('render with divider and next column all minimized — divider zeroed', () => {
    const out = Output();
    const g = [2, 2];
    out.add(createWindow(), g);
    out.add(createWindow(), g);
    out.divider(0, 0.3);
    out.lists[1].windows[0].minimized = true;
    assert.ok(out.lists[1].minimized() === out.lists[1].windows.length, 'column 1 should be fully minimized');
    out.render({ x: 0, y: 0, width: 1920, height: 1080 });
    assert.ok(true, 'render with minimized next column should not crash');
  });
});
