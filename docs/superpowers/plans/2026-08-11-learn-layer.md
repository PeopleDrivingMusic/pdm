# Learn Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `.claude/learn/` retrospective layer defined in `docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md`: structured retros, a rolling digest delivered at session start, and an approval-gated path from recurring lesson to standing rule.

**Architecture:** Three levels — detail retros (`.claude/learn/*.md`), a capped digest (`LEARNINGS.md`) injected by a `SessionStart` hook, and promoted rules living in `memory/` or `CLAUDE.md`. The only executable code is the hook: a pure logic module (fully unit-tested) plus a thin I/O wrapper that shells out to git. Everything else is markdown.

**Tech Stack:** Node 22.14 ESM (`.mjs`), `node --test` built-in runner, git, Claude Code hooks via `.claude/settings.json`. No new dependencies.

## Global Constraints

- **Two repositories.** Everything under `.claude/**` belongs to the nested `pdm-claude` repo and commits via `git -C .claude …`. `CLAUDE.md` and `docs/**` belong to the main `pdm` repo and commit normally. Never stage `.claude/**` in the main repo — it is gitignored there (`.gitignore:39`).
- **Hook config goes in `.claude/settings.json`** (tracked). Never `.claude/settings.local.json` — it is gitignored as machine-local and would not survive a reinstall.
- **Artifact language is English** (per the `WIKI.md` convention). Conversation stays Russian.
- **No new dependencies.** Node built-ins only; tests run on `node --test`.
- **Windows-first.** The hook is pure Node — no bash-isms, no shell quoting that breaks under PowerShell or Git Bash.
- **Vitest does not glob `.claude/**`** (`vite.config.ts:83,93`include only`src/\*\*`). Do not try to wire these tests into `yarn test`.
- Fixed values from the spec, to be used verbatim: promotion threshold **x3** (or **x2** when cost is high), active rules cap **10**, digest cap **60 lines**, detail retros kept **40** before archiving.
- **No wall-clock thresholds anywhere** (spec §12). Every threshold counts events.

## File Structure

| Path                                                               | Repo       | Responsibility                                    |
| ------------------------------------------------------------------ | ---------- | ------------------------------------------------- |
| `docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md` | pdm        | Spec; amended in Task 1                           |
| `.claude/learn/LEARN.md`                                           | pdm-claude | Maintainer's manual for the layer                 |
| `.claude/learn/LEARNINGS.md`                                       | pdm-claude | Rolling digest — the only always-loaded file      |
| `.claude/learn/archive/.gitkeep`                                   | pdm-claude | Holds retired detail retros                       |
| `.claude/hooks/retro-debt.logic.mjs`                               | pdm-claude | Pure functions: parse, select, compute, format    |
| `.claude/hooks/retro-debt.logic.test.mjs`                          | pdm-claude | Unit tests for the above                          |
| `.claude/hooks/retro-debt.mjs`                                     | pdm-claude | CLI wrapper: git I/O + stdout                     |
| `.claude/settings.json`                                            | pdm-claude | `SessionStart` hook registration                  |
| `.claude/skills/retro/SKILL.md`                                    | pdm-claude | The `/retro` command                              |
| `CLAUDE.md`                                                        | pdm        | Pointer + the rule making the model offer a retro |

Split rationale: `retro-debt.logic.mjs` holds every decision and touches nothing external, so it is unit-testable without git fixtures. `retro-debt.mjs` holds only I/O and is verified by running it. Keeping them apart is what makes TDD possible here at all.

---

### Task 1: Add `head:` to the retro frontmatter in the spec

The spec's template records `branch:` but no commit SHA, so "are there new commits since the last retro?" would fall back to comparing dates — exactly what spec §12 removed. A SHA makes the check exact and event-based.

**Files:**

- Modify: `docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md` (§5 template, §6 trigger 3)

- [ ] **Step 1: Add the field to the template in §5**

Find the frontmatter block in §5 and add `head:` directly under `branch:`:

```markdown
branch: feature/comments-and-fan-chat--pr5-ui
head: 5b75ab7 # HEAD sha when this retro was written
```

- [ ] **Step 2: Make §6 trigger 3 reference the SHA**

Replace the sentence beginning "The `SessionStart` hook derives debt from git" with:

```markdown
The `SessionStart` hook derives debt from git rather than from a marker left by
the previous session: it compares `HEAD` against the `head:` sha recorded by the
newest retro for the current branch, and reports the number of commits in
between. If no retro exists for the branch yet, it counts commits since the
default branch instead.
```

- [ ] **Step 3: Verify no date-based logic crept back in**

Run: `grep -nE "\b(days?|weeks?|months?)\b" docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md`
Expected: only prose mentions (lines about "six months on", "BSODs several times a day", and the §12 rationale). No threshold uses a time unit.

- [ ] **Step 4: Commit (main repo)**

```bash
git add docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md
git commit -m "docs: record head sha in retro frontmatter for exact debt detection"
```

---

### Task 2: Scaffold `.claude/learn/` with the manual and an empty digest

**Files:**

- Create: `.claude/learn/LEARN.md`
- Create: `.claude/learn/LEARNINGS.md`
- Create: `.claude/learn/archive/.gitkeep`

**Interfaces:**

- Produces: the four digest section headings (`## Active rules (promoted)`, `## Recurring — promotion candidates`, `## Recent lessons (last 5)`, `## Retired`) that Task 6's `/retro` command edits, and the `head:` frontmatter field Task 4 reads.

- [ ] **Step 1: Write `.claude/learn/LEARN.md`**

````markdown
# LEARN.md — the learn layer (maintainer's manual)

Read this before writing a retro, updating the digest, or proposing a promotion.
The design rationale lives in `docs/superpowers/specs/2026-08-11-learn-retrospectives-design.md`
(main repo). This file is the operating manual.

## What this layer is

Structured retrospectives on **how the work went** — the model's own performance,
not PDM domain knowledge. Three levels:

1. **Detail** — `YYYY-MM-DD-slug.md`, one per closed unit of work.
2. **Digest** — `LEARNINGS.md`, the only file loaded every session. Cap: 60 lines.
3. **Rules** — promoted entries in `memory/` or `CLAUDE.md`. Cap: 10 active.

The model does not learn from these files. Behaviour changes only when a file
reaches the context window, which is why the digest is hooked into session start
and why promotion exists at all.

## Writing a retro

Trigger: `/retro`, or an offer from the model when a slice merges, or the debt
note emitted at session start.

Gather evidence first — `git log`, `git diff --stat`, touched files, test status
— then write. Without evidence the result is a plausible impression of the
session rather than what happened.

Template:

```markdown
---
title: <what the work was>
type: retro
branch: <git branch>
head: <HEAD sha at time of writing>
tags: [<area>, <area>]
status: current # current | promoted | superseded
promoted: [] # links to rules grown from this retro
updated: YYYY-MM-DD
---

## SUMMARY

Two to four sentences. Condensed to one line, this is what travels up.

## WHAT WAS GOOD

- <what worked> — **why:** <the mechanism, not praise>

## WHAT WAS BAD

- <what did not work> — **why:** <root cause>
  — **cost:** <rework, wasted turns, lost time>

## HOW TO CONVERT BAD => GOOD

- <checkable action, imperative> → **target:** CLAUDE.md | memory | skill | none
```
````

Rules for the content:

- **"Why" is mandatory.** "A test broke" is not a lesson. "A test broke because I
  changed a signature without checking its callers" is.
- **"Cost" creates priority.** Without it every lesson weighs the same.
- **Only checkable actions** in HOW TO CONVERT. "Be more careful" is rejected.
- **Bar:** write the file only if there is an item in WHAT WAS BAD with non-zero
  cost, or a non-obvious win worth reproducing deliberately. Routine "went fine"
  is recorded nowhere.
- **One retro per closed unit of work** (slice / PR / feature), not per session.

## Deduplication

Before writing, search `LEARNINGS.md` for this lesson. If it is already under
Recurring, **do not create a new file**: increment the counter and append a link
to the new occurrence. The counter is what justifies promotion later.

## Promotion

Threshold: **x3**, or **x2** when cost is high. The model proposes a formulated
rule; the founder approves; only then is it written. Never automatic.

| Target                                     | When                                          |
| ------------------------------------------ | --------------------------------------------- |
| `memory/<slug>.md` + a line in `MEMORY.md` | how the founder and the model work together   |
| `CLAUDE.md`                                | an operational rule about the repository      |
| `skills/<name>/SKILL.md`                   | a multi-step procedure worth invoking by name |

After approval: every detail retro linked from that Recurring entry gets
`status: promoted` and a link in `promoted:`; the line moves to Active rules with
`(survived x0)`; the counter resets.

## Maintenance

- **Nothing here is driven by wall-clock time.** This is a side project with
  irregular activity; a month-long gap is normal and proves nothing.
- `survived` counts retros written since promotion in which the rule did not
  appear under WHAT WAS BAD. Increment it for every active rule when a retro is
  filed clean.
- **Retirement is never scheduled.** Only when an eleventh rule is approved:
  present active rules ranked by `survived`, propose retiring the highest, the
  founder decides.
- A rule violated despite promotion → the formulation is defective. Rewrite it
  and reset `survived`. Never add a second rule about the same thing.
- Detail retros beyond the most recent 40 → `archive/`, oldest first.
- Digest over 60 lines → compress the oldest Recent lessons to one line each.
- Contradiction between an active rule and `CLAUDE.md` → report it, do not
  resolve it silently.

## Boundaries

- `wiki/` — knowledge about the project. Technical lessons about PDM go there
  (usually `decisions/`), not here.
- `memory/` — facts about the user and standing feedback. Promoted rules land here.
- `learn/` — evidence about how the work went, plus the counters that justify
  promotion.

No fact is duplicated across two layers.

## Committing

`.claude/` is the `pdm-claude` repo. Commit from inside it: `git -C .claude …`.

````

- [ ] **Step 2: Write `.claude/learn/LEARNINGS.md`**

```markdown
# Learnings — rolling digest

<!-- Maintained by /retro. Hard cap: 60 lines. Loaded into every session by the
     SessionStart hook, so every line here is paid for in tokens each time. -->

## Active rules (promoted)

_None yet._

## Recurring — promotion candidates

_None yet._

## Recent lessons (last 5)

_None yet._

## Retired

_None yet._
````

- [ ] **Step 3: Create the archive directory**

```bash
mkdir -p .claude/learn/archive
printf '' > .claude/learn/archive/.gitkeep
```

- [ ] **Step 4: Verify the digest is within budget and structurally complete**

```bash
wc -l < .claude/learn/LEARNINGS.md
grep -c '^## ' .claude/learn/LEARNINGS.md
```

Expected: line count well under 60; exactly `4` section headings.

- [ ] **Step 5: Commit (pdm-claude repo)**

```bash
git -C .claude add learn/
git -C .claude commit -m "feat(learn): scaffold the learn layer with its manual and empty digest"
```

---

### Task 3: Frontmatter parsing and retro selection (pure, TDD)

**Files:**

- Create: `.claude/hooks/retro-debt.logic.mjs`
- Test: `.claude/hooks/retro-debt.logic.test.mjs`

**Interfaces:**

- Produces: `parseRetro(text, file)` → `{ file, branch, head } | null`; `selectLatestRetro(retros, branch)` → retro or `null`. Task 4 consumes both.

- [ ] **Step 1: Write the failing tests**

Create `.claude/hooks/retro-debt.logic.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRetro, selectLatestRetro } from './retro-debt.logic.mjs';

const retro = (branch, head) => `---
title: Example
type: retro
branch: ${branch}
head: ${head}
updated: 2026-08-11
---

## SUMMARY
Something happened.
`;

test('parseRetro extracts branch and head', () => {
	const result = parseRetro(retro('feature/x', 'abc1234'), '2026-08-11-x.md');
	assert.deepEqual(result, { file: '2026-08-11-x.md', branch: 'feature/x', head: 'abc1234' });
});

test('parseRetro returns null when frontmatter is missing', () => {
	assert.equal(parseRetro('# Just a heading\n', 'x.md'), null);
});

test('parseRetro returns null when head is absent', () => {
	const text = '---\ntype: retro\nbranch: feature/x\n---\n';
	assert.equal(parseRetro(text, 'x.md'), null);
});

test('parseRetro ignores a branch-like line in the body', () => {
	const text = `---\ntype: retro\nbranch: feature/real\nhead: aaa1111\n---\n\nbranch: feature/fake\n`;
	assert.equal(parseRetro(text, 'x.md').branch, 'feature/real');
});

test('selectLatestRetro picks the newest filename for the branch', () => {
	const retros = [
		{ file: '2026-08-04-a.md', branch: 'feature/x', head: 'aaa' },
		{ file: '2026-08-11-b.md', branch: 'feature/x', head: 'bbb' },
		{ file: '2026-08-20-c.md', branch: 'feature/other', head: 'ccc' }
	];
	assert.equal(selectLatestRetro(retros, 'feature/x').head, 'bbb');
});

test('selectLatestRetro returns null when the branch has no retro', () => {
	assert.equal(selectLatestRetro([], 'feature/x'), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test .claude/hooks/retro-debt.logic.test.mjs`
Expected: FAIL — `Cannot find module … retro-debt.logic.mjs`

- [ ] **Step 3: Write the minimal implementation**

Create `.claude/hooks/retro-debt.logic.mjs`:

```js
// Pure logic for the SessionStart retro-debt check. No I/O lives here so the
// decisions stay unit-testable without git fixtures.

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

function field(block, name) {
	const match = block.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
	return match ? match[1].trim() : null;
}

export function parseRetro(text, file) {
	const fm = text.match(FRONTMATTER);
	if (!fm) return null;
	const branch = field(fm[1], 'branch');
	const head = field(fm[1], 'head');
	if (!branch || !head) return null;
	return { file, branch, head };
}

// Filenames are ISO-dated, so lexicographic order is chronological order.
export function selectLatestRetro(retros, branch) {
	const mine = retros.filter((r) => r.branch === branch).sort((a, b) => (a.file < b.file ? 1 : -1));
	return mine[0] ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test .claude/hooks/retro-debt.logic.test.mjs`
Expected: PASS — 6 tests, 0 failures

- [ ] **Step 5: Commit (pdm-claude repo)**

```bash
git -C .claude add hooks/
git -C .claude commit -m "feat(learn): parse retro frontmatter and select the latest per branch"
```

---

### Task 4: Debt computation and note formatting (pure, TDD)

**Files:**

- Modify: `.claude/hooks/retro-debt.logic.mjs`
- Test: `.claude/hooks/retro-debt.logic.test.mjs` (append)

**Interfaces:**

- Consumes: `selectLatestRetro` from Task 3.
- Produces: `computeDebt({ branch, defaultBranch, retros, countCommitsSince })` → `{ hasDebt, reason, commits?, since?, retro? }`; `formatDebtNote(debt)` → string or `null`. `countCommitsSince` is injected as `(sha) => number` so tests need no git. Task 5 supplies the real one.

- [ ] **Step 1: Write the failing tests**

Append to `.claude/hooks/retro-debt.logic.test.mjs`. Leave the existing import from Task 3 alone — a second import statement from the same module is valid ESM and keeps the two tasks' diffs independent:

```js
import { computeDebt, formatDebtNote } from './retro-debt.logic.mjs';

const base = { defaultBranch: 'main', retros: [], countCommitsSince: () => 0 };

test('no debt while on the default branch', () => {
	const debt = computeDebt({ ...base, branch: 'main', countCommitsSince: () => 99 });
	assert.equal(debt.hasDebt, false);
	assert.equal(debt.reason, 'on-default-branch');
});

test('no debt on a fresh branch with no commits', () => {
	const debt = computeDebt({ ...base, branch: 'feature/x' });
	assert.equal(debt.hasDebt, false);
	assert.equal(debt.reason, 'no-commits');
});

test('debt when a branch has commits and no retro yet', () => {
	const debt = computeDebt({ ...base, branch: 'feature/x', countCommitsSince: () => 4 });
	assert.equal(debt.hasDebt, true);
	assert.equal(debt.reason, 'no-retro-yet');
	assert.equal(debt.commits, 4);
});

test('no debt when the latest retro records the current head', () => {
	const debt = computeDebt({
		...base,
		branch: 'feature/x',
		retros: [{ file: '2026-08-11-x.md', branch: 'feature/x', head: 'abc' }],
		countCommitsSince: (sha) => (sha === 'abc' ? 0 : 7)
	});
	assert.equal(debt.hasDebt, false);
	assert.equal(debt.reason, 'up-to-date');
});

test('debt counts commits since the latest retro head', () => {
	const debt = computeDebt({
		...base,
		branch: 'feature/x',
		retros: [{ file: '2026-08-11-x.md', branch: 'feature/x', head: 'abc' }],
		countCommitsSince: (sha) => (sha === 'abc' ? 3 : 0)
	});
	assert.equal(debt.hasDebt, true);
	assert.equal(debt.reason, 'commits-since-retro');
	assert.equal(debt.commits, 3);
	assert.equal(debt.retro, '2026-08-11-x.md');
});

test('formatDebtNote returns null when there is no debt', () => {
	assert.equal(formatDebtNote({ hasDebt: false, reason: 'up-to-date' }), null);
});

test('formatDebtNote names the branch, the count and the command', () => {
	const note = formatDebtNote({
		hasDebt: true,
		reason: 'commits-since-retro',
		branch: 'feature/x',
		commits: 3,
		retro: '2026-08-11-x.md'
	});
	assert.match(note, /feature\/x/);
	assert.match(note, /3 commit/);
	assert.match(note, /\/retro/);
	assert.match(note, /2026-08-11-x\.md/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test .claude/hooks/retro-debt.logic.test.mjs`
Expected: FAIL — `computeDebt is not a function` (or an import error)

- [ ] **Step 3: Write the minimal implementation**

Append to `.claude/hooks/retro-debt.logic.mjs`:

```js
// countCommitsSince is injected (sha) => number so this stays pure.
export function computeDebt({ branch, defaultBranch, retros, countCommitsSince }) {
	if (branch === defaultBranch) return { hasDebt: false, reason: 'on-default-branch' };

	const latest = selectLatestRetro(retros, branch);
	const since = latest ? latest.head : defaultBranch;
	const commits = countCommitsSince(since);

	if (commits === 0) {
		return { hasDebt: false, reason: latest ? 'up-to-date' : 'no-commits' };
	}
	return {
		hasDebt: true,
		reason: latest ? 'commits-since-retro' : 'no-retro-yet',
		branch,
		commits,
		since,
		retro: latest ? latest.file : null
	};
}

export function formatDebtNote(debt) {
	if (!debt.hasDebt) return null;
	const plural = debt.commits === 1 ? 'commit' : 'commits';
	const tail =
		debt.reason === 'commits-since-retro'
			? `since the last retro (${debt.retro})`
			: `and no retro has been written for it yet`;
	return [
		`Retro debt: branch ${debt.branch} has ${debt.commits} ${plural} ${tail}.`,
		`If a unit of work closed, offer /retro while git log and the diff are still fresh.`
	].join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test .claude/hooks/retro-debt.logic.test.mjs`
Expected: PASS — 13 tests, 0 failures

- [ ] **Step 5: Commit (pdm-claude repo)**

```bash
git -C .claude add hooks/
git -C .claude commit -m "feat(learn): compute retro debt from commit counts and format the note"
```

---

### Task 5: Hook CLI wrapper and `SessionStart` registration

**Files:**

- Create: `.claude/hooks/retro-debt.mjs`
- Create: `.claude/settings.json`

**Interfaces:**

- Consumes: `parseRetro`, `computeDebt`, `formatDebtNote` from Tasks 3–4.
- Produces: a `SessionStart` hook that prints the digest, and the debt note when there is one.

- [ ] **Step 1: Write the CLI wrapper**

Create `.claude/hooks/retro-debt.mjs`:

```js
#!/usr/bin/env node
// SessionStart hook: emits the learnings digest, plus a retro-debt note when the
// current branch has moved since its last retro. All decisions live in
// retro-debt.logic.mjs; this file is I/O only.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRetro, computeDebt, formatDebtNote } from './retro-debt.logic.mjs';

const LEARN_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'learn');
const DEFAULT_BRANCH = 'main';

function git(args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function loadRetros() {
	if (!existsSync(LEARN_DIR)) return [];
	return readdirSync(LEARN_DIR)
		.filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f))
		.map((f) => parseRetro(readFileSync(join(LEARN_DIR, f), 'utf8'), f))
		.filter(Boolean);
}

try {
	const digest = join(LEARN_DIR, 'LEARNINGS.md');
	if (existsSync(digest)) process.stdout.write(readFileSync(digest, 'utf8') + '\n');

	const debt = computeDebt({
		branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
		defaultBranch: DEFAULT_BRANCH,
		retros: loadRetros(),
		countCommitsSince: (ref) => Number(git(['rev-list', '--count', `${ref}..HEAD`]))
	});

	const note = formatDebtNote(debt);
	if (note) process.stdout.write('\n' + note + '\n');
} catch {
	// A hook must never block a session. Silence beats a broken start.
	process.exit(0);
}
```

- [ ] **Step 2: Run it directly and check the output**

Run: `node .claude/hooks/retro-debt.mjs`
Expected: the contents of `LEARNINGS.md`, followed by a retro-debt note naming the current branch (`feature/comments-and-fan-chat--pr6-likes`) and a commit count, since no retro exists yet.

- [ ] **Step 3: Verify it fails silently outside a git repo**

Run, from the project root, with an absolute path to the hook and a non-repo working directory:

```bash
HOOK="$PWD/.claude/hooks/retro-debt.mjs"
(cd "$HOME" && node "$HOOK"; echo "exit=$?")
```

Expected: `exit=0` and no stack trace. `$HOME` is outside the repo, so `git rev-parse` fails and the `catch` must swallow it. If a stack trace appears, the hook can break session startup — fix before continuing.

- [ ] **Step 4: Register the hook**

Create `.claude/settings.json`:

```json
{
	"hooks": {
		"SessionStart": [
			{
				"hooks": [
					{
						"type": "command",
						"command": "node .claude/hooks/retro-debt.mjs"
					}
				]
			}
		]
	}
}
```

Before writing it, confirm the schema with the `update-config` skill — the event name and nesting must match this Claude Code version (2.1.227). If the shape differs, follow the skill and keep the `command` line as-is.

- [ ] **Step 5: Verify the hook fires**

Start a fresh session in this project and confirm the digest text arrives as SessionStart context. If nothing appears, run `claude doctor` and re-check `.claude/settings.json` against the `update-config` skill.

- [ ] **Step 6: Commit (pdm-claude repo)**

```bash
git -C .claude add hooks/ settings.json
git -C .claude commit -m "feat(learn): deliver the digest and retro debt via a SessionStart hook"
```

---

### Task 6: The `/retro` command

**Files:**

- Create: `.claude/skills/retro/SKILL.md`

**Interfaces:**

- Consumes: the template and rules in `.claude/learn/LEARN.md` (Task 2).
- Produces: the `/retro` command that writes a detail retro and updates the digest.

- [ ] **Step 1: Write the skill**

Create `.claude/skills/retro/SKILL.md`:

```markdown
---
name: retro
description: Use when a unit of work closes — a slice merged, a PR opened, a feature finished — or when the session-start hook reports retro debt. Writes a structured retrospective on how the work went and updates the learnings digest.
---

# Retro

Read `.claude/learn/LEARN.md` first — it holds the template, the quality bar, the
deduplication rule and the promotion thresholds. Follow it exactly.

## Procedure

1. **Gather evidence before forming any opinion.** Run, in the main repo:
   - `git rev-parse --abbrev-ref HEAD` — the branch
   - `git rev-parse --short HEAD` — the sha for the `head:` field
   - `git log --oneline main..HEAD` — what was actually done
   - `git diff --stat main..HEAD` — where the work landed
   - the test command for the touched area, if it is cheap to run

   Do not skip this. Without evidence you will write a plausible impression of
   the session instead of what happened.

2. **Ask the founder two questions**, then wait:
   - "What annoyed you in this piece of work?"
   - "Where did I make you repeat yourself?"

   Half of what went badly is visible only from their side — you do not know a
   request was reworded three times before you understood it.

3. **Apply the quality bar.** Write a file only if there is an item in
   WHAT WAS BAD with non-zero cost, or a non-obvious win worth reproducing.
   If neither holds, say so and stop. Do not write a file to look productive.

4. **Deduplicate.** Search `LEARNINGS.md` for the lesson. If it is already under
   Recurring, do not create a file: increment the counter, append a link to this
   occurrence, and report the new count.

5. **Write the retro** to `.claude/learn/YYYY-MM-DD-slug.md` using the template
   in `LEARN.md`. Record `head:` from step 1.

6. **Update `LEARNINGS.md`:** add a one-line SUMMARY entry to Recent lessons
   (keep the last 5), increment `survived` on every active rule that did not
   appear in WHAT WAS BAD, and keep the file under 60 lines.

7. **Check for promotion.** If any Recurring entry reached x3 — or x2 with high
   cost — stop and propose a formulated rule to the founder: the exact wording,
   the target file, and the evidence links. Never write a rule without approval.

8. **Commit** in the nested repo: `git -C .claude add learn/ && git -C .claude commit`.

## Honesty note

You are grading your own work, and that estimate is biased: you cannot see your
own blind spots and you tend toward favourable reports. The counterweights are
the git evidence, the founder's answers, and recording cost in rework and turns
rather than in feelings. Write the retro as if a reviewer will check every claim
against the diff.
```

- [ ] **Step 2: Verify the command is discoverable**

Start a fresh session and type `/retro`. Expected: the skill loads and step 1 begins with git commands, not with prose.

- [ ] **Step 3: Commit (pdm-claude repo)**

```bash
git -C .claude add skills/
git -C .claude commit -m "feat(learn): add the /retro command"
```

---

### Task 7: Wire the layer into `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md` (main repo) — add a subsection under "Project Knowledge Base & Memory (`.claude/`)"

**Interfaces:**

- Consumes: the layer built in Tasks 2–6.

- [ ] **Step 1: Add the section**

Insert after the **Memory (hard rule)** paragraph in `CLAUDE.md`:

```markdown
**Learn layer** — retrospectives on how the work went live at **`.claude/learn/`**
(also part of `pdm-claude`). `LEARNINGS.md` is a capped rolling digest injected at
session start by a hook; `LEARN.md` is its operating manual.

- When a unit of work closes — a slice merged, a PR opened, a feature finished —
  **offer `/retro`**. Do not write one unattended, and do not write one when there
  is no lesson: the bar is an item with non-zero cost or a non-obvious win.
- A recurring lesson becomes a standing rule only with the founder's approval.
  Promoted rules land in `memory/`, in this file, or in a skill — never
  automatically, and never more than 10 active at once.
- Technical lessons about PDM itself belong in `.claude/wiki/decisions/`, not here.
```

- [ ] **Step 2: Verify the claims match reality**

```bash
ls .claude/learn/LEARN.md .claude/learn/LEARNINGS.md .claude/skills/retro/SKILL.md
grep -c 'SessionStart' .claude/settings.json
```

Expected: all three files listed; `1`.

- [ ] **Step 3: Commit (main repo)**

```bash
git add CLAUDE.md
git commit -m "docs: point CLAUDE.md at the learn layer and its retro trigger"
```

---

### Task 8: End-to-end dry run on real work

The layer is only proven by producing a real retro. This branch
(`feature/comments-and-fan-chat--pr6-likes`) has unmerged work, which makes it a
genuine subject rather than a fabricated one.

**Files:**

- Create: `.claude/learn/2026-08-11-<slug>.md` (the first real retro)
- Modify: `.claude/learn/LEARNINGS.md`

- [ ] **Step 1: Run `/retro` against the likes work**

Follow the skill exactly, including the two questions to the founder. Let the
quality bar apply honestly — if there is genuinely no lesson, record that outcome
and skip the file. A skipped first retro is a valid result, not a failure.

- [ ] **Step 2: Verify the digest survived its budget**

```bash
wc -l < .claude/learn/LEARNINGS.md
grep -c '^## ' .claude/learn/LEARNINGS.md
```

Expected: under 60 lines; exactly 4 headings.

- [ ] **Step 3: Verify the debt clears**

Run: `node .claude/hooks/retro-debt.mjs`
Expected: the digest prints, and **no** debt note follows — the retro's `head:`
now matches HEAD.

- [ ] **Step 4: Commit (pdm-claude repo)**

```bash
git -C .claude add learn/
git -C .claude commit -m "feat(learn): first retro — <slug>"
```

- [ ] **Step 5: Push both repos**

```bash
git -C .claude push
git push
```

---

## Verification Summary

| Spec section                   | Covered by                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| §3 three levels                | Tasks 2, 5, 6                                                                          |
| §4 directory structure         | Task 2                                                                                 |
| §5 retro format                | Tasks 1, 2                                                                             |
| §6 triggers                    | Task 5 (hook), 6 (`/retro`), 7 (`CLAUDE.md` rule)                                      |
| §7 quality bar, dedup          | Task 6 steps 3–4                                                                       |
| §8 digest format               | Task 2                                                                                 |
| §9 delivery                    | Task 5                                                                                 |
| §10 promotion                  | Task 6 step 7                                                                          |
| §11 rules cap                  | Tasks 2 (LEARN.md), 7 (CLAUDE.md)                                                      |
| §12 maintenance, no wall-clock | Tasks 1 step 3, 2                                                                      |
| §13 success criteria           | Task 2 (LEARN.md)                                                                      |
| §14 self-assessment bias       | Task 6 honesty note                                                                    |
| §15 boundaries                 | Tasks 2, 7                                                                             |
| §17 open items                 | Task 5 step 4 (hook schema), Task 6 step 2 (skill vs command), Task 5 step 3 (Windows) |
