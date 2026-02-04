import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	duration?: number; // ms, 0 = no auto-dismiss
	createdAt: number;
}

function createNotificationStore() {
	const { subscribe, set, update } = writable<Notification[]>([]);

	return {
		subscribe,
		add: (type: NotificationType, message: string, duration = 5000) => {
			const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const notification: Notification = {
				id,
				type,
				message,
				duration,
				createdAt: Date.now()
			};

			update((notifications) => [...notifications, notification]);

			// Auto-remove after duration if duration > 0
			if (duration > 0) {
				setTimeout(() => {
					notificationStore.remove(id);
				}, duration);
			}

			return id;
		},
		remove: (id: string) => {
			update((notifications) => notifications.filter((n) => n.id !== id));
		},
		clear: () => {
			set([]);
		},
		success: (message: string, duration = 5000) => {
			return notificationStore.add('success', message, duration);
		},
		error: (message: string, duration = 5000) => {
			return notificationStore.add('error', message, duration);
		},
		warning: (message: string, duration = 5000) => {
			return notificationStore.add('warning', message, duration);
		},
		info: (message: string, duration = 5000) => {
			return notificationStore.add('info', message, duration);
		}
	};
}

export const notificationStore = createNotificationStore();
