# Scenario Test & Feedback Log

> Friday deliverable. Fill during the sessions, not from memory afterwards.

## How to run a session

Testers do **not** need a computer. They play the user; you play the Agent and the terminal.
Screenshots over chat, or a video call with screen sharing, both work.

**Order matters — step 1 is ruined by anything shown first.**

1. **Ask for the request in their own words.** Before showing anything:

   > "假设有个 AI 能帮你在 Monad 上做 DeFi 操作,你想拿点固定收益。你会怎么跟它说?"

   Record the answer **verbatim**. This is the most valuable data in the whole exercise — it shows
   how a real user phrases the intent, and the pitch and any future UI should use their words.

   Do **not** show the pitch script or any explanation first. Once they read your wording they
   will parrot it back and the data is worthless.

2. **Run `mcp` and share the output** in segments. The key screens: step 2 (risk labels),
   step 4 (quote), step 6 (simulation result and the final `buy-pt` line).

3. **Ask the three questions** in the table below. The third one matters most — it tests the claim
   that failures speak plainly, and only a user can verify that.

Enlarge the terminal font and use a dark background before screenshotting.

## Testers

| # | Background | Crypto familiarity | Pendle familiarity | Session format |
| --- | --- | --- | --- | --- |
| 1 | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[chat / call]` |
| 2 | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[chat / call]` |
| 3 | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[PLACEHOLDER]` | `[chat / call]` |

## Their exact words (step 1)

Verbatim. Do not clean up the phrasing.

| # | What they said |
| --- | --- |
| 1 | `[PLACEHOLDER]` |
| 2 | `[PLACEHOLDER]` |
| 3 | `[PLACEHOLDER]` |

**Vocabulary they used that I did not:**
`[PLACEHOLDER — words worth stealing for the pitch and Week 4 UI]`

## Comprehension

| # | Understood market + quote? | Knew nothing had moved yet? | Failure message clear? | Where they hesitated |
| --- | --- | --- | --- | --- |
| 1 | [ ] | [ ] | [ ] | `[PLACEHOLDER]` |
| 2 | [ ] | [ ] | [ ] | `[PLACEHOLDER]` |
| 3 | [ ] | [ ] | [ ] | `[PLACEHOLDER]` |

Questions asked:

- "看到这个报价,你知道自己要花多少、拿到多少吗?"
- "到这一步,钱动了吗?"
- *(failure screenshot)* "这是什么意思?你会怎么办?"

## Findings

| # | Finding | Severity | Action taken | Landed before freeze? |
| --- | --- | --- | --- | --- |
| 1 | `[PLACEHOLDER]` | `[blocker / confusing / cosmetic]` | `[PLACEHOLDER]` | [ ] |
| 2 | `[PLACEHOLDER]` | | | [ ] |
| 3 | `[PLACEHOLDER]` | | | [ ] |

## What I changed because of this

`[PLACEHOLDER — copy edits, pitch wording, error messages. If nothing changed, say so and explain
why; "no changes" is a finding too.]`

## Limitations

Solo team, `[N]` testers, all reached over `[chat / call]` rather than running the demo
themselves. Sample size is small and the testers were recruited from personal contacts, so this
measures comprehension rather than adoption.
