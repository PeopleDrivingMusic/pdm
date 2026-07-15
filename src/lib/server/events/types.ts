export type Visibility = 'public' | 'subscribers_only';

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
