# Learn Layer — Retrospectives that Compound — Design Spec

**Date:** 2026-08-11
**Status:** Approved (design), pending implementation
**Author:** Ivan Izobov (with Claude Code)

## 1. Goal

Add a fourth knowledge direction to `.claude/`: **`learn/`** — a layer where the
LLM records structured retrospectives on its own performance after each closed
unit of work, and where recurring lessons are promoted into standing rules that
actually change behaviour.

The founder's framing: after finishing a task or feature, ask the model for its
own feedback — what went well, what went badly, why, and what would have avoided
the bad — then keep a short rolling digest that is read at the start of every
session, with links down into the detail.

### 1.1 The constraint that shapes everything

The model does not learn from these files. Weights never change; nothing carries
across sessions on its own. The only mechanism available is: **the right file
reaches the context window at the right moment.**

A directory of retrospectives that nothing loads is a dead archive. Therefore the
load-bearing part of this design is not the template — it is the delivery path
and the promotion path. Every decision below is judged against one question: does
this change what the model actually does next time?

## 2. Decisions (from brainstorming)

| Decision        | Choice                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Subject**     | The model's own performance in the session — process, not PDM domain knowledge.                                                                |
| **Approach**    | Hybrid: `learn/` is the evidence layer; recurring lessons are promoted into `memory/` or `CLAUDE.md`, which are the layers that actually bind. |
| **Promotion**   | Never automatic. The model proposes a formulated rule; the founder approves; only then is it written.                                          |
| **Triggers**    | Multiple, by design: `/retro` command (primary), a `CLAUDE.md` rule making the model offer it, and a session-start debt check as backstop.     |
| **Granularity** | One retro per closed unit of work (slice / PR / feature), not per session.                                                                     |
| **Quality bar** | No lesson, no file. Routine "went fine as usual" is not recorded.                                                                              |
| **Language**    | English, per the `WIKI.md` convention, so all of `.claude/` stays homogeneous. Conversation stays in Russian.                                  |
| **Repo**        | `.claude/` is gitignored in the main repo and versioned in `pdm-claude`; all of `learn/` commits via `git -C .claude`.                         |

## 3. Architecture — three levels

Same shape as the wiki (`raw → wiki → schema`) and memory (`fact → MEMORY.md`).
This is a third application of a pattern already in use, not a new paradigm.

1. **Detail** — `.claude/learn/YYYY-MM-DD-slug.md`. The full retrospective in four
   sections. Written rarely, read on demand via a link.
2. **Digest** — `.claude/learn/LEARNINGS.md`. A rolling summary of
   `previous + new → summarization`, with links down to the detail. This is the
   only file loaded every session.
3. **Rules** — entries in `memory/` or `CLAUDE.md` that a lesson earned by
   recurring and being approved. This is the only level that changes behaviour.

## 4. Directory structure

```
.claude/learn/
  LEARN.md                          # maintainer's manual for this layer
  LEARNINGS.md                      # rolling digest — the only always-loaded file
  2026-08-11-comments-fan-chat.md   # detail retros
  2026-08-04-subscription-gating.md
  archive/                          # retired detail retros (git keeps everything anyway)
```

`LEARN.md` plays the role `WIKI.md` plays for the wiki: it tells the model how to
operate this layer. It lives next to the data rather than in anyone's head.

## 5. Retro file format

```markdown
---
title: Comments & fan chat — PR5 UI
type: retro
branch: feature/comments-and-fan-chat--pr5-ui
tags: [tdd, ui, review]
status: current # current | promoted | superseded
promoted: [] # links to rules grown from this retro
updated: 2026-08-11
---

## SUMMARY

Two to four sentences: what was done, how it ended. This block, condensed to one
line, is what travels up into the digest.

## WHAT WAS GOOD

- <what worked> — **why:** <the mechanism, not praise>

## WHAT WAS BAD

- <what did not work> — **why:** <root cause>
  — **cost:** <what it cost: rework, wasted turns, lost time>

## HOW TO CONVERT BAD => GOOD

- <checkable action, imperative> → **target:** CLAUDE.md | memory | skill | none
```

Four rules about this template, each load-bearing:

**"Why" is mandatory.** Without it the file is a list of complaints from which no
rule can be derived. "A test broke" is not a lesson. "A test broke because I
changed a signature without checking its callers" is.

**"Cost" is what creates priority.** Without it every lesson weighs the same, the
digest turns to mush, and there is no basis for deciding what to promote. A
lesson that cost three rounds of rework outranks one that cost a typo.

**HOW TO CONVERT accepts only checkable actions.** "Be more careful" can neither
be executed nor verified and is rejected by the template. "Before editing a
Svelte component, check whether an equivalent exists in `src/lib/ui/`" is
executable. Each item carries an explicit target, so its destination on promotion
is already decided.

**`status` and `promoted`** make it visible which lessons became rules and which
are still advice. Without them, six months on, nothing distinguishes a working
rule from a forgotten one.

## 6. Capture triggers

Three channels, in descending order of reliability.

**1. `/retro` — the primary path.** Invoked when a slice or PR closes. The
command first gathers evidence — `git log` for the branch, `git diff --stat`,
touched files, test status — and only then writes conclusions. This ordering is
not optional: without evidence the model writes a plausible impression of the
session rather than what happened. It then asks the founder one or two direct
questions ("what annoyed you?"), because half of what went badly is visible only
from the human side — the model does not know a request was reworded three times
before it understood.

**2. A rule in `CLAUDE.md`.** The model offers a retro when a slice is merged,
tied to the existing TDD cycle. Cheap, but depends on the model remembering.

**3. Session-start debt check — the backstop.** The `SessionStart` hook derives
debt from git rather than from a marker left by the previous session: if the
current branch has commits newer than the newest retro that references it, the
hook emits a note and the model offers to close the debt while `git log` and the
diff are still fresh. This survives an abruptly terminated session, which matters
on a machine that BSODs several times a day.

> **Simplification vs. the version discussed verbally:** the originally described
> `.pending` marker written by a session-end hook is dropped. Git already carries
> the information, so one hook (`SessionStart`) replaces two and there is no
> marker file to go stale.

## 7. Quality bar and deduplication

**Bar.** A file is created only if at least one of these holds: an item in
WHAT WAS BAD with non-zero cost, or a non-obvious win in WHAT WAS GOOD worth
reproducing deliberately. Routine "did it the usual way, went fine" is recorded
nowhere. Without this bar, "as many triggers as possible" produces a pile of
files saying nothing, and real lessons drown in it.

**Deduplication — and the promotion engine.** Before writing, the model searches
the digest for this lesson. If it already exists, **no new file is created**;
instead the repeat counter increments and a link to the new occurrence is added.
This is what turns "I feel like I've seen this before" into a number, and the
number is what triggers promotion.

## 8. `LEARNINGS.md` format

```markdown
# Learnings — rolling digest

<!-- Maintained by /retro. Hard cap: 60 lines. -->

## Active rules (promoted)

- Strict TDD, sliced PRs → memory/strict-tdd-workflow.md (survived x7)

## Recurring — promotion candidates

- x3 Starts writing code before the slice scope is agreed
  → [[2026-08-11-comments]] [[2026-08-04-gating]] [[2026-07-28-upload]]
- x2 Does not check for an existing equivalent in src/lib/ui/ → [[...]] [[...]]

## Recent lessons (last 5)

- 2026-08-11 Comments PR5 UI — one-line SUMMARY → [[2026-08-11-comments-fan-chat]]

## Retired

- <rule that stuck and no longer needs restating>
```

**Recurring is the heart of the design.** Everything else is bookkeeping around
that counter.

## 9. Delivery into context

A `SessionStart` hook places `LEARNINGS.md` into context on every launch — the
same mechanism that already delivers the superpowers skill in this setup, so the
capability is proven here, not assumed. A pointer line in `CLAUDE.md` documents
the arrangement for humans so it does not live only inside a config file.

The **60-line cap is a budget, not cosmetics**: this is paid in tokens on every
session, including ones that have nothing to do with development. When the digest
exceeds the cap, the oldest entries are compressed to one line each or retired.

## 10. Promotion to rules

**Threshold:** counter reaches **x3**, or **x2 when cost is high**.

On trigger, the model sees the entry in Recurring at session start and comes to
the founder with an already-formulated rule. On approval it is written to:

| Target                       | When                                          |
| ---------------------------- | --------------------------------------------- |
| `memory/` (`type: feedback`) | How the founder and the model work together   |
| `CLAUDE.md`                  | An operational rule about this repository     |
| A skill                      | A multi-step procedure worth invoking by name |

After promotion: **every** detail retro linked from that Recurring entry — not
just the most recent one — gets `status: promoted` and a link to the new rule in
its `promoted:` list. The line moves from Recurring to Active rules and the
counter resets. Marking all of them keeps the evidence trail intact: the rule can
be traced back to each occurrence that justified it.

## 11. Caps and anti-runaway

**No more than 10 active promoted rules.** An eleventh requires retiring one.

This cap is mandatory, not advisory. Rules that only accumulate become, within a
year, a wall of mutually contradictory instructions that the model then follows
selectively — strictly worse than having no system at all. The cap forces the
prioritisation that makes the layer useful.

## 12. Maintenance (lint)

Modelled on the existing wiki lint pass, run periodically:

- **Nothing in this layer is driven by wall-clock time.** PDM is a side project
  with irregular activity; a month-long gap is normal. A rule that went unbroken
  because nobody worked on the project has not been tested, and treating elapsed
  time as evidence would quietly retire exactly the rules a returning session
  needs most. Every threshold below counts events instead.
- Each active rule carries a **`survived`** counter: the number of retros written
  since its promotion in which it did **not** appear under WHAT WAS BAD. It
  measures opportunities, not calendar. A three-month hiatus advances nothing.
- **Retirement is never scheduled.** It happens only under pressure on the
  ten-rule cap (§11): when an eleventh rule is approved, the model presents the
  active rules ranked by `survived` and proposes retiring the highest. The
  founder decides. There is no background cleanup.
- A rule violated **despite** promotion → the formulation is defective; rewrite
  it and reset `survived`. Adding a second rule about the same thing is
  forbidden.
- Detail retros beyond the most recent 40 → `archive/`, oldest first. By count,
  not by age, for the same reason.
- Digest over 60 lines → compress the oldest entries.
- Contradictions between an active rule and `CLAUDE.md` → report, do not
  silently resolve.

## 13. Success criteria

The system works if, and only if, **the repeat counter of promoted lessons stops
growing.** A lesson that became a rule and then resurfaced means the rule does not
work, and the formulation is what gets fixed — not the model's conscience.

Secondary signals: the digest stays under its cap without manual pruning, and
active rules stay at or below 10 without pressure to raise the limit.

## 14. Known limitation — self-assessment bias

The model grades its own work. That estimate is biased: it cannot see its own
blind spots by definition, and it tends toward favourable reports.

Three counterweights are built in: grounding in `git log` and diffs instead of
recollection, the founder's direct "what annoyed you?" question, and recording
cost in rework and turns rather than in feelings. These reduce the bias; they do
not remove it. Retros should be read with that discount applied.

## 15. Boundaries with existing layers

`WIKI.md` already defines a boundary this layer must not blur:

- **`.claude/wiki/`** — knowledge about the _project_: product, architecture,
  domain, strategy. Technical lessons about PDM itself belong here (usually
  `decisions/`), not in `learn/`.
- **`.claude/memory/`** — facts about the user, feedback, cross-session working
  context. This is where promoted process rules land.
- **`.claude/learn/`** — evidence about _how the work went_, and the counters that
  justify promotion. It holds narrative that memory's one-fact-per-file format
  cannot.

No fact is duplicated across two layers. A lesson lives in `learn/` until it is
promoted, after which `learn/` keeps the evidence and the rule lives in its
target.

## 16. Out of scope (YAGNI)

- Domain/technical lessons about PDM — those go to `wiki/decisions/`.
- Automatic promotion without founder approval — explicitly rejected.
- Embedding search over retros — the digest plus links is sufficient at this scale.
- Per-session retros — the unit is a closed piece of work.
- Any metric beyond the repeat counter.

## 17. To verify during implementation

1. Exact hook event name and payload shape for `SessionStart` in Claude Code
   2.1.227, via the `update-config` skill. `.claude/settings.local.json` currently
   defines no hooks, so this configuration starts from scratch.
2. Whether `/retro` should be authored as a skill (`.claude/skills/retro/SKILL.md`)
   or a command file, given that this version appears to have unified the two
   (`--disable-slash-commands` is documented as disabling all skills).
3. That the hook works on Windows with the project's Git Bash / PowerShell setup.
