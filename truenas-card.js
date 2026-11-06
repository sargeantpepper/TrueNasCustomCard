/*
 * TrueNAS Card for Home Assistant
 * Built for https://github.com/tomaae/homeassistant-truenas
 *
 * Sections: System, Pools, Disks, Apps / VMs / Services.
 * Entities are auto-discovered from their attributes; everything can be overridden in YAML.
 */

const CARD_VERSION = "2.9.0";

const DEFAULTS = {
  title: "TrueNAS",
  prefix: "truenas", // biases discovery; useful with several systems
  sections: ["system", "pools", "disks", "apps", "vms"], // add "services" if wanted; "disks" = drive bays
  expand: [], // collapsible groups (disks, apps, vms, services) that start open
  bay_columns: null, // drive-bay grid columns (auto if unset)
  bay_count: null, // total physical slots, so empty bays show (auto if unset)
  bay_slots: null, // explicit slot order: list of disk entity ids, "" for an empty slot
  bay_vertical: true, // tall trays (default); set false for wide trays
  controls: true, // start/stop buttons on apps, VMs and services
  scrutiny: true, // use SMART data from the Scrutiny integration when found
  warn_temp: 45,
  crit_temp: 55,
  warn_pct: 80,
  crit_pct: 90,
};

const GROUP_LABEL = { disks: "Disks", apps: "Apps", vms: "Virtual machines", services: "Services" };
const GROUP_ICON = { disks: "mdi:harddisk", apps: "mdi:docker", vms: "mdi:monitor", services: "mdi:cog" };

const STYLE = `
  :host { display:block; }
  ha-card { display:block; box-sizing:border-box; padding:16px; overflow:hidden; --tn-ring:#fff; }
  .t-ok { --tone:var(--success-color,#43a047); } .t-warn { --tone:var(--warning-color,#ffa600); }
  .t-bad { --tone:var(--error-color,#db4437); } .t-off { --tone:var(--disabled-color,#9e9e9e); }
  .tint { background:color-mix(in srgb, var(--tone) 18%, transparent); color:var(--tone); }

  .head { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
  .badge { width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex:none;
    background:var(--secondary-background-color,rgba(127,127,127,.18)); color:var(--tone); --mdc-icon-size:24px; }
  .head .ht { flex:1; min-width:0; }
  .head .title { font-size:1.35em; font-weight:700; line-height:1.2; color:var(--primary-text-color); }
  .head .sub { color:var(--secondary-text-color); font-size:1em; }
  .pill { display:flex; align-items:center; gap:8px; padding:12px 18px; border-radius:24px; font-weight:600; white-space:nowrap; --mdc-icon-size:22px; }

  .item { display:flex; flex-direction:column; gap:6px; padding:12px 0; border-top:1px solid var(--divider-color,rgba(127,127,127,.25)); }
  .item:first-of-type { border-top:none; }
  .item .top { display:flex; align-items:center; gap:14px; cursor:pointer; }
  .ico { position:relative; width:40px; height:40px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; --mdc-icon-size:22px; }
  .ico .dot { position:absolute; right:-3px; bottom:-3px; width:12px; height:12px; border-radius:50%; background:var(--tone);
    border:2px solid var(--tn-ring); box-sizing:content-box; }
  .item .tx { flex:1; min-width:0; }
  .item .nm { font-size:1.1em; color:var(--primary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .item .nm .upd { font-size:.65em; background:var(--info-color,#039be5); color:#fff; border-radius:8px; padding:1px 7px; margin-left:8px; vertical-align:middle; }
  .item .sb { color:var(--secondary-text-color); font-size:.88em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .acts { display:flex; gap:4px; flex:none; }
  .act { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;
    color:var(--secondary-text-color); --mdc-icon-size:22px; }
  .act:hover { background:var(--secondary-background-color,rgba(127,127,127,.2)); }

  .bars { display:flex; gap:20px; padding-left:54px; align-items:center; }
  .m { flex:1; display:flex; align-items:center; gap:10px; min-width:0; font-size:.9em; color:var(--secondary-text-color); }
  .m .bar { flex:1; height:6px; border-radius:3px; background:var(--divider-color,rgba(127,127,127,.35)); overflow:hidden; min-width:30px; }
  .m .bar i { display:block; height:100%; border-radius:3px; background:var(--primary-color,#03a9f4); }
  .m .bar i.warn { background:var(--warning-color,#ffa600); } .m .bar i.bad { background:var(--error-color,#db4437); }
  .m .mv { min-width:2.8em; text-align:right; font-variant-numeric:tabular-nums; }

  .grp { margin-top:8px; }
  .gh { display:flex; align-items:center; justify-content:center; gap:12px; padding:18px; border-radius:20px; cursor:pointer;
    font-size:1.05em; user-select:none; --mdc-icon-size:24px; }
  .gh ha-icon:last-child { transition:transform .15s; }
  .grp.open .gh ha-icon:last-child { transform:rotate(180deg); }
  .grp .gb { display:none; margin-top:4px; } .grp.open .gb { display:block; }

  .block { margin-top:16px; }
  .stitle + .item { border-top:none; }
  .stitle { font-size:.8em; letter-spacing:.06em; text-transform:uppercase; color:var(--secondary-text-color); margin:0 4px 4px; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; padding:4px 0 0 54px; }
  .chip { font-size:.85em; padding:4px 10px; border-radius:12px; background:var(--secondary-background-color,rgba(127,127,127,.15)); color:var(--secondary-text-color); }
  .chip b { color:var(--primary-text-color); font-weight:600; }
  .bays-wrap { margin:8px 0 4px; }
  .bays-title { font-size:.8em; letter-spacing:.06em; text-transform:uppercase; color:var(--secondary-text-color); margin:0 4px 8px; }
  .chassis { display:grid; grid-template-columns:repeat(var(--cols),1fr); gap:8px; padding:10px; border-radius:16px;
    background:var(--secondary-background-color,rgba(127,127,127,.15)); box-shadow:inset 0 0 0 1px var(--divider-color,rgba(127,127,127,.25)); }
  .bay { display:flex; flex-direction:column; gap:4px; min-width:0; cursor:pointer; }
  .bay.empty { cursor:default; }
  .tray { position:relative; height:58px; border-radius:8px; overflow:hidden; box-sizing:border-box;
    border:2px solid color-mix(in srgb, var(--tone) 55%, var(--divider-color,#888));
    background:
      repeating-linear-gradient(90deg, transparent 0 5px, color-mix(in srgb, var(--tone) 22%, transparent) 5px 6px) 0 0 / 100% 100% no-repeat,
      color-mix(in srgb, var(--tone) 14%, var(--card-background-color, rgba(0,0,0,.2))); }
  .vert .tray { height:auto; aspect-ratio:1 / 1.5; background:
      repeating-linear-gradient(0deg, transparent 0 5px, color-mix(in srgb, var(--tone) 22%, transparent) 5px 6px),
      color-mix(in srgb, var(--tone) 14%, var(--card-background-color, rgba(0,0,0,.2))); }
  .tray .led { position:absolute; top:6px; left:6px; width:8px; height:8px; border-radius:50%; background:var(--tone); box-shadow:0 0 6px var(--tone); }
  .tray .hd { position:absolute; right:6px; bottom:6px; width:34%; height:6px; border-radius:3px; background:color-mix(in srgb, var(--tone) 55%, transparent); }
  .vert .tray .hd { right:auto; left:50%; transform:translateX(-50%); width:50%; }
  .tray .no { position:absolute; top:4px; right:7px; font-size:.7em; color:var(--secondary-text-color); }
  .tray .tt { position:absolute; left:0; right:0; top:50%; transform:translateY(-55%); text-align:center; font-weight:600; font-size:.95em; color:var(--primary-text-color); font-variant-numeric:tabular-nums; }
  .bay.empty .tray { border:2px dashed var(--divider-color,rgba(127,127,127,.4)); background:none; }
  .bay.empty .led, .bay.empty .hd { display:none; }
  .bay .bn.bs { margin-top:-3px; opacity:.8; }
  .bay .sm { text-align:center; font-size:.72em; font-weight:600; color:var(--tone); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bay .sm.ok { color:var(--success-color,#43a047); } .bay .sm.warn { color:var(--warning-color,#ffa600); }
  .bay .sm.bad { color:var(--error-color,#db4437); } .bay .sm.off { color:var(--secondary-text-color); }
  .tray .flag { position:absolute; left:50%; bottom:16px; transform:translateX(-50%); font-weight:700; font-size:.9em; color:var(--tone); }
  .bay .bn { text-align:center; font-size:.78em; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .empty { padding:8px 4px; color:var(--secondary-text-color); font-size:.9em; }
`;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const fmtBytes = (gib) => {
  if (gib == null) return "–";
  if (gib >= 1024) return `${(gib / 1024).toFixed(gib >= 10240 ? 1 : 2)} TiB`;
  return `${gib.toFixed(gib >= 100 ? 0 : 1)} GiB`;
};

const fmtDrive = (bytes) => {
  const b = num(bytes);
  if (b == null) return "";
  const tb = b / 1e12;
  return tb >= 1 ? `${+tb.toFixed(tb >= 10 ? 0 : 1)} TB` : `${Math.round(b / 1e9)} GB`;
};

const diskName = (d) => {
  const a = d.attributes;
  return String(a.name || a.devname || (a.friendly_name || d.entity_id).replace(/^(truenas|disks)\s*/i, "").replace(/\s*temperature$/i, ""));
};

const cleanModel = (m) => (m ? String(m).replace(/_/g, " ") : "");

const fmtUp = (v) => {
  let secs = null;
  const d = new Date(v);
  if (typeof v === "string" && !isNaN(d) && /\D/.test(v)) secs = (Date.now() - d.getTime()) / 1000;
  else if (num(v) != null) secs = num(v);
  if (secs == null || secs < 0) return null;
  const days = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600);
  return days ? `${days}d ${h}h` : `${h}h ${Math.floor((secs % 3600) / 60)}m`;
};

// The TrueNAS integration names attributes like "Serial", "Scrub state", "Available GiB".
// Add snake_case aliases (serial, scrub_state, available_gib) so the card can read them either way.
const _normCache = new WeakMap();
const normState = (s) => {
  if (!s || typeof s !== "object") return s;
  let n = _normCache.get(s);
  if (n) return n;
  const a = s.attributes || {};
  let na = null;
  for (const k of Object.keys(a)) {
    const nk = k.toLowerCase().replace(/[\s-]+/g, "_");
    if (nk !== k && !(nk in a)) (na || (na = { ...a }))[nk] = a[k];
  }
  n = na ? { ...s, attributes: na } : s;
  _normCache.set(s, n);
  return n;
};
const normStates = (states) => {
  const out = {};
  for (const k in states) out[k] = normState(states[k]);
  return out;
};

class TrueNASCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._open = null;
    this._sig = "";
  }

  static async getConfigElement() {
    // HA lazy-loads ha-form; force it to load before our editor renders.
    if (!customElements.get("ha-form")) {
      try {
        const helpers = await window.loadCardHelpers();
        const entities = await helpers.createCardElement({ type: "entities", entities: [] });
        await entities.constructor.getConfigElement();
      } catch (e) {
        /* fall through to the wait below */
      }
      await Promise.race([customElements.whenDefined("ha-form"), new Promise((r) => setTimeout(r, 4000))]);
    }
    return document.createElement("truenas-card-editor");
  }

  static getStubConfig() {
    return { type: "custom:truenas-card", title: "TrueNAS" };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...DEFAULTS, ...config };
    const norm = (l) => (Array.isArray(l) ? [...new Set(l.map((k) => (k === "bays" ? "disks" : k)))] : l);
    this._config.sections = norm(this._config.sections);
    this._config.expand = norm(this._config.expand);
    // disks entries: "id" | "" | { entity, smart, name }
    this._diskOverrides = new Map();
    if (Array.isArray(this._config.disks)) {
      this._diskIds = this._config.disks.map((x) => {
        if (x && typeof x === "object") {
          if (x.entity) this._diskOverrides.set(x.entity, x);
          return x.entity || "";
        }
        return x || "";
      });
    } else this._diskIds = null;
    if (this._open === null) this._open = new Set(this._config.expand);
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._st = normStates(hass.states);
    this._render();
  }

  getCardSize() {
    return 8;
  }

  // ---------- discovery ----------

  _entities() {
    const prefix = String(this._config.prefix || "").toLowerCase();
    const all = Object.values(this._st);
    const mine = prefix
      ? all.filter((s) => s.entity_id.toLowerCase().includes(prefix) || String(s.attributes.friendly_name || "").toLowerCase().includes(prefix))
      : all;
    return { mine, all };
  }

  _byIds(ids) {
    return ids.map((id) => this._st[id]).filter(Boolean);
  }

  _discover() {
    const c = this._config;
    const { mine, all } = this._entities();
    const attr = (s, k) => s.attributes && s.attributes[k] !== undefined;
    const bin = (s) => s.entity_id.startsWith("binary_sensor.");
    const sen = (s) => s.entity_id.startsWith("sensor.");
    // Attribute fingerprints from the integration; fall back to all entities if the prefix matched nothing.
    const pick = (pred, ids) => {
      if (ids) return this._byIds(ids);
      const a = mine.filter(pred);
      return a.length ? a : all.filter(pred);
    };

    this._poolExtras = new Map();
    const poolCfg = Array.isArray(c.pools) ? c.pools : null;
    const poolIds = poolCfg ? poolCfg.filter((x) => typeof x === "string") : null;
    const manualPools = poolCfg ? poolCfg.filter((x) => x && typeof x === "object" && (x.health || x.scrub || x.size || x.name)).map((x) => this._manualPool(x)) : [];
    const rootDs = (s) => sen(s) && attr(s, "pool") && attr(s, "mountpoint") &&
      String(s.attributes.mountpoint).replace(/\/+$/, "") === "/mnt/" + s.attributes.pool;
    let pools = pick((s) => ((bin(s) || sen(s)) && (attr(s, "scrub_state") || attr(s, "is_decrypted") || attr(s, "autotrim"))) || rootDs(s), poolIds);
    {
      // one entry per pool, preferring the health binary sensor
      const groups = new Map();
      for (const p of pools) {
        const k = this._poolKey(p);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(p);
      }
      pools = [];
      for (const g of groups.values()) {
        // primary: health binary sensor, else the one with a status, else first
        const primary = g.find(bin) || g.find((e) => e.attributes.status !== undefined) || g[0];
        pools.push(primary);
        this._poolExtras.set(primary.entity_id, g.filter((e) => e !== primary));
      }
    }
    const vms = pick((s) => bin(s) && attr(s, "autostart") && attr(s, "memory") && attr(s, "type"), c.vms);
    const apps = pick((s) => bin(s) && attr(s, "update_available") && attr(s, "latest_version"), c.apps);
    const services = pick((s) => bin(s) && attr(s, "enable") && attr(s, "state") && !attr(s, "scrub_state"), c.services);
    const disks = pick(
      (s) =>
        sen(s) &&
        s.attributes.device_class === "temperature" &&
        (attr(s, "serial") || attr(s, "model") || attr(s, "type") || attr(s, "rotational") || attr(s, "size")) &&
        !/cpu|motherboard|board/i.test(s.entity_id),
      this._diskIds && this._diskIds.some(Boolean) ? this._diskIds.filter(Boolean) : null
    );

    // System sensors: explicit override > name regex among prefixed entities.
    const find = (key, re, extra) => {
      if (c[key]) return this._st[c[key]];
      const test = (s) => sen(s) && re.test(s.entity_id + " " + (s.attributes.friendly_name || "")) && (!extra || extra(s));
      return mine.find(test) || all.find(test);
    };
    const system = {
      cpu: find("cpu", /cpu.*(usage|load)|cpu_usage/i, (s) => s.attributes.unit_of_measurement === "%"),
      mem: find("memory", /memory.*(usage|used)|ram/i, (s) => s.attributes.unit_of_measurement === "%"),
      temp: find("cpu_temp", /cpu.*temp|temperature/i, (s) => !/disk/i.test(s.entity_id) && !attr(s, "serial")),
      uptime: find("uptime", /uptime/i),
      arc: find("arc", /arc.*(size|cache)|arc_size/i),
      load: find("load", /load.*(short|1)|load_short|load_shortterm/i),
    };
    return { pools, manualPools, vms, apps, services, disks, system };
  }

  // ---------- rendering ----------

  _barTone(pct) {
    const c = this._config;
    return pct >= c.crit_pct ? "bad" : pct >= c.warn_pct ? "warn" : "";
  }

  _tempTone(t) {
    const c = this._config;
    return t >= c.crit_temp ? "bad" : t >= c.warn_temp ? "warn" : "ok";
  }

  _metric(label, pct, text) {
    const p = Math.max(0, Math.min(100, pct));
    return `<div class="m"><span>${esc(label)}</span><div class="bar"><i class="${this._barTone(p)}" style="width:${p.toFixed(1)}%"></i></div><span class="mv">${esc(text)}</span></div>`;
  }

  _item({ id, icon, tone, name, sub, bars, acts, upd }) {
    return `<div class="item t-${tone}">
      <div class="top" data-e="${esc(id)}">
        <div class="ico tint"><ha-icon icon="${icon}"></ha-icon><span class="dot"></span></div>
        <div class="tx"><div class="nm">${esc(name)}${upd ? '<span class="upd">update</span>' : ""}</div>${sub ? `<div class="sb">${esc(sub)}</div>` : ""}</div>
        ${acts ? `<div class="acts">${acts}</div>` : ""}
      </div>
      ${bars ? `<div class="bars">${bars}</div>` : ""}
    </div>`;
  }

  _acts(kind, e) {
    if (!this._config.controls) return "";
    const on = e.state === "on";
    const btn = (svc, icon, title) =>
      `<div class="act" data-svc="${kind}_${svc}" data-id="${esc(e.entity_id)}" title="${title}"><ha-icon icon="${icon}"></ha-icon></div>`;
    if (e.state === "unavailable") return "";
    if (kind === "service") return (on ? btn("restart", "mdi:restart", "Restart") + btn("stop", "mdi:stop", "Stop") : btn("start", "mdi:play", "Start"));
    return on ? btn("stop", "mdi:stop", "Stop") : btn("start", "mdi:power", "Start");
  }

  _systemItem(s, upd) {
    const parts = [];
    const up = s.uptime && fmtUp(s.uptime.state);
    if (up) parts.push("Uptime " + up);
    if (s.temp && num(s.temp.state) != null) parts.push(`${num(s.temp.state).toFixed(0)}°C`);
    const cpu = s.cpu && num(s.cpu.state), mem = s.mem && num(s.mem.state);
    let bars = "";
    if (cpu != null) bars += this._metric("CPU", cpu, cpu.toFixed(0) + "%");
    if (mem != null) bars += this._metric("RAM", mem, mem.toFixed(0) + "%");
    const hot = s.temp && num(s.temp.state) >= this._config.crit_temp;
    const tone = hot ? "bad" : (cpu ?? 0) >= this._config.crit_pct || (mem ?? 0) >= this._config.crit_pct ? "warn" : "ok";
    const id = (s.cpu || s.mem || s.uptime || s.temp || {}).entity_id;
    const chips = [];
    if (s.load && num(s.load.state) != null) chips.push(`<span class="chip">Load <b>${num(s.load.state).toFixed(2)}</b></span>`);
    if (s.arc && num(s.arc.state) != null) chips.push(`<span class="chip">ARC <b>${num(s.arc.state).toFixed(1)} ${esc(s.arc.attributes.unit_of_measurement || "")}</b></span>`);
    const item = this._item({ id: id || "", icon: "mdi:server", tone, name: parts.join(" · ") || "Online", sub: "", bars });
    return chips.length ? item.replace(/<\/div>\s*$/, `<div class="chips">${chips.join("")}</div></div>`) : item;
  }

  // Reads capacity from any entity: % sensors, free/used sensors, or total/used/free/available attributes.
  // All sizes returned in GiB.
  _capacity(e) {
    const out = { total: null, used: null, free: null, pct: null, ok: false };
    if (!e) return out;
    const a = e.attributes || {};
    const toGiB = (v, key, unit) => {
      const n = num(v);
      if (n == null) return null;
      const k = `${key || ""} ${unit || ""}`.toLowerCase();
      if (/tib|\btb\b|_tb/.test(k)) return n * 1024;
      if (/mib|\bmb\b|_mb/.test(k)) return n / 1024;
      if (/bytes|\bb\b/.test(k) || n > 1e9) return n / 1024 ** 3;
      return n; // gib / gb / unlabelled
    };
    for (const [k, v] of Object.entries(a)) {
      const key = k.toLowerCase();
      if (typeof v === "object" || num(v) == null) continue;
      if (/(pct|percent|usage_percent)/.test(key) && /(used|usage)/.test(key) && out.pct == null) out.pct = num(v);
      else if (/^(total|size)(_|$)/.test(key) && out.total == null) out.total = toGiB(v, key);
      else if (/^(used|allocated|alloc)(_|$)/.test(key) && out.used == null) out.used = toGiB(v, key);
      else if (/^(free|avail|available)(_|$)/.test(key) && out.free == null) out.free = toGiB(v, key);
    }
    const unit = a.unit_of_measurement || "";
    const st = num(e.state);
    if (st != null && e.entity_id.startsWith("sensor.")) {
      const id = `${e.entity_id} ${a.friendly_name || ""}`.toLowerCase();
      if (unit === "%") { if (out.pct == null) out.pct = /free|avail/.test(id) ? 100 - st : st; }
      else if (/[KMGT]i?B/i.test(unit)) {
        const g = toGiB(st, "", unit);
        if (/free|avail/.test(id)) { if (out.free == null) out.free = g; }
        else if (/used|usage/.test(id)) { if (out.used == null) out.used = g; }
        else if (/total|size/.test(id)) { if (out.total == null) out.total = g; }
        else if (out.used == null && out.free == null) out.free = g; // tomaae pool sensor state is free space
      }
    }
    if (out.total == null && out.used != null && out.free != null) out.total = out.used + out.free;
    out.ok = out.pct != null || (out.total != null && (out.used != null || out.free != null));
    return out;
  }

  _poolKey(e) {
    const a = e.attributes || {};
    if (a.pool) return String(a.pool).toLowerCase();
    const p = a.path || a.mountpoint;
    if (p) return String(p).split("/").filter(Boolean).pop().toLowerCase();
    return String(a.name || (a.friendly_name || e.entity_id.split(".")[1]))
      .toLowerCase().replace(/^(truenas|pools?)[\s_]+/, "").replace(/[\s_]+(health|healthy|free|usage|used|space|pool)$/g, "").trim();
  }

  _poolHealthy(p) {
    const a = p.attributes;
    if (p.entity_id.startsWith("binary_sensor.")) return p.state === "on";
    if (a.healthy !== undefined) return a.healthy === true || a.healthy === "true";
    if (a.status !== undefined) return String(a.status).toUpperCase() === "ONLINE";
    if (/^(unknown|unavailable)$/i.test(p.state)) return null;
    if (num(p.state) == null) return /^(online|healthy|on|true|ok|good)$/i.test(p.state);
    return true;
  }

  _poolName(e) {
    const a = e.attributes || {};
    const p = a.path || a.mountpoint;
    if (!a.pool && p) return String(p).split("/").filter(Boolean).pop();
    return String(a.pool || (a.friendly_name || e.entity_id).replace(/^(truenas|system|pools?|datasets?)\s+/i, "").replace(/\s*(health|healthy|free|usage|used|scrub.*)$/i, ""));
  }

  _poolItem(p) {
    const a = p.attributes;
    const group = [p, ...(this._poolExtras.get(p.entity_id) || [])];
    const caps = group.map((e) => this._capacity(e));
    const poolName = this._poolKey(p).replace(/-/g, "_");
    const has = caps.some((x) => x.ok);
    const auto = has ? null : Object.values(this._st).find(
      (s) => s.entity_id.startsWith("sensor.") && s.entity_id !== p.entity_id &&
        s.entity_id.toLowerCase().replace(/-/g, "_").includes(poolName) && !/health/i.test(s.entity_id) &&
        !s.attributes.serial && this._capacity(s).ok
    );
    if (auto) caps.push(this._capacity(auto));
    const healthy = this._poolHealthy(p);
    const status = group.map((e) => e.attributes.status).find(Boolean) || (p.entity_id.startsWith("binary_sensor.") ? (healthy ? "ONLINE" : "UNHEALTHY") : "");
    const scrub = group.map((e) => e.attributes.scrub_state).find(Boolean);
    const scrubEnd = group.map((e) => e.attributes.scrub_end).find(Boolean);
    return this._poolRow({ id: p.entity_id, name: this._poolName(p), healthy, status, scrub, scrubEnd, caps });
  }

  // A pool configured in the editor: { name, health, scrub, size } (each an entity id, all optional)
  _manualPool(cfg) {
    const get = (id) => (id ? this._st[id] : null);
    const h = get(cfg.health), sc = get(cfg.scrub), sz = get(cfg.size);
    const ents = [h, sc, sz].filter(Boolean);
    const isBin = h && h.entity_id.startsWith("binary_sensor.");
    const healthy = h ? this._poolHealthy(h) : null;
    let status = "";
    if (h) status = h.attributes.status || (isBin ? (healthy ? "ONLINE" : "UNHEALTHY") : num(h.state) == null ? h.state : "");
    // scrub text: a scrub attribute on the scrub entity, then on the health entity,
    // then the scrub entity's own state (ignored if it is just on/off)
    const sAttr = (e, re) => {
      if (!e) return undefined;
      const k = Object.keys(e.attributes || {}).find((x) => re.test(x));
      return k ? e.attributes[k] : undefined;
    };
    const STATE_RE = /^scrub[ _]?(state|status)$/i, END_RE = /^scrub[ _]?(end|finished|last)/i;
    let scrub = sAttr(sc, STATE_RE) ?? sAttr(h, STATE_RE);
    if (scrub == null && sc && !/^(on|off|unknown|unavailable)$/i.test(sc.state)) scrub = sc.state;
    const scrubEnd = sAttr(sc, END_RE) ?? sAttr(h, END_RE);
    const caps = sz ? [this._capacity(sz)] : h ? [this._capacity(h)] : [];
    return {
      caps,
      scrubEnd,
      ents,
      healthy,
      id: (h || sz || sc || {}).entity_id || "",
      name: cfg.name || (ents[0] ? this._poolName(ents[0]) : "Pool"),
      status,
      scrub,
    };
  }

  _manualPoolItem(m) {
    return this._poolRow({ id: m.id, name: m.name, healthy: m.healthy, status: m.status, scrub: m.scrub, scrubEnd: m.scrubEnd, caps: m.caps || [] });
  }

  _poolRow({ id, name, healthy, status, scrub, scrubEnd, caps }) {
    const pick = (k) => caps.map((x) => x[k]).find((v) => v != null);
    const sub = ["Pool"];
    if (status && !/^(unknown|unavailable)$/i.test(status)) sub.push(status);
    if (scrub && !/^(none|unknown|unavailable)$/i.test(scrub)) {
      let t = "scrub " + String(scrub).toLowerCase();
      const d = scrubEnd && new Date(scrubEnd);
      if (d && !isNaN(d) && /finished/i.test(scrub)) t += " " + d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
      sub.push(t);
    }
    let bars = "", pct = 0;
    const total = pick("total"), free = pick("free");
    const used = pick("used") ?? (total != null && free != null ? total - free : null);
    const p2 = pick("pct") ?? (total && used != null ? (used / total) * 100 : null);
    if (p2 != null) {
      pct = p2;
      bars = this._metric("Used", pct, pct.toFixed(0) + "%");
      if (total && used != null) sub.push(`${fmtBytes(used)} of ${fmtBytes(total)}`);
      else if (free != null) sub.push(fmtBytes(free) + " free");
    } else if (free != null) sub.push(fmtBytes(free) + " free");
    const c = this._config;
    const tone = healthy === false ? "bad" : pct >= c.crit_pct ? "bad" : pct >= c.warn_pct ? "warn" : "ok";
    return this._item({ id, icon: "mdi:database", tone, name, sub: sub.join(" · "), bars });
  }

  _runItem(kind, e, icon, extra) {
    const un = e.state === "unavailable" || e.state === "unknown";
    const on = e.state === "on";
    const tone = un ? "off" : on ? "ok" : "off";
    const name = (e.attributes.friendly_name || e.entity_id).replace(/^truenas\s*/i, "").replace(/^(app|vm|service)\s+/i, "");
    const label = { app: "App", vm: "VM", service: "Service" }[kind];
    const upd = e.attributes.update_available === true || e.attributes.update_available === "true";
    const sub = [label, un ? "Unavailable" : on ? "Running" : "Stopped", ...extra].filter(Boolean).join(" · ");
    return this._item({ id: e.entity_id, icon, tone, name, sub, acts: this._acts(kind, e), upd });
  }

  _group(key, tone, label, inner) {
    const open = this._open.has(key);
    const icon = tone === "ok" ? "mdi:check-circle-outline" : tone === "off" ? "mdi:minus-circle-outline" : "mdi:alert-circle-outline";
    return `<div class="grp t-${tone} ${open ? "open" : ""}" data-g="${key}">
      <div class="gh tint"><ha-icon icon="${icon}"></ha-icon><span>${esc(label)}</span><ha-icon icon="mdi:chevron-down"></ha-icon></div>
      <div class="gb">${inner || `<div class="empty">Nothing found</div>`}</div></div>`;
  }

  _kind(d) {
    const a = d.attributes;
    const raw = String(a.type ?? "").toUpperCase();
    const hay = `${d.entity_id} ${a.model ?? ""} ${a.friendly_name ?? ""}`.toLowerCase();
    let t = "";
    if (/nvme/.test(hay) || /NVME/.test(raw)) t = "NVMe";
    else if (/SSD/.test(raw)) t = "SSD";
    else if (/HDD/.test(raw)) t = "HDD";
    else if (a.rotational === false || a.rotationrate === 0 || String(a.rotationrate).toUpperCase() === "SSD") t = "SSD";
    else if (a.rotational === true || num(a.rotationrate) > 0) t = "HDD";
    else if (raw) t = raw;
    const bus = a.bus || a.interface || a.transfermode;
    const b = bus && !/auto|nvme/i.test(String(bus)) ? String(bus).toUpperCase() : "";
    return [b, t].filter(Boolean).join(" ");
  }

  // ---------- Scrutiny (ha_scrutiny integration) ----------
  // Groups Scrutiny sensors by serial_number. Returns Map(normSerial -> info) plus a device_name index.
  _scrutinyData() {
    const norm = (x) => String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const bySerial = new Map(), byDev = new Map();
    if (this._config.scrutiny === false) return { bySerial, byDev, ents: [], norm };
    const ents = [];
    for (const s of Object.values(this._st)) {
      const a = s.attributes;
      if (!s.entity_id.startsWith("sensor.") || a.serial_number === undefined) continue;
      ents.push(s);
      const k = norm(a.serial_number);
      if (!bySerial.has(k)) bySerial.set(k, { serial: a.serial_number, dev: a.device_name, ents: [] });
      const info = bySerial.get(k);
      info.ents.push(s);
      const id = s.entity_id;
      if (/_overall_status$/.test(id)) info.status = s;
      else if (/_smart_test_result$/.test(id)) info.test = s;
      else if (/_power_on_time$/.test(id)) info.pot = s;
      else if (/_power_cycle_count$/.test(id)) info.cycles = s;
      else if (/_last_smart_update$/.test(id)) info.last = s;
      else if (/_temperature$/.test(id)) info.temp = s;
      else if (/_capacity$/.test(id)) info.cap = s;
      if (a.device_name) byDev.set(String(a.device_name).toLowerCase(), info);
    }
    return { bySerial, byDev, ents, norm };
  }

  _smartFor(d) {
    const sc = this._scr;
    const ov = this._diskOverrides && this._diskOverrides.get(d.entity_id);
    if (ov && ov.smart && sc && this._config.scrutiny !== false) {
      const e = this._st[ov.smart];
      if (e) {
        const viaSerial = e.attributes.serial_number !== undefined && sc.bySerial.get(sc.norm(e.attributes.serial_number));
        return viaSerial || { status: e, ents: [e] };
      }
    }
    if (!sc || !sc.bySerial.size) return null;
    const a = d.attributes;
    const dev = diskName(d).toLowerCase();
    return (a.serial && sc.bySerial.get(sc.norm(a.serial))) || sc.byDev.get(dev) || sc.byDev.get(dev.replace(/n\d+$/, "")) ||
      [...sc.byDev.entries()].find(([k]) => k.replace(/n\d+$/, "") === dev.replace(/n\d+$/, ""))?.[1] || null;
  }

  // "ok" | "warn" | "bad" | "off" plus a short label
  _smartState(info) {
    if (!info) return null;
    const st = info.status && info.status.state, tr = info.test && info.test.state;
    const v = `${st || ""} ${tr || ""}`;
    if (/failed/i.test(v)) return { tone: "bad", label: "SMART failed" };
    if (/warning/i.test(v)) return { tone: "warn", label: "SMART warning" };
    if (/passed/i.test(st || tr || "")) return { tone: "ok", label: "SMART passed" };
    return { tone: "off", label: "SMART unknown" };
  }

  _smartTip(info) {
    if (!info) return "";
    const out = [];
    const val = (e) => (e && !/^(unknown|unavailable)$/i.test(e.state) ? e.state : null);
    if (val(info.status)) out.push(`Scrutiny status: ${info.status.state}`);
    if (val(info.test)) out.push(`SMART test: ${info.test.state}`);
    if (val(info.pot)) {
      const n = num(info.pot.state), u = info.pot.attributes.unit_of_measurement || "";
      const days = u === "h" ? n / 24 : u === "min" ? n / 1440 : n;
      out.push(`Power-on: ${days >= 365 ? (days / 365).toFixed(1) + " years" : Math.round(days) + " days"}`);
    }
    if (val(info.cycles)) out.push(`Power cycles: ${info.cycles.state}`);
    // any other numeric Scrutiny sensors (e.g. reallocated sectors), labelled by their name
    const known = new Set([info.status, info.test, info.pot, info.cycles, info.last, info.temp, info.cap].filter(Boolean));
    for (const e of info.ents) {
      if (known.has(e) || num(e.state) == null) continue;
      const label = String(e.attributes.friendly_name || e.entity_id).replace(/^.*\)\s*/, "");
      out.push(`${label}: ${e.state}${e.attributes.unit_of_measurement ? " " + e.attributes.unit_of_measurement : ""}`);
    }
    if (val(info.last)) {
      const t = new Date(info.last.state);
      if (!isNaN(t)) out.push(`Last SMART update: ${t.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
    }
    return out.join("\n");
  }

  _bays(disks) {
    const c = this._config;
    const sorted = [...disks].sort((a, b) => a.entity_id.localeCompare(b.entity_id, undefined, { numeric: true }));
    let slots;
    const byId = (id) => (id ? this._st[id] || null : null);
    if (Array.isArray(c.bay_slots)) slots = c.bay_slots.map(byId);
    else if (this._diskIds && this._diskIds.some(Boolean)) slots = this._diskIds.map(byId); // editor order, "" = empty bay
    else slots = sorted;
    const total = Math.max(c.bay_count || 0, slots.length, 1);
    const cols = c.bay_columns || (c.bay_vertical ? 4 : total <= 6 ? total : total <= 8 ? 4 : 6);
    while (slots.length < total) slots.push(null);
    // with a known bay count, fill the last row so the chassis stays rectangular
    if (c.bay_count) while (slots.length % cols) slots.push(null);
    const cells = slots.map((d, i) => {
      if (!d) return `<div class="bay empty t-off"><div class="tray"><span class="no">${i + 1}</span></div><div class="bn">empty</div></div>`;
      const a = d.attributes, t = num(d.state);
      let tone = d.state === "unavailable" ? "off" : t == null ? "off" : this._tempTone(t);
      const info = this._smartFor(d), sm = this._smartState(info);
      // SMART failure / warning overrides a normal temperature colour
      if (sm && sm.tone === "bad") tone = "bad";
      else if (sm && sm.tone === "warn" && tone === "ok") tone = "warn";
      const name = (this._diskOverrides.get(d.entity_id) || {}).name || diskName(d);
      const tip = [[name, this._kind(d), cleanModel(a.model), fmtDrive(a.size), a.rotationrate > 0 ? a.rotationrate + " rpm" : "", a.serial].filter(Boolean).join(" · "), this._smartTip(info)].filter(Boolean).join("\n");
      const flag = sm && (sm.tone === "bad" || sm.tone === "warn") ? `<span class="flag">${sm.tone === "bad" ? "✕" : "!"}</span>` : "";
      return `<div class="bay t-${tone}" data-e="${esc(d.entity_id)}" title="${esc(tip)}">
        <div class="tray"><span class="led"></span><span class="no">${i + 1}</span><span class="tt">${t == null ? "–" : t.toFixed(0) + "°"}</span>${flag}<span class="hd"></span></div>
        <div class="bn">${esc(name)}${this._kind(d) ? " · " + esc(this._kind(d)) : ""}</div>${a.size ? `<div class="bn bs">${esc(fmtDrive(a.size))}</div>` : ""}${sm ? `<div class="sm ${sm.tone}">${esc(sm.label)}</div>` : ""}</div>`;
    });
    return `<div class="bays-wrap">
      <div class="chassis ${c.bay_vertical ? "vert" : ""}" style="--cols:${cols}">${cells.join("")}</div></div>`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const c = this._config;
    const d = this._discover();

    const ids = [...d.pools, ...d.manualPools.flatMap((m) => m.ents), ...d.vms, ...d.apps, ...d.disks, ...d.services, ...Object.values(d.system).filter(Boolean)];
    const capSig = Object.values(this._st)
      .filter((s) => s.entity_id.startsWith("sensor.") && /free|total|used/i.test(s.entity_id) && s.entity_id.toLowerCase().includes((c.prefix || "").toLowerCase()))
      .map((s) => s.state).join(",");
    this._scr = this._scrutinyData();
    const sig = this._scr.ents.map((e) => e.state).join(",") + ids.map((e) => `${e.entity_id}|${e.state}|${e.last_updated}`).join(";") + capSig + JSON.stringify(c.sections);
    if (sig === this._sig) return;
    this._sig = sig;

    const isOn = (e) => e.state === "on";
    const updCount = d.apps.filter((a) => a.attributes.update_available === true || a.attributes.update_available === "true").length;
    const badPools = d.pools.filter((p) => this._poolHealthy(p) === false).length + d.manualPools.filter((m) => m.healthy === false).length;
    const hotDisks = d.disks.filter((x) => (num(x.state) ?? 0) >= c.crit_temp).length;
    const smart = d.disks.map((x) => this._smartState(this._smartFor(x))).filter(Boolean);
    const smartBad = smart.filter((x) => x.tone === "bad").length, smartWarn = smart.filter((x) => x.tone === "warn").length;

    let tone = "ok", sub = "All healthy";
    if (badPools) { tone = "bad"; sub = `${badPools} pool${badPools > 1 ? "s" : ""} unhealthy`; }
    else if (smartBad) { tone = "bad"; sub = `${smartBad} disk${smartBad > 1 ? "s" : ""} failing SMART`; }
    else if (hotDisks) { tone = "bad"; sub = `${hotDisks} disk${hotDisks > 1 ? "s" : ""} too hot`; }
    else if (smartWarn) { tone = "warn"; sub = `${smartWarn} disk SMART warning${smartWarn > 1 ? "s" : ""}`; }
    else if (updCount) { tone = "warn"; sub = `${updCount} update${updCount > 1 ? "s" : ""} available`; }
    const stopped = [...d.apps, ...d.vms].filter((e) => !isOn(e)).length;
    if (tone === "ok" && stopped) sub = `${stopped} stopped`;

    const guests = [...d.apps, ...d.vms];
    const pill = guests.length ? `${guests.filter(isOn).length} / ${guests.length} running` : `${d.pools.length + d.manualPools.length} pool${d.pools.length + d.manualPools.length === 1 ? "" : "s"}`;
    const pillIcon = guests.length ? "mdi:server" : "mdi:database";

    let body = "";
    for (const key of c.sections) {
      if (key === "system") body += `<div class="block"><div class="stitle">System</div>${this._systemItem(d.system)}</div>`;
      else if (key === "pools") body += `<div class="block"><div class="stitle">Pools</div>${d.pools.length + d.manualPools.length ? d.pools.map((p) => this._poolItem(p)).join("") + d.manualPools.map((m) => this._manualPoolItem(m)).join("") : `<div class="empty">No pools found. Add them under Pools in the card editor.</div>`}</div>`;
      else if (key === "disks") {
        const disks = d.disks;
        const t = hotDisks || smartBad ? "bad" : smartWarn || disks.some((x) => (num(x.state) ?? 0) >= c.warn_temp) ? "warn" : disks.length ? "ok" : "off";
        const hot = disks.length ? Math.max(...disks.map((x) => num(x.state) ?? -Infinity)) : null;
        const label = `Disks · ${disks.length} ${disks.length === 1 ? "drive" : "drives"}` + (Number.isFinite(hot) ? ` · max ${hot.toFixed(0)}°C` : "") +
          (smartBad ? ` · ${smartBad} failing` : smartWarn ? ` · ${smartWarn} warning` : smart.length ? " · SMART OK" : "");
        body += this._group(key, t, label, disks.length || c.bay_count || Array.isArray(c.bay_slots) || (this._diskIds && this._diskIds.length) ? this._bays(disks) : "");
      } else if (key === "apps") {
        const run = d.apps.filter(isOn).length;
        const t = !d.apps.length ? "off" : updCount ? "warn" : run === d.apps.length ? "ok" : "off";
        body += this._group(key, t, `Apps · ${run} / ${d.apps.length} running`,
          d.apps.map((a) => this._runItem("app", a, "mdi:docker", [a.attributes.version, a.attributes.update_available === true && a.attributes.latest_version ? "→ " + a.attributes.latest_version : ""])).join(""));
      } else if (key === "vms") {
        const run = d.vms.filter(isOn).length;
        body += this._group(key, !d.vms.length ? "off" : run === d.vms.length ? "ok" : "off", `VMs · ${run} / ${d.vms.length} running`,
          d.vms.map((v) => this._runItem("vm", v, "mdi:monitor", [v.attributes.cpu && v.attributes.cpu + " vCPU", v.attributes.memory && v.attributes.memory + " MiB"])).join(""));
      } else if (key === "services") {
        const run = d.services.filter(isOn).length;
        body += this._group(key, run === d.services.length && run ? "ok" : "off", `Services · ${run} / ${d.services.length} running`,
          d.services.map((v) => this._runItem("service", v, "mdi:cog", [v.attributes.enable ? "enabled" : "disabled"])).join(""));
      }
    }

    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <ha-card>
        <div class="head t-${tone}">
          <div class="badge"><ha-icon icon="${tone === "ok" ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"}"></ha-icon></div>
          <div class="ht"><div class="title">${esc(c.title)}</div><div class="sub">${esc(sub)}</div></div>
          <div class="pill tint"><ha-icon icon="${pillIcon}"></ha-icon>${esc(pill)}</div>
        </div>
        ${body}
      </ha-card>`;

    const root = this.shadowRoot;
    root.querySelectorAll(".gh").forEach((el) =>
      el.addEventListener("click", () => {
        const g = el.parentElement, k = g.dataset.g;
        this._open.has(k) ? this._open.delete(k) : this._open.add(k);
        g.classList.toggle("open");
      })
    );
    root.querySelectorAll(".act").forEach((el) =>
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const [kind, action] = el.dataset.svc.split("_");
        if (action === "stop" && !confirm(`Stop ${el.dataset.id}?`)) return;
        this._hass.callService("truenas", el.dataset.svc, { entity_id: el.dataset.id });
      })
    );
    root.querySelectorAll(".top[data-e], .bay[data-e]").forEach((el) =>
      el.addEventListener("click", () => {
        if (el.dataset.e) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: el.dataset.e } }));
      })
    );
  }
}


// ---------- visual editor ----------

const LABELS = {
  title: "Title",
  prefix: "Entity prefix (optional, biases discovery)",
  expand: "Panels that start open",
  controls: "Show start / stop buttons",
  scrutiny: "Use Scrutiny SMART data (if installed)",
  bay_vertical: "Tall drive trays",
  bay_columns: "Bays per row (blank = auto)",
  bay_count: "Total physical bays (blank = auto)",
  warn_temp: "Disk warning temperature (°C)",
  crit_temp: "Disk critical temperature (°C)",
  warn_pct: "Usage warning (%)",
  crit_pct: "Usage critical (%)",
  apps: "Apps (leave empty to auto-detect)",
  vms: "Virtual machines (leave empty to auto-detect)",
  cpu: "CPU usage sensor",
  memory: "Memory usage sensor",
  cpu_temp: "CPU temperature sensor",
  uptime: "Uptime sensor",
  load: "Load sensor",
  arc: "ARC size sensor",
};

const POOL_SCHEMA = [
  { name: "name", selector: { text: {} } },
  { name: "health", selector: { entity: {} } },
  { name: "scrub", selector: { entity: {} } },
  { name: "size", selector: { entity: {} } },
];
const POOL_LABELS = {
  name: "Pool name",
  health: "Health entity (on / ONLINE = healthy)",
  scrub: "Scrub status entity",
  size: "Size / usage entity",
};

const EDITOR_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "apps", selector: { entity: { multiple: true, domain: ["binary_sensor", "switch"] } } },
  { name: "vms", selector: { entity: { multiple: true, domain: ["binary_sensor", "switch"] } } },
  {
    name: "expand",
    selector: {
      select: {
        multiple: true,
        mode: "list",
        options: [
          { value: "disks", label: "Disks (drive bays)" },
          { value: "apps", label: "Apps" },
          { value: "vms", label: "Virtual machines" },
          { value: "services", label: "Services" },
        ],
      },
    },
  },
  { name: "controls", selector: { boolean: {} } },
  { name: "scrutiny", selector: { boolean: {} } },
  { name: "bay_vertical", selector: { boolean: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "bay_columns", selector: { number: { min: 1, max: 12, mode: "box" } } },
      { name: "bay_count", selector: { number: { min: 1, max: 60, mode: "box" } } },
      { name: "warn_temp", selector: { number: { min: 10, max: 100, mode: "box" } } },
      { name: "crit_temp", selector: { number: { min: 10, max: 100, mode: "box" } } },
      { name: "warn_pct", selector: { number: { min: 1, max: 100, mode: "box" } } },
      { name: "crit_pct", selector: { number: { min: 1, max: 100, mode: "box" } } },
    ],
  },
  { name: "prefix", selector: { text: {} } },
  { name: "cpu", selector: { entity: { domain: "sensor" } } },
  { name: "memory", selector: { entity: { domain: "sensor" } } },
  { name: "cpu_temp", selector: { entity: { domain: "sensor" } } },
  { name: "uptime", selector: { entity: { domain: "sensor" } } },
  { name: "load", selector: { entity: { domain: "sensor" } } },
  { name: "arc", selector: { entity: { domain: "sensor" } } },
];

class TrueNASCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    (this._poolForms || []).forEach((f) => (f.hass = hass));
    (this._diskRows || []).forEach((r) => r && r.form && (r.form.hass = hass));
    this._autoDisks = Object.values(normStates(hass.states))
      .filter((s) => s.entity_id.startsWith("sensor.") && s.attributes.device_class === "temperature" &&
        (s.attributes.serial || s.attributes.model || s.attributes.type || s.attributes.size) && !/cpu|motherboard|board/i.test(s.entity_id))
      .map((s) => s.entity_id)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  // pools in object form; plain entity ids from older configs are converted
  _poolsList() {
    const p = Array.isArray(this._config.pools) ? this._config.pools : [];
    return p.map((x) =>
      typeof x === "string" ? (x.startsWith("binary_sensor.") ? { health: x } : { health: x, size: x }) : { ...x }
    );
  }

  _emit(cfg) {
    cfg.type = this._config.type || "custom:truenas-card";
    this._config = cfg;
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: cfg } }));
  }

  _setPools(list) {
    const out = { ...this._config };
    const clean = list
      .map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== "")))
      .filter((p, i, arr) => Object.keys(p).length || i < arr.length); // keep blank rows the user just added
    if (clean.length) out.pools = clean;
    else delete out.pools;
    this._emit(out);
  }

  _render() {
    if (!this._form) {
      if (!customElements.get("ha-form")) {
        this.textContent = "The form component could not be loaded. Edit this card in YAML, or refresh the page and try again.";
        return;
      }
      const style = document.createElement("style");
      style.textContent = `
        .tn-pools { margin:16px 0 8px; }
        .tn-coll > .tn-ch { display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none; margin-bottom:4px; }
        .tn-coll > .tn-ch h3 { margin:0; flex:1; }
        .tn-coll > .tn-ch .chev { transition:transform .15s; opacity:.7; }
        .tn-coll.closed > .tn-ch .chev { transform:rotate(-90deg); }
        .tn-coll.closed > .tn-cb { display:none; }
        .tn-coll .cnt { font-size:.85em; opacity:.6; }
        .tn-disk { border:1px solid var(--divider-color,#ccc); border-radius:10px; margin-bottom:6px; }
        .tn-disk .dh { display:flex; align-items:center; gap:8px; padding:4px 8px; }
        .tn-disk .dn { flex:1; min-width:0; cursor:pointer; padding:8px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tn-disk .dn small { opacity:.6; margin-left:6px; }
        .tn-disk .db { padding:0 12px 12px; }
        .tn-disk.closed .db { display:none; }
        .tn-disk .sm-ok { color:var(--success-color,#43a047); } .tn-disk .sm-no { color:var(--warning-color,#ffa600); }
        .tn-pools h3 { font-size:1em; font-weight:500; margin:0 0 4px; }
        .tn-pools .hint { font-size:.85em; opacity:.7; margin-bottom:8px; }
        .tn-pool { border:1px solid var(--divider-color,#ccc); border-radius:12px; padding:12px; margin-bottom:10px; }
        .tn-pool .bar { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:500; }
        .tn-btn { font:inherit; cursor:pointer; border:none; border-radius:18px; padding:6px 14px;
          background:var(--primary-color,#03a9f4); color:var(--text-primary-color,#fff); }
        .tn-secs { margin:4px 0 8px; }
        .tn-secs h3, .tn-pools h3 { font-size:1em; font-weight:500; margin:0 0 4px; }
        .tn-sec { display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--divider-color,#ccc);
          border-radius:10px; margin-bottom:6px; }
        .tn-sec.off { opacity:.55; }
        .tn-sec label { flex:1; display:flex; align-items:center; gap:8px; cursor:pointer; }
        .tn-mv { font:inherit; width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; background:none;
          color:var(--primary-text-color); font-size:1.1em; }
        .tn-mv:hover:not(:disabled) { background:var(--secondary-background-color,rgba(127,127,127,.2)); }
        .tn-mv:disabled { opacity:.25; cursor:default; }
        .tn-btn.rm { background:none; color:var(--error-color,#db4437); padding:4px 8px; }
      `;
      this.appendChild(style);

      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.schema = EDITOR_SCHEMA;
      this._form.addEventListener("value-changed", (ev) => this._changed(ev.detail.value));

      this._secEl = document.createElement("div");
      this._secEl.className = "tn-secs";
      this.appendChild(this._secEl);

      this._poolsEl = document.createElement("div");
      this._poolsEl.className = "tn-pools";
      this.appendChild(this._poolsEl);

      this._disksEl = document.createElement("div");
      this._disksEl.className = "tn-pools";
      this.appendChild(this._disksEl);

      const opts = document.createElement("h3");
      opts.textContent = "Options";
      opts.style.cssText = "font-size:1em;font-weight:500;margin:16px 0 4px";
      this.appendChild(opts);
      this.appendChild(this._form);

      const note = document.createElement("div");
      note.style.cssText = "margin-top:12px;font-size:.85em;opacity:.7";
      note.textContent = "All options can also be set in YAML (see the README).";
      this.appendChild(note);
    }
    if (this._hass) this._form.hass = this._hass;
    const norm = (l) => (Array.isArray(l) ? [...new Set(l.map((k) => (k === "bays" ? "disks" : k)))] : l);
    this._form.data = { ...DEFAULTS, ...this._config, sections: norm(this._config.sections ?? DEFAULTS.sections), expand: norm(this._config.expand ?? DEFAULTS.expand) };
    this._renderSections();
    this._renderPools();
    this._renderDisks();
  }

  // Disks / bay order. Saved as `disks:` in bay order. Each entry is:
  //   "sensor.disks_sda"                                   – just the disk
  //   ""                                                   – an empty bay
  //   { entity, smart?, name? }                            – disk with a Scrutiny status entity and/or a display name
  _diskEntries() {
    const raw = Array.isArray(this._config.disks) ? this._config.disks : Array.isArray(this._config.bay_slots) ? this._config.bay_slots : [];
    return raw.map((x) => (x === "" ? "" : x && typeof x === "object" ? { ...x } : { entity: x || null }));
  }

  _saveDisks(list) {
    const out = { ...this._config };
    delete out.bay_slots; // the editor list supersedes the YAML-only option
    const tidy = list.map((x) => {
      if (x === "") return "";
      const o = Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== null && v !== ""));
      return Object.keys(o).length === 1 && o.entity ? o.entity : Object.keys(o).length ? o : null;
    });
    if (tidy.length) out.disks = tidy;
    else delete out.disks;
    this._emit(out);
  }

  _diskLabel(x) {
    const st = this._hass && x.entity ? normState(this._hass.states[x.entity]) : null;
    const name = x.name || (st ? diskName(st) : x.entity ? x.entity : "Choose a disk");
    // has Scrutiny data? (explicit entity, or auto-match by serial / device name)
    let smart = "";
    if (st) {
      const scr = Object.values(this._hass.states).map(normState).filter((e) => e.attributes.serial_number !== undefined);
      const n = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const dev = diskName(st).toLowerCase().replace(/n\d+$/, "");
      const auto = scr.some((e) => (st.attributes.serial && n(e.attributes.serial_number) === n(st.attributes.serial)) ||
        String(e.attributes.device_name || "").toLowerCase().replace(/n\d+$/, "") === dev);
      smart = x.smart ? '<small class="sm-ok">SMART: set</small>' : auto ? '<small class="sm-ok">SMART: matched</small>' : scr.length ? '<small class="sm-no">SMART: not matched</small>' : "";
    }
    return `${esc(name)}${smart}`;
  }

  _renderDisks() {
    const list = this._diskEntries();
    const shape = JSON.stringify(list.map((x) => (x === "" ? "" : "d")));
    // field edits keep the same shape: refresh labels/data instead of rebuilding (keeps focus)
    if (this._diskRows && this._diskShape === shape) {
      this._diskRows.forEach((r, i) => {
        if (!r || list[i] === "") return;
        r.label.innerHTML = this._diskLabel(list[i]);
        if (!this._diskEdit) r.form.data = list[i];
      });
      this._diskEdit = false;
      return;
    }
    this._diskShape = shape;
    this._diskOpen = this._diskOpen || new Set();
    const save = (l, rebuild) => {
      if (rebuild) this._diskRows = null;
      this._saveDisks(l);
      this._renderDisks();
    };
    const cur = () => this._diskEntries();
    const el = this._collapse(this._disksEl, "disks", "Disks",
      "Leave empty to auto-detect. Disks are shown in bay order: use the arrows to move them and \"empty bay\" for unused slots. Open a disk to rename it or pick its Scrutiny status sensor if it isn't matched automatically.",
      list.length ? `${list.filter((x) => x !== "").length} disks` : "auto");
    this._diskRows = list.map((x, i) => {
      const box = document.createElement("div");
      box.className = "tn-disk" + (this._diskOpen.has(i) || x === "" ? "" : " closed");
      const head = document.createElement("div");
      head.className = "dh";
      head.innerHTML = `<span style="min-width:22px;text-align:center;opacity:.7">${i + 1}</span>`;
      const label = document.createElement("div");
      label.className = "dn";
      if (x === "") {
        label.innerHTML = "<i style='opacity:.7'>Empty bay</i>";
        label.style.cursor = "default";
      } else {
        label.innerHTML = this._diskLabel(x);
        label.title = "Click to edit";
        label.addEventListener("click", () => {
          this._diskOpen.has(i) ? this._diskOpen.delete(i) : this._diskOpen.add(i);
          box.classList.toggle("closed");
        });
      }
      head.appendChild(label);
      const btn = (text, title, dis, fn) => {
        const b = document.createElement("button");
        b.className = "tn-mv";
        b.title = title;
        b.textContent = text;
        b.disabled = dis;
        b.addEventListener("click", fn);
        head.appendChild(b);
      };
      const swapOpen = (p, q) => {
        const a = this._diskOpen.has(p), b = this._diskOpen.has(q);
        a ? this._diskOpen.add(q) : this._diskOpen.delete(q);
        b ? this._diskOpen.add(p) : this._diskOpen.delete(p);
      };
      const move = (d) => {
        const l = cur();
        [l[i], l[i + d]] = [l[i + d], l[i]];
        swapOpen(i, i + d);
        save(l, true);
      };
      btn("▲", "Move up", i === 0, () => move(-1));
      btn("▼", "Move down", i === list.length - 1, () => move(1));
      btn("✕", "Remove", false, () => {
        const l = cur();
        l.splice(i, 1);
        this._diskOpen = new Set([...this._diskOpen].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)));
        save(l, true);
      });
      box.appendChild(head);
      let form = null;
      if (x !== "") {
        const body = document.createElement("div");
        body.className = "db";
        form = document.createElement("ha-form");
        form.schema = [
          { name: "entity", selector: { entity: { domain: "sensor" } } },
          { name: "smart", selector: { entity: { domain: "sensor" } } },
          { name: "name", selector: { text: {} } },
        ];
        form.computeLabel = (sch) =>
          ({ entity: "Disk (TrueNAS disk sensor)", smart: "Scrutiny status sensor (only if not matched automatically)", name: "Display name (optional)" })[sch.name];
        if (this._hass) form.hass = this._hass;
        form.data = x;
        form.addEventListener("value-changed", (ev) => {
          ev.stopPropagation();
          const l = cur();
          l[i] = { ...ev.detail.value };
          this._diskEdit = true;
          save(l, false);
        });
        body.appendChild(form);
        box.appendChild(body);
      }
      el.appendChild(box);
      return { label, form };
    });
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    const add = (text, fn) => {
      const b = document.createElement("button");
      b.className = "tn-btn";
      b.textContent = text;
      b.addEventListener("click", fn);
      bar.appendChild(b);
    };
    add("+ Add disk", () => {
      let l = cur();
      if (!l.length && this._autoDisks) l = this._autoDisks.map((e) => ({ entity: e }));
      l.push({ entity: null });
      this._diskOpen.add(l.length - 1);
      save(l, true);
    });
    add("+ Empty bay", () => {
      let l = cur();
      if (!l.length && this._autoDisks) l = this._autoDisks.map((e) => ({ entity: e }));
      l.push("");
      save(l, true);
    });
    if (!list.length) add("Use detected disks", () => this._autoDisks && this._autoDisks.length && save(this._autoDisks.map((e) => ({ entity: e })), true));
    el.appendChild(bar);
  }

  // Turns a container into a collapsible block; returns the body element to fill.
  _collapse(el, key, title, hint, count) {
    this._closedBlocks = this._closedBlocks || new Set();
    el.classList.add("tn-coll");
    el.classList.toggle("closed", this._closedBlocks.has(key));
    el.innerHTML = `<div class="tn-ch"><span class="chev">▾</span><h3>${title}</h3>${count != null ? `<span class="cnt">${count}</span>` : ""}</div>
      <div class="tn-cb">${hint ? `<div class="hint" style="font-size:.85em;opacity:.7;margin-bottom:8px">${hint}</div>` : ""}</div>`;
    el.querySelector(".tn-ch").addEventListener("click", () => {
      this._closedBlocks.has(key) ? this._closedBlocks.delete(key) : this._closedBlocks.add(key);
      el.classList.toggle("closed");
    });
    return el.querySelector(".tn-cb");
  }

  _renderSections() {
    const ALL = ["system", "pools", "disks", "apps", "vms", "services"];
    const NAMES = { system: "System", pools: "Pools", disks: "Disks (drive bays)", apps: "Apps", vms: "Virtual machines", services: "Services" };
    const cur = [...new Set((this._config.sections || DEFAULTS.sections).map((k) => (k === "bays" ? "disks" : k)))].filter((k) => ALL.includes(k));
    const order = [...cur, ...ALL.filter((k) => !cur.includes(k))];
    const save = (on, ord) => {
      const sections = ord.filter((k) => on.has(k));
      const out = { ...this._config };
      if (JSON.stringify(sections) === JSON.stringify(DEFAULTS.sections)) delete out.sections;
      else out.sections = sections;
      this._emit(out);
      this._renderSections();
    };
    const on = new Set(cur);
    const el = this._collapse(this._secEl, "sections", "Sections", "Tick to show, use the arrows to change the order.", `${cur.length} shown`);
    order.forEach((k, i) => {
      const row = document.createElement("div");
      row.className = "tn-sec" + (on.has(k) ? "" : " off");
      row.innerHTML = `<label><input type="checkbox" ${on.has(k) ? "checked" : ""}>${NAMES[k]}</label>
        <button class="tn-mv" title="Move up" ${i === 0 ? "disabled" : ""}>▲</button>
        <button class="tn-mv" title="Move down" ${i === order.length - 1 ? "disabled" : ""}>▼</button>`;
      row.querySelector("input").addEventListener("change", (ev) => {
        ev.target.checked ? on.add(k) : on.delete(k);
        save(on, order);
      });
      const [up, down] = row.querySelectorAll(".tn-mv");
      const move = (d) => {
        const o = [...order];
        [o[i], o[i + d]] = [o[i + d], o[i]];
        save(on, o);
      };
      up.addEventListener("click", () => move(-1));
      down.addEventListener("click", () => move(1));
      el.appendChild(row);
    });
  }

  _renderPools() {
    const list = this._poolsList();
    // only rebuild when the number of pools changes, so typing doesn't lose focus
    if (this._poolForms && this._poolForms.length === list.length) {
      this._poolForms.forEach((f, i) => (f.data = list[i]));
      return;
    }
    const el = this._collapse(this._poolsEl, "pools", "Pools", "Leave empty to auto-detect. Add a pool to choose its health, scrub and size entities yourself.", list.length ? `${list.length}` : "auto");
    this._poolForms = list.map((p, i) => {
      const box = document.createElement("div");
      box.className = "tn-pool";
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.innerHTML = `<span>Pool ${i + 1}</span>`;
      const rm = document.createElement("button");
      rm.className = "tn-btn rm";
      rm.textContent = "Remove";
      rm.addEventListener("click", () => {
        const l = this._poolsList();
        l.splice(i, 1);
        this._poolForms = null;
        this._setPools(l);
        this._renderPools();
      });
      bar.appendChild(rm);
      const f = document.createElement("ha-form");
      f.schema = POOL_SCHEMA;
      f.computeLabel = (s) => POOL_LABELS[s.name] || s.name;
      if (this._hass) f.hass = this._hass;
      f.data = p;
      f.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const l = this._poolsList();
        l[i] = ev.detail.value;
        this._setPools(l);
      });
      box.append(bar, f);
      el.appendChild(box);
      return f;
    });
    const add = document.createElement("button");
    add.className = "tn-btn";
    add.textContent = "+ Add pool";
    add.addEventListener("click", () => {
      const l = this._poolsList();
      l.push({});
      this._poolForms = null;
      this._setPools(l);
      this._renderPools();
    });
    el.appendChild(add);
  }

  _changed(value) {
    const out = { ...this._config };
    for (const [k, v] of Object.entries(value || {})) {
      if (k === "pools" || k === "sections") continue; // managed by their own editors
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length && k !== "expand" && k !== "sections");
      const isDefault = k in DEFAULTS && JSON.stringify(DEFAULTS[k]) === JSON.stringify(v);
      if (empty || isDefault) delete out[k];
      else out[k] = v;
    }
    this._emit(out);
  }
}

if (!customElements.get("truenas-card-editor")) customElements.define("truenas-card-editor", TrueNASCardEditor);

if (!customElements.get("truenas-card")) customElements.define("truenas-card", TrueNASCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "truenas-card",
  name: "TrueNAS Card",
  description: "Pools, system, disks, apps and VMs for the tomaae TrueNAS integration",
  preview: false,
});

console.info(`%c TRUENAS-CARD %c v${CARD_VERSION} `, "background:#0095d5;color:#fff;font-weight:bold", "background:#333;color:#fff");
