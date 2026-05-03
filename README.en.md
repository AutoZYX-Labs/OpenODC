# OpenODC

> Open Platform for Automated Driving Operational Design Conditions
> 自动驾驶系统运行设计条件开源平台

An open registry that turns public evidence about AD / ADAS operational boundaries into transparent, comparable, machine-readable data — aligned with GB/T 45312—2025.

[中文 README →](./README.md) · [Architecture →](./ARCHITECTURE.md) · [Contributing →](./CONTRIBUTING.md)

---

## What is this

OpenODC is an open-source platform for defining, comparing, and browsing ODC (Operational Design Condition) declarations for driver assistance and automated driving systems. It is aligned with **GB/T 45312—2025** *Intelligent and connected vehicles — Operational design condition for automated driving system*.

OpenODC measures how clearly operational boundaries are evidenced in public sources. It does not rank automated-driving capability and it is not a safety certification. Unless a record is marked `vendor_confirmed`, it is a community extraction from public sources.

It addresses three problems:

1. There is no industry-standard format for publishing ODCs — every OEM rolls their own
2. Third-party labs, regulators, and consumers cannot make like-for-like comparisons across vehicles
3. The standard's hierarchical structure has no machine-readable counterpart

OpenODC delivers:

- A **JSON Schema** strictly aligned with GB/T 45312—2025
- A **web editor** for OEMs or the community to maintain a standardized ODC table
- A public **gallery** with six community-extracted ADAS / ADS / Robotaxi samples from public sources
- A **matrix view** that aligns 144 GB/T elements across multiple systems
- Two **views** of the same data: developer / consumer
- A **Vendor Intake Workbench** that turns manuals, configuration tables, operating rules, or sanitized excerpts into a 144-element ODC draft table

## Why this exists

The boundary between "supported" and "unsupported" for assisted and automated driving is one of the least transparent and most misunderstood pieces of the AD industry. Each OEM declares their ODC in their own format. Regulators struggle to compare. Consumers can't see it at all.

OpenODC is not a replacement for an OEM's internal ODC tooling. OEMs already disclose parts of the boundary through owner manuals and in-vehicle tutorials. The problem is that every OEM uses its own categories, wording, and granularity.

OpenODC provides a unified, machine-readable public format and a sample library so ODCs become queryable, comparable, and reusable. Community-extracted samples come first; vendor-confirmed records can follow once the format becomes useful.

Important semantic boundary: L2 records describe feature availability conditions while the driver remains responsible for the dynamic driving task. L3/L4 records are the cases where an ADS may take responsibility inside an ODD. See the [Methodology](https://openodc.autozyx.com/en/methodology.html) page.

## Current status

`v0.4.0 (Phase 0–4 MVP)`

- ✅ Full transcription of GB/T 45312—2025 ODC element hierarchy (144 elements / 7 categories)
- ✅ JSON Schema + TypeScript type definitions
- ✅ Machine-readable quantitative scales (12 wind levels, 4 rain levels, snow / accumulation / visibility, etc.)
- ✅ Web editor with tree selection, live JSON, export / copy / local save
- ✅ Public gallery with Tesla FSD US current public sample, Tesla China Assisted Driving, Huawei ADS 4, Apollo Go, XPeng XNGP, and Pony.ai Gen-7 Robotaxi
- ✅ 144-element public-source coverage metrics with per-sample evidence-as-of dates; this is not a vendor disclosure rate
- ✅ Dual renderer: developer view and consumer view
- ✅ Matrix view: 144 GB/T elements × 6 sample systems
- ✅ Vendor Intake Workbench: paste manual / rule excerpts, generate a 144-element ODC draft table, and export CSV / Markdown review packages
- ⏳ Backend publishing loop: corporate-domain verification, role permissions, private file parsing, administrator review, and portal / API / GitHub publication channels

Full roadmap: [ARCHITECTURE.md](./ARCHITECTURE.md). Publishing semantics: [Methodology](https://openodc.autozyx.com/en/methodology.html).

## Repository layout

```
OpenODC/
├── schema/                           # The standard, machine-readable
│   ├── odc.schema.json               # Main JSON Schema
│   ├── odc.types.ts                  # TypeScript types
│   ├── categories/                   # ODC element catalog
│   └── enums/                        # Quantitative scale tables
├── data/examples/                    # Reference ODC documents
├── site/                             # Static site: Gallery / Editor / Matrix / Workbench
└── tools/                            # manifest build, coverage fill, reference checks
```

## Quick start

Validate an ODC document:

```bash
npx ajv-cli validate --spec=draft2019 --strict=false --validate-formats=false -s schema/odc.schema.json -d data/examples/huawei-ads4-aito-m9.json
node tools/check-references.mjs
node tools/build-manifest.mjs
node tools/check-source-links.mjs
```

Use in TypeScript:

```typescript
import type { ODCDocument } from './schema/odc.types'

const doc: ODCDocument = require('./data/examples/huawei-ads4-aito-m9.json')
```

## Mapping to the standard

| Standard clause | OpenODC counterpart |
|---|---|
| §5 General requirements | `ODCElement` definition in the schema |
| §6.1 ODC base element hierarchy | Tree structure under `schema/categories/*.json` |
| §6.2 ODD (road / infra / targets / weather / digital) | Five `odd_*.json` files |
| §6.3 Driver and passenger state | `personnel_state.json` |
| §6.4 Vehicle state | `vehicle_state.json` |
| §5.4.b Permitted / not permitted | `requirement: 'permitted' \| 'not_permitted'` |
| §5.4.c Element associations | `associations[]` field |
| §5.5 Exit behavior for not-permitted elements | `exit_behavior` field |
| Public sample library | `data/examples/*.json` (community-extracted samples with per-element public-source coverage and gaps) |
| L2 / L3 / L4 semantics | `site/en/methodology.html` |
| Tables 5–14 quantitative scales | `schema/enums/quantitative_scales.json` |

## Contributing

Three types of contributions are welcome:

1. **New sample data** — extracted from public sources (owner manuals, operating rules, government notices, third-party tests). Mark `source.type` and `source.confidence` honestly.
2. **Vendor-confirmed records** — OEMs submit official versions that override community-extracted ones, marked `review_status: vendor_confirmed`.
3. **Schema improvements** — international mappings (ISO 34503 / ASAM OpenODD / BSI PAS 1883), level corrections.

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

- Code: [Apache License 2.0](./LICENSE)
- Data (`data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — please credit OpenODC

## Citation

```
Zhang, Y. (2026). OpenODC: An open registry of operational design conditions
for automated driving systems. https://openodc.autozyx.com
```

## Related projects

- [ROAM](https://autozyx.github.io/ROAM/) — L4 Robotaxi Operations Anomaly Management
- [DRIVEResearch](https://www.driveresearch.tech/) — Aerial naturalistic driving dataset

Together they form an open AD safety toolkit: ROAM (incident outcomes) + OpenODC (declared design boundary) + DRIVEResearch (measured operational distribution).

## Contact

- Issues: https://github.com/AutoZYX-Labs/OpenODC/issues
- Maintainer: [Zhang Yuxin](https://www.linkedin.com/in/zhangyuxin312/), Jilin University · Zhuoyu Tech · DRIVEResearch
