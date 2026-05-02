# Architecture

This document explains how OpenODC is structured, why the data model looks the way it does, and how the pieces fit together. Audience: anyone who wants to extend the schema, build views on top of it, or contribute data.

For the product roadmap, see [PLAN.md](../PLAN.md).

---

## 1. Design principles

1. **Standard-first, not tool-first.** The JSON Schema is the contract. Every UI, every export format, every tool is a derivative of this contract. If the standard updates, the schema updates, and everything downstream re-derives.

2. **Machine-readable from day one.** GB/T 45312—2025 is a PDF describing a tree of elements with prose. We turn that prose into structured JSON so it can be validated, queried, diffed, and rendered programmatically.

3. **Provenance over completeness.** Every ODC element entry must declare its source: official vendor declaration, community extraction from public materials, regulatory filing, etc. A document with 30 well-sourced entries is more valuable than one with 80 unsourced ones.

4. **No hidden hierarchy.** The catalog mirrors the standard's clause numbering exactly (`spec_section: "6.2.1.1.3.a"`). Anyone reading the standard can find the corresponding JSON, and vice versa.

5. **One document, many views.** Same JSON renders as: developer view (full hierarchy), consumer view (plain-language cards), compare view (document-to-document diff), and matrix view (catalog × document coverage).

## 2. Data model

There are three kinds of files in `schema/`:

### 2.1 The catalog (`schema/categories/*.json`)

The catalog is the **authoritative dictionary** of ODC elements as defined by GB/T 45312—2025. It is a flat list per category, with each element carrying its level, parent_id, and spec_section.

```json
{
  "id": "odd.road.type.highway.expressway",
  "name_zh": "高速公路",
  "name_en": "Expressway (Highway)",
  "level": 5,
  "parent_id": "odd.road.type.highway",
  "spec_section": "6.2.1.1.3.a",
  "description_zh": "专供汽车分方向、分车道行驶，全部控制出入的多车道公路。"
}
```

Catalog files are organized by the standard's second-level categories:
- `odd_road.json` (§6.2.1)
- `odd_road_infrastructure.json` (§6.2.2)
- `odd_targets.json` (§6.2.3)
- `odd_weather.json` (§6.2.4)
- `odd_digital_info.json` (§6.2.5)
- `personnel_state.json` (§6.3)
- `vehicle_state.json` (§6.4)

### 2.2 The enums (`schema/enums/*.json`)

Quantitative scales (wind force, rain intensity, visibility, lighting illuminance, etc.) are factored out into a separate file so they can be cross-referenced from the catalog.

For example, fog/haze/dust/smoke all use the same 4-level visibility scale (Tables 9–12 of the standard). Rather than repeat the scale four times in the catalog, we define it once in `enums/quantitative_scales.json` under `visibility_levels`, and the catalog elements reference it by `enum_id`.

### 2.3 The document schema (`schema/odc.schema.json`)

This is a JSON Schema (Draft 2020-12) that defines the shape of an actual ODC document — what an OEM or contributor would author. Conceptually:

```
ODCDocument
├── Identity (vendor, model, function_name, ads_level, version)
├── elements: ODCElement[]
│       ├── element_id        ← references the catalog
│       ├── requirement       ← permitted / not_permitted
│       ├── parameter_range   ← e.g. "曲率半径 ≥ 150 m"
│       ├── exit_behavior     ← required when not_permitted
│       └── source            ← provenance
├── associations: ODCAssociation[]   ← cross-element constraints
└── metadata
        ├── submitted_by
        ├── review_status     ← draft / community_reviewed / vendor_confirmed
        └── sources
```

## 3. The catalog vs. the document — important distinction

A common confusion: the **catalog** and a **document** are different things.

- The **catalog** is the universe of all possible ODC elements (defined by the standard). It does not say whether each element is allowed for any particular ADS — it just lists what elements exist and how they nest.

- A **document** is one ADS's declaration: "here are the elements I selected from the catalog, and for each one whether I allow it or not."

This separation lets us evolve the catalog (e.g. when the standard is revised) without breaking existing documents, and lets us validate that a document only references elements that exist in the catalog.

## 4. The element id convention

Element IDs use **dot-separated lowercase paths** that mirror the standard's hierarchy:

```
odd.road.type.highway.expressway       ← §6.2.1.1.3.a
odd.weather.particles.fog              ← §6.2.4.2.1
personnel.driver.takeover.attention    ← §6.3.1.1.1
vehicle.motion.speed.activation        ← §6.4.1.1.2
```

Top-level prefixes are fixed: `odd.` / `personnel.` / `vehicle.` (matching §6.2 / §6.3 / §6.4).

This convention makes it trivial to:
- Sort and group elements by topic
- Find an element by its standard clause
- Diff two documents (line up by id)
- Generate URL slugs (`/elements/odd.road.type.highway.expressway`)

## 5. Modeling the "permitted / not permitted / association" trichotomy

§5.4 of the standard requires every ODC element to have:
- A clear name
- A clear requirement (permitted / not permitted)
- Optionally, an association relationship

§5.5 adds a constraint: when requirement is "not permitted," the document must specify *how* the element affects ADS — suppress activation, trigger exit, or both.

Our model:
- `requirement` is an enum: `'permitted' | 'not_permitted'`
- `exit_behavior` is required when `requirement === 'not_permitted'`, with values `'suppress_activation' | 'trigger_exit' | 'suppress_and_exit'`
- Associations are stored at the document level (not per-element) because they are inherently relational. Each association names a primary and a dependent element and the relation type.

## 6. Provenance and trust levels

Each element entry can carry a `source` block:

```json
"source": {
  "type": "owner_manual",
  "url": "https://example.com/manual.pdf#page=42",
  "confidence": "high",
  "extracted_date": "2026-04-17"
}
```

At the document level, `metadata.review_status` summarizes the whole document:
- `draft` — unreviewed, often community-submitted
- `community_reviewed` — peer-checked via PR review
- `vendor_confirmed` — officially endorsed by the OEM

In the UI, vendor-confirmed records rank above community-extracted ones for the same vehicle, and unconfirmed records carry a visible "⚠ community-sourced" badge.

## 7. How rendering works

The current renderers all read the same `ODCDocument` plus the merged catalog in `site/data/catalog.json`.

| View | What it shows | What it hides |
|---|---|---|
| **Developer** | Full 5-level tree, raw JSON, spec section labels | Nothing |
| **Consumer** | Plain-language buckets ("能用 / 有限制 / 不能用"), coverage tags, sources | Raw JSON unless expanded through developer view |
| **Compare** | 2–4 documents aligned by element_id | Deep source prose |
| **Matrix** | 144 GB/T elements × all sample documents, with coverage and requirement classes | Raw JSON |

Rendering is fully client-side: the document JSON plus the catalog JSON are enough to produce any view.

## 8. Why we chose the data model we did

### Why a flat catalog instead of nested?

Nested would mirror the visual structure of the standard, but flat (with `parent_id` references) is much easier to:
- Search by id
- Add/remove elements without rewriting tree branches
- Lazy-load by category
- Diff against future standard revisions

A nested view is generated from the flat data at render time.

### Why JSON Schema instead of XML / YAML / Protobuf?

- JSON Schema has wide validator support (ajv, ajv-cli) and IDE integration
- The data is human-readable and reviewable in PRs
- Future API exposure (REST / GraphQL) maps to JSON natively
- The standard's example tables are tabular — JSON arrays of objects is the obvious fit

### Why store everything in git instead of a database?

For Phase 0–4 MVP, all public data lives as JSON files in the repo:
- Zero infrastructure cost
- Every change is reviewable as a PR diff
- History is git-native
- Anyone can fork and run their own copy

The current Vendor Workbench is a static frontend MVP backed by browser localStorage. For Phase 5, we will add a Supabase backend for OEM direct authoring, with the git repo as the canonical public export.

## 9. What's NOT in scope

OpenODC is **not** trying to be:
- A simulation platform (we describe ODCs; tools like SimOne / 51Sim / CARLA consume them)
- An OEM's internal ADS specification system (we are a publishing format)
- A safety case framework (ISO 21448 / ISO 26262 sit above us)
- A real-time monitoring system (we declare design conditions; we do not measure runtime conditions)

## 10. Versioning

- The **schema** follows semver. Breaking changes to `odc.schema.json` (e.g. removing a required field) bump the major version.
- The **catalog** versions track the underlying standard (currently `GB/T 45312-2025`). When the standard is revised, we publish a new catalog version with a migration note.
- **Documents** declare their `spec_version`, allowing renderers to handle multiple schema versions in parallel.

---

*Last updated 2026-05-02 (v0.4.0 / Phase 0–4 MVP).*
