import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupQtGlobals, createTimerComponent } from '../mocks/kwin.mjs';
import { createWindow, resetWindowIds } from '../mocks/window.mjs';
import { createWorkspace } from '../mocks/workspace.mjs';
import { shared } from 'shared.mjs';
import { config, load } from 'config.mjs';
import { Layout } from 'layout.mjs';

function setup() {
  setupQtGlobals();
  shared.workspace = createWorkspace();
  shared.kwin = {};
  shared.timer = createTimerComponent();
  load((key, def) => def);
  resetWindowIds();
}

describe('Layout', () => {
  beforeEach(setup);

  it('add window creates activity', () => {
    const layout = Layout();
    const w = createWindow();
    layout.add(w);
    assert.equal(w.activityId, 'act-0');
    assert.ok(layout.activities.hasOwnProperty('act-0'));
  });

  it('remove last window — activity cleaned up', () => {
    const layout = Layout();
    const w = createWindow();
    layout.add(w);
    layout.remove(w);
    assert.equal(Object.keys(layout.activities).length, 0);
  });

  it('moved across activities — activityId updated (Bug #3)', () => {
    const layout = Layout();
    const w = createWindow({ activities: ['act-0'] });
    layout.add(w);
    assert.equal(w.activityId, 'act-0');

    w.activities = ['act-1'];
    shared.workspace.currentActivity = 'act-1';
    layout.moved(w);
    assert.equal(w.activityId, 'act-1', 'window should have new activityId after moved');
    assert.ok(!layout.activities['act-0'] || layout.activities['act-0'].count() === 0,
      'old activity should be empty after moved');
  });

  it('moved preserves window in new activity', () => {
    const layout = Layout();
    const w = createWindow({ activities: ['act-0'] });
    layout.add(w);
    w.activities = ['act-1'];
    layout.moved(w);
    assert.ok(layout.activities.hasOwnProperty('act-1'), 'target activity should exist');
    assert.ok(layout.activities['act-1'].count() >= 1, 'target activity should have the window');
  });

  it('moved removes window from old activity', () => {
    const layout = Layout();
    const w = createWindow({ activities: ['act-0'] });
    layout.add(w);
    assert.equal(layout.activities['act-0'].count(), 1);
    w.activities = ['act-1'];
    layout.moved(w);
    const oldActivity = layout.activities['act-0'];
    if (oldActivity) {
      assert.equal(oldActivity.count(), 0, 'old activity should have 0 windows');
    }
  });

  it('render all activities — no crash', () => {
    const layout = Layout();
    const w = createWindow();
    layout.add(w);
    assert.doesNotThrow(() => layout.render());
  });

  it('add to different activities creates separate entries', () => {
    const layout = Layout();
    const w1 = createWindow({ activities: ['act-0'] });
    const w2 = createWindow({ activities: ['act-1'] });
    layout.add(w1);
    layout.add(w2);
    assert.ok(layout.activities.hasOwnProperty('act-0'));
    assert.ok(layout.activities.hasOwnProperty('act-1'));
  });

  it('add multiple windows to same activity', () => {
    const layout = Layout();
    const w1 = createWindow({ activities: ['act-0'] });
    const w2 = createWindow({ activities: ['act-0'] });
    layout.add(w1);
    layout.add(w2);
    assert.equal(layout.activities['act-0'].count(), 2);
  });

  it('remove one of multiple windows — activity persists', () => {
    const layout = Layout();
    const w1 = createWindow({ activities: ['act-0'] });
    const w2 = createWindow({ activities: ['act-0'] });
    layout.add(w1);
    layout.add(w2);
    layout.remove(w1);
    assert.ok(layout.activities.hasOwnProperty('act-0'));
    assert.equal(layout.activities['act-0'].count(), 1);
  });

  it('moved creates target activity if not exists', () => {
    const layout = Layout();
    const w = createWindow({ activities: ['act-0'] });
    layout.add(w);
    assert.ok(!layout.activities.hasOwnProperty('act-2'));
    w.activities = ['act-2'];
    layout.moved(w);
    assert.ok(layout.activities.hasOwnProperty('act-2'), 'target activity should be created');
  });
});
