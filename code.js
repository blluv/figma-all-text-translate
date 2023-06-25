figma.showUI(__html__);
figma.skipInvisibleInstanceChildren = true;

const mapp = {};
const loadedFonts = [];

figma.ui.onmessage = async (msg) => {
  if (msg.type === "translate") {
    const { source, target, provider } = msg;

    const nodes = [];

    function traverse(node) {
      if ("children" in node) {
        if (node.type !== "INSTANCE") {
          for (const child of node.children) {
            traverse(child);
          }
        }
      } else {
        if (node.type == "TEXT") nodes.push(node);
      }
    }

    figma.currentPage.selection.forEach((element) => {
      traverse(element);
    });

    const fonts = [...new Set(nodes.map((node) => node.fontName.family + "_" + node.fontName.style))];
    for (const font of fonts) {
      if (loadedFonts.includes(font)) continue;

      const fontInfo = { family: font.split("_")[0], style: font.split("_")[1] };
      try {
        await figma.loadFontAsync(fontInfo);
      } catch (e) {}

      loadedFonts.push(font);
    }
    for (const node of nodes) {
      if (node.type !== "TEXT") continue;

      mapp[node.characters] = mapp[node.characters] || [];
      mapp[node.characters].push(node);
    }
    for (const text of Object.keys(mapp)) {
      figma.ui.postMessage({ type: "translate", source, target, text, provider });
    }
  }

  if (msg.type === "translateRes") {
    const { srcMsg, res } = msg;

    const nodes = mapp[srcMsg];
    if (!nodes) return;

    for (const node of nodes) {
      node.characters = res;
    }
  }
};
