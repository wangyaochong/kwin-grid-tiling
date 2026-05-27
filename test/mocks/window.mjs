let idCounter = 0;

export function resetWindowIds() {
  idCounter = 0;
}

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

export function createWindow(overrides = {}) {
  const win = {
    internalId: `win-${idCounter++}`,
    resourceName: 'konsole',
    normalWindow: true,
    popupWindow: false,
    minimized: false,
    active: false,
    fullScreen: false,
    move: false,
    resize: false,
    deleted: false,
    noBorder: false,
    opacity: 1.0,
    closeWindowCalled: false,
    frameGeometry: { x: 0, y: 0, width: 800, height: 600 },
    renderGeometry: { x: 0, y: 0, width: 800, height: 600 },
    activities: ['act-0'],
    desktops: [{ id: 'desk-0' }],
    output: { name: 'DP-1' },
    connected: [],
    frameGeometryChanged: createSignalMock(),
    moveResizedChanged: createSignalMock(),
    minimizedChanged: createSignalMock(),
    activitiesChanged: createSignalMock(),
    desktopsChanged: createSignalMock(),
    outputChanged: createSignalMock(),
    closeWindow() { this.closeWindowCalled = true; },
    ...overrides,
  };
  return win;
}
