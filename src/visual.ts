/*
 * Mini LEGO Builder — Power BI custom visual
 *
 * A playful, purely-decorative interactive widget. Users drag colorful bricks
 * from a palette onto a snap-to-grid plate to build simple models. It does not
 * bind to, read, or modify any report data — it is "just for fun".
 *
 * Because Power BI visuals run in a sandboxed iframe (no reliable localStorage),
 * the built model lives in memory for the session and resets on report reload.
 */
"use strict";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

interface BrickTemplate {
    color: string;
    w: number; // width in cells
    h: number; // height in cells
}

interface PlacedBrick {
    id: number;
    color: string;
    w: number;
    h: number;
    x: number; // px within plate
    y: number; // px within plate
}

const CELL = 26;

const TEMPLATES: BrickTemplate[] = [
    { color: "#e3000b", w: 2, h: 1 },
    { color: "#ffd500", w: 1, h: 1 },
    { color: "#0d69ab", w: 3, h: 1 },
    { color: "#237f3e", w: 2, h: 2 },
    { color: "#ff8a00", w: 4, h: 1 },
    { color: "#8b5cf6", w: 1, h: 2 }
];

export class Visual implements IVisual {
    private root: HTMLElement;
    private paletteEl: HTMLElement;
    private plateEl: HTMLElement;

    private bricks: PlacedBrick[] = [];
    private idSeq = 1;
    private cols = 8;
    private rows = 6;
    private lastClickAt: { [id: number]: number } = {};

    constructor(options: VisualConstructorOptions) {
        this.root = options.element;
        this.buildChrome();
    }

    /** One-time DOM scaffold. */
    private buildChrome(): void {
        this.root.classList.add("lego-root");
        this.root.replaceChildren();

        const wrap = document.createElement("div");
        wrap.className = "lego-wrap";

        const head = document.createElement("div");
        head.className = "lego-head";

        const title = document.createElement("span");
        title.className = "lego-title";
        title.textContent = "🧱 Build Your Brick";

        const clearBtn = document.createElement("button");
        clearBtn.className = "lego-clear";
        clearBtn.type = "button";
        clearBtn.title = "Clear plate";
        clearBtn.textContent = "↺ Clear";
        clearBtn.addEventListener("click", () => this.clear());

        head.appendChild(title);
        head.appendChild(clearBtn);

        this.paletteEl = document.createElement("div");
        this.paletteEl.className = "lego-palette";

        const plateHolder = document.createElement("div");
        plateHolder.className = "lego-plate-holder";
        this.plateEl = document.createElement("div");
        this.plateEl.className = "lego-plate";
        plateHolder.appendChild(this.plateEl);

        const hint = document.createElement("div");
        hint.className = "lego-hint";
        hint.textContent = "Drag a brick onto the plate · double-click a brick to remove";

        wrap.appendChild(head);
        wrap.appendChild(this.paletteEl);
        wrap.appendChild(plateHolder);
        wrap.appendChild(hint);
        this.root.appendChild(wrap);

        this.buildPalette();
    }

    private buildPalette(): void {
        this.paletteEl.replaceChildren();
        TEMPLATES.forEach((t, idx) => {
            const el = document.createElement("div");
            el.className = "lego-tpl";
            el.style.width = t.w * 16 + "px";
            el.style.height = t.h * 16 + "px";
            el.style.background = t.color;
            el.dataset.idx = String(idx);
            el.addEventListener("pointerdown", (e) => this.startCreate(e, idx));
            this.paletteEl.appendChild(el);
        });
    }

    /** Called by the host on resize / data refresh — we only care about size. */
    public update(options: VisualUpdateOptions): void {
        const vp = options.viewport;
        // Reserve vertical room for header (~34), palette (~44), hint (~22) + margins.
        const availW = Math.max(CELL * 3, vp.width - 24);
        const availH = Math.max(CELL * 3, vp.height - 130);
        const cols = Math.max(3, Math.floor(availW / CELL));
        const rows = Math.max(3, Math.floor(availH / CELL));
        if (cols === this.cols && rows === this.rows && this.plateEl.style.width) {
            return; // no size change
        }
        this.cols = cols;
        this.rows = rows;
        this.plateEl.style.width = cols * CELL + "px";
        this.plateEl.style.height = rows * CELL + "px";
        this.plateEl.style.backgroundSize = CELL + "px " + CELL + "px";
        // Keep any placed bricks inside the new bounds.
        this.bricks.forEach((b) => {
            b.x = Math.min(b.x, (cols - b.w) * CELL);
            b.y = Math.min(b.y, (rows - b.h) * CELL);
            b.x = Math.max(0, b.x);
            b.y = Math.max(0, b.y);
        });
        this.renderPlate();
    }

    private clear(): void {
        this.bricks = [];
        this.renderPlate();
    }

    private renderPlate(): void {
        this.plateEl.replaceChildren();
        this.bricks.forEach((b) => {
            const el = document.createElement("div");
            el.className = "lego-brick";
            el.style.left = b.x + "px";
            el.style.top = b.y + "px";
            el.style.width = b.w * CELL - 3 + "px";
            el.style.height = b.h * CELL - 3 + "px";
            el.style.background = b.color;
            el.dataset.id = String(b.id);
            el.appendChild(this.makeStuds(b.w, b.h));
            el.addEventListener("pointerdown", (e) => this.startMove(e, b.id));
            this.plateEl.appendChild(el);
        });
    }

    /** Decorative LEGO studs on top of a brick. */
    private makeStuds(w: number, h: number): HTMLElement {
        const studs = document.createElement("div");
        studs.className = "lego-studs";
        studs.style.gridTemplateColumns = "repeat(" + w + ",1fr)";
        studs.style.gridTemplateRows = "repeat(" + h + ",1fr)";
        for (let i = 0; i < w * h; i++) {
            const s = document.createElement("span");
            s.className = "lego-stud";
            studs.appendChild(s);
        }
        return studs;
    }

    private makeGhost(t: BrickTemplate): HTMLElement {
        const g = document.createElement("div");
        g.className = "lego-ghost";
        g.style.width = t.w * CELL - 3 + "px";
        g.style.height = t.h * CELL - 3 + "px";
        g.style.background = t.color;
        this.root.appendChild(g);
        return g;
    }

    /** Drag a fresh brick out of the palette. */
    private startCreate(e: PointerEvent, idx: number): void {
        e.preventDefault();
        const t = TEMPLATES[idx];
        const ghost = this.makeGhost(t);
        const rootRect = this.root.getBoundingClientRect();

        const move = (ev: PointerEvent) => {
            ghost.style.left = ev.clientX - rootRect.left - ghost.offsetWidth / 2 + "px";
            ghost.style.top = ev.clientY - rootRect.top - ghost.offsetHeight / 2 + "px";
        };
        move(e);

        const up = (ev: PointerEvent) => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            ghost.remove();
            const r = this.plateEl.getBoundingClientRect();
            if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                let gx = Math.round((ev.clientX - r.left - (t.w * CELL) / 2) / CELL);
                let gy = Math.round((ev.clientY - r.top - (t.h * CELL) / 2) / CELL);
                gx = Math.max(0, Math.min(this.cols - t.w, gx));
                gy = Math.max(0, Math.min(this.rows - t.h, gy));
                this.bricks.push({ id: this.idSeq++, color: t.color, w: t.w, h: t.h, x: gx * CELL, y: gy * CELL });
                this.renderPlate();
            }
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
    }

    /** Move an already-placed brick (and detect a double-click to remove it). */
    private startMove(e: PointerEvent, id: number): void {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const brick = this.bricks.find((b) => b.id === id);
        if (!brick) {
            return;
        }
        const r = this.plateEl.getBoundingClientRect();
        const offX = e.clientX - r.left - brick.x;
        const offY = e.clientY - r.top - brick.y;
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        let liveX = brick.x;
        let liveY = brick.y;
        el.classList.add("dragging");
        // Bring to front in the stacking array.
        this.bricks = this.bricks.filter((b) => b.id !== id);
        this.bricks.push(brick);

        const move = (ev: PointerEvent) => {
            if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
                moved = true;
            }
            let nx = ev.clientX - r.left - offX;
            let ny = ev.clientY - r.top - offY;
            nx = Math.max(0, Math.min((this.cols - brick.w) * CELL, nx));
            ny = Math.max(0, Math.min((this.rows - brick.h) * CELL, ny));
            el.style.left = nx + "px";
            el.style.top = ny + "px";
            liveX = nx;
            liveY = ny;
        };

        const up = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            el.classList.remove("dragging");
            if (!moved) {
                const now = Date.now();
                if (now - (this.lastClickAt[id] || 0) < 380) {
                    delete this.lastClickAt[id];
                    this.bricks = this.bricks.filter((b) => b.id !== id);
                    this.renderPlate();
                    return;
                }
                this.lastClickAt[id] = now;
            }
            let gx = Math.round(liveX / CELL);
            let gy = Math.round(liveY / CELL);
            gx = Math.max(0, Math.min(this.cols - brick.w, gx));
            gy = Math.max(0, Math.min(this.rows - brick.h, gy));
            brick.x = gx * CELL;
            brick.y = gy * CELL;
            this.renderPlate();
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
    }
}
