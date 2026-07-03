// Deterministic gradient placeholder for albums/tracks without cover art.
export function coverGradient(seed: string): string {
	let h = 0;
	for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	const a = h % 360;
	const b = (a + 40 + (h % 60)) % 360;
	return `linear-gradient(135deg, hsl(${a} 55% 44%), hsl(${b} 60% 30%))`;
}
