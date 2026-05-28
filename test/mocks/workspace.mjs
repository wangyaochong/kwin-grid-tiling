function createSignalMock() {
  const handlers = [];
  return {
    connect(fn) { handlers.push(fn); },
    disconnect(fn) {
      const idx = handlers.indexOf(fn);
      if (idx >= 0) handlers.splice(idx, 1);
    },
    fire(...args) { for (const h of handlers) h(...args); },
    handlers,
  };
}

export function createWorkspace(overrides = {}) {
  return {
    screens: [
      { name: 'DP-1', geometry: { x: 0, y: 0, width: 1920, height: 1080 } },
    ],
    desktops: [{ id: 'desk-0' }],
    currentActivity: 'act-0',
    currentDesktop: { id: 'desk-0' },
    activeScreen: { name: 'DP-1' },
    activeWindow: null,
    windows: [],
    cursorPos: { x: 500, y: 500 },
    clientArea(flags, output, desktop) {
      return output && output.geometry
        ? { x: output.geometry.x, y: output.geometry.y, width: output.geometry.width, height: output.geometry.height }
        : { x: 0, y: 0, width: 1920, height: 1080 };
    },
    sendClientToScreenCalls: [],
    sendClientToScreen(window, output) {
      this.sendClientToScreenCalls.push({ window, output });
      if (output && output.name) window.output = output;
    },
    windowAdded: createSignalMock(),
    windowRemoved: createSignalMock(),
    windowActivated: createSignalMock(),
    ...overrides,
  };
}
