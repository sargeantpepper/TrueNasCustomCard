/*
 * TrueNAS Card for Home Assistant
 * Built for https://github.com/tomaae/homeassistant-truenas
 *
 * Sections: System, Pools, Disks, Apps / VMs / Services.
 * Entities are auto-discovered from their attributes; everything can be overridden in YAML.
 */

const CARD_VERSION = "2.0.0";

const DEFAULTS = {
  title: "TrueNAS",
  system_name: "TrueNAS",
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

    const pools = pick((s) => bin(s) && attr(s, "scrub_state") && attr(s, "is_decrypted"), c.pools);
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
        <div class="tx"><div class="nm">${esc(name)}${upd ? '<span class="upd">update</span>' : ""}</div><div class="sb">${esc(sub)}</div></div>
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
    const parts = ["System"];
    const up = s.uptime && fmtUp(s.uptime.state);
    if (up) parts.push("up " + up);
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
    const item = this._item({ id: id || "", icon: "mdi:server", tone, name: this._config.system_name, sub: parts.join(" · "), bars });
    return chips.length ? item.replace(/<\/div>\s*$/, `<div class="chips">${chips.join("")}</div></div>`) : item;
  }

  _poolItem(p) {
    const a = p.attributes;
    const name = (a.friendly_name || p.entity_id).replace(/^truenas\s*/i, "").replace(/\s*health$/i, "");
    const healthy = p.state === "on";
    const poolName = (a.path ? String(a.path).split("/").filter(Boolean).pop() : name).toLowerCase().replace(/-/g, "_");
    const cap = Object.values(this._hass.states).find(
      (s) =>
        s.entity_id.startsWith("sensor.") &&
        s.entity_id.toLowerCase().replace(/-/g, "_").includes(poolName) &&
        !s.entity_id.toLowerCase().includes("health") &&
        (s.attributes.total_value !== undefined || s.attributes.total_gib !== undefined || s.attributes.total_gb !== undefined ||
          s.attributes.free_gib !== undefined || s.attributes.free_gb !== undefined || /free/i.test(s.entity_id))
    );
    const sub = ["Pool", a.status || (healthy ? "ONLINE" : "UNHEALTHY")];
    if (a.scrub_state && a.scrub_state !== "NONE") sub.push("scrub " + String(a.scrub_state).toLowerCase());
    let bars = "", pct = 0;
    if (cap) {
      const ca = cap.attributes;
      const total = num(ca.total_gib ?? ca.total_gb ?? ca.total_value);
      let free = num(ca.free_gib ?? ca.free_gb);
      if (free == null && /free/i.test(cap.entity_id)) free = num(cap.state);
      const used = num(ca.used_gib ?? ca.used_gb) ?? (total != null && free != null ? total - free : null);
      if (total && used != null) {
        pct = (used / total) * 100;
        bars = this._metric("Used", pct, pct.toFixed(0) + "%");
        sub.push(`${fmtBytes(used)} of ${fmtBytes(total)}`);
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
    const badPools = d.pools.filter((p) => !isOn(p)).length;
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
      else if (key === "pools" && d.pools.length) body += `<div class="block"><div class="stitle">Pools</div>${d.pools.map((p) => this._poolItem(p)).join("")}</div>`;
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

if (!customElements.get("truenas-card")) customElements.define("truenas-card", TrueNASCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "truenas-card",
  name: "TrueNAS Card",
  description: "Pools, system, disks, apps and VMs for the tomaae TrueNAS integration",
  preview: false,
});

console.info(`%c TRUENAS-CARD %c v${CARD_VERSION} `, "background:#0095d5;color:#fff;font-weight:bold", "background:#333;color:#fff");
