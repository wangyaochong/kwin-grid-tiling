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
      return { x: 0, y: 0, width: 1920, height: 1080 };
    },
    sendClientToScreen(window, output) {},
    windowAdded: { connect() {}, disconnect() {} },
    windowRemoved: { connect() {}, disconnect() {} },
    windowActivated: { connect() {}, disconnect() {} },
    ...overrides,
  };
}
