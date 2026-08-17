Plan: Studio Music MVP
This plan implements the Studio Music MVP per the spec, using form actions for UI flows while delegating CRUD logic to shared server endpoints. It adds a many-to-many album–track relation, introduces a genres table with normalized values, and keeps genres arrays on albums/tracks for search. Uploads are handled via multipart endpoints writing to static/uploads. The UI is built as a StudioMusicPage component co-located with the route and composed from reusable ui components and theme variables.

Steps

Create the page shell: make StudioMusicPage next to the route, render it from +page.svelte, and wire +page.server.ts load + actions for create/edit/delete flows and album–track linking.
Data model updates: add genres table and many-to-many album–track join table via Drizzle migrations; update schema.ts and any query helpers in queries.ts to support these relations.
Endpoints/services: implement CRUD endpoints for albums/tracks plus link/unlink operations; expose genre lookup/create; reuse or extend existing patterns under api and update service layers as needed in services.
Upload handling: add multipart endpoints for audio and cover uploads that write to static/uploads per the spec; store relative paths in DB fields already present or newly added if needed.
UI components: build reusable modal/forms and uploader components in ui, export them in index.ts, and compose them in StudioMusicPage using theme variables from themes.
Studio UI data: in server load, return albums, tracks, stats, and genres; render album grid and track list with play/like/save metrics and status; add controls for CRUD and album assignment.
Verification

Run DB migrations and confirm tables/relations exist.
Manual check the studio music page for: album grid, track list, CRUD, album–track linking, and upload storage path correctness.
(If available) run existing tests or add minimal endpoint tests for create/update/delete and linking.
Decisions

Album–track relation is many-to-many via a join table.
Uploads use multipart endpoints writing to static/uploads.
Use form actions in +page.server.ts while delegating CRUD to shared endpoints.
Add a genres table with normalized lowercase values; keep genres arrays on albums/tracks for search.
