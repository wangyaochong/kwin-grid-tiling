import { shared, area } from 'shared.mjs';
import { grid, isOutputEnabled } from 'config.mjs';
import { Output } from 'output.mjs';

export function Desktop() {
  const outputs = {};

  function count() {
    return Object.values(outputs).reduce((n, o) => n + o.count(), 0);
  }

  function add(window, desktopId) {
    const name = window.output.name;
    if (!isOutputEnabled(name)) return;
    if (!outputs.hasOwnProperty(name)) outputs[name] = Output();
    if (outputs[name].add(window, grid())) {
      window.outputName = name;
      return window;
    }
  }

  function remove(window) {
    const n = window.outputName;
    const output = outputs[n];
    if (output && output.remove(window)) {
      if (!output.count()) delete outputs[n];
      return window;
    }
  }

  function moved(window) {
    let c, t;
    for (const [i, output] of shared.workspace.screens.entries()) {
      const n = output.name;
      if (n === window.outputName) c = i;
      if (n === window.output.name) t = i;
    }
    const direction = Math.sign(t - c);
    if (direction) {
      const max = shared.workspace.screens.length;
      let i = t;
      while (i !== c) {
        const output = shared.workspace.screens[i];
        const n = output.name;
        if (!isOutputEnabled(n)) {
          i += direction;
          if (i < 0) i = max - 1;
          if (i >= max) i = 0;
          continue;
        }
        if (!outputs.hasOwnProperty(n)) outputs[n] = Output();
        const w = Object.assign({}, window);
        if (outputs[n].add(window, grid())) {
          remove(w);
          window.outputName = n;
          shared.workspace.sendClientToScreen(window, output);
          return window;
        }

        i += direction;
        if (i < 0) i = max - 1;
        if (i >= max) i = 0;
      }
    }
    return window;
  }

  function render(desktop) {
    for (const [name, output] of Object.entries(outputs)) {
      if (!isOutputEnabled(name)) continue;
      output.render(
        area(
          desktop,
          shared.workspace.screens.find((s) => s.name === name)
        )
      );
    }
  }

  return { outputs, count, add, remove, moved, render };
}
