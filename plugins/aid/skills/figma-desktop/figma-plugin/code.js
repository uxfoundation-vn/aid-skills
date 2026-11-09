// Claude Nav: the sandbox side. Tells the UI which file this is and what is selected; jumps to nodes on request.
// The UI does all networking (sandbox code cannot fetch), polling the local claude-nav server every second.
(async () => {
  // Minimized (title row only) is remembered across runs, like the panel's open/closed state in the browser version.
  const min = !!(await figma.clientStorage.getAsync('claudeNavMin'));
  figma.showUI(__html__, { width: 280, height: min ? 40 : 120, title: 'Lâyơ ở mố?', themeColors: true });

  const info = () => ({
    type: 'info', min,
    // fileKey needs enablePrivatePluginApi (fine for a local dev plugin); it is the branch key when a branch is open.
    file: figma.fileKey || 'local:' + figma.root.name,
    name: figma.root.name,
    page: figma.currentPage.name,
    // A selected instance sublayer can vanish under us (instance swapped, component updated, undo); its .name then throws.
    sel: figma.currentPage.selection.slice(0, 20).flatMap(n => { try { return [{ id: n.id, name: n.name, type: n.type }]; } catch (e) { return []; } }),
  });
  const send = () => figma.ui.postMessage(info());
  figma.on('selectionchange', send);
  figma.on('currentpagechange', send);
  send();

  figma.ui.onmessage = async (m) => {
    if (m.type === 'go') {
      let ok = false;
      try {
        const n = await figma.getNodeByIdAsync(m.id);
        if (n && n.type !== 'DOCUMENT') {
          let p = n; while (p.type !== 'PAGE') p = p.parent;
          if (figma.currentPage !== p) await figma.setCurrentPageAsync(p);
          if (n.type !== 'PAGE') { figma.currentPage.selection = [n]; figma.viewport.scrollAndZoomIntoView([n]); }
          ok = true;
        }
      } catch (e) {}
      figma.ui.postMessage({ type: 'went', id: m.id, ok });
    } else if (m.type === 'resize') {
      figma.ui.resize(Math.ceil(m.w), Math.max(40, Math.ceil(m.h)));
    } else if (m.type === 'min') {
      figma.clientStorage.setAsync('claudeNavMin', !!m.on);
    }
  };
})();
