export function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');
}

export async function getUniqueSlug(
	base: string,
	checker: (slug: string) => Promise<unknown>
): Promise<string> {
	let slug = base || 'artist';
	let suffix = 1;

	while (await checker(slug)) {
		slug = `${base}-${suffix}`;
		suffix += 1;
	}

	return slug;
}
