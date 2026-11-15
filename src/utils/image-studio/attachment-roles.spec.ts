/**
 * attachment-roles.spec.ts - US-10.6 T11 (FR-10, FR-11, FR-12 (a)-(f), FR-14; AC-6, AC-7, AC-8; US-10.1 AC-3 kept by AC-15).
 *
 * `src/utils/image-studio/attachment-roles.ts` holds the ONE invariant function for every path that sets or changes a role: at most FIVE Product
 * uploads, at most ONE Style ref, and the attached "Edit this" version OUTSIDE the five (US-10.1 FR-10).
 *
 * PINNED CONTRACT (the plan names the three functions; the list item shape and the result shape follow `upload-rules.ts` and are fixed here):
 *   item = { id: string, kind: 'upload' | 'version', role?: 'product' | 'style-ref' }     a role-less upload is Product
 *   decideAttach(list): { ok: true } | { ok: false, reason: string }
 *       whether ONE MORE new Product upload may be attached to `list` (a new image is Product, AC-6). The sixth Product is refused with the existing 'T-3'.
 *   decideRoleChange(list, id, role): { ok: true } | { ok: false, reason: string }
 *       whether the item `id` may take `role`. A second Style ref is refused; a change to Product that would leave six Product uploads is refused.
 *       `reason` is a studio text id string; its value for the two NEW rejections is the T24 copy task's (FR-25), so only "non-empty string, and the
 *       two rejections differ from each other" is asserted. The functions never mutate `list`.
 *   normalizeStoredRole(x): 'product' | 'style-ref'      'style-ref' only for the exact string 'style-ref'; everything else is Product.
 *   upload-rules.ts countUploads(list): number           role-aware: a Style ref upload is NOT counted toward the five.
 *
 * FR-12 path (e), re-uploading an expired file, adds no image and keeps the role: it cannot be expressed on this pure surface and is covered by the
 * store specs of T29 (SEAM SM-2, deferred). Path (d)'s selector on the attached version is SM-3 (unruled) and is deferred.
 */
import { describe, it, expect } from 'vitest';
import { countUploads, canAttachUpload } from './upload-rules';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const mod = () => load('./attachment-roles');

type Item = { id: string; kind: 'upload' | 'version'; role?: 'product' | 'style-ref' };
const product = (id: string): Item => ({ id, kind: 'upload', role: 'product' });
const style = (id: string): Item => ({ id, kind: 'upload', role: 'style-ref' });
const version = (id = 'v'): Item => ({ id, kind: 'version' });
const products = (n: number, from = 1): Item[] => Array.from({ length: n }, (_, i) => product(`p${from + i}`));

describe('decideAttach: a new image is Product and the five-Product limit is unchanged (AC-6, AC-8, FR-12 (b))', () => {
  it('US-10.1 AC-3 kept: with 4 Product uploads a 5th is accepted; with 5 the 6th is refused with T-3', async () => {
    const { decideAttach } = await mod();
    expect(decideAttach(products(4))).toEqual({ ok: true });
    expect(decideAttach(products(5))).toEqual({ ok: false, reason: 'T-3' });
  });

  it('AC-8: a Style ref image does not count toward the five - 5 Product uploads plus one Style ref are six uploads in all, and a 6th PRODUCT is still refused', async () => {
    const { decideAttach } = await mod();
    expect(decideAttach([...products(4), style('s1')])).toEqual({ ok: true });
    expect(decideAttach([...products(5), style('s1')])).toEqual({ ok: false, reason: 'T-3' });
  });

  it('FR-12 (d) / US-10.1 FR-10: the attached "Edit this" version is outside the five - 5 uploads plus a version accept nothing more, 4 uploads plus a version accept one', async () => {
    const { decideAttach } = await mod();
    expect(decideAttach([...products(4), version()])).toEqual({ ok: true });
    expect(decideAttach([...products(5), version()])).toEqual({ ok: false, reason: 'T-3' });
    expect(decideAttach([version()])).toEqual({ ok: true });
  });

  it('FR-12 (b): a role-less upload (an item written before this Story) counts as a Product', async () => {
    const { decideAttach } = await mod();
    const roleLess = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, kind: 'upload' as const }));
    expect(decideAttach(roleLess)).toEqual({ ok: false, reason: 'T-3' });
  });

  it('FR-12 (c): removing a Product upload frees capacity and never causes a rejection', async () => {
    const { decideAttach } = await mod();
    const full = products(5);
    expect(decideAttach(full).ok).toBe(false);
    expect(decideAttach(full.filter((i) => i.id !== 'p3'))).toEqual({ ok: true });
    expect(decideAttach([])).toEqual({ ok: true });
  });
});

describe('decideRoleChange: at most one Style ref (AC-7, FR-11)', () => {
  it('AC-6 / FR-10: marking a Product as Style ref when none exists is accepted', async () => {
    const { decideRoleChange } = await mod();
    expect(decideRoleChange([...products(2)], 'p1', 'style-ref')).toEqual({ ok: true });
  });

  it('AC-7: marking a SECOND image as Style ref is refused with a reason, and the first stays marked (the list is not changed)', async () => {
    const { decideRoleChange } = await mod();
    const list = [style('s1'), product('p1'), product('p2')];
    const before = structuredClone(list);
    const decision = decideRoleChange(list, 'p1', 'style-ref');
    expect(decision.ok).toBe(false);
    expect(typeof decision.reason).toBe('string');
    expect(decision.reason.length).toBeGreaterThan(0);
    expect(list).toEqual(before);
    expect(list.filter((i) => i.role === 'style-ref').map((i) => i.id)).toEqual(['s1']);
  });

  it('AC-7: removing the Style ref image makes the role available again', async () => {
    const { decideRoleChange } = await mod();
    const list = [style('s1'), product('p1')];
    expect(decideRoleChange(list, 'p1', 'style-ref').ok).toBe(false);
    expect(decideRoleChange(list.filter((i) => i.id !== 's1'), 'p1', 'style-ref')).toEqual({ ok: true });
  });

  it('FR-11: changing the one Style ref image back to Product frees the role for another image (with room under the five)', async () => {
    const { decideRoleChange } = await mod();
    expect(decideRoleChange([style('s1'), product('p1')], 's1', 'product')).toEqual({ ok: true });
  });
});

describe('decideRoleChange: the five-Product limit holds when a role changes (FR-12 "Changing a role", review B-6)', () => {
  it('FR-12: with 5 Product uploads and one Style ref, changing the Style ref to Product is refused (it would hold six Products) and the image stays Style ref', async () => {
    const { decideRoleChange } = await mod();
    const list = [...products(5), style('s1')];
    const before = structuredClone(list);
    const decision = decideRoleChange(list, 's1', 'product');
    expect(decision.ok).toBe(false);
    expect(typeof decision.reason).toBe('string');
    expect(decision.reason.length).toBeGreaterThan(0);
    expect(list).toEqual(before);
  });

  it('FR-12: the two role rejections have different reasons (the second Style ref and the sixth Product are different messages)', async () => {
    const { decideRoleChange } = await mod();
    const secondStyle = decideRoleChange([style('s1'), product('p1')], 'p1', 'style-ref');
    const sixthProduct = decideRoleChange([...products(5), style('s1')], 's1', 'product');
    expect(secondStyle.ok).toBe(false);
    expect(sixthProduct.ok).toBe(false);
    expect(secondStyle.reason).not.toBe(sixthProduct.reason);
  });

  it('FR-12: removing a Product upload makes the change to Product possible again', async () => {
    const { decideRoleChange } = await mod();
    const list = [...products(5), style('s1')];
    expect(decideRoleChange(list, 's1', 'product').ok).toBe(false);
    expect(decideRoleChange(list.filter((i) => i.id !== 'p5'), 's1', 'product')).toEqual({ ok: true });
  });

  it('FR-12: a change from Product to Style ref never raises the Product count, so the limit does not refuse it (governed by FR-11 only)', async () => {
    const { decideRoleChange } = await mod();
    expect(decideRoleChange(products(5), 'p5', 'style-ref')).toEqual({ ok: true });
  });

  it('FR-12 (d): the attached version is not an upload - with 5 Products and a Style ref the version does not make the change worse or better', async () => {
    const { decideRoleChange } = await mod();
    expect(decideRoleChange([...products(4), style('s1'), version()], 's1', 'product')).toEqual({ ok: true });
    expect(decideRoleChange([...products(5), style('s1'), version()], 's1', 'product').ok).toBe(false);
  });
});

describe('normalizeStoredRole (FR-12 (f), FR-14 failure path)', () => {
  it('a stored style-ref stays style-ref and a stored product stays product', async () => {
    const { normalizeStoredRole } = await mod();
    expect(normalizeStoredRole('style-ref')).toBe('style-ref');
    expect(normalizeStoredRole('product')).toBe('product');
  });

  it('a stored value that is not Style ref is treated as Product: absent, empty, wrong case, wrong type', async () => {
    const { normalizeStoredRole } = await mod();
    for (const bad of [undefined, null, '', 'STYLE-REF', 'Style ref', 'style_ref', 'reference', 0, 1, true, {}, ['style-ref']]) {
      expect(normalizeStoredRole(bad), JSON.stringify(bad)).toBe('product');
    }
  });
});

describe('upload-rules countUploads is role-aware (T11)', () => {
  it('AC-8: a Style ref upload is not counted toward the five', () => {
    expect(countUploads([...products(5), style('s1')] as any)).toBe(5);
    expect(countUploads([...products(4), style('s1'), version()] as any)).toBe(4);
  });

  it('US-10.1 AC-3: role-less input behaves exactly as before - 5 uploads and a version count 5, and canAttachUpload refuses the 6th with T-3 [characterization]', () => {
    const roleLess = [...Array.from({ length: 5 }, (_, i) => ({ kind: 'upload' as const, id: String(i) })), { kind: 'version' as const }];
    expect(countUploads(roleLess)).toBe(5);
    expect(canAttachUpload(roleLess)).toEqual({ ok: false, reason: 'T-3' });
  });
});
