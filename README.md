# 📜 LoreBook Creator

> Build, repair and merge SillyTavern World Info / LoreBooks with an LLM — from a single idea, a guided worldbuilding form, or lore you already have.

LoreBook Creator turns a one-line premise into a finished **World Info / LoreBook** ready to import into SillyTavern. The LLM writes the world overview, the lore, and a full set of interconnected entries — characters, factions, locations, items, events, magic/tech, creatures, customs and core rules — each with proper trigger keywords and insertion settings.

It is also a **workbench for lorebooks you already own**: load any World Info JSON and audit it for the mechanical defects that silently break lorebooks, edit it with plain-language instructions, merge two books side by side, or grow a whole new book out of a handful of existing entries.

It's the worldbuilding companion to **[Character Creator](https://github.com/virgilianshailer/character-creator)** and **[AutoIllustrator](https://github.com/virgilianshailer/AutoIllustrator)**.

---

## Features

### Creating

- **Two creation modes** — a one-box **Simple** mode (type an idea, get a whole LoreBook) and a tabbed **Advanced** mode (*Overview, World, Lore, Entries, Export*) for full control
- **Guided worldbuilding parameters** — pick a **world type** (Realistic, Fantasy, Sci-Fi, Horror, Post-Apocalyptic, Urban Fantasy, Steampunk, Mythological, or Custom), an **era** (Prehistoric → Far Future, plus Timeless and Custom), and a **scale** that controls how many entries are generated (Micro 5–10 → Epic 55–80+)
- **Your place in the world** — set the **user role** (Observer, Participant, Key Player, Ruler, Godlike) so the lore is framed around how you'll actually role-play in it
- **Rich world fields** — tone, themes, main conflict, geography, factions, magic system, tech level, history and core rules, each individually generatable
- **14 entry categories** — Core Rule, Core Concept, Character, Faction, Location, Item / Artifact, Event / History, Magic / Technology, Creature / Species, Culture / Custom, Organization, Lore / Legend, RP Prompt, Supplementary — plus **custom categories** you define yourself, which become reusable one-click buttons
- **Per-field LLM tools** — 🎲 **Generate**, ➕ **Add More / Extend** (append new entities to an existing field), and ✨ **Enhance & Expand** (rewrite a field or entry in more depth)
- **Parent entries** — pick existing entries as source material for a new one, so it is generated *from* them and stays interlinked instead of free-floating
- **Blank entry** — add an empty entry and write it by hand, no generation involved
- **🔒 Field & section locking** — lock any field or entry and the LLM treats it as fixed context it must build around, so regenerating the rest never overwrites your choices

### Working with existing lorebooks

- **📂 Load & edit existing LoreBooks** — import any SillyTavern World Info JSON back into the editor; replace your current work or merge the imported entries into it
- **🩺 LoreBook Optimizer** — a deterministic audit that finds the mechanical defects that make lorebooks misfire, an **Auto-Fix** for the unambiguous ones, and an optional LLM pass for the judgment calls (see below)
- **🔀 Merge Workspace** — load two lorebooks side by side, match overlapping entries mechanically *and* semantically, then merge or keep both, pair by pair
- **✏️ LLM Edit** — describe an edit in plain language (*"rename the cult to Ashen Choir everywhere"*) and review every proposed change in a before/after diff before it lands
- **📖 Build a lorebook from lore** — select entries you already have and grow a new book out of them: deep-dive, spin-off, or pure restructure
- **🏷️ Auto-categorize** — let the LLM assign the best category to every entry, cleaning up inconsistent or duplicate categories without rewriting the entries themselves
- **🪄 Reconstruct fields from entries** — analyze the current entries and auto-fill the Overview / World / Lore fields; great after importing a book that has no high-level description. Locked fields are preserved.

### Output

- **Proper World Info output** — entries carry primary/secondary **trigger keywords**, **position**, **order**, **constant**, **probability** and **depth**; Core Rules are pinned with recursion prevention so they stay authoritative
- **Full entry model round-trip** — `group`, `sticky`, `preventRecursion`, `matchWholeWords`, `selectiveLogic`, `cooldown` and `disable` survive import → edit → export instead of being silently dropped
- **One-click import** — sends the LoreBook straight to SillyTavern via the World Info API, with an automatic JSON download as a fallback
- **📄 Template loading** — paste a template to steer the structure, tone and conventions of the generated world
- **🌍 Built-in translation** — translate the whole UI *and* generated content into your SillyTavern UI language via the Chat Translation extension, while keeping the original English for export
- **Persona-safe generation** — explicitly prevents your User Persona and active character description from leaking into the worldbuilding output
- **Right-drawer or center-modal** UI, plus a chat-bar button to open the panel

---

## Requirements

| Requirement | Notes |
| --- | --- |
| [SillyTavern](https://github.com/SillyTavern/SillyTavern) | Latest stable recommended |
| An LLM connection in SillyTavern | Used to write all world and entry text via the quiet-generation API |
| [Chat Translation extension](https://docs.sillytavern.app/extensions/chat-translation/) | Optional — enables UI and generated-content translation |

> LoreBook Creator only needs an LLM connection. There are no image or ComfyUI dependencies. The **Audit** half of the Optimizer needs no LLM at all.

---

## Installation

1. Open SillyTavern → **Extensions** → **Install Extension**
2. Paste this repository URL and click Install:

```
https://github.com/virgilianshailer/lorebook-creator
```

3. Reload the page — a **📜** button appears on the chat bar, and a **LoreBook Creator** section appears in the Extensions settings

Or install manually:

```
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/virgilianshailer/lorebook-creator
```

---

## Quick Start

1. Click the **📜** button on the chat bar to open the panel.
2. Stay in **Simple** mode, type a premise (e.g. *"a drowned city ruled by rival guilds of salvage divers"*), and click **Generate**.
3. Review the world overview and entries; switch to **Advanced** to refine any tab.
4. Lock anything you want to keep, then regenerate, expand (✨) or extend (➕) individual fields and entries.
5. Run **Audit** on the Entries tab — it is instant and free — and Auto-Fix what it finds.
6. Open the **Export** tab and click **Import to SillyTavern** — the LoreBook lands in your World Info, ready to attach to a chat or character.

Already have a lorebook? Use **📂 Load LoreBook**, then go straight to step 5.

---

## How It Works

```
Idea or world form                     Existing World Info JSON
        ↓                                        ↓
LLM writes the world overview +         Loaded into the editor as
a scaled set of entries — respecting    fully editable entries
locked fields, shielded from your                ↓
User Persona / character description    Audit · LLM Edit · Merge · Build from lore
        ↓                                        ↓
        └────────────────┬───────────────────────┘
                         ↓
   Entries are normalized: title, category, primary + secondary keywords,
      position / order / constant / probability / depth / group / recursion flags
                         ↓
   Review & refine: regenerate, edit, expand (✨) or extend (➕); lock what you keep
                         ↓
   (optional) Translate UI and content via Chat Translation (original kept for export)
                         ↓
   Export → standard World Info JSON → imported via /api/worldinfo/import
      (with download fallback)
```

The **scale** setting decides roughly how many entries the model aims for, and the **world type / era / user role** steer their content and framing. Core Rules and Core Concepts are emitted as high-order, recursion-protected entries so they always take precedence over incidental lore.

---

## Modes & Tabs

**Simple mode** — a single idea box. One click generates a name, a world description and a full, category-balanced set of entries sized to your chosen scale.

**Advanced mode** exposes five tabs:

- **🌍 Overview** — the core premise: world type, era, scale, your role, tone and themes.
- **🗺️ World** — the setting's bones: geography, factions, magic system, tech level, history.
- **📜 Lore** — main conflict, core rules and the deeper narrative material.
- **📋 Entries** — the full entry list with category filtering; generate, regenerate, edit, expand, extend, lock or delete individual entries. This is also where **Audit**, **Optimize**, **Auto-categorize**, **Reconstruct Fields** and **Build lorebook from lore** live.
- **💾 Export** — import to SillyTavern or download the World Info JSON.

A footer action, **📂 Load LoreBook**, is always available: pick a previously exported (or any SillyTavern) World Info JSON and it loads into the editor as fully editable entries. This is different from **Template**, which only uses a file as a style reference for new generation.

Every generatable field carries 🎲 (generate), ➕ (add more) and ✨ (enhance) controls, plus a 🔒 lock.

---

## LoreBook Optimizer

Most broken lorebooks are not badly written — they are badly *wired*. An entry with no keys never fires. Secondary keys are ignored unless `selective` is on. One common word as a trigger drags three entries into every prompt. The Optimizer is built in two stages so you always know what is fact and what is opinion.

**Stage 1 — Audit.** Pure JavaScript, no LLM call, instant, free, and it cannot hallucinate. It estimates real token cost per entry and reports:

| Check | Severity | What it means |
| --- | --- | --- |
| `no_keys` | error | Not constant and has no keys — the entry can never activate |
| `dead_secondary` | error | Has secondary keys but `selective=false` — SillyTavern ignores them completely |
| `suspected_dupe` | error | Two entries share ≥60% of their keys — they will always fire together |
| `key_collision` | error / warn | One key fires several entries at once; escalates to error past ~800 tokens |
| `constant_bloat` | warn | Always-on entries exceed the ~1200-token budget guideline |
| `token_bomb` | warn | A ~700+ token entry with `preventRecursion=false` recursively drags in others |
| `ungated_bomb` | warn | A large entry with many broad keys and no selective gate |
| `generic_key` | warn | A trigger like *"city"*, *"power"* or *"time"* that misfires in ordinary prose |
| `empty_selective` | warn | `selective` is on but there are no secondary keys — the flag does nothing |
| `order_pileup` | warn | Four or more entries share one `order` value — priority under budget pressure is random |
| `short_key` | info | A ≤4-character key without `matchWholeWords` matches inside other words |
| `dupe_key_self` | info | The same key listed twice in one entry |
| `dead_depth` | info | `depth` only applies to position 4 (@D) |

**Auto-Fix** applies only the unambiguous repairs — enable/disable `selective`, set `preventRecursion`, set `matchWholeWords`, de-duplicate keys, group suspected duplicates, and re-space `order` values along a category priority ladder (Core Rule 1000 → Supplementary 100) so budget truncation drops the least important lore first.

**Stage 2 — Optimize.** Only the judgment calls go to the LLM: replacement keywords for colliding or generic triggers, semantically duplicate entries, and possible canon contradictions. It receives a compact digest, never the whole book.

**Stage 3 — Review.** Every proposed change appears as a checkbox diff. Nothing is applied until you say so.

---

## Merge Workspace

Load two lorebooks — from files, or one of them straight from the editor — and compare them side by side.

1. **Mechanical pairing** matches obviously-overlapping entries for free.
2. **LLM Analysis** catches the semantic duplicates mechanics can't see — the same entity under two different names.
3. For each pair choose **Merge** (one combined entry) or **Both** (keep them separate); click any entry to exclude it entirely.
4. Merging runs **batched, pair by pair**, so it scales to large books. Pairs the LLM fails on are kept as two entries rather than lost.

**Full LLM merge** sends both books whole in a single request. It is offered for small lorebooks only, and says so.

---

## Build a Lorebook from Lore

Select entries you already have and grow a new book out of them, in one of three modes:

- **Deep-dive** — unpack the selected entries into a full book of their own
- **Spin-off** — a new corner of the same universe
- **Restructure** — rebuild only this material, inventing nothing

Set a target entry count, optionally a name and a focus directive, and click **Build lorebook**. Source entries can be clicked to exclude them.

---

## LLM Edit

Describe the change in plain language — *"rename the cult to Ashen Choir everywhere"*, *"add that the ritual only works on a new moon"* — and the LLM proposes edits across the affected entries. Every change is shown as a before/after diff with a checkbox; uncheck anything you don't want and click **Apply**. Only what you asked for changes.

---

## Field & Section Locking

Each field and entry has a 🔒 toggle. A locked item is never overwritten by bulk or per-field generation — instead its current value is handed to the LLM as fixed context, so the rest of the world is written *around* it. Lock your world name, your central conflict or a hand-written faction and let the model fill in everything that should stay consistent with it.

---

## Translation

With the **Chat Translation** extension installed, the translation toggle does two things: it localizes the panel UI, and it translates generated entries and world fields into your SillyTavern UI language for reading. The original English text is preserved separately and is what gets written to the exported World Info, so your LoreBook stays in a portable, model-friendly language regardless of the display language.

There is also a **To English** action next to the idea box: write your premise in your own language and translate it before generating, which produces better results than asking the model to build the world in a non-English language directly.

---

## Troubleshooting

**Nothing generates / "LLM not available"**

- Make sure an LLM is connected in SillyTavern. The panel uses the quiet-generation API and reports when no connection is available.

**My entries never trigger in chat**

- Run **Audit**. `no_keys` and `dead_secondary` are the two usual culprits, and both are one Auto-Fix away.

**My prompt is bloated / the model forgets things**

- Audit reports `constant_bloat` and `token_bomb`. Always-on entries and un-gated large entries are the two ways a lorebook quietly eats the whole context.

**One keyword drags in half the book**

- That's `key_collision` or `generic_key`. Auto-Fix can group or gate them; **Optimize** asks the LLM for better replacement keywords.

**The model invents details about me or my current character**

- LoreBook Creator already blocks User Persona and character-description injection. If stray details still appear, lock the affected fields or remove the persona context from your prompt and regenerate.

**Import didn't appear in World Info**

- If the World Info API import fails, the extension automatically downloads the LoreBook as a JSON file instead — import it manually via **World Info → Import**.

**A full LLM merge failed**

- Expected on large books: it is a single request holding both. Use the pair-by-pair merge in the Merge Workspace instead, which batches the work.

**An entry came out wrong**

- Use the per-entry **regenerate**, edit it directly, or **Enhance & Expand** (✨) for a richer rewrite. Lock the entries you're happy with first so they aren't touched.

**Too many / too few entries**

- Adjust the **scale** (Micro → Epic) before generating; it controls the target entry count. You can always add entries per-category afterward with ➕.

**Translation isn't working**

- Confirm the **Chat Translation** extension is installed and configured. Translation features are disabled without it.

---

## Version History

**1.15.0** — everything below landed since 1.4.0.

- **LoreBook Optimizer** — deterministic audit with 13 checks and real token accounting, Auto-Fix for the unambiguous defects, an LLM pass for key deconfliction and canon contradictions, and a checkbox diff before anything is applied.
- **Merge Workspace** (1.12) — side-by-side comparison of two lorebooks, deterministic pair matching, LLM overlap analysis for semantic duplicates, selective transfer, and batched per-pair merging that scales to large books. The earlier whole-book merge remains as **Full LLM merge** for small books.
- **LLM Edit** — plain-language edit instructions applied across entries, with a before/after diff and per-change checkboxes.
- **Build lorebook from lore** — grow a new book out of selected existing entries, in deep-dive, spin-off or restructure mode.
- **Auto-categorize** — LLM re-assigns the best category to every entry without rewriting them.
- **Parent entries** — generate a new entry *from* chosen existing ones so it stays interlinked.
- **Blank entry** — add an empty entry and fill it by hand.
- **Entry model round-trip fix** — `group`, `sticky`, `preventRecursion`, `matchWholeWords`, `selectiveLogic`, `cooldown` and `disable` are now preserved across import → edit → export.
- **Translate idea to English** before generating, for better results than generating directly in another language.

**1.4.0**

- Added **Load LoreBook** — import an existing SillyTavern World Info JSON back into the editor to continue or refine it, with a choice to replace or merge into your current entries.
- Added **Reconstruct Fields** — on the Entries tab, analyze the current/imported entries and auto-fill the Overview / World / Lore fields. Pairs with Load LoreBook so imported books get a full high-level description. Locked fields are never overwritten.
- Added **custom categories** — define your own entry category by name; it becomes a reusable one-click button so you can keep adding entries of that category without retyping. Custom categories found in imported LoreBooks are surfaced as buttons too.
- Fixed **Expand (+5)** in Simple mode generating entries without trigger keywords; the expansion prompt now requests the full entry structure, matching the main generator.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*LoreBook Creator is a third-party extension and is not affiliated with SillyTavern.*
