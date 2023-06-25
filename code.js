figma.showUI(__html__);
figma.skipInvisibleInstanceChildren = true;

const mapping = {};
const loadedFonts = [];
const cache = {}

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

    // load fonts
    const fonts = [...new Set(nodes.map((node) => node.fontName.family + "_" + node.fontName.style))];
    for (const font of fonts) {
      if (loadedFonts.includes(font)) continue;

      const fontInfo = { family: font.split("_")[0], style: font.split("_")[1] };
      try {
        await figma.loadFontAsync(fontInfo);
      } catch (e) {}

      loadedFonts.push(font);
    }

    const texts = new Set();
    for (const node of nodes) {
      if (node.type !== "TEXT") continue;

      mapping[node.characters] = mapping[node.characters] || [];
      mapping[node.characters].push(node);

      texts.add(node.characters);
    }

    for (const text of Object.keys(mapping)) {
      const cached = cache[`${provider}:${source}:${target}:${text}`];
      if (cached) {
        const nodes = mapping[text];
        for (const node of nodes) {
          node.characters = res;
        }
      } else {
        figma.ui.postMessage({ type: "translate", source, target, text, provider });
      }
    }
  } else if (msg.type === "translateRes") {
    const { source, target, srcText, provider, res } = msg;

    cache[`${provider}:${source}:${target}:${srcText}`] = res;

    const nodes = mapping[srcText];
    if (!nodes) return;

    for (const node of nodes) {
      node.characters = res;
    }

    delete mapping[srcText];
  }
};
