import { calc, clampDivider, config, grid } from 'config.mjs';
import { shared } from 'shared.mjs';
import { List } from 'list.mjs';

export function Output() {
  const lists = [];
  const dividers = [];

  function count() {
    return lists.reduce((n, l) => n + l.windows.length, 0);
  }

  function minimized() {
    return lists.reduce((s, l) => s + (l.minimized() === l.windows.length), 0);
  }

  function addList(start = false) {
    if (start) {
      for (const l of lists) {
        for (const w of l.windows) w.listIndex += 1;
      }
      if (lists.unshift(List()) > 1) dividers.unshift(0);
    } else {
      if (lists.push(List()) > 1) dividers.push(0);
    }
    return start ? 0 : lists.length - 1;
  }

  function removeLine(index) {
    for (let i = index + 1; i < lists.length; ++i) {
      for (const w of lists[i].windows) w.listIndex -= 1;
    }
    lists.splice(index, 1);
    if (index === 0) {
      if (dividers.length > 0) dividers.shift();
    } else {
      dividers.splice(index - 1, 1);
    }
  }

  function optimize() {
    const g = grid();
    const totalWindows = count();
    if (totalWindows <= 1) return;
    if (lists.length >= g[1]) return;
    const hasVerticalSplit = lists.some(l => l.windows.length > 1);
    if (!hasVerticalSplit) return;

    const allWindows = [];
    for (const list of lists) {
      for (const w of list.windows) allWindows.push(w);
    }

    lists.length = 0;
    dividers.length = 0;

    const numCols = Math.min(totalWindows, g[1]);
    const base = Math.floor(totalWindows / numCols);
    const extra = totalWindows % numCols;

    let idx = 0;
    for (let col = 0; col < numCols; col++) {
      lists.push(List());
      if (col > 0) dividers.push(0);
      const n = base + (col < extra ? 1 : 0);
      for (let row = 0; row < n; row++) {
        const w = allWindows[idx++];
        lists[col].add(w);
        w.listIndex = col;
      }
    }
  }

  function add(window, grid) {
    const allSameCount = lists.length > 0 && lists.every((l) => l.windows.length === lists[0].windows.length);

    if (lists.length < grid[1] && (lists.length === 0 || allSameCount)) {
      const j = addList();
      let list = lists[j];
      if (list) {
        list.add(window);
        window.listIndex = j;
        return window;
      }
    }

    let bestIndex = -1;
    let bestCount = Infinity;
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      if (
        list.windows.length < grid[0] &&
        list.windows.length < bestCount
      ) {
        bestIndex = i;
        bestCount = list.windows.length;
      }
    }
    if (bestIndex >= 0) {
      lists[bestIndex].add(window);
      window.listIndex = bestIndex;
      return window;
    }
  }

  function remove(window) {
    const i = window.listIndex;
    if (i < lists.length) {
      const list = lists[i];
      if (list.remove(window)) {
        if (!list.windows.length) removeLine(i);
        return window;
      }
    }
  }

  function swap(listIndex, amount) {
    const t = listIndex + amount;
    const target = lists[t];
    if (target) {
      const current = lists[listIndex];

      for (const w of target.windows) w.listIndex = listIndex;
      lists[listIndex] = target;

      for (const w of current.windows) w.listIndex = t;
      lists[t] = current;

      return current;
    }
  }

  function move(window, amount, grid) {
    let t = window.listIndex + amount;
    let target = lists[t];
    if (!target && lists.length < grid[1] && lists[window.listIndex].windows.length > 1) {
      t = addList(amount < 0);
      target = lists[t];
    }

    if (target && target.windows.length < grid[0]) {
      const c = window.listIndex;
      const current = lists[c];
      current.remove(window);
      if (!current.windows.length) {
        removeLine(c);
        if (t > c) --t;
      }
      target.add(window);
      window.listIndex = t;
      return window;
    }
  }

  function dividerPost(listIndex, amount) {
    if (listIndex < lists.length - 1) dividers[listIndex] = clampDivider(dividers[listIndex] + amount);
  }

  function dividerPre(listIndex, amount) {
    if (listIndex > 0) dividers[listIndex - 1] = clampDivider(dividers[listIndex - 1] - amount);
  }

  function divider(listIndex, amount) {
    dividerPost(listIndex, amount);
    dividerPre(listIndex, amount);
  }

  function resized(window, area) {
    let diff = {};
    for (const [key, value] of Object.entries(window.frameGeometry)) diff[key] = value - window.renderGeometry[key];
    if (diff.width === 0 && diff.height === 0) return;

    const width = calc.width(area.width, lists.length - minimized());
    if (diff.width !== 0) {
      if (diff.x === 0) dividerPost(window.listIndex, diff.width / width);
      else dividerPre(window.listIndex, diff.width / width);
    }

    const height = calc.height(
      area.height,
      lists[window.listIndex].windows.length - lists[window.listIndex].minimized()
    );
    if (diff.height !== 0) {
      if (diff.y === 0) lists[window.listIndex].dividerPost(window.windowIndex, diff.height / height);
      else lists[window.listIndex].dividerPre(window.windowIndex, diff.height / height);
    }
    return window;
  }

  function findWindowAtCursor(window) {
    const cursor = shared.workspace.cursorPos;
    for (const list of lists) {
      for (const w of list.windows) {
        if (w === window || w.minimized) continue;
        const g = w.renderGeometry || w.frameGeometry;
        if (cursor.x >= g.x && cursor.x <= g.x + g.width &&
            cursor.y >= g.y && cursor.y <= g.y + g.height) {
          return w;
        }
      }
    }
    return null;
  }

  function moved(window, area) {
    const w = findWindowAtCursor(window);
    if (w) {
      const swapWindowIndex = w.windowIndex;
      const swapListIndex = w.listIndex;

      w.windowIndex = window.windowIndex;
      w.listIndex = window.listIndex;
      lists[window.listIndex].windows[window.windowIndex] = w;

      window.windowIndex = swapWindowIndex;
      window.listIndex = swapListIndex;
      lists[swapListIndex].windows[swapWindowIndex] = window;

      return w;
    }
  }

  function render(area) {
    optimize();
    const width = calc.width(area.width, lists.length - minimized());
    let x = calc.x(area.x);
    let current = 0;
    let previous = 0;
    for (let [i, list] of lists.entries()) {
      if (list.minimized() === list.windows.length) continue;

      let divider = dividers[i] || 0;
      if (divider) {
        const l = lists[i + 1];
        if (l && l.minimized() === l.windows.length) divider = 0;
      }

      current = width * divider;
      const w = width + current - previous;

      list.render(x, area.y, w, area.height);

      x += w + config.gap;
      previous = current;
    }
  }

  return { lists, count, minimized, add, remove, swap, move, divider, resized, moved, render, findWindowAtCursor };
}
