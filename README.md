# 📜 LoreBook Creator

> Build complete SillyTavern World Info / LoreBooks with an LLM — from a single idea or a guided, tabbed worldbuilding form.

LoreBook Creator turns a one-line premise (or a fully fleshed-out world form) into a finished **World Info / LoreBook** ready to import into SillyTavern. The LLM writes the world overview, the lore, and a full set of interconnected entries — characters, factions, locations, items, events, magic/tech, creatures, customs and core rules — each with proper trigger keywords and insertion settings. You can generate everything at once, build it tab by tab, regenerate or expand any single entry, and lock anything you want to keep. The result exports as a standard World Info JSON and imports straight into SillyTavern.

It's the worldbuilding companion to **[Character Creator](https://github.com/virgilianshailer/character-creator)** and **[AutoIllustrator](https://github.com/virgilianshailer/AutoIllustrator)**.

---

## Features

- **Two creation modes** — a one-box **Simple** mode (type an idea, get a whole LoreBook) and a tabbed **Advanced** mode (*Overview, World, Lore, Entries, Export*) for full control
- **Guided worldbuilding parameters** — pick a **world type** (Realistic, Fantasy, Sci-Fi, Horror, Post-Apocalyptic, Urban Fantasy, Steampunk, Mythological, or Custom), an **era** (Prehistoric → Far Future, plus Timeless and Custom), and a **scale** that controls how many entries are generated (Micro 5–10 → Epic 55–80+)
- **Your place in the world** — set the **user role** (Observer, Participant, Key Player, Ruler, Godlike) so the lore is framed around how you'll actually role-play in it
- **Rich world fields** — tone, themes, main conflict, geography, factions, magic system, tech level, history and core rules, each individually generatable
- **14 entry categories** — Core Rule, Core Concept, Character, Faction, Location, Item / Artifact, Event / History, Magic / Technology, Creature / Species, Culture / Custom, Organization, Lore / Legend, RP Prompt, Supplementary
- **Per-field LLM tools** — 🎲 **Generate**, ➕ **Add More / Extend** (append new entities to an existing field), and ✨ **Enhance & Expand** (rewrite a field or entry in more depth)
- **Per-entry control** — regenerate, edit, or expand any single entry; filter the entry list by category
- **🔒 Field & section locking** — lock any field or entry and the LLM treats it as fixed context it must build around, so regenerating the rest never overwrites your choices
- **Proper World Info output** — entries are exported with primary/secondary **trigger keywords**, **position**, **order**, **constant**, **probability** and **depth**; Core Rules are pinned with recursion prevention so they stay authoritative
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

> LoreBook Creator only needs an LLM connection. There are no image or ComfyUI dependencies.

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
5. Add or remove entries and set their categories as needed.
6. Open the **Export** tab and click **Import to SillyTavern** — the LoreBook lands in your World Info, ready to attach to a chat or character.

---

## How It Works

```
Idea or world form
        ↓
LLM writes the world overview + a scaled set of entries — respecting locked fields,
   shielded from your User Persona / character description
        ↓
Entries are normalized: title, category, primary + secondary keywords,
   position / order / constant / probability / depth
        ↓
Review & refine: regenerate, edit, expand (✨) or extend (➕) any field or entry; lock what you keep
        ↓
(optional) Translate UI and content via the Chat Translation extension (original kept for export)
        ↓
Export → standard World Info JSON → imported via /api/worldinfo/import (with download fallback)
```

The **scale** setting decides roughly how many entries the model aims for, and the **world type / era / user role** steer their content and framing. Core Rules and Core Concepts are emitted as high-order, recursion-protected entries so they always take precedence over incidental lore.

---

## Modes & Tabs

**Simple mode** — a single idea box. One click generates a name, a world description and a full, category-balanced set of entries sized to your chosen scale.

**Advanced mode** exposes five tabs:

- **🌍 Overview** — the core premise: world type, era, scale, your role, tone and themes.
- **🗺️ World** — the setting's bones: geography, factions, magic system, tech level, history.
- **📜 Lore** — main conflict, core rules and the deeper narrative material.
- **📋 Entries** — the full entry list with category filtering; generate, regenerate, edit, expand, extend, lock or delete individual entries.
- **💾 Export** — import to SillyTavern or download the World Info JSON.

Every generatable field carries 🎲 (generate), ➕ (add more) and ✨ (enhance) controls, plus a 🔒 lock.

---

## Field & Section Locking

Each field and entry has a 🔒 toggle. A locked item is never overwritten by bulk or per-field generation — instead its current value is handed to the LLM as fixed context, so the rest of the world is written *around* it. Lock your world name, your central conflict or a hand-written faction and let the model fill in everything that should stay consistent with it.

---

## Translation

With the **Chat Translation** extension installed, the translation toggle does two things: it localizes the panel UI, and it translates generated entries and world fields into your SillyTavern UI language for reading. The original English text is preserved separately and is what gets written to the exported World Info, so your LoreBook stays in a portable, model-friendly language regardless of the display language.

---

## Troubleshooting

**Nothing generates / "LLM not available"**

- Make sure an LLM is connected in SillyTavern. The panel uses the quiet-generation API and reports when no connection is available.

**The model invents details about me or my current character**

- LoreBook Creator already blocks User Persona and character-description injection. If stray details still appear, lock the affected fields or remove the persona context from your prompt and regenerate.

**Import didn't appear in World Info**

- If the World Info API import fails, the extension automatically downloads the LoreBook as a JSON file instead — import it manually via **World Info → Import**.

**An entry came out wrong**

- Use the per-entry **regenerate**, edit it directly, or **Enhance & Expand** (✨) for a richer rewrite. Lock the entries you're happy with first so they aren't touched.

**Too many / too few entries**

- Adjust the **scale** (Micro → Epic) before generating; it controls the target entry count. You can always add entries per-category afterward with ➕.

**Translation isn't working**

- Confirm the **Chat Translation** extension is installed and configured. Translation features are disabled without it.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*LoreBook Creator is a third-party extension and is not affiliated with SillyTavern.*
