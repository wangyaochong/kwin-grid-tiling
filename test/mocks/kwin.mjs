export function setupQtGlobals() {
  globalThis.Qt = {
    rect: (x, y, w, h) => ({ x, y, width: w, height: h }),
  };
}

export class MockTimer {
  constructor(callback, interval) {
    this.callback = callback;
    this.interval = interval;
    this._running = false;
  }
  start() {
    this._running = true;
    if (this.callback) this.callback();
  }
  stop() { this._running = false; }
  destroy() {}
}

export function createTimerComponent() {
  return {
    createObject(parent, props) {
      const t = new MockTimer(props.callback, props.interval);
      t.start();
      return t;
    },
  };
}
