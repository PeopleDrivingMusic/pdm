// Deliberately version/variant-agnostic: it must never reject an id Postgres itself
// would accept, only obvious junk that would otherwise surface as a uuid cast error.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is shaped like a uuid and safe to pass to a uuid column. */
export function isUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_PATTERN.test(value);
}
