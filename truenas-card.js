/*
 * TrueNAS Card for Home Assistant
 * Built for https://github.com/tomaae/homeassistant-truenas
 *
 * Sections: System, Pools, Disks, Apps / VMs / Services.
 * Entities are auto-discovered from their attributes; everything can be overridden in YAML.
 */

const CARD_VERSION = "2.3.1";

const DEFAULTS = {
  title: "TrueNAS",
  prefix: "truenas", // biases discovery; useful with several systems
  sections: ["system", "pools", "bays", "disks", "apps", "vms"], // add "services" if wanted
  expand: [], // collapsible groups (disks, apps, vms, services) that start open
  bay_columns: null, // drive-bay grid columns (auto if unset)
  bay_count: null, // total physical slots, so empty bays show (auto if unset)
  bay_slots: null, // explicit slot order: list of disk entity ids, "" for an empty slot
  bay_vertical: true, // tall trays (default); set false for wide trays
  controls: true, // start/stop buttons on apps, VMs and services
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
  .bays-wrap { margin:16px 0 4px; }
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
    if (this._open === null) this._open = new Set(this._config.expand);
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  // ---------- discovery ----------

  _entities() {
    const prefix = String(this._config.prefix || "").toLowerCase();
    const all = Object.values(this._hass.states);
    const mine = prefix
      ? all.filter((s) => s.entity_id.toLowerCase().includes(prefix) || String(s.attributes.friendly_name || "").toLowerCase().includes(prefix))
      : all;
    return { mine, all };
  }

  _byIds(ids) {
    return ids.map((id) => this._hass.states[id]).filter(Boolean);
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
    const rootDs = (s) => sen(s) && attr(s, "pool") && attr(s, "mountpoint") &&
      String(s.attributes.mountpoint).replace(/\/+$/, "") === "/mnt/" + s.attributes.pool;
    let pools = pick((s) => ((bin(s) || sen(s)) && (attr(s, "scrub_state") || attr(s, "is_decrypted") || attr(s, "autotrim"))) || rootDs(s), c.pools);
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
      c.disks
    );

    // System sensors: explicit override > name regex among prefixed entities.
    const find = (key, re, extra) => {
      if (c[key]) return this._hass.states[c[key]];
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
    return { pools, vms, apps, services, disks, system };
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
    return String(a.status || "ONLINE").toUpperCase() === "ONLINE";
  }

  _poolItem(p) {
    const a = p.attributes;
    const name = String(a.pool || (a.friendly_name || p.entity_id).replace(/^(truenas|pools?|datasets?)\s+/i, "").replace(/\s*health$/i, ""));
    const healthy = this._poolHealthy(p);
    const poolName = this._poolKey(p).replace(/-/g, "_");
    const caps = [p, ...(this._poolExtras.get(p.entity_id) || [])].map((e) => this._capacity(e));
    const auto = caps.some((x) => x.pct != null || (x.total != null && (x.used != null || x.free != null)))
      ? null
      : Object.values(this._hass.states).find(
          (s) => s.entity_id.startsWith("sensor.") && s.entity_id !== p.entity_id &&
            s.entity_id.toLowerCase().replace(/-/g, "_").includes(poolName) && !/health/i.test(s.entity_id) &&
            !s.attributes.serial && this._capacity(s).ok
        );
    if (auto) caps.push(this._capacity(auto));
    const pick = (k) => caps.map((x) => x[k]).find((v) => v != null);
    const status = a.status || [p, ...(this._poolExtras.get(p.entity_id) || [])].map((e) => e.attributes.status).find(Boolean);
    const sub = ["Pool", status || (p.entity_id.startsWith("binary_sensor.") ? (healthy ? "ONLINE" : "UNHEALTHY") : "")].filter(Boolean);
    if (a.scrub_state && a.scrub_state !== "NONE") sub.push("scrub " + String(a.scrub_state).toLowerCase());
    let bars = "", pct = 0;
    {
      const total = pick("total");
      const free = pick("free");
      const used = pick("used") ?? (total != null && free != null ? total - free : null);
      const p2 = pick("pct") ?? (total && used != null ? (used / total) * 100 : null);
      if (p2 != null) {
        pct = p2;
        bars = this._metric("Used", pct, pct.toFixed(0) + "%");
        if (total && used != null) sub.push(`${fmtBytes(used)} of ${fmtBytes(total)}`);
        else if (free != null) sub.push(fmtBytes(free) + " free");
      } else if (free != null) sub.push(fmtBytes(free) + " free");
    }
    const tone = !healthy ? "bad" : pct >= this._config.crit_pct ? "bad" : pct >= this._config.warn_pct ? "warn" : "ok";
    return this._item({ id: p.entity_id, icon: "mdi:database", tone, name, sub: sub.join(" · "), bars });
  }

  _diskItem(d) {
    const a = d.attributes, t = num(d.state);
    const tone = t == null ? "off" : this._tempTone(t);
    const name = diskName(d);
    const sub = [this._kind(d) || "Disk", cleanModel(a.model), fmtDrive(a.size), a.rotationrate > 0 ? a.rotationrate + " rpm" : "", a.serial].filter(Boolean).join(" · ");
    let bars = "";
    if (t != null) {
      const p = (t / (this._config.crit_temp + 15)) * 100;
      bars = `<div class="m"><span>Temp</span><div class="bar"><i class="${tone === "ok" ? "" : tone}" style="width:${Math.min(100, p).toFixed(0)}%"></i></div><span class="mv">${t.toFixed(0)}°C</span></div>`;
    }
    return this._item({ id: d.entity_id, icon: "mdi:harddisk", tone, name, sub, bars });
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

  _bays(disks) {
    const c = this._config;
    const sorted = [...disks].sort((a, b) => a.entity_id.localeCompare(b.entity_id, undefined, { numeric: true }));
    let slots;
    if (Array.isArray(c.bay_slots)) slots = c.bay_slots.map((id) => (id ? this._hass.states[id] || null : null));
    else slots = sorted;
    const total = Math.max(c.bay_count || 0, slots.length, 1);
    const cols = c.bay_columns || (c.bay_vertical ? Math.min(total, 4) : total <= 6 ? total : total <= 8 ? 4 : 6);
    while (slots.length < total) slots.push(null);
    // fill the last row so the chassis grid stays rectangular
    while (slots.length % cols) slots.push(null);
    const cells = slots.map((d, i) => {
      if (!d) return `<div class="bay empty t-off"><div class="tray"><span class="no">${i + 1}</span></div><div class="bn">empty</div></div>`;
      const a = d.attributes, t = num(d.state);
      const tone = d.state === "unavailable" ? "off" : t == null ? "off" : this._tempTone(t);
      const name = diskName(d);
      const tip = [name, this._kind(d), cleanModel(a.model), fmtDrive(a.size), a.rotationrate > 0 ? a.rotationrate + " rpm" : "", a.serial].filter(Boolean).join(" · ");
      return `<div class="bay t-${tone}" data-e="${esc(d.entity_id)}" title="${esc(tip)}">
        <div class="tray"><span class="led"></span><span class="no">${i + 1}</span><span class="tt">${t == null ? "–" : t.toFixed(0) + "°"}</span><span class="hd"></span></div>
        <div class="bn">${esc(name)}${this._kind(d) ? " · " + esc(this._kind(d)) : ""}</div>${a.size ? `<div class="bn bs">${esc(fmtDrive(a.size))}</div>` : ""}</div>`;
    });
    return `<div class="bays-wrap"><div class="bays-title">Drive bays</div>
      <div class="chassis ${c.bay_vertical ? "vert" : ""}" style="--cols:${cols}">${cells.join("")}</div></div>`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const c = this._config;
    const d = this._discover();

    const ids = [...d.pools, ...d.vms, ...d.apps, ...d.disks, ...d.services, ...Object.values(d.system).filter(Boolean)];
    const capSig = Object.values(this._hass.states)
      .filter((s) => s.entity_id.startsWith("sensor.") && /free|total|used/i.test(s.entity_id) && s.entity_id.toLowerCase().includes((c.prefix || "").toLowerCase()))
      .map((s) => s.state).join(",");
    const sig = ids.map((e) => `${e.entity_id}|${e.state}|${e.last_updated}`).join(";") + capSig + JSON.stringify(c.sections);
    if (sig === this._sig) return;
    this._sig = sig;

    const isOn = (e) => e.state === "on";
    const updCount = d.apps.filter((a) => a.attributes.update_available === true || a.attributes.update_available === "true").length;
    const badPools = d.pools.filter((p) => !this._poolHealthy(p)).length;
    const hotDisks = d.disks.filter((x) => (num(x.state) ?? 0) >= c.crit_temp).length;

    let tone = "ok", sub = "All healthy";
    if (badPools) { tone = "bad"; sub = `${badPools} pool${badPools > 1 ? "s" : ""} unhealthy`; }
    else if (hotDisks) { tone = "bad"; sub = `${hotDisks} disk${hotDisks > 1 ? "s" : ""} too hot`; }
    else if (updCount) { tone = "warn"; sub = `${updCount} update${updCount > 1 ? "s" : ""} available`; }
    const stopped = [...d.apps, ...d.vms].filter((e) => !isOn(e)).length;
    if (tone === "ok" && stopped) sub = `${stopped} stopped`;

    const guests = [...d.apps, ...d.vms];
    const pill = guests.length ? `${guests.filter(isOn).length} / ${guests.length} running` : `${d.pools.length} pool${d.pools.length === 1 ? "" : "s"}`;
    const pillIcon = guests.length ? "mdi:server" : "mdi:database";

    let body = "";
    for (const key of c.sections) {
      if (key === "system") body += `<div class="block"><div class="stitle">System</div>${this._systemItem(d.system)}</div>`;
      else if (key === "pools") body += `<div class="block"><div class="stitle">Pools</div>${d.pools.length ? d.pools.map((p) => this._poolItem(p)).join("") : `<div class="empty">No pools found. Set <code>pools:</code> to your pool entities in the card YAML.</div>`}</div>`;
      else if (key === "bays") body += this._bays(d.disks);
    }
    for (const key of c.sections) {
      if (key === "disks") {
        const disks = [...d.disks].sort((a, b) => a.entity_id.localeCompare(b.entity_id));
        const t = hotDisks ? "bad" : disks.some((x) => (num(x.state) ?? 0) >= c.warn_temp) ? "warn" : disks.length ? "ok" : "off";
        body += this._group(key, t, `Disks · ${disks.length} ${disks.length === 1 ? "drive" : "drives"}`, disks.map((x) => this._diskItem(x)).join(""));
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
  sections: "Sections to show",
  expand: "Panels that start open",
  controls: "Show start / stop buttons",
  bay_vertical: "Tall drive trays",
  bay_columns: "Bays per row (blank = auto)",
  bay_count: "Total physical bays (blank = auto)",
  warn_temp: "Disk warning temperature (°C)",
  crit_temp: "Disk critical temperature (°C)",
  warn_pct: "Usage warning (%)",
  crit_pct: "Usage critical (%)",
  pools: "Pools (leave empty to auto-detect)",
  disks: "Disks (leave empty to auto-detect)",
  apps: "Apps (leave empty to auto-detect)",
  vms: "Virtual machines (leave empty to auto-detect)",
  cpu: "CPU usage sensor",
  memory: "Memory usage sensor",
  cpu_temp: "CPU temperature sensor",
  uptime: "Uptime sensor",
  load: "Load sensor",
  arc: "ARC size sensor",
};

const EDITOR_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "pools", selector: { entity: { multiple: true, domain: ["sensor", "binary_sensor"] } } },
  { name: "disks", selector: { entity: { multiple: true, domain: "sensor" } } },
  { name: "apps", selector: { entity: { multiple: true, domain: ["binary_sensor", "switch"] } } },
  { name: "vms", selector: { entity: { multiple: true, domain: ["binary_sensor", "switch"] } } },
  {
    name: "sections",
    selector: {
      select: {
        multiple: true,
        mode: "list",
        options: [
          { value: "system", label: "System" },
          { value: "pools", label: "Pools" },
          { value: "bays", label: "Drive bays" },
          { value: "disks", label: "Disks list" },
          { value: "apps", label: "Apps" },
          { value: "vms", label: "Virtual machines" },
          { value: "services", label: "Services" },
        ],
      },
    },
  },
  {
    name: "expand",
    selector: {
      select: {
        multiple: true,
        mode: "list",
        options: [
          { value: "disks", label: "Disks list" },
          { value: "apps", label: "Apps" },
          { value: "vms", label: "Virtual machines" },
          { value: "services", label: "Services" },
        ],
      },
    },
  },
  { name: "controls", selector: { boolean: {} } },
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
  }

  _render() {
    if (!this._form) {
      if (!customElements.get("ha-form")) {
        this.textContent = "The form component could not be loaded. Edit this card in YAML, or refresh the page and try again.";
        return;
      }
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.schema = EDITOR_SCHEMA;
      this._form.addEventListener("value-changed", (ev) => this._changed(ev.detail.value));
      this.appendChild(this._form);
      const note = document.createElement("div");
      note.style.cssText = "margin-top:12px;font-size:.85em;opacity:.7";
      note.textContent = "Pin disks to exact bays with bay_slots in YAML.";
      this.appendChild(note);
    }
    if (this._hass) this._form.hass = this._hass;
    this._form.data = { ...DEFAULTS, ...this._config };
  }

  _changed(value) {
    const out = { ...this._config };
    for (const [k, v] of Object.entries(value || {})) {
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length && k !== "expand" && k !== "sections");
      const isDefault = k in DEFAULTS && JSON.stringify(DEFAULTS[k]) === JSON.stringify(v);
      if (empty || isDefault) delete out[k];
      else out[k] = v;
    }
    out.type = this._config.type || "custom:truenas-card";
    this._config = out;
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: out } }));
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
