import { area, shared, setTimeout } from 'shared.mjs';
import { config, isWindowTiled, isOutputEnabled } from 'config.mjs';
import { Layout } from 'layout.mjs';

let floating = {};
let tiled = {};
let layout = Layout();

function connect(window, signal, callback) {
  if (!window.hasOwnProperty('connected')) window.connected = [];
  window.connected.push({ signal, callback });
  window[signal].connect(callback);
}
function disconnect(window) {
  for (const { signal, callback } of window.connected) window[signal].disconnect(callback);
  delete window.connected;
  return window;
}

function ignored(window) {
  return !isWindowTiled(window.resourceName);
}

function addProps(window) {
  window.init = {
    noBorder: window.noBorder,
    frameGeometry: window.frameGeometry,
  };

  window.activities = [window.activities[0]];
  window.desktops = [window.desktops[0]];

  return window;
}

function tile(window) {
  if (!tiled.hasOwnProperty(window.internalId) && layout.add(window)) {
    unwatchFloatingOutput(window);
    tiled[window.internalId] = addSignals(window);
    if (floating.hasOwnProperty(window.internalId)) delete floating[window.internalId];
    return window;
  }
}

function unTile(window) {
  if (tiled.hasOwnProperty(window.internalId)) {
    clearDragState(window);

    if (window.hasOwnProperty('init')) {
      for (const [prop, value] of Object.entries(window.init)) window[prop] = value;
    }

    window = tiled[window.internalId];
    if (layout.remove(window)) {
      layout.render();
    }
    delete tiled[disconnect(window).internalId];
    delete window.outputName;
    delete window.desktopId;
    delete window.activityId;
    delete window.listIndex;
    delete window.windowIndex;
    delete window.renderGeometry;
    floating[window.internalId] = window;
    // Watch for the window returning to a tiled output so it can be re-tiled
    watchFloatingOutput(window);
    return window;
  }
}

// Attach an outputChanged listener to a floating (untiled) window so that
// when it is moved back to the largest output it gets re-tiled automatically.
function watchFloatingOutput(window) {
  if (window.deleted) return;
  const handler = () => {
    setTimeout(() => {
      if (window.deleted) return;
      if (!isOutputEnabled(window.output.name)) return;
      if (tiled.hasOwnProperty(window.internalId)) return;
      if (!floating.hasOwnProperty(window.internalId)) return;
      addProps(window);
      if (config.tile && tile(window)) {
        layout.render();
        shared.workspace.currentDesktop = window.desktops[0];
      }
    }, config.delay);
  };
  window._floatingOutputHandler = handler;
  window.outputChanged.connect(handler);
}

function unwatchFloatingOutput(window) {
  if (window._floatingOutputHandler) {
    window.outputChanged.disconnect(window._floatingOutputHandler);
    delete window._floatingOutputHandler;
  }
}

function clearDragState(window) {
  if (window._dragHighlightHandler) {
    window.frameGeometryChanged.disconnect(window._dragHighlightHandler);
    delete window._dragHighlightHandler;
  }
  if (window._highlightTarget && !window._highlightTarget.deleted) {
    if (window._highlightTarget.hasOwnProperty('savedHighlightOpacity')) {
      window._highlightTarget.opacity = window._highlightTarget.savedHighlightOpacity;
      delete window._highlightTarget.savedHighlightOpacity;
    }
    delete window._highlightTarget;
  }
  if (window.hasOwnProperty('savedOpacity')) {
    window.opacity = window.savedOpacity;
    delete window.savedOpacity;
  }
}

function addSignals(window) {
  if (config.force) {
    connect(window, 'frameGeometryChanged', () => {
      if (!window.move && !window.resize && !window.fullScreen && window.frameGeometry !== window.renderGeometry)
        window.frameGeometry = window.renderGeometry;
    });
  }

  connect(window, 'moveResizedChanged', () => {
    if (window.move) {
      // Only apply drag effects on the largest (tiled) output
      if (!isOutputEnabled(window.output.name)) return;
      window.savedOpacity = window.opacity;
      window.opacity = 0.5;
      window._highlightTarget = null;
      const onDragMove = () => {
        if (!window.move) return;
        if (!isOutputEnabled(window.output.name)) {
          clearDragState(window);
          return;
        }
        const output = getOutput(window);
        if (!output) return;
        const target = output.findWindowAtCursor(window);
        if (window._highlightTarget !== target) {
          if (window._highlightTarget && !window._highlightTarget.deleted) {
            if (window._highlightTarget.hasOwnProperty('savedHighlightOpacity')) {
              window._highlightTarget.opacity = window._highlightTarget.savedHighlightOpacity;
              delete window._highlightTarget.savedHighlightOpacity;
            }
          }
          if (target) {
            target.savedHighlightOpacity = target.opacity;
            target.opacity = 0.7;
          }
          window._highlightTarget = target;
        }
      };
      window._dragHighlightHandler = onDragMove;
      window.frameGeometryChanged.connect(onDragMove);
      return;
    }
    if (window.resize) return;

    clearDragState(window);

    if (!isOutputEnabled(window.output.name)) return;

    const output = getOutput(window);
    const a = area(window.desktops[0], window.output);
    const swapWindow = output.moved(window, a);
    if (!swapWindow) output.resized(window, a);
    output.render(a);

    if (swapWindow) {
      const savedBorder = config.border;
      const savedBorderActive = config.borderActive;
      window.noBorder = false;
      swapWindow.noBorder = false;
      setTimeout(() => {
        window.noBorder = savedBorderActive && window.active ? false : !savedBorder;
        swapWindow.noBorder = savedBorderActive && swapWindow.active ? false : !savedBorder;
      }, 300);
    }
  });

  connect(window, 'minimizedChanged', () => {
    const output = getOutput(window);
    if (output) output.render(area(window.desktops[0], window.output));
  });

  connect(window, 'activitiesChanged', () => {
    setTimeout(() => {
      if (!window.deleted) {
        if (window.activities.length !== 1 || !layout.moved(window)) unTile(window);
        layout.render();
      }
    }, config.delay);
  });

  connect(window, 'desktopsChanged', () => {
    setTimeout(() => {
      if (!window.deleted) {
        const activity = getActivity(window);
        if (activity) {
          if (window.desktops.length === 1) {
            activity.moved(window);
            shared.workspace.currentDesktop = window.desktops[0];
          } else {
            unTile(window);
          }
          activity.render();
        }
      }
    }, config.delay);
  });

  connect(window, 'outputChanged', () => {
    setTimeout(() => {
      if (!window.deleted) {
        if (!isOutputEnabled(window.output.name)) {
          unTile(window);
          return;
        }
        const desktop = getDesktop(window);
        if (desktop) {
          desktop.moved(window);
          desktop.render(window.desktops[0]);
        }
      }
    }, config.delay);
  });

  return window;
}

export function add(window) {
  if (window) {
    setTimeout(() => {
      try {
        if (window.deleted) return;
        if (floating.hasOwnProperty(window.internalId) || tiled.hasOwnProperty(window.internalId)) return;

        var hasAct = window.activities && window.activities.length;
        var hasDesk = window.desktops && window.desktops.length;

        if (!window.normalWindow) return;
        if (window.popupWindow) return;

        var isIgn = ignored(window);
        if (isIgn) return;

        if (!hasAct) window.activities = [shared.workspace.currentActivity];
        if (!hasDesk) window.desktops = [shared.workspace.currentDesktop];

        if (!isOutputEnabled(window.output.name)) {
          floating[window.internalId] = window;
          watchFloatingOutput(window);
          return;
        }

        addProps(window);
        if (config.tile && tile(window)) {
          layout.render();
          shared.workspace.currentDesktop = window.desktops[0];
        } else {
          floating[window.internalId] = window;
        }
      } catch (e) {
        console.warn('Grid Tiling: add error:', e);
      }
    }, config.delay);
  }
}

export function remove(window) {
  if (window) {
    if (tiled.hasOwnProperty(window.internalId)) {
      window = tiled[window.internalId];
      if (layout.remove(window)) {
        delete tiled[disconnect(window).internalId];
        layout.render();
      }
    } else if (floating.hasOwnProperty(window.internalId)) {
      unwatchFloatingOutput(window);
      delete floating[window.internalId];
    }
  }
}

export function isTiled(window) {
  return !!(window && tiled.hasOwnProperty(window.internalId));
}

export function activated(window) {
  if (!tiled.hasOwnProperty(window.internalId)) return;
  const output = getOutput(window);
  if (output) output.render(area(window.desktops[0], window.output));
}

export function toggle() {
  const window = shared.workspace.activeWindow;
  if (window) {
    if (
      (floating.hasOwnProperty(window.internalId) && tile(window)) ||
      (tiled.hasOwnProperty(window.internalId) && unTile(window))
    ) {
      layout.render();
      return window;
    }
    return add(window);
  }
}

export function getActivity(window) {
  if (window && tiled.hasOwnProperty(window.internalId)) window = tiled[window.internalId];
  return layout.activities[window ? window.activityId : shared.workspace.currentActivity];
}

export function getDesktop(window) {
  const activity = getActivity(window);
  if (activity) return activity.desktops[window ? window.desktopId : shared.workspace.currentDesktop.id];
}

export function getOutput(window) {
  const desktop = getDesktop(window);
  if (desktop) return desktop.outputs[window ? window.outputName : shared.workspace.activeScreen.name];
}

export function render() {
  layout.render();
}

export function stop() {
  for (const window of Object.values(tiled)) disconnect(window);
  tiled = {};
  floating = {};
  layout = Layout();
}

export function start() {
  for (const window of shared.workspace.windows) add(window);
  layout.render();
}
