/**
 * Admin entrypoint for seeding an artist. Two steps on purpose: search first, read the
 * candidates, then import the id you chose. There is no "import the top hit" path,
 * because a search for a well-known name returns several accounts using it.
 *
 *   yarn import:artist --search "deadmau5"
 *   yarn import:artist --id LKdlD
 *   yarn import:artist --id D8OGl --allow-name-conflict
 *
 * Imported rows are hidden (`is_active = false`, `is_published = false`) until slice
 * S2b ships the "unofficial page" notice, so running this cannot publish anything.
 */
import 'dotenv/config';
import { CatalogSourceService } from '../src/lib/server/catalog-source';

const REFUSAL_HELP: Record<string, string> = {
	not_found: 'No artist with that id. Run --search first and copy an externalId.',
	name_conflict:
		'A verified account on the source already publishes under that display name, and this one is not it. Re-run with --allow-name-conflict only if you have confirmed the identity yourself.',
	deactivated: 'That account is deactivated on the source.',
	no_tracks: 'No playable tracks — all are gated, unlisted, deleted or unavailable.',
	slug_taken: 'A different PDM artist already owns that slug.',
	already_claimed: 'That page has been claimed; import must not overwrite the artist.'
};

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
	const search = arg('search');
	const id = arg('id');
	const allowNameConflict = process.argv.includes('--allow-name-conflict');

	if (search) {
		const candidates = await CatalogSourceService.lookupArtist(search);
		if (candidates.length === 0) {
			console.log('No candidates.');
			return;
		}
		console.table(candidates);
		console.log('\nPick one and run:  yarn import:artist --id <externalId>');
		return;
	}

	if (!id) {
		console.error('Usage: --search "<name>"  |  --id <externalId> [--allow-name-conflict]');
		process.exitCode = 1;
		return;
	}

	const result = await CatalogSourceService.importArtist(id, { allowNameConflict });
	if (!result.ok) {
		console.error(`Refused: ${result.reason} — ${REFUSAL_HELP[result.reason] ?? ''}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		`Imported ${result.slug} (artist ${result.artistId}) with ${result.tracksImported} tracks, hidden.`
	);
}

main().then(
	() => process.exit(process.exitCode ?? 0),
	(err) => {
		console.error(err);
		process.exit(1);
	}
);
