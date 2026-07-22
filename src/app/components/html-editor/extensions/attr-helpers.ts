/**
 * attr-helpers.ts
 *
 * Shared attribute definitions reused across the custom TipTap nodes in this
 * directory — kept here instead of duplicated per-file since both
 * table-extensions.ts and generic-block-node.ts need the same schema.org
 * microdata + boolean-HTML-attribute handling.
 */

/**
 * A boolean HTML attribute (present with no meaningful value, e.g.
 * `itemscope`) modeled as a nullable string: `null` = absent, `''` =
 * present. Verified against a real TipTap parse/serialize round-trip —
 * renders as `itemscope=""`, which parses back as present.
 */
export function booleanAttr() {
  return {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => (element.hasAttribute('itemscope') ? '' : null),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes['itemscope'] !== null && attributes['itemscope'] !== undefined
        ? { itemscope: '' }
        : {},
  };
}

/** schema.org microdata attrs allowed by CLAUDE.md's hard rules (PropertyValue/FAQPage/HowTo). */
export const MICRODATA_ATTRS = {
  itemprop: { default: null as string | null },
  itemtype: { default: null as string | null },
  itemscope: booleanAttr(),
};
