# TrueNAS Card

A Home Assistant Lovelace card for the [tomaae TrueNAS integration](https://github.com/tomaae/homeassistant-truenas). It shows system stats, pools with capacity bars, disk temperatures, apps and VMs, and optionally services. Tapping a row opens that entity's more-info dialog.

## Install

1. Copy `truenas-card.js` to `/config/www/truenas-card/`.
2. Settings → Dashboards → Resources → add `/local/truenas-card/truenas-card.js` as a *JavaScript module*.
3. Hard-refresh the browser.

(Or add the repo to HACS as a custom *Dashboard* repository.)

## Usage

The card has a visual editor: add **TrueNAS Card** from the card picker and use the form. YAML works too.

```yaml
type: custom:truenas-card
title: Nas
```

Entities are auto-discovered from the attributes the integration exposes. Everything below is optional.

```yaml
type: custom:truenas-card
title: Nas
prefix: truenas              # biases discovery; useful with several TrueNAS systems
sections: [system, pools, disks, apps, vms, services]
collapse: [disks]            # sections that start collapsed
warn_temp: 45
crit_temp: 55
warn_pct: 80                 # pool usage thresholds
crit_pct: 90
# explicit overrides if auto-discovery picks the wrong thing
cpu: sensor.truenas_cpu_usage
memory: sensor.truenas_memory_usage
cpu_temp: sensor.truenas_cpu_temperature
uptime: sensor.truenas_uptime
load: sensor.truenas_load_average_short
arc: sensor.truenas_arc_size
pools:                       # or set these per pool in the editor
  - name: NAS_Storage
    health: binary_sensor.truenas_nas_storage_health
    scrub: binary_sensor.truenas_nas_storage_health  # uses its scrub_state attribute, else its state
    size: sensor.datasets_nas_storage
disks: [sensor.truenas_sda_temperature]
apps: []
vms: []
services: []
```

## Notes

- The header pill turns red for an unhealthy pool or a disk at/above `crit_temp`, and amber when app updates are available.
- Pool capacity is read from the pool's sensor (`sensor.<pool>`) attributes. If your bars are missing, check that sensor's attributes in Developer Tools and tell me the names.
- This was written from the integration's documented attributes, not a live instance, so entity name regexes may need an override or two.
