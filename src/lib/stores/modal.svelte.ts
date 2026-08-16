interface Modal {
	id: string;
	show: boolean;
}

class ModalStore {
	modals = $state<Map<string, Modal>>(new Map());

	open(id: string): void {
		this.modals.forEach((modal) => {
			modal.show = false;
		});

		if (!this.modals.has(id)) {
			this.modals.set(id, { id, show: true });
		} else {
			const modal = this.modals.get(id)!;
			modal.show = true;
		}
	}

	close(id: string): void {
		if (this.modals.has(id)) {
			const modal = this.modals.get(id)!;
			modal.show = false;
		}
	}

	closeAll(): void {
		this.modals.forEach((modal) => {
			modal.show = false;
		});
	}

	isOpen(id: string): boolean {
		const modal = this.modals.get(id);
		return modal?.show ?? false;
	}

	register(id: string): void {
		if (!this.modals.has(id)) {
			this.modals.set(id, { id, show: false });
		}
	}
}

export const modalStore = new ModalStore();
