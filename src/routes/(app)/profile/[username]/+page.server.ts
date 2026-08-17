import { UserService } from '$lib/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = await UserService.getUserByUsername(params.username);

	if (!user) {
		error(404, {
			message: 'Not found'
		});
	}
	return { profileUser: user };
};
