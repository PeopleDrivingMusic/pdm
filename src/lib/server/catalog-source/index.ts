export { CatalogSourceService } from './CatalogSourceService';
export type { ArtistCandidate, ImportResult, ImportRefusal } from './CatalogSourceService';
export type { CatalogSource, ExternalArtist, ExternalTrack } from './types';

// `AudiusAdapter` is deliberately not exported — nothing outside this boundary may
// reach a catalog source directly.
