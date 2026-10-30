---
name: the-catch-story
description: Pick a topic and write the script for a "The Catch" case: a human, relatable, useful money story where Nickel the raccoon finds the hidden catch in something everyday (gift cards, warranties, subscriptions, overdrafts). Covers the topic test, the human frame, the five acts, fast-voice line rules, fact sourcing and the hand-back. Use when asked for a The Catch episode, case, story or script, or to fix one that is boring, generic or "YouTube noise". Staging is the-catch-staging.
---

# The Catch: story

Every case answers one question a normal person has felt but never asked: *who wins when I do
this ordinary thing?* The viewer should leave with a story they retell at dinner and one thing
they'll do differently tonight. Plan and look: `../planning/2026-10-30-the-catch/plan.md`.
Reference case: `../planning/2026-10-30-the-catch/cases/001-the-drawer/`.

## 1. Topic test (all five, or pick another)

| Test | Pass | Fail (noise) |
|---|---|---|
| **Touches the viewer** | Something they own, pay or did this month (gift card, phone plan, rent deposit) | A billionaire, a company feud, a stock |
| **Hidden mechanism** | A real business mechanism most people never see (breakage, float, reordering, auto-renew) | "X is secretly evil", "you won't believe" |
| **Twist** | The answer flips how the thing looks ("a gift card is two gifts") | A list of facts |
| **Useful** | 2–3 actions the viewer can take tonight, legal and specific | "Be careful out there" |
| **Sourced** | Every number traces to a filing, regulator, survey or court record | "Experts say", viral stats |

Out of bounds: real private people, outrage at a named person, medical/legal/investment advice
beyond stating the rule, topics in the news cycle (they date fast and read as noise), Costco-chicken
style trivia everyone has seen. Fresh beats famous.

## 2. The human frame

Every case runs on one invented person in a specific, small moment: Maya finding a birthday card
from her grandma in a kitchen drawer. Not a "consumer", not "you guys".
- Give the person one concrete object (the card, the receipt, the renewal email) and one feeling
  (guilt, annoyance, "I meant to").
- They open the video, come back at the human turn, and close it. The callback is the payoff.
- The money is the mystery; the person is the reason to care. Never cut the person to fit more data.

## 3. Five acts (fast pace: ~190 wpm; 4–7 min)

| Act | Share | Job |
|---|---|---|
| **Cold open** | ≤ 20 s | The object + the impossible-sounding question by 0:08 ("For four years, who had that fifty dollars?"). The answer is teased, not given |
| **Case file** | ~10% | How big this is for everyone (one survey number), why it matters to the viewer |
| **Clues** (2–3) | ~50% | Each clue reveals one mechanism and ends on a bigger question. A `rehook` line every 45–75 s ("But that's not the strange part.") |
| **The catch** | ~10% | The twist in one sentence a 12-year-old could repeat. Then silence (a beat) |
| **Verdict** | ~20% | The rules that protect the viewer, 2–3 actions for tonight, the human callback, a last line that makes them think twice |

## 4. Lines for a fast voice

- One idea per line, **≤ 16 words**, most 6–12. Short lines read fast without sounding rushed.
- Lead with the noun ("Two billion dollars. Sitting in coffee apps."), not "It's important to note".
- Numbers: round for speech ("about two billion"), exact in the `numbers` tag and on screen.
- Every number gets a "so what" in the same or next line.
- Contractions, fragments, questions. Talk to one person.
- Nickel speaks rarely: ≤ 8 lines per case, ≤ 6 words each, dry and curious, never explains
  ("Shh. Follow the money."). The narrator explains.
- Banned: "In this video", "Let's dive in", "game-changer", "Here's the thing", "buckle up",
  "mind-blowing", "secretly", "you won't believe", "smash that like", rhetorical triples, a
  sign-off asking to subscribe. Run the wording check (`ai-wording`) and fix every hit.

## 5. Facts

- Every number lives in a dataset row with `source: { name, url, retrieved }`. Prefer primary:
  SEC filings (10-K/10-Q), CFPB/FTC/Fed, statutes, court records; then named surveys (Bankrate).
- Write `sources.md` next to the script: claim → number → source → quote. Mark anything you
  could not open as **TO VERIFY**; the owner checks before render.
- Rules (laws) are stated plainly with scope ("most store gift cards", "in California") and
  never as advice to a specific person.

## 6. Output

`cases/<nnn>-<slug>/`: `script.md` (acts, lines, speaker, estimated time), `sources.md`, then
hand over to **the-catch-staging** for `storyboard.md` and the skit JSON. Hand-back: the one-line
logline, the twist sentence, the three actions, runtime estimate at 190 wpm, TO VERIFY list.

## Self-check before hand-back

- Could someone retell the story in two sentences after one watch? Write those two sentences.
- Does each clue end on a question the next clue answers?
- Is there a line a viewer would quote in the comments?
- Would the viewer do something different tonight? Which line tells them what?
