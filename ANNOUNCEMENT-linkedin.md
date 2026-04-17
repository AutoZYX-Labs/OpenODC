# LinkedIn Launch Post Draft (OpenODC)

> Audience: international AD safety community, regulatory researchers, OEM safety engineers, AD startup founders.
> Tone: confident, technical, not promotional. Anchored to the underlying problem, not to me.
> Image: landing page hero screenshot (crop to title + subtitle + tagline + CTA).

---

## Version A · Standard launch post (recommended, ~280 words)

Last year I helped draft GB/T 45312-2025 — China's national standard for **Operational Design Conditions** of automated driving systems.

The standard organizes ODCs into a 5-level hierarchy with ~80 atomic elements: road types, weather, lighting, driver state, vehicle kinematics. For each element, an OEM declares "permitted" or "not permitted" with a clear exit behavior.

But once the standard was published, an obvious gap remained:

→ Each OEM declares ODCs in their own format
→ Third-party labs cannot make like-for-like comparisons
→ Regulators struggle to see across vendors
→ Consumers can't see the boundaries at all

So I built **OpenODC** — an open registry that makes ADS operational design conditions transparent, comparable, and machine-readable.

What's live today (v0.1.0):

→ The full GB/T 45312-2025 hierarchy as a machine-readable JSON Schema
→ All quantitative scales (wind, rain, snow, visibility, lighting) factored into reusable enums
→ The standard's Appendix A L3 expressway example, fully transcribed to JSON
→ Apache 2.0 (code) + CC BY 4.0 (data)

What's coming:

→ Web editor (anyone can author a standardized ODC)
→ Public gallery of ODC declarations, with diff and comparison views
→ Four renderings of the same data: developer / tester / regulator / consumer

The model is the same as ROAM (https://github.com/AutoZYX/ROAM): open, community-contributed, not commercial, designed to become public infrastructure rather than a product.

If you work on ADS safety, type approval, simulation pipelines, or consumer transparency — your contributions are welcome. Submit a PR, open an issue, or just star the repo.

→ https://github.com/AutoZYX/OpenODC
→ https://openodc.autozyx.com

#AutomatedDriving #ADSafety #ODD #SOTIF #ISO34503 #OpenSource

---

## Version B · Short post (~120 words, for second wave)

GB/T 45312-2025 defines ~80 atomic elements that describe an ADS's operational design condition, in a strict 5-level hierarchy.

I just open-sourced the full standard as a machine-readable JSON Schema, with the appendix example fully transcribed.

OpenODC is the registry that the standard implies but doesn't ship: anyone can author, validate, compare, and publish ODC declarations against a common contract.

Phase 0 is live. Phase 1 (web editor + gallery) is next.

If you build, test, regulate, or report on automated driving — this might matter to you.

Apache 2.0 (code) + CC BY 4.0 (data).

→ https://github.com/AutoZYX/OpenODC

#AutomatedDriving #SOTIF #OpenSource #ADSafety

---

## Version C · Reply template for comments

For "what about ISO 34503?":
> Phase 4 includes a mapping layer between GB/T 45312-2025 and ISO 34503 / BSI PAS 1883. The schemas are not 1:1 but the structural overlap is significant — most ODD elements in PAS 1883 have a counterpart in GB 45312. Happy to coordinate on this if you want to contribute.

For "will OEMs actually publish?":
> Honest answer: I don't expect OEMs to volunteer this. The model is to (1) build the standard format, (2) seed the gallery with community-extracted ODCs from public materials (owner manuals, regulatory filings, third-party tests), (3) let the resulting transparency apply natural pressure for OEMs to publish official versions. The same dynamic that worked for caniuse.com vs browser vendors.

For "is this only for China standards?":
> The schema is rooted in GB/T 45312-2025 because that's the most comprehensive and recent national standard. But the data model is not China-specific — it's a permitted/not-permitted declaration over a hierarchical ODC catalog. Phase 4 explicitly adds international standard mappings.

---

## Posting cadence suggestion

1. **Day 0** (repo public + landing live): Version A on LinkedIn + 公众号 short version simultaneously
2. **Day 7**: Engage with comments, share in 1-2 relevant LinkedIn groups (AD safety, type approval)
3. **Day 14** (Phase 1 MVP): Version B announcing the editor and first 5 gallery samples
4. **Day 21**: Direct outreach to 3-5 standout AD safety contacts (Nancy Leveson via FISITA ISC connection, fka leveLXData, etc.)
