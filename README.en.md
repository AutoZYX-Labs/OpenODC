# OpenODC

> Open Platform for Automated Driving Operational Design Conditions
> 自动驾驶系统运行设计条件开源平台

An open registry that makes ADS operational design conditions transparent, comparable, and machine-readable — aligned with the Chinese national standard GB/T 45312—2025.

[中文 README →](./README.md) · [Architecture →](./ARCHITECTURE.md) · [Contributing →](./CONTRIBUTING.md)

---

## What is this

OpenODC is an open-source platform for defining, comparing, and browsing ODC (Operational Design Condition) declarations for Automated Driving Systems. It is rigorously aligned with the Chinese national standard **GB/T 45312—2025** *Intelligent and connected vehicles — Operational design condition for automated driving system*.

It addresses three problems:

1. There is no industry-standard format for publishing ODCs — every OEM rolls their own
2. Third-party labs, regulators, and consumers cannot make like-for-like comparisons across vehicles
3. The standard's hierarchical structure has no machine-readable counterpart

OpenODC delivers:

- A **JSON Schema** strictly aligned with GB/T 45312—2025
- A **web editor** for OEMs or the community to fill in a standardized ODC table
- A public **gallery** of sample ODCs, browsable by model / function / level
- Four **views** of the same data: developer / tester / regulator / consumer

## Why this exists

The boundary between "supported" and "unsupported" for assisted and automated driving is one of the least transparent and most misunderstood pieces of the AD industry. Each OEM declares their ODC in their own format. Regulators struggle to compare. Consumers can't see it at all.

The goal of OpenODC is not to replace any vendor's internal ODC tooling — it is to establish a standardized, public-facing format and a public sample library, in the spirit of caniuse.com. ODCs become queryable, comparable, and reusable.

## Current status

`v0.1.0 (Phase 0)`

- ✅ Full transcription of GB/T 45312—2025 ODC element hierarchy (~80 fifth-level elements)
- ✅ JSON Schema + TypeScript type definitions
- ✅ Machine-readable quantitative scales (12 wind levels, 4 rain levels, snow / accumulation / visibility, etc.)
- ✅ Appendix A example (L3 ADS on expressway) fully transcribed to JSON
- ⏳ Web editor (Phase 1)
- ⏳ Public gallery (Phase 1)
- ⏳ Multi-view renderer (Phase 2)

Full roadmap: [PLAN.md](../PLAN.md).

## Repository layout

```
OpenODC/
├── schema/                           # The standard, machine-readable
│   ├── odc.schema.json               # Main JSON Schema
│   ├── odc.types.ts                  # TypeScript types
│   ├── categories/                   # ODC element catalog
│   └── enums/                        # Quantitative scale tables
├── data/examples/                    # Reference ODC documents
├── site/                             # Landing page (Phase 0 static)
└── docs/                             # Documentation
```

## Quick start

Validate an ODC document:

```bash
npx ajv-cli validate -s schema/odc.schema.json -d data/examples/gb45312-appendix-a-l3-highway.json
```

Use in TypeScript:

```typescript
import type { ODCDocument } from './schema/odc.types'

const doc: ODCDocument = require('./data/examples/gb45312-appendix-a-l3-highway.json')
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
| Appendix A example | `data/examples/gb45312-appendix-a-l3-highway.json` |
| Tables 5–14 quantitative scales | `schema/enums/quantitative_scales.json` |

## Contributing

Three types of contributions are welcome:

1. **New sample data** — extracted from public sources (owner's manuals, regulatory filings, third-party tests). Mark `source.type` and `source.confidence` honestly.
2. **Vendor-confirmed records** — OEMs submit official versions that override community-extracted ones, marked `review_status: vendor_confirmed`.
3. **Schema improvements** — international mappings (ISO 34503 / BSI PAS 1883), level corrections.

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

- [ROAM](https://github.com/AutoZYX/ROAM) — L4 Robotaxi Operations Anomaly Management
- [DRIVEResearch](https://www.driveresearch.tech/) — Aerial naturalistic driving dataset

Together they form an open AD safety toolkit: ROAM (incident outcomes) + OpenODC (declared design boundary) + DRIVEResearch (measured operational distribution).

## Contact

- Issues: https://github.com/AutoZYX/OpenODC/issues
- Maintainer: [Zhang Yuxin](https://www.linkedin.com/in/zhangyuxin312/), Jilin University · Zhuoyu Tech · DRIVEResearch
