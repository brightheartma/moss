# Scenario Test & Feedback Log

> Friday deliverable. Fill during the sessions, not from memory afterwards.

## Ops test-preparation pack

### One-line introduction

PT Yield Assistant 让 AI 帮你在 Monad 上寻找并模拟购买 Pendle 固定收益代币，在签名前把
原本看不懂的交易变成可读结果，由你决定是否签名。

### Project introduction (100–200 Chinese characters)

在 DeFi 中，用户常常需要在看不懂交易 calldata 的情况下决定是否签名。PT Yield
Assistant 让 Agent 通过 Moss 查询经过验证的 Pendle 市场、获取买入 PT 的报价，并在
签名前模拟完整交易。用户会看到预计获得数量、最低可接受数量、风险标签和按链上顺序
生成的 Receipt。Moss 不保管私钥、不签名、不广播；出现 Warning 时流程立即停止，最终
决定始终留给用户。

### Tester invitation

> 嗨，我正在测试一个叫 **PT Yield Assistant** 的小项目：它让 AI 帮用户查询 Pendle
> 固定收益市场，并在签名前把交易模拟结果翻译成可以读懂的 Receipt。
>
> 想邀请你参加一次 **10–15 分钟**的远程测试。你不需要懂 Pendle，也不需要连接钱包、
> 转账或提供任何私钥；你只需要用自己的话提出需求，然后看我共享的几个终端画面，告诉
> 我哪些地方清楚、哪些地方让你犹豫。
>
> 我只记录与你理解过程有关的文字反馈，不记录敏感信息。如果你愿意参加，请告诉我一个
> 方便语音或文字沟通的时间，谢谢！

### One user-test task

Do not explain the product or show the pitch before the first prompt.

> 假设有个 AI 能帮你在 Monad 上做 DeFi 操作，而你想拿一点固定收益。请用你平时会说的
> 方式告诉它你想做什么。看到市场、报价、风险标签和模拟结果后，请判断：你要花多少、
> 会拿到多少、钱现在是否已经移动，以及你会继续还是停止。

Run the `mcp` demo and reveal only these screens, in order:

1. risk labels from `load`;
2. verified market and quote;
3. successful simulation and the final `buy-pt` Receipt;
4. unfunded-account failure message.

The task succeeds when the tester can explain the input/output, recognizes that no funds have moved,
and can make a reasoned continue/stop decision without help.

### Feedback questions

1. 如果要向朋友复述，你觉得这个项目是做什么的？
2. 看到报价后，你知道自己要花多少、预计拿到多少、最少拿到多少吗？
3. 看到模拟结果时，你认为钱已经移动了吗？为什么？
4. `fundOut`、`approval`、`priceImpact` 这些风险标签有没有帮助？哪里仍然看不懂？
5. 看到“账户没有足够 USDat”的失败信息后，你认为发生了什么，下一步会怎么做？

### Landing page draft

- Source: [`landing.html`](./landing.html)
- Published draft:
  https://claude.ai/code/artifact/c4bac40b-126d-4e78-912f-7c8a168811e7
  (**private until shared from the page menu**)
- Headline: **PT Yield Assistant**
- Subhead: “让 AI Agent 在 Monad 上买 Pendle PT——但每一步都留下可读的证据，而且它永远
  不能替你签名。”
- Story: opaque calldata → readable buy-PT Receipt → ordered event evidence → pre-action risk labels
  → plain-language failure → real/Mock boundary → verified numbers and PR evidence.
- Proof points are from the 2026-07-23 mainnet run: **325 tests, 4 verified markets, 0 simulation
  warnings**.
- Before submission: share the published draft publicly and verify the link in a signed-out window.

### Preparation status from the latest session log

| Item | Status |
| --- | --- |
| One-line introduction | Ready |
| 100–200 character introduction | Ready |
| Tester invitation | Ready |
| Test task and five feedback questions | Ready |
| Landing page draft | Built and published; sharing permission still private |
| Testers | Three people lined up; sessions not yet recorded |
| Feedback findings | Pending real sessions — do not fill from memory |
| Demo recording | Pending |

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
