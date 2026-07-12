# Mini LEGO Builder — Power BI Custom Visual

A playful, interactive **LEGO builder** you can drop onto any Power BI report
page. Drag colorful bricks from the palette onto a snap-to-grid plate to build
little models. It's **purely for fun** — the visual does **not** bind to, read,
or modify any of your report data.

![Mini LEGO Builder](assets/icon.png)

## Features

- 🧱 Six bright, LEGO-style bricks in different shapes and colors
- 🖱️ Smooth pointer-based drag & drop (works with mouse and touch)
- 📐 Snap-to-grid placement on a studded plate
- ↺ One-click **Clear** button, double-click a brick to remove it
- 📱 Responsive — the plate fills whatever tile size you give the visual
- 🔒 Zero data binding — safe to place next to your analytics

## Use it in Power BI (quick path)

1. Download **`legoBuilder.pbiviz`** from the root of this repo
   (a pre-built copy is committed so you don't have to build anything).
2. In **Power BI Desktop**, go to the **Visualizations** pane →
   **`...`** (More options) → **Import a visual from a file**.
   *(In Power BI Service: **Edit** → **Visualizations** → **⋯** → **Import a visual from a file**.)*
3. Select the `.pbiviz` file. The 🧱 Mini LEGO Builder icon appears in the pane.
4. Click the icon to drop it on the canvas, then resize the tile as you like.
   No fields need to be added — just start dragging bricks.

> If your organization restricts uncertified custom visuals, an admin may need
> to allow this visual in the **Power BI Admin portal → Tenant settings →
> Custom visuals**.

## Build it yourself

Requires Node.js. From the project root:

```bash
npm install
npm run package      # produces legoBuilder.pbiviz
```

To develop live against Power BI Service with the developer visual:

```bash
npm start            # runs `pbiviz start`
```

(You'll need to enable the developer visual and install the pbiviz certificate
once — see the [Power BI visuals docs](https://learn.microsoft.com/power-bi/developer/visuals/).)

## Project layout

| Path | Purpose |
|------|---------|
| `src/visual.ts` | The visual — DOM, drag-and-drop, brick logic |
| `style/visual.less` | Styling (bricks, plate, palette, studs) |
| `capabilities.json` | Declares **no** data roles (decorative visual) |
| `pbiviz.json` | Visual metadata (name, guid, api version) |
| `assets/icon.png` | Visualizations-pane icon |

## Notes

- Power BI visuals run in a sandboxed iframe without reliable `localStorage`,
  so the model you build lives **in memory for the session** and resets when the
  report reloads. This keeps the visual self-contained and privacy-safe.

## License

MIT
