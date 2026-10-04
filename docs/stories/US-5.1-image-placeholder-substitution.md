---
artifact: story
story: US-5.1
slug: image-placeholder-substitution
title: Replace [file-name.ext] markers in Original Description with the matching uploaded image at the same position in the final description
track: angular
version: 1
status: ARCHIVED
owner: so-story-writer
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-02T00:00:00Z
---

# US-5.1 — Replace [file-name.ext] markers in Original Description with the matching uploaded image at the same position in the final description

## Story

As a **content operator running a generation**,
I want **a file-name marker in square brackets (for example `[image-name.jpg]` or
`[image-name.webp]`) in the Original Description field to be treated as an image placeholder
and replaced, at that exact position in the final product description, with the matching
uploaded image**,
so that **I control where each image lands in the description instead of accepting wherever
the pipeline would otherwise put it, and no raw `[file-name]` text leaks into published
copy**.

## Context

The operator can already upload images; each upload is recorded in the image manifest and
analysed by the Vision pipeline. The Original Description (the operator's source text) may
already say where an image belongs by naming the file in square brackets, but today that
marker has no defined meaning. This Story gives it one, across every content schema.

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY` |
| **Locales** | All locales of every store (uk-UA master and every translation) |
| **Surface** | Expected: Original Description parsing, image manifest matching, description rendering (`src/render`, `src/domain`, `src/utils`), and the generation report/warnings. To be confirmed by impact analysis. |
| **Touches FROZEN files?** | Unknown until planning. If a prompt file listed in AGENTS.md §9 would need to change, that is a §9 stop and must be raised then. |
| **Touches generated HTML?** | Yes — `<img>` / `<figure>` output and the AGENTS.md §4 image criteria (first image without `loading="lazy"`, later ones with it, `decoding="async"` on all, no orphan images, `<figcaption>` from the manifest caption) |

## Acceptance criteria

- **AC-1:** A bracketed token in Original Description whose content is a file name (for
  example `[image-name.jpg]`, `[image-name.webp]`) is identified as an image placeholder.
- **AC-2:** When a placeholder's file name matches an uploaded image in the manifest, the
  final description contains that image at the position of the placeholder, rendered as a
  full `<img>` with `src` pointing to that image and a non-empty `alt`, and the literal
  `[file-name.ext]` text does not appear in the output.
- **AC-3:** The substituted image output satisfies the AGENTS.md §4 image criteria that apply
  to the chosen schema (lazy-loading rule, `decoding="async"`, `<figure>`/`<figcaption>`
  wrapping, no orphan image).
- **AC-4:** The substitution works for every content schema the Generator offers (all v4 and
  simplified Content Template schemas and the Consumables doc pipeline), for every store in
  `STORE_REGISTRY` and every locale generated.
- **AC-5:** When a placeholder's file name matches no uploaded image, the marker is removed
  from the final description (the HTML stays well-formed and no `[file-name.ext]` text
  remains) and a warning naming the unmatched file name appears in the generated report.
- **AC-6:** Bracketed text that is not a file name (for example `[note]` or `[1]`) is left
  untouched.

## Out of scope

- Uploading images, the Vision analysis, and alt-text/caption generation themselves.
- Changing which uploaded images are used when no placeholders are present.
- Adding new content schemas, stores or locales.

## Resolved questions / Decisions log

All questions raised during story writing are resolved. The decisions below are binding
input for the specification.

- **Q1 — Which extensions, and how strict is the match?**
  - **Decision:** Only `.jpg` and `.webp`. Matching is strict kebab-case: lowercase letters,
    digits and single hyphens only. Files that violate this (spaces, a double dot, other
    letter case) are rejected at upload time and never enter the system, so the parser only
    has to recognise well-formed names.
  - **Hint for developers:** `^\[[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|webp)\]$`
- **Q2 — Interaction with the coverage rule?**
  - **Decision:** The first mention of a marker renders the image. Every later mention of the
    same marker only has its marker text removed. Uploaded images without a marker are placed
    as usual.
- **Q3 — Which report carries the warning, and does it block?**
  - **Decision:** A non-blocking Warning in the generation QA report shown in the UI.
- **Q4 — What is `src` when `imageBaseUrl` is empty?**
  - **Decision:** Use the absolute URL from the manifest (CDN) or a relative path, whichever
    the upload system returns for that store.
- **Q5 — Where does `alt` come from?**
  - **Decision:** Priority order: 1) Vision-derived alt, 2) file name without extension
    (fallback), 3) manifest caption.

## References

- AGENTS.md §4 (HTML acceptance criteria for images), §9 (FROZEN files)
- `src/prompt-core/constants.ts` — `STORE_REGISTRY.imageBaseUrl`
- `src/utils/image-manifest-coverage.ts`, `src/utils/image-filename.ts`, `src/utils/image-figure.ts`
