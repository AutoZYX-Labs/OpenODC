# Contributing to OpenODC

Thank you for considering a contribution. OpenODC is built around the principle that public, machine-readable ODCs are a piece of safety infrastructure — and infrastructure gets better with many contributors.

## What kinds of contributions are welcome

### 1. New sample ODC documents

Find a vehicle/function whose ODC is not yet in `data/examples/` and add one. Suggested workflow:

1. Pick a public source: car owner's manual, type-approval filing, third-party test report, regulatory disclosure
2. Extract the relevant ODC information element by element
3. Map each element to a `element_id` from `schema/categories/*.json`
4. Author a JSON document in `data/examples/<vendor>-<model>-<function>.json`
5. Mark `source.type` honestly (`owner_manual` / `media_test` / `regulatory_filing` / `community_extracted`)
6. Mark `source.confidence` honestly (`high` / `medium` / `low`)
7. Set `metadata.review_status: "draft"` initially
8. Open a PR

### 2. Vendor-confirmed versions

If you represent an OEM or AD supplier and want to publish an officially-endorsed ODC:

1. Either claim and amend an existing community draft, or submit a fresh document
2. Set `metadata.review_status: "vendor_confirmed"`
3. Sign off in the PR description with your role and contact (e.g. "John Doe, Safety Engineering Lead, BYD")
4. We will merge after a basic sanity check

Vendor-confirmed records rank above community-extracted ones for the same vehicle. They also remove the "⚠ community-sourced" badge from the public view.

### 3. Schema improvements

- Adding mappings to international standards (ISO 34503, BSI PAS 1883, SAE J3016)
- Fixing element hierarchy errors against the source standard
- Adding new quantitative scales as the standard is revised
- Improving English translations

For schema changes, please open an issue first to discuss.

### 4. Documentation

- Translations
- Tutorials
- Use-case writeups (regulatory submission, simulation pipeline, etc.)

## Pull request guidelines

- **One change per PR.** Don't bundle a schema change with a data submission.
- **Validate before submitting.** Run `npx ajv-cli validate -s schema/odc.schema.json -d <your-file>.json` locally.
- **Cite your sources.** Every data PR must include the URLs or document references in `metadata.sources`.
- **Be honest about confidence.** It is better to mark `confidence: low` than to overclaim.
- **No marketing copy.** Document descriptions should be technical, not promotional.

## Style

- All `name_zh` fields in Simplified Chinese
- All `name_en` fields in English
- Element ids: lowercase, dot-separated, snake_case (e.g. `odd.weather.atmospheric.wind`)
- Document ids: lowercase, hyphenated (e.g. `byd-han-2026-dipilot-highway`)
- Dates in ISO 8601 (`2026-04-17` for dates, full RFC 3339 for timestamps)

## Reporting errors in existing data

If you find a factual error in an existing sample ODC, open an issue (or send a PR) with:
- The document affected
- The specific element or field
- Evidence (link, screenshot, page reference)
- Whether you are the affected OEM or a third-party reporter

We respond to errors quickly because they affect the credibility of the whole platform.

## Code of conduct

Be respectful. Disagreements about technical correctness are welcome; personal attacks are not.

## License

By submitting a contribution you agree that:
- Code contributions are licensed under [Apache License 2.0](./LICENSE)
- Data contributions are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Contact

For private inquiries (vendor partnerships, undisclosed safety issues): zhangyuxin312@gmail.com
