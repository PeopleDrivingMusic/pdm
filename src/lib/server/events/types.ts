// Music/catalog visibility shares the same two-tier vocabulary as content —
// aliased to the single source of truth so they can never drift apart.
import type { ContentVisibility } from '$lib/db/content-visibility';
export type Visibility = ContentVisibility;

export type DomainEvent =
	| { type: 'track.uploaded'; trackId: string; artistId: string; occurredAt: string }
	| { type: 'track.published'; trackId: string; artistId: string; occurredAt: string }
	| {
			type: 'track.visibility_changed';
			trackId: string;
			artistId: string;
			visibility: Visibility;
			occurredAt: string;
	  }
	| { type: 'track.deleted'; trackId: string; artistId: string; occurredAt: string }
	| {
			type: 'album.visibility_changed';
			albumId: string;
			artistId: string;
			visibility: Visibility;
			trackIds: string[];
			occurredAt: string;
	  };

export interface EventPublisher {
	publish(event: DomainEvent): Promise<void>;
}
