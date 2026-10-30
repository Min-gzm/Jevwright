// Captures Jev Harness fixtures from the Tasklane demo app.
//
//   pnpm fixtures:capture            # all scenarios
//   pnpm fixtures:capture login-error
//
// For every scenario it writes fixtures/<name>/:
//   screenshot.png  viewport screenshot, the Visual Locate input
//   snapshot.json   interactive elements and visible text with bounding boxes,
//                   the DOM Locate / DOM text assertion input
//   expected.json   ground truth for each target and statement

import { createServer, type Server } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium, type Page } from "playwright";
import { scenarios, type Scenario } from "./scenarios.ts";

const ROOT = import.meta.dirname;
const APP_DIR = join(ROOT, "../../benchmark/demo-app");
const FIXTURES_DIR = join(ROOT, "fixtures");
const PORT = 4173;
const VIEWPORT = { width: 1280, height: 800 };

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

type BBox = { x: number; y: number; width: number; height: number };

function serveDemoApp(): Promise<Server> {
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const file = normalize(join(APP_DIR, pathname === "/" ? "login.html" : pathname));
    if (!file.startsWith(APP_DIR)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

// Runs inside the page. Mimics what the Browser Driver will hand to the Harness:
// every visible interactive element, tagged with data-jev-id so ground-truth
// selectors can be mapped back to an element id.
function extractSnapshot() {
  const INTERACTIVE = [
    "a[href]", "button", "input:not([type=hidden])", "select", "textarea", "summary",
    "[role=button]", "[role=link]", "[role=tab]", "[role=checkbox]", "[role=radio]",
    "[role=switch]", "[role=menuitem]", "[role=option]", "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  const round = (r: DOMRect) => ({
    x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height),
  });
  const inViewport = (r: DOMRect) =>
    r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

  function role(el: Element): string {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button" || tag === "summary") return "button";
    if (tag === "select") return "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "input") {
      const type = (el as HTMLInputElement).type;
      if (type === "checkbox" || type === "radio") return type;
      if (type === "search") return "searchbox";
      if (type === "submit" || type === "button") return "button";
      return "textbox";
    }
    return tag;
  }

  function accessibleName(el: Element): string {
    const label = el.getAttribute("aria-label");
    if (label) return clean(label);
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      return clean(labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(" "));
    }
    const labels = (el as HTMLInputElement).labels;
    if (labels && labels.length > 0) return clean([...labels].map((l) => l.textContent).join(" "));
    return clean((el as HTMLElement).innerText) || clean(el.getAttribute("title")) || clean(el.getAttribute("placeholder"));
  }

  function attrs(el: Element) {
    const out: Record<string, string | boolean> = {};
    for (const name of ["type", "placeholder", "href", "aria-current", "aria-selected", "aria-checked", "aria-invalid"]) {
      const value = el.getAttribute(name);
      if (value !== null) out[name] = value;
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      if (el.value) out.value = el.value;
      if (el.disabled) out.disabled = true;
    }
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) out.checked = el.checked;
    if (el instanceof HTMLButtonElement && el.disabled) out.disabled = true;
    return out;
  }

  function hittable(el: Element, r: DOMRect): boolean {
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (!hit) return false;
    // A click on a <label> reaches its control, so a label hit counts too.
    return el === hit || el.contains(hit) || (hit instanceof HTMLLabelElement && hit.control === el);
  }

  const elements = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const rect = el.getBoundingClientRect();
    if (!inViewport(rect) || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const id = elements.length;
    el.setAttribute("data-jev-id", String(id));
    const text = clean((el as HTMLElement).innerText);
    const name = accessibleName(el);
    elements.push({
      id,
      tag: el.tagName.toLowerCase(),
      role: role(el),
      name,
      ...(text && text !== name ? { text } : {}),
      attrs: attrs(el),
      bbox: round(rect),
      hittable: hittable(el, rect),
    });
  }

  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = clean(node.textContent);
    const parent = node.parentElement;
    if (!text || !parent || parent.closest("script, style")) continue;
    if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (!inViewport(rect)) continue;
    texts.push({ text, tag: parent.tagName.toLowerCase(), bbox: round(rect) });
  }

  return { title: document.title, elements, texts };
}

function insideViewport(box: BBox): boolean {
  return box.x + box.width > 0 && box.y + box.height > 0 && box.x < VIEWPORT.width && box.y < VIEWPORT.height;
}

async function resolveTarget(page: Page, scenario: string, target: Scenario["targets"][number]) {
  const base = { target: target.target, ...(target.note ? { note: target.note } : {}) };
  if (target.selector === null) return { ...base, present: false, elementId: null, bbox: null };

  const locator = page.locator(target.selector);
  const count = await locator.count();
  if (count !== 1) throw new Error(`${scenario}: selector "${target.selector}" matched ${count} elements, expected 1`);
  const bbox = await locator.boundingBox();
  if (!bbox || !insideViewport(bbox)) throw new Error(`${scenario}: "${target.target}" is not inside the viewport`);

  const jevId = await locator.getAttribute("data-jev-id");
  return {
    ...base,
    present: true,
    // null when the target is not an interactive element, e.g. a message or a canvas.
    elementId: jevId === null ? null : Number(jevId),
    bbox: { x: Math.round(bbox.x), y: Math.round(bbox.y), width: Math.round(bbox.width), height: Math.round(bbox.height) },
  };
}

async function capture(page: Page, scenario: Scenario) {
  await page.goto(`http://127.0.0.1:${PORT}${scenario.path}`);
  await scenario.setup?.(page);
  await page.waitForLoadState("networkidle");

  const dir = join(FIXTURES_DIR, scenario.name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  // Screenshot first: extraction adds data-jev-id attributes to the DOM.
  await page.screenshot({ path: join(dir, "screenshot.png") });
  const { title, elements, texts } = await page.evaluate(extractSnapshot);
  const url = new URL(page.url());

  const snapshot = { url: url.pathname + url.search, title, viewport: VIEWPORT, elements, texts };
  const targets = [];
  for (const target of scenario.targets) targets.push(await resolveTarget(page, scenario.name, target));
  const expected = { scenario: scenario.name, description: scenario.description, targets, statements: scenario.statements };

  await writeFile(join(dir, "snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  await writeFile(join(dir, "expected.json"), JSON.stringify(expected, null, 2) + "\n");
  console.log(`✔ ${scenario.name}: ${elements.length} elements, ${texts.length} texts, ${targets.length} targets`);
}

async function main() {
  const only = process.argv.slice(2);
  const selected = only.length ? scenarios.filter((s) => only.includes(s.name)) : scenarios;
  if (selected.length === 0) throw new Error(`No scenario named ${only.join(", ")}`);

  const server = await serveDemoApp();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: "reduce" });
    for (const scenario of selected) {
      const page = await context.newPage();
      await capture(page, scenario);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
