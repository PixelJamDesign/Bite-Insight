/**
 * Family order: by generation first, then the user's own drag order
 * (sort_order) within each group. Partners first, then the user's parents
 * and siblings, then children, then anyone else, so a child never shows
 * above a parent. get_family_members() already returns rows in sort_order,
 * so a stable sort by group keeps the user's order inside each group.
 */
const RELATIONSHIP_GROUP: Record<string, number> = {
  partner: 0,
  wife: 0,
  husband: 0,
  mother: 1,
  father: 1,
  sister: 2,
  brother: 2,
  son: 3,
  daughter: 3,
  other: 4,
};

/** No relationship set sorts with "other". */
export function relationshipGroup(relationship: string | null | undefined): number {
  return relationship ? (RELATIONSHIP_GROUP[relationship] ?? 4) : 4;
}

/** A new array in family order; the input order breaks ties. */
export function sortFamily<T extends { relationship?: string | null }>(members: T[]): T[] {
  return members
    .map((m, i) => ({ m, i }))
    .sort((a, b) => relationshipGroup(a.m.relationship) - relationshipGroup(b.m.relationship) || a.i - b.i)
    .map(({ m }) => m);
}
