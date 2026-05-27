import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load, grid } from 'config.mjs';
import { Activity } from 'activity.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Activity', () => {
  beforeEach(setup);

  it('add window to existing desktop', () => {
    const activity = Activity();
    const w = createWindow();
    const result = activity.add(w);
    assert.equal(result, w);
    assert.equal(w.desktopId, 'desk-0');
  });

  it('add window with empty desktops array — returns undefined', () => {
    const activity = Activity();
    const w = createWindow({ desktops: [] });
    const result = activity.add(w);
    assert.equal(result, undefined);
  });

  it('add window with no desktops property — returns undefined', () => {
    const activity = Activity();
    const w = createWindow({ desktops: null });
    const result = activity.add(w);
    assert.equal(result, undefined);
  });

  it('add multiple windows to same desktop', () => {
    const activity = Activity();
    const w1 = createWindow();
    const w2 = createWindow();
    activity.add(w1);
    activity.add(w2);
    assert.equal(activity.count(), 2);
  });

  it('remove last window — desktop cleaned up', () => {
    const activity = Activity();
    const w = createWindow();
    activity.add(w);
    const result = activity.remove(w);
    assert.equal(result, w);
    assert.equal(Object.keys(activity.desktops).length, 0);
  });

  it('remove window — desktop persists when other windows remain', () => {
    const activity = Activity();
    const w1 = createWindow();
    const w2 = createWindow();
    activity.add(w1);
    activity.add(w2);
    activity.remove(w1);
    assert.equal(Object.keys(activity.desktops).length, 1);
    assert.equal(activity.count(), 1);
  });

  it('remove non-existent window — no crash', () => {
    const activity = Activity();
    const w = createWindow();
    assert.equal(activity.remove(w), undefined);
  });

  it('count returns 0 for empty activity', () => {
    const activity = Activity();
    assert.equal(activity.count(), 0);
  });

  it('count across desktops', () => {
    const activity = Activity();
    const w1 = createWindow();
    activity.add(w1);
    assert.equal(activity.count(), 1);
  });

  it('render all desktops — no crash', () => {
    const activity = Activity();
    const w = createWindow();
    activity.add(w);
    assert.doesNotThrow(() => activity.render());
  });

  it('render empty activity — no crash', () => {
    const activity = Activity();
    assert.doesNotThrow(() => activity.render());
  });

  it('moved with no direction — returns window unchanged', () => {
    const activity = Activity();
    const w = createWindow();
    activity.add(w);
    const result = activity.moved(w);
    assert.equal(result, w);
    assert.equal(w.desktopId, 'desk-0');
  });

  it('add falls back to other desktops when first is full', () => {
    const activity = Activity();
    const g = grid();
    shared.workspace.desktops = [
      { id: 'desk-0' },
      { id: 'desk-1' },
    ];
    for (let col = 0; col < g[1]; col++) {
      for (let row = 0; row < g[0]; row++) {
        const w = createWindow();
        activity.add(w);
      }
    }
    const extra = createWindow();
    const result = activity.add(extra);
    assert.ok(result, 'should fall back to desk-1');
    assert.equal(extra.desktopId, 'desk-1');
  });
});
