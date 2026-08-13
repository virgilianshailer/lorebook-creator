/*
 *  LoreBook Creator v1.15.0 — SillyTavern Extension
 *  Create World Info / LoreBook entries via LLM with simple & advanced modes.
 *  Full translation support via Chat Translation extension.
 *  Template loading, era/type/scale parameters, per-field LLM generation,
 *  user role, category system, export/import, generated content translation.
 *  Added: Enhance & Expand entries and text fields.
 *  Added: Add More / Extend (➕) to append new entities to existing fields.
 *  Added: Merge LoreBooks — intelligently combine multiple lorebooks into one via LLM.
 *  Fix: Prevent User Persona / Character description leaking into generation.
 *  Added: LoreBook Optimizer — deterministic audit + Auto-Fix + LLM key deconfliction.
 *  Fix: entry model now preserves group/sticky/preventRecursion/matchWholeWords/
 *       selectiveLogic/cooldown/disable across import → edit → export.
 *  Added v1.12: Merge Workspace — side-by-side comparison of two lorebooks,
 *       deterministic pair matching, LLM overlap analysis, selective transfer,
 *       and batched per-pair LLM merging that scales to large books.
 *  Added: LLM Edit (plain-language edits with before/after diff review),
 *       Build lorebook from lore, Auto-categorize, parent entries, blank entry.
 */

/* ══════════════════════════════════════
   MODULE GLOBALS
   ══════════════════════════════════════ */

var LBC_MODULE = 'lorebook-creator';
var lbcSettings = null;
var extSettings = null;
var saveFn = null;
var lbcCtx = null;
var genQuiet = null;
var translateFn = null;

/* ── State ── */
var lbcData = {
    mode: 'simple',
    activeTab: 'overview',
    simpleIdea: '',
    worldName: '',
    worldDescription: '',
    era: '',
    eraCustom: '',
    worldType: '',
    worldScale: 3,
    userRole: 'participant',
    userRoleDescription: '',
    tone: '',
    themes: '',
    mainConflict: '',
    geography: '',
    factions: '',
    magicSystem: '',
    techLevel: '',
    history: '',
    coreRules: '',
    entries: [],
    customCategories: [],
    templateData: null,
    templateName: '',
    locked: {},
    editingEntryIdx: -1,
    categoryFilter: 'all',
    _translated: false,
    _trL: {}
};

var lbcBusy = false;

function L() { console.log.apply(console, ['[LBC]'].concat(Array.from(arguments))); }
function E() { console.error.apply(console, ['[LBC]'].concat(Array.from(arguments))); }
function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

/* ══════════════════════════════════════
   genQuiet WRAPPER
   ══════════════════════════════════════ */
async function lbcGenQuiet(prompt) {
    window._lbcOwnGeneration = true;
    try { 
        // Pass 'false' as the 2nd parameter to explicitly prevent SillyTavern 
        // from injecting the System Prompt and User Persona into the background generation.
        return await genQuiet(prompt, false); 
    }
    finally { setTimeout(function () { window._lbcOwnGeneration = false; }, 500); }
}

/* ══════════════════════════════════════
   UI LABELS (translation keys)
   ══════════════════════════════════════ */

var UI = {
    title: 'LoreBook Creator',
    simple: 'Simple',
    advanced: 'Advanced',
    overview: 'Overview',
    world: 'World',
    lore: 'Lore',
    entries: 'Entries',
    exportTab: 'Export',
    generate: 'Generate',
    expand: 'Expand (+5)',
    template: 'Template',
    exportJSON: 'Export JSON',
    importST: 'Import to ST',
    loadBook: 'Load LoreBook',
    bookImported: 'LoreBook imported',
    bookImportReplace: 'Replace current entries with the imported LoreBook?\n\nOK = replace all\nCancel = add imported entries to the current ones',
    noEntriesInFile: 'No entries found in this file.',
    optimize: 'Optimize',
    optimizing: 'Analyzing...',
    audit: 'Audit',
    optimizeTitle: 'LoreBook Optimizer',
    optIssues: 'Detected problems',
    optClean: 'No mechanical problems found.',
    optProposed: 'Proposed key changes',
    optNoPatches: 'Nothing for the LLM to fix here — use Auto-Fix for the mechanical issues.',
    optContradictions: 'Possible canon contradictions (review manually)',
    optAutoFix: 'Auto-Fix (no LLM)',
    optAutoFixed: 'Mechanical fixes applied',
    optApply: 'Apply selected',
    optApplied: 'Patches applied',
    optFixLog: 'Auto-Fix changes',
    optNothingToFix: 'Nothing to auto-fix — the mechanical side is already clean.',
    optRunOptimize: 'Run Optimize to let the LLM resolve the remaining key collisions.',
    optClean2: 'All clear — nothing left to fix.',
    optAuditHint: 'Instant mechanical audit — no LLM call',
    optOptimizeHint: 'Audit + LLM key deconfliction',
    noEntriesToOptimize: 'No entries to optimize. Generate or load a lorebook first.',
    reconstructFields: 'Reconstruct Fields',
    reconstructConfirm: 'Analyze the current entries and fill in the Overview / World / Lore fields?\n\nThis overwrites those fields (except locked ones) based on your entries.',
    reconstructing: 'Reconstructing world fields from entries...',
    reconstructDone: 'world fields reconstructed!',
    noEntriesToReconstruct: 'No entries to analyze. Generate or import some first.',
    describeWorld: 'Describe Your World',
    ideaPlaceholder: 'Describe your world/setting idea in a few sentences or paragraphs...',
    templateLoaded: 'Template loaded',
    clearTemplate: 'Clear',
    worldIdentity: 'World Identity',
    worldName: 'World Name',
    worldDescription: 'World Description',
    worldType: 'World Type',
    era: 'Era / Time Period',
    eraCustom: 'Custom Era Description',
    scaleScope: 'Scale & Scope',
    userRoleLabel: 'User Role in This World',
    roleDetails: 'Role Details',
    roleDetailsPlaceholder: 'Additional details about the user\'s role, title, connections...',
    toneThemes: 'Tone & Themes',
    tone: 'Tone / Atmosphere',
    themes: 'Key Themes',
    mainConflict: 'Main Conflict',
    geographyLoc: 'Geography & Locations',
    geography: 'Geography',
    factionsOrg: 'Factions & Organizations',
    factions: 'Major Factions',
    magicTech: 'Magic / Technology System',
    magicSystem: 'Magic / Powers System',
    techLevel: 'Technology Level',
    historyBg: 'Historical Background',
    historyLabel: 'History',
    coreRulesLabel: 'Core Rules / Laws',
    coreRules: 'Core Rules of This World',
    genAllParams: 'Generate All Parameters',
    noEntries: 'No entries yet. Generate entries using the Generate button, or add individual entries below.',
    addEntryByCat: 'Add Entry by Category',
    blankEntry: 'Blank entry',
    llmEdit: 'LLM Edit',
    llmEditHint: 'Describe the edit in plain language. Only what you ask for will change, and you review every change before it lands.',
    llmEditPlaceholder: 'e.g. "Rename the cult to Ashen Choir everywhere" or "Add that the ritual only works on a new moon"',
    llmEditRun: 'Run Edit',
    llmEditApply: 'Apply',
    llmEditBack: 'Back',
    llmEditBefore: 'Before',
    llmEditAfter: 'After',
    llmEditNoChanges: 'The LLM found nothing to change for this instruction.',
    llmEditInstrEmpty: 'Enter an edit instruction first.',
    llmEditDone: 'change(s) applied.',
    llmEditPreviewHint: 'Review the proposed changes. Uncheck any you want to skip, then Apply.',
    blankEntryHint: 'Add an empty entry and fill it by hand — no generation',
    parentEntries: 'Parent Entries',
    parentEntriesHint: 'Pick existing entries as source material — the new content will be generated FROM them, staying consistent and interlinked',
    genFromParents: 'Generate from parents',
    addParent: '+ add parent…',
    noOtherEntries: 'no other entries to pick from',
    parentsGenerated: 'Generated from parents — review and save',
    customCat: '+ Custom',
    customCatPrompt: 'Enter a custom category name (e.g. "Trading Psychology", "Deity", "Bloodline"):',
    editEntry: 'Edit Entry',
    back: 'Back',
    save: 'Save',
    titleComment: 'Title / Comment',
    category: 'Category',
    primaryKeys: 'Primary Keywords (comma-separated)',
    secondaryKeys: 'Secondary Keywords (comma-separated)',
    content: 'Content',
    order: 'Order',
    position: 'Position',
    depth: 'Depth',
    constant: 'Constant (always active)',
    selective: 'Selective (requires secondary key match)',
    pos0: 'Before char defs',
    pos1: 'After char defs',
    pos4: 'System prompt',
    exportImport: 'Export & Import',
    downloadJSON: 'Download JSON',
    importToST: 'Import to SillyTavern',
    jsonPreview: 'JSON Preview',
    genFirst: 'Generate entries first, then export.',
    allCat: 'All',
    entriesWord: 'entries',
    categories: 'categories',
    constantWord: 'constant',
    generating: 'Generating...',
    generatingEntries: 'Generating lorebook entries...',
    expandingLore: 'Expanding lorebook...',
    genSuccess: 'entries generated!',
    expandSuccess: 'new entries added!',
    exportSuccess: 'entries exported as JSON.',
    importSuccess: 'imported!',
    allFieldsGen: 'All fields generated!',
    entryCreated: 'entry created!',
    entryRegenerated: 'Entry regenerated!',
    noLLM: 'LLM generation not available.',
    ideaEmpty: 'Please enter a world idea first.',
    fillParams: 'Fill in at least some world parameters first.',
    noEntriesToExport: 'No entries to export.',
    resetConfirm: 'Reset all LoreBook data?',
    resetDone: 'Reset complete.',
    deleteConfirm: 'Delete entry',
    translating: 'Translating...',
    translateDone: 'Translation complete!',
    translateOff: 'Translation removed.',
    translateNA: 'Translation not available.',
    transContent: 'Translating content...',
    translateIdea: 'To English',
    translateIdeaHint: 'Translate your idea into English so the LLM understands the request and writes all fields in English (recommended over creating a lorebook directly in another language).',
    translatingIdea: 'Translating idea to English...',
    ideaTranslated: 'Idea translated to English!',
    entryEnhanced: 'Entry enhanced and expanded!',
    enhanceEntry: 'Enhance & Expand',
    fieldEnhanced: 'Field enhanced and expanded!',
    enhanceField: 'Enhance & Expand field',
    addMoreField: 'Add More / Extend',
    fieldAddedMore: 'New data added to field!',
    merge: 'Merge',
    mergeNeedTwo: 'Please select at least 2 LoreBook files to merge.',
    flTitle: 'Lorebook from lore',
    flSources: 'Source entries (click to exclude)',
    flMode: 'What to build',
    flModeDeep: 'Deep-dive — unpack these entries into a full book',
    flModeSpin: 'Spin-off — a new corner of the same universe',
    flModeClean: 'Restructure — rebuild only this material, invent nothing',
    flCount: 'Target entries',
    flName: 'New lorebook name (optional — LLM will propose one)',
    flFocus: 'Focus / directive (optional)',
    flGenerate: 'Build lorebook',
    flBuilding: 'Building...',
    flNoSources: 'All source entries are excluded — nothing to build from.',
    flReplaceConfirm: 'The editor already holds entries. Replace them with the generated lorebook?',
    flDone: 'Lorebook built from lore',
    flFailed: 'Failed to parse LLM response.',
    mergeNoEntries: 'None of the selected files contained any entries.',
    mergeWithCurrentConfirm: 'You already have entries loaded.\n\nOK = merge ONLY the selected files (your current entries are discarded)\nCancel = include your CURRENT entries in the merge as well',
    mergeParsing: 'Reading selected lorebooks...',
    merging: 'Merging lorebooks with the LLM...',
    mergeSuccess: 'merged entries created!',
    mergeFailed: 'Failed to merge lorebooks.',
    mgTitle: 'Merge Lorebooks',
    mgLoadFile: 'Load file',
    mgUseCurrent: 'Use current entries',
    mgPickBoth: 'Load two lorebooks — a file or the current editor entries — to compare them side by side.',
    mgPairsTitle: 'Matched pairs',
    mgOnlyIn: 'Only in',
    mgNoPairs: 'No overlapping entries detected mechanically. Run LLM Analysis to catch semantic duplicates (same entity under different names).',
    mgAnalyze: 'LLM Analysis',
    mgAnalyzing: 'Analyzing overlap with the LLM...',
    mgAnalyzeDone: 'LLM analysis complete',
    mgNotes: 'LLM notes',
    mgChoiceMerge: 'Merge',
    mgChoiceBoth: 'Both',
    mgRun: 'Merge',
    mgFullLLM: 'Full LLM merge',
    mgFullLLMHint: 'Send both books whole to the LLM in ONE request — only reliable for small lorebooks',
    mgFullConfirm: 'Full LLM merge sends BOTH books whole in a single request (may fail on large books) and replaces the editor contents. Continue?',
    mgMergingPair: 'Merging pairs',
    mgDone: 'Merge complete',
    mgFailedPairs: 'pair(s) could not be merged by the LLM and were kept as two entries',
    mgNothing: 'Nothing to merge — everything is excluded.',
    mgReplaceConfirm: 'Replace the current editor entries with the merge result?',
    mgExcludedHint: 'click an entry to exclude / include it',
    mgResult: 'Result',
    autoCategorize: 'Auto-categorize',
    autoCategorizeConfirm: 'Let the LLM review every entry and assign the best category to each one?\n\nThis cleans up inconsistent / duplicate categories. Entries are not rewritten — only their category changes.',
    autoCategorizing: 'Auto-categorizing entries with the LLM...',
    autoCategorizeDone: 'entries re-categorized!',
    autoCategorizeNoChange: 'Categories already look consistent — nothing changed.',
    noEntriesToCategorize: 'No entries to categorize. Generate or import some first.'
};

function T(key) {
    if (lbcData._translated && lbcData._trL && lbcData._trL[key]) return lbcData._trL[key];
    return UI[key] || key;
}

/* ══════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════ */

var WORLD_TYPES = [
    { id: 'realistic', label: '🌍 Realistic', desc: 'Real world, historical accuracy, no magic' },
    { id: 'fantasy', label: '🐉 Fantasy', desc: 'Magic, mythical creatures, medieval/ancient settings' },
    { id: 'scifi', label: '🚀 Sci-Fi', desc: 'Future tech, space, aliens, cyberpunk' },
    { id: 'horror', label: '👻 Horror', desc: 'Dark, supernatural, fear, monsters' },
    { id: 'postapoc', label: '☢️ Post-Apocalyptic', desc: 'After the end, survival, ruins' },
    { id: 'urban_fantasy', label: '🏙️ Urban Fantasy', desc: 'Modern world with hidden magic' },
    { id: 'steampunk', label: '⚙️ Steampunk', desc: 'Victorian + advanced steam technology' },
    { id: 'mythological', label: '🏛️ Mythological', desc: 'Based on real myths, gods, legends' },
    { id: 'custom', label: '✏️ Custom', desc: 'Define your own type' }
];

var ERA_PRESETS = [
    { id: 'prehistoric', label: 'Prehistoric', range: 'Before 3000 BCE' },
    { id: 'ancient', label: 'Ancient', range: '3000 BCE – 500 CE' },
    { id: 'medieval', label: 'Medieval', range: '500 – 1500 CE' },
    { id: 'renaissance', label: 'Renaissance', range: '1400 – 1600 CE' },
    { id: 'early_modern', label: 'Early Modern', range: '1600 – 1800 CE' },
    { id: 'industrial', label: 'Industrial', range: '1800 – 1900 CE' },
    { id: 'modern', label: 'Modern', range: '1900 – 2025 CE' },
    { id: 'near_future', label: 'Near Future', range: '2025 – 2200 CE' },
    { id: 'far_future', label: 'Far Future', range: '2200+ CE' },
    { id: 'timeless', label: 'Timeless / Mythical', range: 'Outside normal time' },
    { id: 'custom', label: 'Custom...', range: '' }
];

var USER_ROLES = [
    { id: 'observer', label: '👁️ Observer', desc: 'Outsider watching events unfold, no special status' },
    { id: 'participant', label: '🧑 Participant', desc: 'Ordinary member of this world, no special privileges' },
    { id: 'keyplayer', label: '⭐ Key Player', desc: 'Important person with influence and connections' },
    { id: 'ruler', label: '👑 Ruler / Leader', desc: 'Authority figure: king, president, faction leader' },
    { id: 'godlike', label: '✨ Godlike / Transcendent', desc: 'Near-omnipotent entity, reality-bender' }
];

var SCALE_LABELS = {
    1: { label: 'Micro', entries: '5–10', desc: 'A single location: a tavern, a ship, a house' },
    2: { label: 'Small', entries: '10–20', desc: 'A village, a small organization, a neighborhood' },
    3: { label: 'Medium', entries: '20–35', desc: 'A city, a kingdom, a faction-heavy setting' },
    4: { label: 'Large', entries: '35–55', desc: 'A continent, multiple kingdoms, a galactic sector' },
    5: { label: 'Epic', entries: '55–80+', desc: 'Entire world/galaxy with deep lore and many factions' }
};

var ENTRY_CATEGORIES = [
    'Core Rule', 'Core Concept', 'Character', 'Faction', 'Location',
    'Item / Artifact', 'Event / History', 'Magic / Technology', 'Creature / Species',
    'Culture / Custom', 'Organization', 'Lore / Legend', 'RP Prompt', 'Supplementary'
];

/* Common variants / plurals / translations the LLM tends to emit, mapped to the
   canonical category above. Keys are compared case-insensitively after trimming.
   This is what prevents near-duplicate chips like "Characters" vs "Character". */
var CATEGORY_SYNONYMS = {
    'core rules': 'Core Rule', 'rule': 'Core Rule', 'rules': 'Core Rule',
    'core concepts': 'Core Concept', 'concept': 'Core Concept', 'concepts': 'Core Concept',
    'characters': 'Character', 'char': 'Character', 'person': 'Character', 'people': 'Character', 'npc': 'Character',
    'factions': 'Faction', 'group': 'Faction', 'groups': 'Faction',
    'locations': 'Location', 'place': 'Location', 'places': 'Location', 'region': 'Location', 'regions': 'Location',
    'item': 'Item / Artifact', 'items': 'Item / Artifact', 'artifact': 'Item / Artifact', 'artifacts': 'Item / Artifact', 'object': 'Item / Artifact',
    'event': 'Event / History', 'events': 'Event / History', 'history': 'Event / History', 'historical': 'Event / History',
    'magic': 'Magic / Technology', 'technology': 'Magic / Technology', 'tech': 'Magic / Technology', 'magic/tech': 'Magic / Technology', 'magic / tech': 'Magic / Technology', 'power': 'Magic / Technology', 'powers': 'Magic / Technology',
    'creature': 'Creature / Species', 'creatures': 'Creature / Species', 'species': 'Creature / Species', 'monster': 'Creature / Species', 'monsters': 'Creature / Species', 'race': 'Creature / Species', 'races': 'Creature / Species',
    'culture': 'Culture / Custom', 'cultures': 'Culture / Custom', 'custom': 'Culture / Custom', 'customs': 'Culture / Custom', 'tradition': 'Culture / Custom', 'traditions': 'Culture / Custom',
    'organizations': 'Organization', 'org': 'Organization', 'orgs': 'Organization', 'institution': 'Organization',
    'lore': 'Lore / Legend', 'legend': 'Lore / Legend', 'legends': 'Lore / Legend', 'myth': 'Lore / Legend', 'myths': 'Lore / Legend', 'mythology': 'Lore / Legend',
    'rp prompts': 'RP Prompt', 'prompt': 'RP Prompt', 'prompts': 'RP Prompt', 'roleplay prompt': 'RP Prompt',
    'misc': 'Supplementary', 'miscellaneous': 'Supplementary', 'other': 'Supplementary', 'supplement': 'Supplementary', 'supplementary info': 'Supplementary', 'unknown': 'Supplementary'
};

/* Map a raw category string to a canonical built-in when we are confident.
   - exact (case-insensitive) match to a built-in  -> the built-in's exact casing
   - known synonym / plural / variant              -> the mapped built-in
   - anything else (a genuine custom category)      -> returned unchanged (trimmed)
   This is deliberately conservative: real custom categories like "Deity" or
   "Bloodline" are preserved, only obvious near-duplicates get collapsed. */
function canonicalizeCategory(cat) {
    if (cat === undefined || cat === null) return 'Supplementary';
    var raw = String(cat).trim();
    if (!raw) return 'Supplementary';
    var lc = raw.toLowerCase();
    for (var i = 0; i < ENTRY_CATEGORIES.length; i++) {
        if (ENTRY_CATEGORIES[i].toLowerCase() === lc) return ENTRY_CATEGORIES[i];
    }
    if (CATEGORY_SYNONYMS.hasOwnProperty(lc)) return CATEGORY_SYNONYMS[lc];
    return raw;
}

/* ══════════════════════════════════════
   PROMPTS
   ══════════════════════════════════════ */

var PROMPTS = {
    simpleGenerate:
        '[OOC: You are a LoreBook / World Info creation assistant for a roleplaying system.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters.\n\n' +
        'The user provides a brief world/setting idea. Create a COMPLETE set of lorebook entries.\n\n' +
        'USER IDEA:\n{{IDEA}}\n\n' +
        '{{TEMPLATE_BLOCK}}' +
        'Generate a full lorebook with varied entries covering: core rules, key concepts, important characters, ' +
        'factions, locations, items, history, magic/technology, creatures, cultures, and RP prompts.\n\n' +
        'Each entry MUST have:\n' +
        '- "comment": short identifier title\n' +
        '- "key": array of trigger keywords (3-6 per entry)\n' +
        '- "keysecondary": array (0-3)\n' +
        '- "content": detailed lore text (use [ ] for structured data)\n' +
        '- "category": one of: ' + ENTRY_CATEGORIES.join(', ') + '\n' +
        '- "constant": true ONLY for most critical rule. Most are false.\n' +
        '- "order": 50-950 (higher=more important. Core ~900+, concepts ~200-300, chars ~100-150, supplementary ~50-100)\n' +
        '- "position": 0 for lore (before char defs), 1 for RP prompts (after char defs), 4 for constant rules (system prompt)\n\n' +
        'Aim for 15-30 entries. Be creative and detailed.\n' +
        'Write in the SAME LANGUAGE as the user idea.\n\n' +
        'Respond ONLY valid JSON:\n{"worldName":"...","worldDescription":"...","entries":[...]}\nONLY valid JSON!]',

    advancedGenerate:
        '[OOC: You are a LoreBook / World Info creation assistant. Generate entries based on these parameters.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Base everything ONLY on the WORLD PARAMETERS below.\n\n' +
        'WORLD PARAMETERS:\n{{WORLD_PARAMS}}\n\n' +
        '{{TEMPLATE_BLOCK}}' +
        '{{EXISTING_ENTRIES_BLOCK}}' +
        'Generate approximately {{TARGET_COUNT}} entries.\n\n' +
        'CATEGORIES to cover:\n' +
        '- Core Rules (1-3, order 900+, position 4, constant:true for #1)\n' +
        '- Core Concepts (3-6, order 200-300, position 0)\n' +
        '- Characters (3-10, order 100-180, position 1)\n' +
        '- Factions (2-6, order 130-200, position 0)\n' +
        '- Locations (2-5, order 100-150, position 0)\n' +
        '- Items (1-4, order 80-130, position 0)\n' +
        '- Events (2-5, order 100-150, position 0)\n' +
        '- Magic/Tech (1-4, order 110-250, position 0)\n' +
        '- Creatures (1-3, order 80-120, position 0)\n' +
        '- Culture (1-3, order 80-120, position 0)\n' +
        '- RP Prompts (2-5, order 50, position 1)\n' +
        '- Supplementary (1-4, order 50-100, position 0)\n\n' +
        'USER ROLE: {{USER_ROLE}}\n{{USER_ROLE_DESC}}\n\n' +
        'Each entry MUST have these exact JSON keys:\n' +
        '- "comment": string (short identifier title)\n' +
        '- "key": array of strings (trigger keywords)\n' +
        '- "keysecondary": array of strings\n' +
        '- "content": string (detailed lore text, use [ ] for structured data)\n' +
        '- "category": string (exactly matching one category from above)\n' +
        '- "constant": boolean\n' +
        '- "order": number\n' +
        '- "position": number\n\n' +
        'Same language as world params.\n\n' +
        'ONLY valid JSON:\n{"entries":[...]}\nONLY JSON!]',

    generateField:
        '[OOC: You are a world-building assistant. Generate a value for "{{FIELD_NAME}}".\n\n' +
        'WORLD CONTEXT:\n{{CONTEXT}}\n\n' +
        '{{OPTIONS_HINT}}' +
        'Respond with ONLY the value. No JSON, no explanation. Same language as context.]',

    enhanceField:
        '[OOC: You are a creative world-building assistant. Your task is to rewrite and greatly EXPAND the field "{{FIELD_NAME}}".\n\n' +
        'WORLD CONTEXT:\n{{CONTEXT}}\n\n' +
        'CURRENT TEXT:\n{{CURRENT_TEXT}}\n\n' +
        'TASK:\n' +
        '1. Rewrite the text to be significantly longer, more detailed, and artistic.\n' +
        '2. Add rich world-building details, nuance, and depth based on the context.\n' +
        '3. Do not contradict existing facts.\n\n' +
        'Respond with ONLY the improved text. No JSON, no formatting, just the text. Same language as context.]',

    addMoreField:
        '[OOC: You are a creative world-building assistant. Your task is to ADD NEW concepts, items, or lore to the field "{{FIELD_NAME}}".\n\n' +
        'WORLD CONTEXT:\n{{CONTEXT}}\n\n' +
        'CURRENT CONTENT OF THIS FIELD:\n{{CURRENT_TEXT}}\n\n' +
        'TASK:\n' +
        '1. Brainstorm and generate NEW, additional content for this specific field (e.g., new factions, new locations, new historical events, new rules).\n' +
        '2. DO NOT repeat what is already in the CURRENT CONTENT. Expand the world.\n' +
        '3. Match the tone and formatting of the current content.\n\n' +
        'Respond with ONLY the newly generated text (it will be appended to the existing text). No JSON, no headers. Same language as context.]',

    generateAllFields:
        '[OOC: You are a world-building assistant. Fill ALL parameters.\n\n' +
        'KNOWN INFO:\n{{CONTEXT}}\n\n' +
        '{{LOCKED_BLOCK}}' +
        'JSON:\n{\n"worldName":"","worldDescription":"",\n"era":"","worldType":"",\n' +
        '"tone":"","themes":"","mainConflict":"",\n"geography":"","factions":"",\n' +
        '"magicSystem":"","techLevel":"",\n"history":"","coreRules":"",\n' +
        '"userRole":"","userRoleDescription":""\n}\n\n' +
        'worldType: realistic,fantasy,scifi,horror,postapoc,urban_fantasy,steampunk,mythological,custom\n' +
        'userRole: observer,participant,keyplayer,ruler,godlike\n' +
        'era: prehistoric,ancient,medieval,renaissance,early_modern,industrial,modern,near_future,far_future,timeless,custom\n' +
        'Same language as context. ONLY JSON!]',

    generateSingleEntry:
        '[OOC: Generate ONE detailed lorebook entry.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Create an entirely NEW and ORIGINAL entity that fits the WORLD.\n\n' +
        'WORLD:\n{{WORLD_PARAMS}}\n\n' +
        'ENTRY TYPE: {{ENTRY_TYPE}}\n{{SPECIFIC_HINT}}\n\n{{EXISTING_ENTRIES_BLOCK}}' +
        'JSON:\n{"comment":"Title — Category","key":["kw1","kw2"],"keysecondary":[],' +
        '"content":"...","category":"{{ENTRY_TYPE}}","constant":false,"order":{{ORDER_HINT}},"position":{{POSITION_HINT}}}\n' +
        'Same language as world. ONLY JSON!]',

    generateFromParents:
        '[OOC: Generate ONE lorebook entry GROUNDED IN the parent entries below. ' +
        'The parents are the source material: the new entry must be consistent with them, reference or connect to them where natural, and expand the SAME corner of the world — not an unrelated topic.\n\n' +
        'WORLD:\n{{WORLD_PARAMS}}\n\n' +
        'PARENT ENTRIES (canon — never contradict):\n{{PARENTS_BLOCK}}\n\n' +
        'DRAFT OF THE NEW ENTRY (what the user already decided — keep it; empty fields are yours to invent):\n{{DRAFT_BLOCK}}\n\n' +
        '{{EXISTING_ENTRIES_BLOCK}}' +
        'RULES:\n' +
        '- The entry must make sense alongside its parents: shared names, causal links, the same factions/places/eras where appropriate.\n' +
        '- It must still be SELF-CONTAINED (it can be injected without the parents present).\n' +
        '- Do not retell a parent — add something new that grows out of it.\n' +
        '- "key": 3-6 trigger words likely to appear in chat.\n\n' +
        'JSON:\n{"comment":"Title — Category","key":["kw1","kw2"],"keysecondary":[],' +
        '"content":"...","category":"...","constant":false,"order":100,"position":0}\n' +
        'Same language as the parents. ONLY JSON!]',

    regenerateEntry:
        '[OOC: Rewrite this entry with MORE detail.\n\nWORLD:\n{{WORLD_PARAMS}}\n\n' +
        'CURRENT:\n{{CURRENT_ENTRY}}\n\nKeep topic, improve quality. Same format.\n' +
        'ONLY JSON:\n{"comment":"...","key":[...],"keysecondary":[...],"content":"...",' +
        '"category":"...","constant":false,"order":N,"position":N}\nONLY JSON!]',

    expandEntries:
        '[OOC: Generate {{COUNT}} NEW lorebook entries to fill gaps.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Create entirely NEW and ORIGINAL entries.\n\n' +
        'WORLD:\n{{WORLD_PARAMS}}\n\n' +
        'EXISTING:\n{{EXISTING_SUMMARY}}\n\nAvoid duplicates.\n\n' +
        'Each entry MUST have these exact JSON keys:\n' +
        '- "comment": string (short identifier title / the actual name of the entity)\n' +
        '- "key": array of 3-6 trigger keywords (REQUIRED, never empty)\n' +
        '- "keysecondary": array of 0-3 secondary keywords\n' +
        '- "content": detailed lore text (use [ ] for structured data)\n' +
        '- "category": one of: ' + ENTRY_CATEGORIES.join(', ') + '\n' +
        '- "constant": boolean (false for almost all)\n' +
        '- "order": number (50-950)\n' +
        '- "position": number (0 for lore, 1 for RP prompts, 4 for constant rules)\n\n' +
        'Write in the SAME LANGUAGE as the world parameters.\n' +
        'Respond ONLY valid JSON:\n' +
        '{"entries":[{"comment":"Name","key":["kw1","kw2","kw3"],"keysecondary":[],"content":"...","category":"...","constant":false,"order":100,"position":0}]}\nONLY JSON!]',

    reconstructWorld:
        '[OOC: You are a world-building analyst. Below is a set of existing LoreBook entries. ' +
        'Read them carefully and INFER the high-level world description fields from them. ' +
        'Do NOT invent facts that contradict the entries — summarize and synthesize what is actually there.\n\n' +
        'EXISTING ENTRIES:\n{{ENTRIES_SUMMARY}}\n\n' +
        'Produce a JSON object describing the overall world. Fields:\n' +
        '- "worldName": a fitting name for this world/setting (short)\n' +
        '- "worldDescription": 2-4 sentence overview of the setting\n' +
        '- "worldType": EXACTLY one of: realistic, fantasy, scifi, horror, postapoc, urban_fantasy, steampunk, mythological, custom\n' +
        '- "era": EXACTLY one of: prehistoric, ancient, medieval, renaissance, early_modern, industrial, modern, near_future, far_future, timeless, custom\n' +
        '- "tone": the atmosphere/mood of the setting (short phrase)\n' +
        '- "themes": key recurring themes (comma-separated)\n' +
        '- "mainConflict": the central tension or conflict of the world\n' +
        '- "geography": notable places / the physical setting (summary)\n' +
        '- "factions": the major factions or power groups (summary)\n' +
        '- "magicSystem": how magic/special powers work (or "None" if not applicable)\n' +
        '- "techLevel": the level/kind of technology present\n' +
        '- "history": key historical background drawn from the entries\n' +
        '- "coreRules": the fundamental rules/laws that govern this world\n\n' +
        'Write in the SAME LANGUAGE as the entries. Leave a field as an empty string only if the entries truly say nothing about it.\n' +
        'Respond ONLY with valid JSON. ONLY JSON!]',

    autoCategorize:
        '[OOC: You are a LoreBook / World Info librarian. Below is a numbered list of entries, each with its current category, ' +
        'its title and a snippet of its content. Many categories are inconsistent, duplicated, mislabeled, or in the wrong language. ' +
        'Your job is to assign the SINGLE best category to EACH entry.\n' +
        'CRITICAL: IGNORE any user persona or chat characters. Judge ONLY by the entry title and content shown.\n\n' +
        'ALLOWED CATEGORIES (use these EXACT English strings, choose the best fit):\n' +
        '- ' + ENTRY_CATEGORIES.join('\n- ') + '\n\n' +
        'GUIDELINES:\n' +
        '- "Core Rule": fundamental laws/mechanics that govern the world.\n' +
        '- "Core Concept": central setting-defining ideas or systems.\n' +
        '- "Character": a specific named person/being.\n' +
        '- "Faction" / "Organization": groups; use Faction for political/military powers, Organization for institutions/guilds/companies.\n' +
        '- "Location": a place, region, building, realm.\n' +
        '- "Item / Artifact": objects, weapons, relics.\n' +
        '- "Event / History": events, eras, historical background.\n' +
        '- "Magic / Technology": how powers or tech work.\n' +
        '- "Creature / Species": non-character beings, races, monsters.\n' +
        '- "Culture / Custom": traditions, customs, social practices.\n' +
        '- "Lore / Legend": myths, legends, stories, prophecies.\n' +
        '- "RP Prompt": instructions / scene-setting prompts for roleplay.\n' +
        '- "Supplementary": anything that fits none of the above.\n\n' +
        'ENTRIES:\n{{ENTRIES_LIST}}\n\n' +
        'For EVERY entry index above, return its chosen category. Keep the index exactly as given.\n' +
        'Respond ONLY with valid JSON in this exact shape:\n' +
        '{"assignments":[{"index":0,"category":"Character"},{"index":1,"category":"Location"}]}\nONLY JSON!]',

    enhanceEntry:
        '[OOC: You are a creative world-building assistant. Your task is to deeply ENHANCE and EXPAND the following LoreBook entry.\n\n' +
        'WORLD CONTEXT:\n{{WORLD_PARAMS}}\n' +
        '{{PARENTS_BLOCK}}\n' +
        'CURRENT ENTRY:\n{{CURRENT_ENTRY}}\n\n' +
        'TASK:\n' +
        '1. Significantly expand the "content" field. Make it much longer, deeply detailed, artistic, and rich in world-building lore. Add history, sensory details, and depth based on the context.\n' +
        '2. Generate a comprehensive set of trigger keywords for "key" (primary) and "keysecondary" (secondary/selective). Add more relevant keywords based on the newly expanded text.\n' +
        '3. Focus on "showing" rather than "telling". Make the lore fascinating without contradicting existing facts.\n\n' +
        'Respond ONLY with valid JSON in this format:\n' +
        '{"comment":"Title","key":["kw1","kw2"],"keysecondary":["kw3"],"content":"...expanded text..."}\n' +
        'Write in the same language as the context. ONLY JSON!]',

    expandSpecificCategory:
        '[OOC: Generate {{COUNT}} NEW lorebook entries specifically for the category: "{{TARGET_CATEGORY}}".\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Create entirely NEW and ORIGINAL entries.\n\n' +
        'WORLD CONTEXT:\n{{WORLD_PARAMS}}\n\n' +
        'EXISTING ENTRIES (Do not duplicate these):\n{{EXISTING_SUMMARY}}\n\n' +
        'TASK: Create {{COUNT}} completely NEW entries for the "{{TARGET_CATEGORY}}" category.\n\n' +
        'REQUIREMENTS for each entry:\n' +
        '- "comment": The ACTUAL NAME of the new entity/concept (e.g., "The Crimson Hand" or "Neo-Tokyo"). Do NOT use the word "Title".\n' +
        '- "key": An array of 3 to 6 specific trigger keywords related to the entry.\n' +
        '- "content": Detailed and creative lore text.\n' +
        '- "category": EXACTLY "{{TARGET_CATEGORY}}".\n\n' +
        'Respond ONLY with valid JSON in this format:\n' +
        '{"entries":[{"comment":"Actual Name of Entity","key":["keyword1","keyword2","keyword3"],"keysecondary":[],"content":"...","category":"{{TARGET_CATEGORY}}","constant":false,"order":100,"position":0}]}\n' +
        'ONLY JSON!]',

    lorebookFromLore:
        '[OOC: You are an expert LoreBook / World Info author. You are given SOURCE ENTRIES taken from the lorebook "{{SOURCE_WORLD}}". They are canon.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Work ONLY from the source entries and the task below.\n\n' +
        'SOURCE ENTRIES (canon — never contradict):\n{{SOURCE_ENTRIES}}\n\n' +
        'TASK: {{MODE_TASK}}\n' +
        '{{FOCUS_BLOCK}}' +
        'Generate approximately {{TARGET_COUNT}} entries. The result must be a SELF-CONTAINED lorebook: fully usable on its own, without the source book present. Restate whatever source facts the new entries depend on instead of referring to them.\n\n' +
        'Each output entry MUST have these exact JSON keys:\n' +
        '- "comment": string (the entity/concept name, optionally "Name — Category")\n' +
        '- "key": array of 3-6 trigger keywords (REQUIRED, never empty)\n' +
        '- "keysecondary": array of 0-3 secondary keywords\n' +
        '- "content": string (detailed lore text, use [ ] for structured data)\n' +
        '- "category": one of: ' + ENTRY_CATEGORIES.join(', ') + '\n' +
        '- "constant": boolean (false for almost all)\n' +
        '- "order": number (50-950, higher = more important)\n' +
        '- "position": number (0 for lore, 1 for RP prompts, 4 for constant rules)\n\n' +
        'Also propose an overall "worldName" and short "worldDescription" for the new lorebook.\n' +
        'Write in the SAME LANGUAGE as the source entries.\n' +
        'Respond ONLY with valid JSON:\n' +
        '{"worldName":"...","worldDescription":"...","entries":[{"comment":"Name","key":["kw1","kw2","kw3"],"keysecondary":[],"content":"...","category":"...","constant":false,"order":100,"position":0}]}\n' +
        'ONLY JSON!]',

    mergeLorebooks:
        '[OOC: You are an expert LoreBook / World Info editor. You are given {{BOOK_COUNT}} separate lorebooks that cover related topics. ' +
        'Your job is to INTELLIGENTLY MERGE them into a SINGLE, coherent, harmonized lorebook.\n' +
        'CRITICAL: IGNORE any existing user persona, user descriptions, or chat characters. Work ONLY from the lorebooks below.\n\n' +
        'SOURCE LOREBOOKS:\n{{SOURCE_BOOKS}}\n\n' +
        'MERGING RULES:\n' +
        '1. DEDUPLICATE: If two entries describe the same entity/concept/place/faction, combine them into ONE richer entry. Keep all unique facts from both, drop pure repetition.\n' +
        '2. RESOLVE CONFLICTS: If sources contradict each other, reconcile them into the most coherent single version (prefer the more detailed/specific one, or harmonize both).\n' +
        '3. HARMONIZE: Unify naming, tone, terminology and style so the result reads as one consistent world, not stitched fragments.\n' +
        '4. PRESERVE: Do NOT lose unique entries that appear in only one book — carry them over.\n' +
        '5. ENRICH: Where merging two entries, improve and slightly expand the combined content so the union is more useful than either original.\n' +
        '6. MERGE KEYWORDS: For combined entries, merge the trigger keywords (union, de-duplicated).\n' +
        '7. Keep a sensible total — combine aggressively where it makes sense, but never collapse distinct entities together.\n\n' +
        'Each output entry MUST have these exact JSON keys:\n' +
        '- "comment": string (the entity/concept name, optionally "Name — Category")\n' +
        '- "key": array of 3-6 trigger keywords (REQUIRED, never empty)\n' +
        '- "keysecondary": array of 0-3 secondary keywords\n' +
        '- "content": string (detailed merged lore text, use [ ] for structured data)\n' +
        '- "category": one of: ' + ENTRY_CATEGORIES.join(', ') + '\n' +
        '- "constant": boolean (false for almost all)\n' +
        '- "order": number (50-950, higher = more important)\n' +
        '- "position": number (0 for lore, 1 for RP prompts, 4 for constant rules)\n\n' +
        'Also propose an overall "worldName" and short "worldDescription" for the merged result.\n' +
        'Write in the SAME LANGUAGE as the source lorebooks.\n' +
        'Respond ONLY with valid JSON:\n' +
        '{"worldName":"...","worldDescription":"...","entries":[{"comment":"Name","key":["kw1","kw2","kw3"],"keysecondary":[],"content":"...","category":"...","constant":false,"order":100,"position":0}]}\n' +
        'ONLY JSON!]',

    mergeAnalyze:
        '[OOC: You are a LoreBook / World Info analyst. Two lorebooks, A and B, are about to be merged. ' +
        'Below are compact digests of both (index | category | title | keys | opening text).\n' +
        'CRITICAL: IGNORE any user persona or chat characters. Work ONLY on the data below.\n\n' +
        'LOREBOOK A: "{{NAME_A}}"\n{{DIGEST_A}}\n\n' +
        'LOREBOOK B: "{{NAME_B}}"\n{{DIGEST_B}}\n\n' +
        'PAIRS ALREADY MATCHED MECHANICALLY (by key/title overlap):\n{{KNOWN_PAIRS}}\n\n' +
        'TASK:\n' +
        '1. Find SEMANTIC duplicate pairs the mechanical matching missed: entries in A and B that describe the SAME entity, place, faction or concept under different names, spellings or languages.\n' +
        '2. For every pair (including the known ones), classify the relation:\n' +
        '   - "duplicate": same entity, the two versions largely agree — safe to merge into one entry\n' +
        '   - "conflict": same entity but the books CONTRADICT each other on facts — needs a careful merge\n' +
        '   - "related": connected but genuinely DISTINCT entities — both should be kept separately\n' +
        '3. Give a ONE-LINE reason per pair naming the concrete overlap or contradiction.\n' +
        '4. Add up to 5 short overall NOTES about merging these two books (tone mismatch, naming conventions, category overlap, etc.).\n\n' +
        'Indices refer to the digests above.\n' +
        '{{LANG_LINE}}' +
        'Respond ONLY with valid JSON:\n' +
        '{"pairs":[{"a":0,"b":3,"relation":"duplicate","reason":"..."}],"notes":["..."]}\n' +
        'ONLY JSON!]',

    mergePair:
        '[OOC: You are an expert LoreBook / World Info editor. Below are {{PAIR_COUNT}} PAIRS of entries. ' +
        'In each pair, VERSION A and VERSION B describe the same entity/concept but come from two different lorebooks being merged.\n' +
        'CRITICAL: IGNORE any user persona or chat characters. Work ONLY on the entries below.\n\n' +
        '{{PAIRS_BLOCK}}\n\n' +
        'For EACH pair produce ONE merged entry:\n' +
        '- Keep ALL unique facts from both versions; drop pure repetition.\n' +
        '- If the versions contradict each other, reconcile them into the most coherent single version (prefer the more detailed/specific fact).\n' +
        '- Merge the trigger keywords: union, de-duplicated, max 8 primary keys.\n' +
        '- The merged "content" must read as ONE coherent text, not two glued halves.\n' +
        '- Never drop a named character, place or rule that appears in either version.\n' +
        '{{LANG_LINE}}' +
        'Respond ONLY with valid JSON, one object per pair, using the pair numbers above:\n' +
        '{"merged":[{"pair":0,"comment":"...","key":["kw1","kw2"],"keysecondary":[],"content":"...","category":"..."}]}\n' +
        'Include EVERY pair. ONLY JSON!]'
};

/* ══════════════════════════════════════
   DEFAULTS
   ══════════════════════════════════════ */

var LBC_DEFAULTS = {
    enabled: true,
    showMenuItem: false,
    showButton: true,
    panelPosition: 'right'
};

/* ══════════════════════════════════════
   BOOTSTRAP
   ══════════════════════════════════════ */

jQuery(function () { initLBC(); });

async function initLBC() {
    try {
        await loadModules();
        await initTranslation();
        loadSettings();
        buildPanel();
        buildSettingsPanel();
        buildChatButton();
        buildMenuItem();
        exposeLBCApi();
        L('Ready! quiet:', !!genQuiet, 'translate:', !!translateFn);
    } catch (e) { E('Init:', e); }
}

async function loadModules() {
    try {
        lbcCtx = SillyTavern.getContext();
        extSettings = lbcCtx.extensionSettings;
        saveFn = lbcCtx.saveSettingsDebounced;
        genQuiet = lbcCtx.generateQuietPrompt;
    } catch (e) { E('getContext:', e.message); }
}

function loadSettings() {
    if (extSettings) {
        if (!extSettings[LBC_MODULE]) extSettings[LBC_MODULE] = {};
        var k = Object.keys(LBC_DEFAULTS);
        for (var i = 0; i < k.length; i++) {
            if (extSettings[LBC_MODULE][k[i]] === undefined) extSettings[LBC_MODULE][k[i]] = LBC_DEFAULTS[k[i]];
        }
        lbcSettings = extSettings[LBC_MODULE];
    } else {
        lbcSettings = Object.assign({}, LBC_DEFAULTS);
    }
}

function saveSett() { if (saveFn) saveFn(); }

/* ══════════════════════════════════════
   TRANSLATION SYSTEM
   ══════════════════════════════════════ */

async function initTranslation() {
    /* Try importing the translate extension directly */
    try {
        var t = await import('../../translate/index.js');
        if (typeof t.translate === 'function') { translateFn = t.translate; L('Translate OK (module)'); return; }
    } catch (e) {}

    /* Fallback: probe API endpoints */
    var h = await getHeaders();
    var b = JSON.stringify({ text: 'test', lang: 'en' });
    var eps = ['/api/translate', '/api/translate/', '/api/translate/translate',
        '/api/plugins/translate', '/api/plugins/translate/', '/api/plugins/translate/translate'];
    for (var i = 0; i < eps.length; i++) {
        try {
            var r = await fetch(eps[i], { method: 'POST', headers: h, body: b });
            if (r.ok) {
                var u = eps[i];
                translateFn = function (t2, l) {
                    return getHeaders().then(function (h2) {
                        return fetch(u, { method: 'POST', headers: h2, body: JSON.stringify({ text: t2, lang: l }) });
                    }).then(function (r2) {
                        if (!r2.ok) throw new Error('HTTP ' + r2.status);
                        return r2.text();
                    }).then(function (txt) {
                        try { var j = JSON.parse(txt); return typeof j === 'string' ? j : (j.text || txt); }
                        catch (e) { return txt; }
                    });
                };
                L('Translate API:', u); return;
            }
        } catch (e) {}
    }
    L('No translation available');
}

function getLang() {
    return (extSettings && extSettings.translate && extSettings.translate.target_language) || 'en';
}

async function tr(t) {
    if (!translateFn || !t || !t.trim()) return t;
    try { return await translateFn(t, getLang()); }
    catch (e) { L('tr error:', e.message); return t; }
}

/* Translate all UI labels */
async function translateUI() {
    if (!translateFn) throw new Error(T('translateNA'));
    if (lbcData._translated) return;
    lbcData._trL = {};
    var keys = Object.keys(UI);
    /* Batch: translate in chunks to avoid hammering the API */
    var batchSize = 10;
    for (var b = 0; b < keys.length; b += batchSize) {
        var chunk = keys.slice(b, b + batchSize);
        var promises = chunk.map(function (k) {
            return tr(UI[k]).then(function (val) { return { k: k, v: val }; });
        });
        var results = await Promise.all(promises);
        for (var r = 0; r < results.length; r++) {
            lbcData._trL[results[r].k] = results[r].v;
        }
    }
    lbcData._translated = true;
}

function untranslateUI() {
    lbcData._translated = false;
    lbcData._trL = {};
}

/* Translate generated content (entries, fields) */
async function translateGeneratedContent(text) {
    if (!lbcData._translated || !translateFn) return text;
    if (!text || !text.trim()) return text;
    try { return await tr(text); }
    catch (e) { return text; }
}

/* Translate all entries content */
async function translateAllEntries() {
    if (!lbcData._translated || !translateFn) return;
    showStatus(T('transContent'), 'info');
    for (var i = 0; i < lbcData.entries.length; i++) {
        var e = lbcData.entries[i];
        if (e._origContent === undefined) e._origContent = e.content;
        if (e._origComment === undefined) e._origComment = e.comment;
        e.content = await tr(e._origContent);
        e.comment = await tr(e._origComment);
    }
    /* Also translate world fields display */
    if (lbcData.worldName && !lbcData._origWorldName) {
        lbcData._origWorldName = lbcData.worldName;
        lbcData._origWorldDesc = lbcData.worldDescription;
    }
}

/* Restore original content */
function untranslateAllEntries() {
    for (var i = 0; i < lbcData.entries.length; i++) {
        var e = lbcData.entries[i];
        if (e._origContent !== undefined) { e.content = e._origContent; delete e._origContent; }
        if (e._origComment !== undefined) { e.comment = e._origComment; delete e._origComment; }
    }
    if (lbcData._origWorldName) {
        lbcData.worldName = lbcData._origWorldName;
        delete lbcData._origWorldName;
    }
    if (lbcData._origWorldDesc) {
        lbcData.worldDescription = lbcData._origWorldDesc;
        delete lbcData._origWorldDesc;
    }
}

/* ══════════════════════════════════════
   HELPERS
   ══════════════════════════════════════ */

function parseJSON(t) {
    try { return JSON.parse(t); } catch (e) {}
    var m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch (e) {}
    var m2 = t.match(/\[[\s\S]*\]/);
    if (m2) try { return { entries: JSON.parse(m2[0]) }; } catch (e) {}
    return null;
}

async function getHeaders() {
    if (lbcCtx && typeof lbcCtx.getRequestHeaders === 'function')
        try { return lbcCtx.getRequestHeaders(); } catch (e) {}
    var h = { 'Content-Type': 'application/json' };
    try { var r = await fetch('/csrf-token'); if (r.ok) { var d = await r.json(); if (d.token) h['X-CSRF-Token'] = d.token; } } catch (e) {}
    return h;
}

function isLocked(key) { return !!(lbcData.locked && lbcData.locked[key]); }
function toggleLock(key) {
    if (!lbcData.locked) lbcData.locked = {};
    lbcData.locked[key] = !lbcData.locked[key];
}

/* ══════════════════════════════════════
   TEMPLATE LOADING
   ══════════════════════════════════════ */

function loadTemplateFromJSON(jsonData) {
    lbcData.templateData = jsonData;
    var entries = jsonData.entries || {};
    var count = 0; var categories = {}; var sampleEntries = [];
    for (var uid in entries) {
        if (!entries.hasOwnProperty(uid)) continue;
        var e = entries[uid]; count++;
        var comment = e.comment || '';
        var catMatch = comment.match(/—\s*(.+)/);
        var cat = catMatch ? catMatch[1].trim() : 'Unknown';
        categories[cat] = (categories[cat] || 0) + 1;
        if (sampleEntries.length < 5) sampleEntries.push(e);
    }
    lbcData.templateName = jsonData._name || jsonData.name || 'Loaded Template';
    L('Template loaded:', count, 'entries');
    return { count: count, categories: categories, samples: sampleEntries };
}

/* Import an existing SillyTavern World Info / LoreBook for EDITING.
   Unlike loadTemplateFromJSON (which only keeps it as a style sample), this
   parses the file into real, editable lbcData.entries. The ST World Info
   format stores entries as an object keyed by uid: { entries: { "0": {...} } }.
   Returns the array of normalized entries (does not mutate lbcData itself). */
function parseLorebookEntries(jsonData) {
    var src = (jsonData && jsonData.entries) ? jsonData.entries : null;
    if (!src) return [];
    var rawList = Array.isArray(src) ? src : Object.keys(src).map(function (k) { return src[k]; });
    var out = [];
    for (var i = 0; i < rawList.length; i++) {
        var e = rawList[i];
        if (!e || (typeof e !== 'object')) continue;

        // Derive category: explicit field first, otherwise from "Name — Category"
        // suffix in the comment (the convention this tool exports with).
        var cat = e.category || '';
        if (!cat) {
            var comment = e.comment || '';
            var m = comment.match(/—\s*(.+)$/);
            if (m) cat = m[1].trim();
        }

        var entry = normalizeEntry({
            comment: e.comment || e.addMemo || 'Untitled Entry',
            key: e.key,
            keysecondary: e.keysecondary,
            content: e.content || '',
            category: cat || 'Supplementary',
            constant: e.constant,
            selective: e.selective,
            order: (e.order !== undefined ? e.order : e.insertion_order),
            position: e.position,
            depth: e.depth,
            probability: e.probability,

            /* Targeting fields — read them back so a round-trip is lossless. */
            disable: e.disable,
            selectiveLogic: e.selectiveLogic,
            group: e.group,
            groupWeight: e.groupWeight,
            useGroupScoring: e.useGroupScoring,
            preventRecursion: e.preventRecursion,
            excludeRecursion: e.excludeRecursion,
            matchWholeWords: e.matchWholeWords,
            sticky: e.sticky,
            cooldown: e.cooldown
        });
        out.push(entry);
    }
    return out;
}

function getTemplateBlock() {
    if (!lbcData.templateData) return '';
    var entries = lbcData.templateData.entries || {};
    var samples = []; var i = 0;
    for (var uid in entries) {
        if (!entries.hasOwnProperty(uid)) continue;
        if (i >= 3) break;
        var e = entries[uid];
        samples.push('Entry example ' + (i + 1) + ':\n  comment: "' + (e.comment || '') +
            '"\n  key: ' + JSON.stringify(e.key || []) +
            '\n  content (truncated): "' + (e.content || '').substring(0, 500) +
            '"\n  constant: ' + !!e.constant + ', order: ' + (e.order || 100) + ', position: ' + (e.position || 0));
        i++;
    }
    return '\nSTYLE TEMPLATE — Match this writing style:\n--- TEMPLATE ---\n' + samples.join('\n\n') + '\n--- END ---\n\n';
}

/* ══════════════════════════════════════
   CONTEXT HELPERS
   ══════════════════════════════════════ */

function gatherWorldParams() {
    var parts = [];
    if (lbcData.worldName) parts.push('World Name: ' + lbcData.worldName);
    if (lbcData.worldDescription) parts.push('Description: ' + lbcData.worldDescription);
    var eraText = '';
    if (lbcData.era === 'custom') eraText = lbcData.eraCustom || 'Custom era';
    else if (lbcData.era) {
        var ep = ERA_PRESETS.find(function (p) { return p.id === lbcData.era; });
        eraText = ep ? (ep.label + ' (' + ep.range + ')') : lbcData.era;
    }
    if (eraText) parts.push('Era: ' + eraText);
    if (lbcData.worldType) {
        var wt = WORLD_TYPES.find(function (t) { return t.id === lbcData.worldType; });
        parts.push('Type: ' + (wt ? wt.label : lbcData.worldType));
    }
    var sc = SCALE_LABELS[lbcData.worldScale] || SCALE_LABELS[3];
    parts.push('Scale: ' + sc.label + ' (' + sc.desc + ')');
    if (lbcData.tone) parts.push('Tone: ' + lbcData.tone);
    if (lbcData.themes) parts.push('Themes: ' + lbcData.themes);
    if (lbcData.mainConflict) parts.push('Main Conflict: ' + lbcData.mainConflict);
    if (lbcData.geography) parts.push('Geography: ' + lbcData.geography);
    if (lbcData.factions) parts.push('Factions: ' + lbcData.factions);
    if (lbcData.magicSystem) parts.push('Magic System: ' + lbcData.magicSystem);
    if (lbcData.techLevel) parts.push('Technology Level: ' + lbcData.techLevel);
    if (lbcData.history) parts.push('History: ' + lbcData.history);
    if (lbcData.coreRules) parts.push('Core Rules: ' + lbcData.coreRules);
    return parts.join('\n') || '(No details — be creative)';
}

function gatherContext() {
    var parts = [];
    if (lbcData.simpleIdea) parts.push('Idea: ' + lbcData.simpleIdea);
    parts.push(gatherWorldParams());
    return parts.join('\n');
}

function getLockedBlock() {
    var locked = [];
    if (!lbcData.locked) return '';
    var keys = Object.keys(lbcData.locked);
    for (var i = 0; i < keys.length; i++) {
        if (lbcData.locked[keys[i]] && lbcData[keys[i]]) locked.push(keys[i] + ': ' + lbcData[keys[i]]);
    }
    return locked.length ? '\nLOCKED (keep exact):\n' + locked.join('\n') + '\n\n' : '';
}

function getExistingEntriesBlock() {
    if (!lbcData.entries.length) return '';
    var summary = lbcData.entries.map(function (e, i) {
        return (i + 1) + '. [' + (e.category || '?') + '] ' + (e._origComment || e.comment || 'Untitled') +
            ' (keys: ' + (e.key || []).join(', ') + ')';
    }).join('\n');
    return '\nEXISTING (do NOT duplicate):\n' + summary + '\n\n';
}

function getExistingEntriesSummary() {
    return lbcData.entries.map(function (e) {
        var c = e._origContent || e.content || '';
        return '[' + (e.category || '?') + '] ' + (e._origComment || e.comment || 'Untitled') + ': ' + c.substring(0, 150);
    }).join('\n');
}

function getTargetEntryCount() {
    var sc = SCALE_LABELS[lbcData.worldScale] || SCALE_LABELS[3];
    var range = sc.entries.split('–');
    var min = parseInt(range[0]) || 15;
    var max = parseInt(range[1]) || 30;
    return Math.floor((min + max) / 2);
}

function getUserRoleText() {
    var r = USER_ROLES.find(function (u) { return u.id === lbcData.userRole; });
    return r ? (r.label + ' — ' + r.desc) : 'Participant';
}

/* ══════════════════════════════════════
   LLM + TRANSLATION WRAPPER
   ══════════════════════════════════════ */

/* If translation is active, translate generated text automatically */
async function translateEntryIfNeeded(entry) {
    if (!lbcData._translated || !translateFn) return entry;
    entry._origContent = entry.content;
    entry._origComment = entry.comment;
    entry.content = await tr(entry.content);
    entry.comment = await tr(entry.comment);
    return entry;
}

async function translateEntriesIfNeeded(entries) {
    if (!lbcData._translated || !translateFn) return entries;
    for (var i = 0; i < entries.length; i++) {
        await translateEntryIfNeeded(entries[i]);
    }
    return entries;
}

async function translateFieldIfNeeded(value) {
    if (!lbcData._translated || !translateFn) return value;
    return await tr(value);
}

/* ══════════════════════════════════════
   LLM GENERATION FUNCTIONS
   ══════════════════════════════════════ */

async function doSimpleGenerate() {
    if (!genQuiet) throw new Error(T('noLLM'));
    var idea = lbcData.simpleIdea.trim();
    if (!idea) throw new Error(T('ideaEmpty'));

    var prompt = PROMPTS.simpleGenerate
        .replace('{{IDEA}}', idea)
        .replace('{{TEMPLATE_BLOCK}}', getTemplateBlock());

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data) throw new Error('Failed to parse LLM response.');

    if (data.worldName) lbcData.worldName = data.worldName;
    if (data.worldDescription) lbcData.worldDescription = data.worldDescription;
    if (data.entries && Array.isArray(data.entries)) {
        lbcData.entries = normalizeEntries(data.entries);
        await translateEntriesIfNeeded(lbcData.entries);
    }
    /* Translate world name/desc if needed */
    if (lbcData._translated && translateFn) {
        lbcData._origWorldName = lbcData.worldName;
        lbcData._origWorldDesc = lbcData.worldDescription;
        lbcData.worldName = await tr(lbcData.worldName);
        lbcData.worldDescription = await tr(lbcData.worldDescription);
    }
    return data;
}

async function doAdvancedGenerate() {
    if (!genQuiet) throw new Error(T('noLLM'));
    var params = gatherWorldParams();
    if (params === '(No details — be creative)') throw new Error(T('fillParams'));

    var prompt = PROMPTS.advancedGenerate
        .replace('{{WORLD_PARAMS}}', params)
        .replace('{{TEMPLATE_BLOCK}}', getTemplateBlock())
        .replace('{{EXISTING_ENTRIES_BLOCK}}', getExistingEntriesBlock())
        .replace('{{TARGET_COUNT}}', String(getTargetEntryCount()))
        .replace('{{USER_ROLE}}', getUserRoleText())
        .replace('{{USER_ROLE_DESC}}', lbcData.userRoleDescription ? ('Role context: ' + lbcData.userRoleDescription) : '');

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.entries) throw new Error('Failed to parse LLM response.');

    lbcData.entries = normalizeEntries(data.entries);
    await translateEntriesIfNeeded(lbcData.entries);
    return data;
}

/* Reconstruct the Overview/World/Lore fields by analyzing the current entries.
   Useful after importing an existing LoreBook: fills in worldName, type, era,
   tone, factions, history, core rules, etc. Locked fields are never overwritten. */
async function doReconstructWorld() {
    if (!genQuiet) throw new Error(T('noLLM'));
    if (!lbcData.entries.length) throw new Error(T('noEntriesToReconstruct'));

    var prompt = PROMPTS.reconstructWorld.replace('{{ENTRIES_SUMMARY}}', getExistingEntriesSummary());

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data) throw new Error('Failed to parse reconstruction.');

    // Validate select-type fields against known IDs.
    if (data.worldType && !WORLD_TYPES.find(function (t) { return t.id === data.worldType; })) data.worldType = 'custom';
    if (data.era && !ERA_PRESETS.find(function (e) { return e.id === data.era; })) data.era = 'custom';

    // Map of returned keys -> lbcData fields (all live in Overview/World/Lore tabs).
    var fieldMap = {
        worldName: 'worldName', worldDescription: 'worldDescription',
        worldType: 'worldType', era: 'era', tone: 'tone', themes: 'themes',
        mainConflict: 'mainConflict', geography: 'geography', factions: 'factions',
        magicSystem: 'magicSystem', techLevel: 'techLevel', history: 'history',
        coreRules: 'coreRules'
    };

    var applied = 0;
    for (var key in fieldMap) {
        if (!fieldMap.hasOwnProperty(key)) continue;
        var target = fieldMap[key];
        // Never overwrite a locked field.
        if (lbcData.locked && lbcData.locked[target]) continue;
        var val = data[key];
        if (val === undefined || val === null) continue;
        if (typeof val === 'string' && !val.trim()) continue;
        lbcData[target] = (typeof val === 'string') ? val : String(val);
        applied++;
    }

    // Translate the freshly filled text fields if translation is active.
    if (lbcData._translated && translateFn) {
        for (var k in fieldMap) {
            if (!fieldMap.hasOwnProperty(k)) continue;
            var tf = fieldMap[k];
            if (lbcData.locked && lbcData.locked[tf]) continue;
            if (tf === 'worldType' || tf === 'era') continue; // these are IDs, not prose
            if (lbcData[tf]) lbcData[tf] = await tr(lbcData[tf]);
        }
    }

    return { applied: applied };
}

/* Ask the LLM to assign the best category to every existing entry, then map each
   answer onto a canonical built-in (or a kept custom category). Only the category
   field changes — titles, keys and content are left untouched. */
async function doAutoCategorize() {
    if (!genQuiet) throw new Error(T('noLLM'));
    if (!lbcData.entries.length) throw new Error(T('noEntriesToCategorize'));

    // Build a compact, indexed list. Use the original (untranslated) text where
    // available so the model sees the real content.
    var list = lbcData.entries.map(function (e, i) {
        var title = e._origComment || e.comment || 'Untitled';
        var content = (e._origContent || e.content || '').replace(/\s+/g, ' ').trim().substring(0, 220);
        var keys = (e.key || []).slice(0, 6).join(', ');
        return i + '. [current: ' + (e.category || 'Unknown') + '] "' + title + '"' +
            (keys ? ' (keys: ' + keys + ')' : '') +
            ' — ' + content;
    }).join('\n');

    var prompt = PROMPTS.autoCategorize.replace('{{ENTRIES_LIST}}', list);

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data) throw new Error('Failed to parse categorization.');

    // Accept either {"assignments":[...]} or a bare array.
    var assignments = Array.isArray(data) ? data
        : (Array.isArray(data.assignments) ? data.assignments : null);
    if (!assignments) throw new Error('Failed to parse categorization.');

    // Remembered custom categories are valid targets too (compared case-insensitively).
    if (!lbcData.customCategories) lbcData.customCategories = [];
    var customLc = lbcData.customCategories.map(function (c) { return c.toLowerCase(); });

    var changed = 0;
    for (var a = 0; a < assignments.length; a++) {
        var item = assignments[a];
        if (!item || typeof item !== 'object') continue;
        var idx = parseInt(item.index);
        if (isNaN(idx) || idx < 0 || idx >= lbcData.entries.length) continue;
        if (item.category === undefined || item.category === null) continue;

        var proposed = String(item.category).trim();
        if (!proposed) continue;

        // Prefer a canonical built-in; otherwise honor a known custom category;
        // otherwise fall back to the canonicalizer's best guess.
        var finalCat = canonicalizeCategory(proposed);
        var ci = customLc.indexOf(proposed.toLowerCase());
        var isBuiltin = ENTRY_CATEGORIES.some(function (c) { return c.toLowerCase() === finalCat.toLowerCase(); });
        if (!isBuiltin && ci !== -1) finalCat = lbcData.customCategories[ci];

        var entry = lbcData.entries[idx];
        if (entry.category !== finalCat) { entry.category = finalCat; changed++; }
    }

    saveSett();
    return { changed: changed, total: lbcData.entries.length };
}

async function doGenerateField(fieldKey, fieldLabel) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var savedValue = lbcData[fieldKey];
    lbcData[fieldKey] = '';
    var context = gatherContext();
    lbcData[fieldKey] = savedValue;
    var prompt = PROMPTS.generateField
        .replace('{{FIELD_NAME}}', fieldLabel)
        .replace('{{CONTEXT}}', context)
        .replace('{{OPTIONS_HINT}}', '');

    var raw = await lbcGenQuiet(prompt);
    var value = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    value = await translateFieldIfNeeded(value);
    lbcData[fieldKey] = value;
    return value;
}

async function doEnhanceField(fieldKey, fieldLabel) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var context = gatherContext();
    var currentText = lbcData[fieldKey] || '';

    if (!currentText.trim()) {
        var genPrompt = '[OOC: Generate detailed content for the world parameter "{{FIELD_NAME}}".\n\nCONTEXT:\n{{CONTEXT}}\n\nWrite a detailed, artistic entry. Output ONLY the text.]'
            .replace('{{FIELD_NAME}}', fieldLabel)
            .replace('{{CONTEXT}}', context);
        var rawGen = await lbcGenQuiet(genPrompt);
        lbcData[fieldKey] = await translateFieldIfNeeded(rawGen.trim());
    } else {
        var prompt = PROMPTS.enhanceField
            .replace('{{CONTEXT}}', context)
            .replace('{{FIELD_NAME}}', fieldLabel)
            .replace('{{CURRENT_TEXT}}', currentText);
        var raw = await lbcGenQuiet(prompt);
        var cleanRaw = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
        lbcData[fieldKey] = await translateFieldIfNeeded(cleanRaw);
    }
    return lbcData[fieldKey];
}

async function doAddMoreField(fieldKey, fieldLabel) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var context = gatherContext();
    var currentText = lbcData[fieldKey] || '';

    if (!currentText.trim()) {
        return await doEnhanceField(fieldKey, fieldLabel); 
    }

    var prompt = PROMPTS.addMoreField
        .replace('{{CONTEXT}}', context)
        .replace('{{FIELD_NAME}}', fieldLabel)
        .replace('{{CURRENT_TEXT}}', currentText);
    
    var raw = await lbcGenQuiet(prompt);
    var cleanRaw = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    var translatedNew = await translateFieldIfNeeded(cleanRaw);
    
    lbcData[fieldKey] = currentText + '\n\n' + translatedNew;
    return lbcData[fieldKey];
}

async function doGenerateAllFields() {
    if (!genQuiet) throw new Error(T('noLLM'));
    var seedParts = [];
    if (lbcData.simpleIdea) seedParts.push('Idea: ' + lbcData.simpleIdea);
    if (lbcData.worldType) {
        var _wt = WORLD_TYPES.find(function (t) { return t.id === lbcData.worldType; });
        seedParts.push('Type: ' + (_wt ? _wt.label : lbcData.worldType));
    }
    var _eraText = '';
    if (lbcData.era === 'custom') _eraText = lbcData.eraCustom || 'Custom era';
    else if (lbcData.era) {
        var _ep = ERA_PRESETS.find(function (p) { return p.id === lbcData.era; });
        _eraText = _ep ? (_ep.label + ' (' + _ep.range + ')') : lbcData.era;
    }
    if (_eraText) seedParts.push('Era: ' + _eraText);
    var _textFields = ['worldName','worldDescription','tone','themes','mainConflict',
        'geography','factions','magicSystem','techLevel','history','coreRules','userRoleDescription'];
    for (var _li = 0; _li < _textFields.length; _li++) {
        var _lf = _textFields[_li];
        if (isLocked(_lf) && lbcData[_lf]) seedParts.push(_lf + ': ' + lbcData[_lf]);
    }
    if (isLocked('userRole') && lbcData.userRole) seedParts.push('userRole: ' + lbcData.userRole);
    var seedContext = seedParts.join('\n') || '(Generate a creative world)';
    var prompt = PROMPTS.generateAllFields
        .replace('{{CONTEXT}}', seedContext)
        .replace('{{LOCKED_BLOCK}}', getLockedBlock());

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data) throw new Error('Failed to parse LLM response.');

    var fieldMap = {
        worldName: 'worldName', worldDescription: 'worldDescription',
        era: 'era', worldType: 'worldType',
        tone: 'tone', themes: 'themes', mainConflict: 'mainConflict',
        geography: 'geography', factions: 'factions',
        magicSystem: 'magicSystem', techLevel: 'techLevel',
        history: 'history', coreRules: 'coreRules',
        userRole: 'userRole', userRoleDescription: 'userRoleDescription'
    };

    for (var k in fieldMap) {
        if (!fieldMap.hasOwnProperty(k)) continue;
        var fk = fieldMap[k];
        if (isLocked(fk) || !data[k]) continue;
        if (fk === 'worldType') {
            if (!WORLD_TYPES.find(function (t) { return t.id === data[k]; })) data[k] = 'custom';
        }
        if (fk === 'era') {
            if (!ERA_PRESETS.find(function (e) { return e.id === data[k]; })) {
                lbcData.eraCustom = data[k]; data[k] = 'custom';
            }
        }
        if (fk === 'userRole') {
            if (!USER_ROLES.find(function (r) { return r.id === data[k]; })) data[k] = 'participant';
        }
        var val = data[k];
        if (fk !== 'worldType' && fk !== 'era' && fk !== 'userRole') {
            val = await translateFieldIfNeeded(val);
        }
        lbcData[fk] = val;
    }
    return data;
}

async function doGenerateSingleEntry(category, hint) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var orderHint = 100; var posHint = 0;
    if (category === 'Core Rule') { orderHint = 900; posHint = 4; }
    else if (category === 'Core Concept') { orderHint = 250; posHint = 0; }
    else if (category === 'Character') { orderHint = 130; posHint = 1; }
    else if (category === 'RP Prompt') { orderHint = 50; posHint = 1; }
    else if (category === 'Faction') { orderHint = 150; posHint = 0; }

    var prompt = PROMPTS.generateSingleEntry
        .replace('{{WORLD_PARAMS}}', gatherWorldParams())
        .replace(/\{\{ENTRY_TYPE\}\}/g, category)
        .replace('{{SPECIFIC_HINT}}', hint ? ('Request: ' + hint) : '')
        .replace('{{EXISTING_ENTRIES_BLOCK}}', getExistingEntriesBlock())
        .replace('{{ORDER_HINT}}', String(orderHint))
        .replace('{{POSITION_HINT}}', String(posHint));

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.content) throw new Error('Failed to parse entry.');
    var entry = normalizeEntry(data);
    await translateEntryIfNeeded(entry);
    lbcData.entries.push(entry);
    return entry;
}

/* ── v1.9: blank entry — no LLM, straight into the editor ── */
function addBlankEntry(category) {
    var entry = normalizeEntry({
        comment: '',
        key: [],
        keysecondary: [],
        content: '',
        category: category || 'Concept',
        constant: false,
        order: 100,
        position: 0,
    });
    lbcData.entries.push(entry);
    lbcData.editingEntryIdx = lbcData.entries.length - 1;
    lbcData._edParents = [];
    renderBody();
}

/* ── v1.9: generate FROM parent entries ──
   Parents give the model a precise slice of canon to grow from, instead of the
   whole book and a prayer. Selection is per editing session (indices are
   session-stable; a reorder would only happen outside the editor). */

function edParentIdxs() {
    return (lbcData._edParents || []).filter(function (i) {
        return i >= 0 && i < lbcData.entries.length && i !== lbcData.editingEntryIdx;
    });
}

function buildParentsBlock(idxs) {
    return idxs.map(function (i, n) {
        var p = lbcData.entries[i];
        var content = p._origContent || p.content || '';
        if (content.length > 1400) content = content.slice(0, 1400) + '…';
        return 'PARENT ' + (n + 1) + ': ' + (p._origComment || p.comment || 'Untitled')
            + ' [' + (p.category || 'Unknown') + ']'
            + (p.key && p.key.length ? ' (keys: ' + p.key.join(', ') + ')' : '')
            + '\n' + content;
    }).join('\n\n');
}

async function doGenerateFromParents(idx) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var e = lbcData.entries[idx];
    if (!e) throw new Error('Entry not found.');
    var parents = edParentIdxs();
    if (!parents.length) throw new Error('Pick at least one parent entry.');

    /* The user's typed-but-unsaved editor values are the draft. */
    saveEntryEditor();

    var draft = [];
    if (e.comment) draft.push('Title: ' + e.comment);
    if (e.category) draft.push('Category: ' + e.category);
    if (e.key && e.key.length) draft.push('Keys: ' + e.key.join(', '));
    if (e.content && e.content.trim()) draft.push('Notes / partial content to honor:\n' + e.content.trim());

    var prompt = PROMPTS.generateFromParents
        .replace('{{WORLD_PARAMS}}', gatherWorldParams())
        .replace('{{PARENTS_BLOCK}}', buildParentsBlock(parents))
        .replace('{{DRAFT_BLOCK}}', draft.length ? draft.join('\n') : '(nothing yet — invent freely within the parents\' canon)')
        .replace('{{EXISTING_ENTRIES_BLOCK}}', getExistingEntriesBlock());

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.content) throw new Error('Failed to parse entry.');

    var gen = normalizeEntry(data);
    /* The user's structural decisions survive; the LLM fills the substance.
       Category/title only fall back to the generated ones when left empty. */
    e.comment = e.comment || gen.comment;
    e.category = e.category || gen.category;
    e.key = (e.key && e.key.length) ? e.key : gen.key;
    e.keysecondary = (e.keysecondary && e.keysecondary.length) ? e.keysecondary : gen.keysecondary;
    e.content = gen.content;
    delete e._origContent; delete e._origComment;
    await translateEntryIfNeeded(e);
    return e;
}

/* ── v1.10: LLM Edit for a single entry ──
   The CC pattern, scaled to one entry: instruction → the model returns ONLY the
   changed fields → a Before/After review with per-field checkboxes → apply.
   Selected parent entries (if any) ride along as canon, same as Enhance. */

var LBC_EDIT_KEYS = ['comment', 'key', 'keysecondary', 'content', 'category', 'constant', 'selective', 'order', 'position', 'depth'];

async function doLLMEditEntry(idx, instruction) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var e = lbcData.entries[idx];
    if (!e) throw new Error('Entry not found.');

    var cur = {
        comment: e._origComment || e.comment || '',
        key: e.key || [],
        keysecondary: e.keysecondary || [],
        content: e._origContent || e.content || '',
        category: e.category || '',
        constant: !!e.constant,
        selective: !!e.selective,
        order: e.order || 100,
        position: e.position || 0,
        depth: e.depth || 4,
    };

    var parents = (lbcData.editingEntryIdx === idx) ? edParentIdxs() : [];
    var parentsBlock = parents.length
        ? '\nPARENT ENTRIES (canon — stay consistent, never contradict):\n' + buildParentsBlock(parents) + '\n'
        : '';

    var prompt =
        '[OOC: You are a lorebook entry editing assistant. Below is ONE entry as JSON, followed by the user\'s edit instruction.\n\n' +
        'WORLD:\n' + gatherWorldParams() + '\n' +
        parentsBlock +
        '\nCURRENT ENTRY:\n' + JSON.stringify(cur, null, 1) + '\n\n' +
        'EDIT INSTRUCTION:\n"' + instruction + '"\n\n' +
        'Apply ONLY what the instruction asks for. Rules:\n' +
        '1. Respond with ONLY a JSON object containing the fields you changed, with their COMPLETE new values.\n' +
        '2. Use exactly the same keys as in CURRENT ENTRY. Do NOT include unchanged fields.\n' +
        '3. "key" and "keysecondary" are arrays of strings — return the FULL updated array if changed.\n' +
        '4. "constant" and "selective" are booleans; "order", "position", "depth" are numbers.\n' +
        '5. Preserve the original language, tone and formatting. Preserve {{user}} and {{char}} macros as-is.\n' +
        '6. In "content", keep everything the instruction does not touch — change only what is asked.\n' +
        'If the instruction changes nothing, respond with {}.\n' +
        'ONLY valid JSON, no commentary!]';

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data) throw new Error('Failed to parse LLM response.');

    /* Sanitize: allowed keys only, typed, no-ops dropped. */
    var changes = {};
    for (var k in data) {
        if (!data.hasOwnProperty(k) || LBC_EDIT_KEYS.indexOf(k) === -1) continue;
        var val = data[k];
        if (k === 'key' || k === 'keysecondary') {
            if (!Array.isArray(val)) continue;
            val = val.map(function (s) { return String(s).trim(); }).filter(Boolean);
            if (JSON.stringify(val) === JSON.stringify(cur[k])) continue;
        } else if (k === 'constant' || k === 'selective') {
            val = !!val;
            if (val === cur[k]) continue;
        } else if (k === 'order' || k === 'position' || k === 'depth') {
            val = parseInt(val);
            if (isNaN(val) || val === cur[k]) continue;
        } else {
            if (val === null || val === undefined) continue;
            val = String(val);
            if (val === cur[k]) continue;
        }
        changes[k] = val;
    }
    return changes;
}

function lbcEditPreview(v) {
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
}

function lbcShowLLMEditModal(idx) {
    $('#lbc-le-modal, #lbc-le-overlay').remove();
    var h = '<div id="lbc-le-overlay"></div>'
        + '<div id="lbc-le-modal">'
        + '  <div class="lbc-le-head"><span>✒️ ' + esc(T('llmEdit')) + ' — #' + (idx + 1) + '</span><span class="lbc-le-x" id="lbc-le-close">×</span></div>'
        + '  <div class="lbc-le-body" id="lbc-le-body">'
        + '    <div class="lbc-le-hint">' + esc(T('llmEditHint')) + '</div>'
        + '    <textarea class="lbc-textarea" id="lbc-le-instr" rows="4" placeholder="' + esc(T('llmEditPlaceholder')) + '"></textarea>'
        + '  </div>'
        + '  <div class="lbc-le-foot">'
        + '    <button class="menu_button" id="lbc-le-back" style="display:none"><i class="fa-solid fa-arrow-left"></i> ' + esc(T('llmEditBack')) + '</button>'
        + '    <span style="flex:1"></span>'
        + '    <button class="menu_button lbc-btn-primary" id="lbc-le-run"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('llmEditRun')) + '</button>'
        + '    <button class="menu_button lbc-btn-success" id="lbc-le-apply" style="display:none"><i class="fa-solid fa-check"></i> ' + esc(T('llmEditApply')) + '</button>'
        + '  </div>'
        + '</div>';
    $('body').append(h);

    var pending = null;

    function showReview(changes) {
        pending = changes;
        var e = lbcData.entries[idx];
        var bh = '<div class="lbc-le-hint">' + esc(T('llmEditPreviewHint')) + '</div>';
        for (var k in changes) {
            if (!changes.hasOwnProperty(k)) continue;
            var oldV = (k === 'content' && e._origContent) ? e._origContent
                : (k === 'comment' && e._origComment) ? e._origComment
                : e[k];
            bh += '<div class="lbc-le-diff">'
                + '<label class="lbc-le-diff-head"><input type="checkbox" class="lbc-le-cb" data-k="' + esc(k) + '" checked> <strong>' + esc(k) + '</strong></label>'
                + '<div class="lbc-le-old"><span>' + esc(T('llmEditBefore')) + '</span>' + esc(lbcEditPreview(oldV === undefined ? '' : oldV)) + '</div>'
                + '<div class="lbc-le-new"><span>' + esc(T('llmEditAfter')) + '</span>' + esc(lbcEditPreview(changes[k])) + '</div>'
                + '</div>';
        }
        $('#lbc-le-body').html(bh);
        $('#lbc-le-run').hide(); $('#lbc-le-apply, #lbc-le-back').show();
    }

    $('#lbc-le-close, #lbc-le-overlay').on('click', function () { $('#lbc-le-modal, #lbc-le-overlay').remove(); });

    $('#lbc-le-back').on('click', function () {
        pending = null;
        $('#lbc-le-body').html('<div class="lbc-le-hint">' + esc(T('llmEditHint')) + '</div>'
            + '<textarea class="lbc-textarea" id="lbc-le-instr" rows="4" placeholder="' + esc(T('llmEditPlaceholder')) + '"></textarea>');
        $('#lbc-le-apply, #lbc-le-back').hide(); $('#lbc-le-run').show();
    });

    $('#lbc-le-run').on('click', async function () {
        if (lbcBusy) return;
        var instr = String($('#lbc-le-instr').val() || '').trim();
        if (!instr) { showStatus(T('llmEditInstrEmpty'), 'error'); return; }
        lbcBusy = true;
        var $b = $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('generating')));
        try {
            saveEntryEditor();   /* the on-screen text is the truth */
            var changes = await doLLMEditEntry(idx, instr);
            if (!Object.keys(changes).length) showStatus(T('llmEditNoChanges'), 'info');
            else showReview(changes);
        } catch (e) { showStatus(e.message, 'error'); }
        $b.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('llmEditRun')));
        lbcBusy = false;
    });

    $('#lbc-le-apply').on('click', async function () {
        if (!pending) return;
        var e = lbcData.entries[idx];
        var n = 0;
        $('.lbc-le-cb:checked').each(function () {
            var k = $(this).data('k');
            if (!pending.hasOwnProperty(k)) return;
            e[k] = pending[k];
            if (k === 'content') delete e._origContent;
            if (k === 'comment') delete e._origComment;
            n++;
        });
        if (n && (e._origContent !== undefined || e._origComment !== undefined)) {
            /* mixed translated state after a partial edit — retranslate lazily */
        }
        await translateEntryIfNeeded(e);
        $('#lbc-le-modal, #lbc-le-overlay').remove();
        renderBody();
        showStatus(n + ' ' + T('llmEditDone'), 'success');
    });
}

async function doRegenerateEntry(idx) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var entry = lbcData.entries[idx];
    if (!entry) throw new Error('Entry not found.');
    var origEntry = Object.assign({}, entry);
    if (origEntry._origContent) origEntry.content = origEntry._origContent;
    if (origEntry._origComment) origEntry.comment = origEntry._origComment;

    var prompt = PROMPTS.regenerateEntry
        .replace('{{WORLD_PARAMS}}', gatherWorldParams())
        .replace('{{CURRENT_ENTRY}}', JSON.stringify(origEntry, null, 2));

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.content) throw new Error('Failed to parse regenerated entry.');
    lbcData.entries[idx] = normalizeEntry(data);
    await translateEntryIfNeeded(lbcData.entries[idx]);
    return lbcData.entries[idx];
}

async function doEnhanceEntry(idx) {
    if (!genQuiet) throw new Error(T('noLLM'));
    var entry = lbcData.entries[idx];
    if (!entry) throw new Error('Entry not found.');

    var origEntry = Object.assign({}, entry);
    if (origEntry._origContent) origEntry.content = origEntry._origContent;
    if (origEntry._origComment) origEntry.comment = origEntry._origComment;

    /* v1.9.1: if the editor has parent entries selected, they become canon for
       the enhancement too — Enhance grows the entry INTO its parents' corner of
       the world instead of drifting off on world params alone. */
    var parents = (lbcData.editingEntryIdx === idx) ? edParentIdxs() : [];
    var parentsBlock = parents.length
        ? '\nPARENT ENTRIES (canon — stay consistent with them, connect to them where natural, never contradict):\n'
            + buildParentsBlock(parents) + '\n'
        : '';

    var prompt = PROMPTS.enhanceEntry
        .replace('{{WORLD_PARAMS}}', gatherWorldParams())
        .replace('{{PARENTS_BLOCK}}', parentsBlock)
        .replace('{{CURRENT_ENTRY}}', JSON.stringify({
            comment: origEntry.comment,
            key: origEntry.key,
            keysecondary: origEntry.keysecondary,
            content: origEntry.content
        }, null, 2));

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.content) throw new Error('Failed to parse enhanced entry.');

    entry.content = data.content;
    if (data.comment) entry.comment = data.comment;
    if (data.key && Array.isArray(data.key)) entry.key = data.key;
    if (data.keysecondary && Array.isArray(data.keysecondary)) entry.keysecondary = data.keysecondary;

    delete entry._origContent;
    delete entry._origComment;
    
    await translateEntryIfNeeded(entry);
    return entry;
}

async function doExpandEntries(count) {
    if (!genQuiet) throw new Error(T('noLLM'));
    count = count || 5;
    
    var promptStr;

    if (lbcData.mode === 'advanced' && lbcData.activeTab === 'entries' && lbcData.categoryFilter !== 'all') {
        promptStr = PROMPTS.expandSpecificCategory
            .replace('{{WORLD_PARAMS}}', gatherWorldParams())
            .replace('{{EXISTING_SUMMARY}}', getExistingEntriesSummary())
            .replace(/\{\{COUNT\}\}/g, String(count))
            .replace(/\{\{TARGET_CATEGORY\}\}/g, lbcData.categoryFilter);
    } else {
        promptStr = PROMPTS.expandEntries
            .replace('{{WORLD_PARAMS}}', gatherWorldParams())
            .replace('{{EXISTING_SUMMARY}}', getExistingEntriesSummary())
            .replace('{{COUNT}}', String(count));
    }

    var raw = await lbcGenQuiet(promptStr);
    var data = parseJSON(raw);
    if (!data || !data.entries) throw new Error('Failed to parse expansion.');
    var newEntries = normalizeEntries(data.entries);

    if (lbcData.mode === 'advanced' && lbcData.activeTab === 'entries' && lbcData.categoryFilter !== 'all') {
        newEntries.forEach(function(e) { e.category = lbcData.categoryFilter; });
    }

    await translateEntriesIfNeeded(newEntries);
    lbcData.entries = lbcData.entries.concat(newEntries);
    return newEntries;
}

/* ══════════════════════════════════════
   MERGE LOREBOOKS
   ══════════════════════════════════════ */

/* Build the text block describing every source book for the merge prompt.
   Each book is { name: string, entries: [normalized entries] }.
   Entry content is truncated to keep the prompt within a sane size. */
function buildMergeSourceBlock(books) {
    var CONTENT_CAP = 700; // chars per entry sent to the LLM
    var blocks = [];
    for (var b = 0; b < books.length; b++) {
        var book = books[b];
        var lines = ['### LOREBOOK ' + (b + 1) + ': ' + (book.name || ('Book ' + (b + 1)))];
        for (var i = 0; i < book.entries.length; i++) {
            var e = book.entries[i];
            var content = (e._origContent || e.content || '');
            if (content.length > CONTENT_CAP) content = content.substring(0, CONTENT_CAP) + '…';
            lines.push(
                '- [' + (e.category || '?') + '] ' + (e._origComment || e.comment || 'Untitled') +
                ' (keys: ' + (e.key || []).join(', ') + ')\n' +
                '  ' + content.replace(/\n+/g, ' ')
            );
        }
        blocks.push(lines.join('\n'));
    }
    return blocks.join('\n\n');
}

/* Merge several parsed lorebooks into a single harmonized one via the LLM.
   `books` is an array of { name, entries }. Replaces lbcData.entries with the
   merged result and updates worldName/worldDescription. */
async function doMergeLorebooks(books) {
    if (!genQuiet) throw new Error(T('noLLM'));
    if (!books || books.length < 2) throw new Error(T('mergeNeedTwo'));

    var total = books.reduce(function (n, bk) { return n + (bk.entries ? bk.entries.length : 0); }, 0);
    if (!total) throw new Error(T('mergeNoEntries'));

    var prompt = PROMPTS.mergeLorebooks
        .replace('{{BOOK_COUNT}}', String(books.length))
        .replace('{{SOURCE_BOOKS}}', buildMergeSourceBlock(books));

    var raw = await lbcGenQuiet(prompt);
    var data = parseJSON(raw);
    if (!data || !data.entries || !Array.isArray(data.entries) || !data.entries.length)
        throw new Error(T('mergeFailed'));

    var merged = normalizeEntries(data.entries);
    await translateEntriesIfNeeded(merged);
    lbcData.entries = merged;

    if (data.worldName) {
        lbcData.worldName = data.worldName;
        if (lbcData._translated && translateFn) {
            lbcData._origWorldName = data.worldName;
            lbcData.worldName = await tr(data.worldName);
        }
    }
    if (data.worldDescription) {
        lbcData.worldDescription = data.worldDescription;
        if (lbcData._translated && translateFn) {
            lbcData._origWorldDesc = data.worldDescription;
            lbcData.worldDescription = await tr(data.worldDescription);
        }
    }

    /* Surface any non-builtin categories as reusable buttons (same as Load). */
    if (!lbcData.customCategories) lbcData.customCategories = [];
    lbcData.entries.forEach(function (en) {
        var c = (en.category || '').trim(); if (!c) return;
        var lc = c.toLowerCase();
        var builtin = ENTRY_CATEGORIES.some(function (x) { return x.toLowerCase() === lc; });
        var have = lbcData.customCategories.some(function (x) { return x.toLowerCase() === lc; });
        if (!builtin && !have) lbcData.customCategories.push(c);
    });

    return merged;
}

/* ══════════════════════════════════════
   MERGE WORKSPACE  (v1.12)

   Side-by-side comparison of two lorebooks with selective transfer.
   Scales to books far beyond a single whole-book LLM request:
     1. Deterministic matching (title/key overlap) builds candidate pairs —
        free, instant, cannot hallucinate.
     2. Optional LLM Analysis on a compact DIGEST finds semantic duplicates
        and conflicts the mechanics missed.
     3. Unique entries are copied over verbatim — no LLM, nothing to lose.
     4. Only the contested pairs go to the LLM, in small batches.
   The old whole-book merge survives as the "Full LLM merge" button.
   ══════════════════════════════════════ */

var lbcMG = null;

function lbcMGReset() {
    lbcMG = {
        A: null, B: null,        // { name, entries, isCurrent }
        pairs: [],               // { a, b, relation, reason, source:'auto'|'llm', choice:'merge'|'A'|'B'|'both' }
        onlyA: [], onlyB: [],    // indices with no counterpart
        incA: {}, incB: {},      // idx -> false when the user excluded a unique entry
        notes: []                // LLM analysis notes
    };
}

/* Normalized title for matching: lowercased, "— Category" suffix stripped. */
function lbcMGTitleKey(e) {
    var t = String(e._origComment || e.comment || '').toLowerCase();
    t = t.replace(/—\s*[^—]*$/, '');
    return t.replace(/[^a-zа-яё0-9À-ɏ一-鿿]+/gi, ' ').trim();
}

/* Similarity between two entries: exact title = 1, else key overlap ratio,
   boosted when one title contains the other. */
function lbcMGSim(ea, eb) {
    var ta = lbcMGTitleKey(ea), tb = lbcMGTitleKey(eb);
    if (ta && ta === tb) return 1;
    var ka = (ea.key || []).map(function (x) { return String(x).toLowerCase().trim(); }).filter(Boolean);
    var kb = (eb.key || []).map(function (x) { return String(x).toLowerCase().trim(); }).filter(Boolean);
    var score = 0;
    if (ka.length && kb.length) {
        var shared = ka.filter(function (x) { return kb.indexOf(x) !== -1; }).length;
        score = shared / Math.min(ka.length, kb.length);
    }
    if (ta && tb && ta.length > 3 && tb.length > 3 && (ta.indexOf(tb) !== -1 || tb.indexOf(ta) !== -1))
        score = Math.max(score, 0.7);
    return score;
}

/* Greedy best-match pairing between A and B, then unique lists. */
function lbcMGComputePairs() {
    var A = lbcMG.A.entries, B = lbcMG.B.entries;
    var pairs = [], usedB = {};
    for (var i = 0; i < A.length; i++) {
        var best = -1, bestScore = 0;
        for (var j = 0; j < B.length; j++) {
            if (usedB[j]) continue;
            var s = lbcMGSim(A[i], B[j]);
            if (s > bestScore) { bestScore = s; best = j; }
        }
        if (best !== -1 && bestScore >= 0.5) {
            usedB[best] = 1;
            pairs.push({
                a: i, b: best, relation: 'duplicate', source: 'auto', choice: 'merge',
                reason: Math.round(bestScore * 100) + '% key/title overlap'
            });
        }
    }
    lbcMG.pairs = pairs;
    lbcMG.incA = {}; lbcMG.incB = {};
    lbcMGRecomputeUnique();
}

function lbcMGRecomputeUnique() {
    var inA = {}, inB = {};
    lbcMG.pairs.forEach(function (p) { inA[p.a] = 1; inB[p.b] = 1; });
    lbcMG.onlyA = lbcMG.A.entries.map(function (_, i) { return i; }).filter(function (i) { return !inA[i]; });
    lbcMG.onlyB = lbcMG.B.entries.map(function (_, i) { return i; }).filter(function (i) { return !inB[i]; });
}

/* How many entries the current selection would produce. */
function lbcMGEstimate() {
    var n = 0;
    lbcMG.pairs.forEach(function (p) { n += (p.choice === 'both') ? 2 : 1; });
    lbcMG.onlyA.forEach(function (i) { if (lbcMG.incA[i] !== false) n++; });
    lbcMG.onlyB.forEach(function (i) { if (lbcMG.incB[i] !== false) n++; });
    return n;
}

/* ── modal ── */

function lbcShowMergeModal() {
    $('#lbc-mg-modal, #lbc-mg-overlay').remove();
    lbcMGReset();

    var h = '<div id="lbc-mg-overlay"></div><div id="lbc-mg-modal">';
    h += '<div class="lbc-opt-head"><b><i class="fa-solid fa-code-merge"></i> ' + esc(T('mgTitle')) + '</b>';
    h += '<button class="menu_button" id="lbc-mg-close"><i class="fa-solid fa-xmark"></i></button></div>';
    h += '<div class="lbc-mg-slots" id="lbc-mg-slots"></div>';
    h += '<div class="lbc-mg-body" id="lbc-mg-body"></div>';
    h += '<div class="lbc-mg-foot" id="lbc-mg-foot"></div>';
    h += '<input type="file" id="lbc-file-mg" accept=".json" style="display:none">';
    h += '</div>';
    $('body').append(h);

    var $m = $('#lbc-mg-modal');

    $('#lbc-mg-close, #lbc-mg-overlay').on('click', function () {
        if (lbcBusy) return;
        $('#lbc-mg-modal, #lbc-mg-overlay').remove(); lbcMG = null;
    });

    $m.on('click', '.lbc-mg-load', function () {
        lbcMG._pick = $(this).data('slot');
        $('#lbc-file-mg').trigger('click');
    });

    $m.on('change', '#lbc-file-mg', async function () {
        var file = this.files && this.files[0];
        this.value = '';
        if (!file || !lbcMG) return;
        try {
            var json = JSON.parse(await readFileAsText(file));
            var entries = parseLorebookEntries(json);
            if (!entries.length) { lbcMGStatus(T('noEntriesInFile'), true); return; }
            lbcMG[lbcMG._pick === 'B' ? 'B' : 'A'] = {
                name: json._name || json.name || file.name.replace(/\.json$/i, ''),
                entries: entries, isCurrent: false
            };
            if (lbcMG.A && lbcMG.B) lbcMGComputePairs();
            lbcMGRender();
        } catch (e) { lbcMGStatus(e.message, true); }
    });

    $m.on('click', '.lbc-mg-usecur', function () {
        if (!lbcMG || !lbcData.entries.length) return;
        var slot = $(this).data('slot');
        lbcMG[slot] = {
            name: lbcData._origWorldName || lbcData.worldName || 'Current entries',
            entries: lbcData.entries.slice(), isCurrent: true
        };
        if (lbcMG.A && lbcMG.B) lbcMGComputePairs();
        lbcMGRender();
    });

    $m.on('click', '.lbc-mg-slot-x', function () {
        if (lbcBusy) return;
        lbcMG[$(this).data('slot')] = null;
        lbcMG.pairs = []; lbcMG.onlyA = []; lbcMG.onlyB = []; lbcMG.notes = [];
        lbcMGRender();
    });

    $m.on('click', '.lbc-mg-choice span', function () {
        var pi = parseInt($(this).closest('.lbc-mg-pair').data('pi'));
        if (isNaN(pi) || !lbcMG.pairs[pi]) return;
        lbcMG.pairs[pi].choice = $(this).data('c');
        $(this).siblings().removeClass('active'); $(this).addClass('active');
        lbcMGRenderFoot();
    });

    $m.on('click', '.lbc-mg-uniq', function () {
        var slot = $(this).data('slot'), i = parseInt($(this).data('i'));
        var inc = slot === 'A' ? lbcMG.incA : lbcMG.incB;
        inc[i] = (inc[i] === false);
        $(this).toggleClass('off', inc[i] === false);
        lbcMGRenderFoot();
    });

    $m.on('click', '#lbc-mg-analyze', lbcMGAnalyze);
    $m.on('click', '#lbc-mg-run', lbcMGExecute);
    $m.on('click', '#lbc-mg-full', lbcMGFullLLM);

    lbcMGRender();
}

function lbcMGStatus(msg, isErr) {
    $('#lbc-mg-status').text(msg || '').css('color', isErr ? 'rgba(231,76,60,.85)' : '');
}

function lbcMGSnippet(e, cap) {
    var c = String(e._origContent || e.content || '').replace(/\s+/g, ' ').trim();
    return esc(c.length > cap ? c.substring(0, cap) + '…' : c);
}

function lbcMGSlotHtml(slot) {
    var bk = lbcMG[slot];
    var h = '<div class="lbc-mg-slot' + (bk ? ' filled' : '') + '" data-slot="' + slot + '">';
    h += '<div class="lbc-mg-slot-tag">' + slot + '</div>';
    if (bk) {
        h += '<div class="lbc-mg-slot-name" title="' + esc(bk.name) + '">' + esc(bk.name) + '</div>';
        h += '<div class="lbc-mg-slot-count">' + bk.entries.length + ' ' + esc(T('entriesWord')) + '</div>';
        h += '<span class="lbc-mg-slot-x" data-slot="' + slot + '" title="Clear">×</span>';
    } else {
        h += '<button class="menu_button lbc-mg-load" data-slot="' + slot + '"><i class="fa-solid fa-folder-open"></i> ' + esc(T('mgLoadFile')) + '</button>';
        var otherCur = (lbcMG.A && lbcMG.A.isCurrent) || (lbcMG.B && lbcMG.B.isCurrent);
        if (lbcData.entries.length && !otherCur) {
            h += '<button class="menu_button lbc-mg-usecur" data-slot="' + slot + '"><i class="fa-solid fa-pen-to-square"></i> ' + esc(T('mgUseCurrent')) + '</button>';
        }
    }
    h += '</div>';
    return h;
}

function lbcMGRender() {
    if (!lbcMG || !document.getElementById('lbc-mg-modal')) return;
    $('#lbc-mg-slots').html(lbcMGSlotHtml('A') + lbcMGSlotHtml('B'));

    var h = '';
    if (!lbcMG.A || !lbcMG.B) {
        h = '<div class="lbc-mg-hint"><i class="fa-solid fa-scale-balanced" style="font-size:28px;display:block;margin-bottom:10px"></i>' + esc(T('mgPickBoth')) + '</div>';
    } else {
        var A = lbcMG.A.entries, B = lbcMG.B.entries;

        if (lbcMG.notes.length) {
            h += '<div class="lbc-opt-section">' + esc(T('mgNotes')) + '</div>';
            lbcMG.notes.forEach(function (n) { h += '<div class="lbc-mg-note">' + esc(n) + '</div>'; });
        }

        h += '<div class="lbc-opt-section">' + esc(T('mgPairsTitle')) + ' (' + lbcMG.pairs.length + ')</div>';
        if (!lbcMG.pairs.length) {
            h += '<div class="lbc-mg-hint" style="padding:12px">' + esc(T('mgNoPairs')) + '</div>';
        }
        lbcMG.pairs.forEach(function (p, pi) {
            var ea = A[p.a], eb = B[p.b];
            if (!ea || !eb) return;
            h += '<div class="lbc-mg-pair" data-pi="' + pi + '">';
            h += '<div class="lbc-mg-pair-main">';
            h += '<div class="lbc-mg-pv"><span class="lbc-mg-tag a">A</span><b>' + esc(ea._origComment || ea.comment || 'Untitled') + '</b> <span class="lbc-mg-cat">[' + esc(ea.category || '?') + ']</span><div class="lbc-mg-snippet">' + lbcMGSnippet(ea, 110) + '</div></div>';
            h += '<div class="lbc-mg-pv"><span class="lbc-mg-tag b">B</span><b>' + esc(eb._origComment || eb.comment || 'Untitled') + '</b> <span class="lbc-mg-cat">[' + esc(eb.category || '?') + ']</span><div class="lbc-mg-snippet">' + lbcMGSnippet(eb, 110) + '</div></div>';
            h += '<div class="lbc-mg-reason"><span class="lbc-mg-rel ' + esc(p.relation) + '">' + esc(p.relation) + '</span>' + esc(p.reason || '') + '</div>';
            h += '</div>';
            h += '<div class="lbc-mg-choice">';
            [['merge', '⚡ ' + T('mgChoiceMerge')], ['A', 'A'], ['B', 'B'], ['both', T('mgChoiceBoth')]].forEach(function (c) {
                h += '<span data-c="' + c[0] + '"' + (p.choice === c[0] ? ' class="active"' : '') + '>' + esc(c[1]) + '</span>';
            });
            h += '</div></div>';
        });

        [['A', lbcMG.onlyA, lbcMG.incA], ['B', lbcMG.onlyB, lbcMG.incB]].forEach(function (side) {
            var slot = side[0], list = side[1], inc = side[2];
            if (!list.length) return;
            h += '<div class="lbc-opt-section">' + esc(T('mgOnlyIn')) + ' ' + slot + ' (' + list.length + ') <span style="text-transform:none;letter-spacing:0;opacity:.7">— ' + esc(T('mgExcludedHint')) + '</span></div>';
            var src = slot === 'A' ? lbcMG.A.entries : lbcMG.B.entries;
            list.forEach(function (i) {
                var e = src[i];
                h += '<div class="lbc-mg-uniq' + (inc[i] === false ? ' off' : '') + '" data-slot="' + slot + '" data-i="' + i + '">';
                h += '<span class="lbc-mg-tag ' + slot.toLowerCase() + '">' + slot + '</span><b>' + esc(e._origComment || e.comment || 'Untitled') + '</b> <span class="lbc-mg-cat">[' + esc(e.category || '?') + ']</span>';
                h += '<div class="lbc-mg-snippet">' + lbcMGSnippet(e, 110) + '</div></div>';
            });
        });
    }
    $('#lbc-mg-body').html(h);
    lbcMGRenderFoot();
}

function lbcMGRenderFoot() {
    if (!lbcMG) return;
    var ready = !!(lbcMG.A && lbcMG.B);
    var h = '';
    if (ready) {
        h += '<button class="menu_button lbc-btn-primary" id="lbc-mg-analyze"><i class="fa-solid fa-magnifying-glass-chart"></i> ' + esc(T('mgAnalyze')) + '</button>';
        h += '<button class="menu_button" id="lbc-mg-full" title="' + esc(T('mgFullLLMHint')) + '"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('mgFullLLM')) + '</button>';
    }
    h += '<span id="lbc-mg-status"></span>';
    if (ready) {
        var mergeN = lbcMG.pairs.filter(function (p) { return p.choice === 'merge'; }).length;
        h += '<span class="lbc-mg-count">' + esc(T('mgResult')) + ': ~' + lbcMGEstimate() + ' ' + esc(T('entriesWord')) + (mergeN ? ' · ' + mergeN + ' LLM' : '') + '</span>';
        h += '<button class="menu_button lbc-btn-success" id="lbc-mg-run"><i class="fa-solid fa-code-merge"></i> ' + esc(T('mgRun')) + '</button>';
    }
    $('#lbc-mg-foot').html(h);
}

/* ── LLM analysis: digest both books, find semantic pairs + conflicts ── */

function lbcMGDigest(entries, snipLen) {
    return entries.map(function (e, i) {
        var c = String(e._origContent || e.content || '').replace(/\s+/g, ' ').trim().substring(0, snipLen);
        return i + ' | [' + (e.category || '?') + '] ' + (e._origComment || e.comment || 'Untitled') +
            ' | keys: ' + (e.key || []).join(', ') + ' | ' + c;
    }).join('\n');
}

/* Pull a short REAL sample of the source text. "SAME LANGUAGE as the lorebooks"
   alone is too weak — some models drift to English or German. Anchoring the
   output language to a concrete sample fixes the target for any language. */
function lbcLangSample(entryLists) {
    var pool = [];
    (entryLists || []).forEach(function (list) {
        (list || []).slice(0, 10).forEach(function (e) {
            var t = String(e._origContent || e.content || e._origComment || e.comment || '').trim();
            if (t) pool.push(t);
        });
    });
    return pool.join(' ').replace(/\s+/g, ' ').trim().substring(0, 240);
}

function lbcLangLine(entryLists) {
    var sample = lbcLangSample(entryLists);
    if (!sample) return '';
    return 'CRITICAL LANGUAGE RULE: write ALL free text you output (reasons, notes, merged content) ' +
        'in the SAME language as this sample from the source lorebooks — do NOT switch to English, German or any other language:\n' +
        '"' + sample + '"\n\n';
}

async function lbcMGAnalyze() {
    if (lbcBusy || !lbcMG || !lbcMG.A || !lbcMG.B) return;
    if (!genQuiet) { lbcMGStatus(T('noLLM'), true); return; }
    lbcBusy = true;
    var $b = $('#lbc-mg-analyze').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('mgAnalyzing')));
    lbcMGStatus(T('mgAnalyzing'));
    try {
        var A = lbcMG.A.entries, B = lbcMG.B.entries;
        // Adaptive snippet length keeps big books inside one request.
        var snip = (A.length + B.length > 120) ? 80 : 150;
        var known = lbcMG.pairs.map(function (p) {
            return 'A#' + p.a + ' <-> B#' + p.b + ' (' + (A[p.a].comment || '') + ')';
        }).join('\n') || '(none)';

        var prompt = PROMPTS.mergeAnalyze
            .replace('{{NAME_A}}', lbcMG.A.name).replace('{{NAME_B}}', lbcMG.B.name)
            .replace('{{DIGEST_A}}', lbcMGDigest(A, snip))
            .replace('{{DIGEST_B}}', lbcMGDigest(B, snip))
            .replace('{{KNOWN_PAIRS}}', known)
            .replace('{{LANG_LINE}}', lbcLangLine([A, B]));

        var raw = await lbcGenQuiet(prompt);
        var data = parseJSON(raw);
        if (!data) throw new Error(T('mergeFailed'));

        var usedA = {}, usedB = {};
        lbcMG.pairs.forEach(function (p) { usedA[p.a] = p; usedB[p.b] = p; });
        (Array.isArray(data.pairs) ? data.pairs : []).forEach(function (p) {
            var a = parseInt(p.a), b = parseInt(p.b);
            if (isNaN(a) || isNaN(b) || a < 0 || a >= A.length || b < 0 || b >= B.length) return;
            var rel = (p.relation === 'conflict' || p.relation === 'related') ? p.relation : 'duplicate';
            if (usedA[a] && usedA[a].b === b) {
                // Enrich the mechanically found pair with the LLM's verdict.
                usedA[a].relation = rel;
                if (p.reason) usedA[a].reason = String(p.reason);
                usedA[a].source = 'llm';
                if (rel === 'related') usedA[a].choice = 'both';
                return;
            }
            if (usedA[a] || usedB[b]) return;   // conflicting pairing — first wins
            var np = { a: a, b: b, relation: rel, reason: String(p.reason || ''), source: 'llm', choice: rel === 'related' ? 'both' : 'merge' };
            lbcMG.pairs.push(np); usedA[a] = np; usedB[b] = np;
        });
        lbcMG.notes = (Array.isArray(data.notes) ? data.notes : []).slice(0, 6).map(String);
        lbcMGRecomputeUnique();
        lbcMGRender();
        lbcMGStatus(T('mgAnalyzeDone') + ' — ' + lbcMG.pairs.length + ' ' + T('mgPairsTitle').toLowerCase());
    } catch (e) { E('MG analyze:', e); lbcMGStatus(e.message, true); }
    lbcBusy = false;
    $('#lbc-mg-analyze').prop('disabled', false).html('<i class="fa-solid fa-magnifying-glass-chart"></i> ' + esc(T('mgAnalyze')));
}

/* ── execute: copy unique + chosen sides verbatim, LLM-merge contested pairs in batches ── */

async function lbcMGExecute() {
    if (lbcBusy || !lbcMG || !lbcMG.A || !lbcMG.B) return;
    var A = lbcMG.A.entries, B = lbcMG.B.entries;

    var out = [], toMerge = [];
    lbcMG.pairs.forEach(function (p) {
        if (!A[p.a] || !B[p.b]) return;
        if (p.choice === 'A') out.push(A[p.a]);
        else if (p.choice === 'B') out.push(B[p.b]);
        else if (p.choice === 'both') { out.push(A[p.a]); out.push(B[p.b]); }
        else toMerge.push(p);
    });
    lbcMG.onlyA.forEach(function (i) { if (lbcMG.incA[i] !== false) out.push(A[i]); });
    lbcMG.onlyB.forEach(function (i) { if (lbcMG.incB[i] !== false) out.push(B[i]); });

    if (!out.length && !toMerge.length) { lbcMGStatus(T('mgNothing'), true); return; }
    if (toMerge.length && !genQuiet) { lbcMGStatus(T('noLLM'), true); return; }
    if (lbcData.entries.length && !lbcMG.A.isCurrent && !lbcMG.B.isCurrent) {
        if (!confirm(T('mgReplaceConfirm'))) return;
    }

    lbcBusy = true;
    var $b = $('#lbc-mg-run').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
    $('#lbc-mg-analyze, #lbc-mg-full').prop('disabled', true);

    var failed = 0, mergedNew = [];
    var BATCH = 5, CAP = 1500;
    try {
        for (var c = 0; c < toMerge.length; c += BATCH) {
            var batch = toMerge.slice(c, c + BATCH);
            lbcMGStatus(T('mgMergingPair') + ' ' + (c + 1) + '–' + Math.min(c + BATCH, toMerge.length) + ' / ' + toMerge.length + '...');

            var block = batch.map(function (p, n) {
                function fmt(e) {
                    var content = String(e._origContent || e.content || '');
                    if (content.length > CAP) content = content.substring(0, CAP) + '…';
                    return (e._origComment || e.comment || 'Untitled') + ' [' + (e.category || '?') + ']' +
                        ' (keys: ' + (e.key || []).join(', ') +
                        ((e.keysecondary || []).length ? ' | sec: ' + e.keysecondary.join(', ') : '') + ')\n' + content;
                }
                return 'PAIR ' + n + (p.relation === 'conflict' ? ' (sources CONTRADICT each other — reconcile carefully)' : '') +
                    ':\nVERSION A: ' + fmt(A[p.a]) + '\nVERSION B: ' + fmt(B[p.b]);
            }).join('\n\n');

            var batchEntries = [];
            batch.forEach(function (p) { batchEntries.push(A[p.a]); batchEntries.push(B[p.b]); });
            var prompt = PROMPTS.mergePair
                .replace('{{PAIR_COUNT}}', String(batch.length))
                .replace('{{PAIRS_BLOCK}}', block)
                .replace('{{LANG_LINE}}', lbcLangLine([batchEntries]));

            var raw = await lbcGenQuiet(prompt);
            var data = parseJSON(raw);
            var got = {};
            var arr = data && Array.isArray(data.merged) ? data.merged
                : (data && Array.isArray(data.entries) ? data.entries : []);
            arr.forEach(function (m, mi) {
                var pi = parseInt(m.pair);
                if (isNaN(pi)) pi = mi;                     // model dropped the index — trust order
                if (pi < 0 || pi >= batch.length || got[pi] || !m.content) return;
                got[pi] = 1;
                var pa = A[batch[pi].a], pb = B[batch[pi].b];
                // LLM supplies the text; mechanical fields inherit from the sources.
                mergedNew.push(normalizeEntry({
                    comment: m.comment || pa.comment,
                    key: (Array.isArray(m.key) && m.key.length) ? m.key : pa.key,
                    keysecondary: Array.isArray(m.keysecondary) ? m.keysecondary : pa.keysecondary,
                    content: m.content,
                    category: m.category || pa.category,
                    constant: pa.constant || pb.constant,
                    selective: pa.selective, selectiveLogic: pa.selectiveLogic,
                    order: Math.max(pa.order || 100, pb.order || 100),
                    position: pa.position, depth: pa.depth,
                    group: pa.group, groupWeight: pa.groupWeight,
                    preventRecursion: pa.preventRecursion || pb.preventRecursion,
                    excludeRecursion: pa.excludeRecursion,
                    matchWholeWords: pa.matchWholeWords,
                    sticky: pa.sticky, cooldown: pa.cooldown, probability: pa.probability
                }));
            });
            // Anything the model failed to return survives as both originals.
            batch.forEach(function (p, n) {
                if (!got[n]) { out.push(A[p.a]); out.push(B[p.b]); failed++; }
            });
        }

        await translateEntriesIfNeeded(mergedNew);
        lbcData.entries = out.concat(mergedNew);

        // Two files merged: name the result after both. Editor-based merges keep their name.
        if (!lbcMG.A.isCurrent && !lbcMG.B.isCurrent) {
            lbcData.worldName = lbcMG.A.name + ' + ' + lbcMG.B.name;
            lbcData._origWorldName = null;
        }

        lbcAdoptCategories();
        $('#lbc-mg-modal, #lbc-mg-overlay').remove();
        lbcMG = null;
        lbcShowEntries();
        var msg = T('mgDone') + ' — ' + lbcData.entries.length + ' ' + T('entriesWord');
        if (failed) msg += ' (' + failed + ' ' + T('mgFailedPairs') + ')';
        showStatus(msg, failed ? 'info' : 'success');
    } catch (e) {
        E('MG execute:', e);
        lbcMGStatus(e.message, true);
        $b.prop('disabled', false).html('<i class="fa-solid fa-code-merge"></i> ' + esc(T('mgRun')));
        $('#lbc-mg-analyze, #lbc-mg-full').prop('disabled', false);
    }
    lbcBusy = false;
}

/* ── legacy path: both books whole in one request (small books only) ── */

async function lbcMGFullLLM() {
    if (lbcBusy || !lbcMG || !lbcMG.A || !lbcMG.B) return;
    if (!genQuiet) { lbcMGStatus(T('noLLM'), true); return; }
    if (!confirm(T('mgFullConfirm'))) return;
    lbcBusy = true;
    var $b = $('#lbc-mg-full').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
    $('#lbc-mg-analyze, #lbc-mg-run').prop('disabled', true);
    lbcMGStatus(T('merging'));
    try {
        var books = [
            { name: lbcMG.A.name, entries: lbcMG.A.entries },
            { name: lbcMG.B.name, entries: lbcMG.B.entries }
        ];
        var merged = await doMergeLorebooks(books);
        $('#lbc-mg-modal, #lbc-mg-overlay').remove();
        lbcMG = null;
        lbcShowEntries();
        showStatus(merged.length + ' ' + T('mergeSuccess'), 'success');
    } catch (e) {
        E('MG full:', e);
        lbcMGStatus(e.message, true);
        $b.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('mgFullLLM')));
        $('#lbc-mg-analyze, #lbc-mg-run').prop('disabled', false);
    }
    lbcBusy = false;
}

/* ══════════════════════════════════════
   ENTRY NORMALIZATION
   ══════════════════════════════════════ */

function normalizeEntry(raw) {
    return {
        comment: raw.comment || 'Untitled Entry',
        key: Array.isArray(raw.key) ? raw.key : (typeof raw.key === 'string' ? raw.key.split(',').map(function (s) { return s.trim(); }) : []),
        keysecondary: Array.isArray(raw.keysecondary) ? raw.keysecondary : [],
        content: raw.content || '',
        category: canonicalizeCategory(raw.category),
        constant: !!raw.constant,
        selective: !!raw.selective,
        order: parseInt(raw.order) || 100,
        position: parseInt(raw.position) || 0,
        depth: parseInt(raw.depth) || 4,
        // BUGFIX: this used to be hardcoded `false`, which silently re-enabled
        // every disabled entry on import.
        disable: !!raw.disable,
        probability: (raw.probability !== undefined && raw.probability !== null) ? (parseInt(raw.probability) || 100) : 100,

        /* ── Targeting fields. Previously dropped by the model and hardcoded on
           export, which made group / sticky / recursion guards unrepresentable. ── */
        selectiveLogic: (raw.selectiveLogic !== undefined && raw.selectiveLogic !== null) ? parseInt(raw.selectiveLogic) : 0,
        group: raw.group || '',
        groupWeight: parseInt(raw.groupWeight) || 100,
        useGroupScoring: (raw.useGroupScoring === true),
        preventRecursion: !!raw.preventRecursion,
        excludeRecursion: !!raw.excludeRecursion,
        matchWholeWords: (raw.matchWholeWords === true || raw.matchWholeWords === false) ? raw.matchWholeWords : null,
        sticky: parseInt(raw.sticky) || 0,
        cooldown: (raw.cooldown !== undefined && raw.cooldown !== null) ? (parseInt(raw.cooldown) || null) : null
    };
}

function normalizeEntries(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeEntry);
}

/* ══════════════════════════════════════
   EXPORT
   ══════════════════════════════════════ */

function exportAsWorldInfo() {
    var result = { entries: {} };
    for (var i = 0; i < lbcData.entries.length; i++) {
        var e = lbcData.entries[i];
        var exportContent = e._origContent || e.content || '';
        var exportComment = e._origComment || e.comment || '';
        result.entries[String(i)] = {
            uid: i, key: e.key || [], keysecondary: e.keysecondary || [],
            comment: exportComment, content: exportContent,
            // Persist the category as an extra field. SillyTavern ignores unknown
            // World Info keys, but this tool reads it back first on re-import, so the
            // category no longer gets lost / reset to "Supplementary" on a round-trip.
            category: e.category || 'Supplementary',
            constant: !!e.constant, selective: !!e.selective,
            selectiveLogic: (e.selectiveLogic !== undefined && e.selectiveLogic !== null) ? e.selectiveLogic : 0,
            addMemo: true, order: e.order || 100, position: e.position || 0,
            disable: !!e.disable, probability: e.probability || 100, useProbability: true,
            depth: e.depth || 4, sticky: e.sticky || 0, vectorized: false, ignoreBudget: false,
            excludeRecursion: !!e.excludeRecursion,
            // Was derived from category. Now a real field: the auditor sets it by
            // entry SIZE, because it is large entries that pull half the book in
            // behind them via recursive scanning.
            preventRecursion: !!e.preventRecursion,
            displayIndex: i, matchPersonaDescription: false, matchCharacterDescription: false,
            matchCharacterPersonality: false, matchCharacterDepthPrompt: false,
            matchScenario: false, matchCreatorNotes: false, delayUntilRecursion: 0,
            outletName: '', group: e.group || '', groupOverride: false,
            groupWeight: e.groupWeight || 100,
            scanDepth: null, caseSensitive: null,
            matchWholeWords: (e.matchWholeWords === true || e.matchWholeWords === false) ? e.matchWholeWords : null,
            useGroupScoring: (e.useGroupScoring === true) ? true : null, automationId: '',
            role: e.position === 4 ? 0 : null,
            cooldown: e.cooldown || null, delay: null, triggers: [],
            characterFilter: { isExclude: false, names: [], tags: [] }
        };
    }
    return result;
}

function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (ev) { resolve(ev.target.result); };
        reader.onerror = function () { reject(new Error('Failed to read file: ' + (file && file.name))); };
        reader.readAsText(file);
    });
}

function downloadJSON(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function doImportToST() {
    if (!lbcData.entries.length) throw new Error(T('noEntriesToExport'));
    var worldInfo = exportAsWorldInfo();
    var origName = lbcData._origWorldName || lbcData.worldName || 'New LoreBook';
    var name = origName.trim();
    var filename = name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    worldInfo._name = name;
    worldInfo._description = lbcData._origWorldDesc || lbcData.worldDescription || '';

    var blob = new Blob([JSON.stringify(worldInfo, null, 2)], { type: 'application/json' });
    var formData = new FormData();
    formData.append('avatar', blob, filename);
    formData.append('file_type', 'world_info');

    var headers = {};
    if (lbcCtx && typeof lbcCtx.getRequestHeaders === 'function') {
        try {
            var rh = lbcCtx.getRequestHeaders();
            for (var k in rh) { if (k.toLowerCase() !== 'content-type') headers[k] = rh[k]; }
        } catch (e) {}
    }

    var r = await fetch('/api/worldinfo/import', { method: 'POST', headers: headers, body: formData });
    if (!r.ok) { downloadJSON(worldInfo, filename); return name + ' (downloaded)'; }
    return name;
}

/* ══════════════════════════════════════
   UI — PANEL
   ══════════════════════════════════════ */

function buildPanel() {
    if (document.getElementById('lbc-panel')) return;
    var h = '<div id="lbc-panel-overlay"></div><div id="lbc-panel">';

    h += '<div class="lbc-header"><div class="lbc-header-title"><i class="fa-solid fa-book-atlas"></i> <span id="lbc-title-text">' + esc(T('title')) + '</span></div>';
    h += '<button class="lbc-hdr-btn menu_button" id="lbc-h-tr" title="Translate"><i class="fa-solid fa-language"></i></button>';
    h += '<button class="lbc-hdr-btn menu_button" id="lbc-h-reset" title="Reset"><i class="fa-solid fa-rotate-left"></i></button>';
    h += '<button class="lbc-hdr-btn menu_button" id="lbc-h-close" title="Close"><i class="fa-solid fa-xmark"></i></button></div>';

    h += '<div style="padding:10px 16px 0"><div class="lbc-mode-switch">';
    h += '<div class="lbc-mode-btn active" data-mode="simple">✨ ' + esc(T('simple')) + '</div>';
    h += '<div class="lbc-mode-btn" data-mode="advanced">⚙️ ' + esc(T('advanced')) + '</div></div></div>';

    h += '<div class="lbc-tabs" id="lbc-tabs" style="display:none">';
    var tabs = [
        ['overview', '🌍 ' + T('overview')], ['world', '🗺️ ' + T('world')],
        ['lore', '📜 ' + T('lore')], ['entries', '📋 ' + T('entries')],
        ['export', '💾 ' + T('exportTab')]
    ];
    for (var ti = 0; ti < tabs.length; ti++)
        h += '<div class="lbc-tab' + (ti === 0 ? ' active' : '') + '" data-tab="' + tabs[ti][0] + '">' + tabs[ti][1] + '</div>';
    h += '</div>';

    h += '<div class="lbc-status-bar" id="lbc-status" style="display:none"></div>';
    h += '<div class="lbc-body" id="lbc-body"></div>';

    h += '<div class="lbc-footer">';
    h += '<button class="menu_button lbc-btn-primary" id="lbc-f-generate"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('generate')) + '</button>';
    h += '<button class="menu_button" id="lbc-f-expand" style="display:none"><i class="fa-solid fa-layer-group"></i> ' + esc(T('expand')) + '</button>';
    h += '<div class="lbc-footer-spacer"></div>';
    h += '<button class="menu_button" id="lbc-f-loadbook"><i class="fa-solid fa-folder-open"></i> ' + esc(T('loadBook')) + '</button>';
    h += '<button class="menu_button" id="lbc-f-merge"><i class="fa-solid fa-code-merge"></i> ' + esc(T('merge')) + '</button>';
    h += '<button class="menu_button" id="lbc-f-template"><i class="fa-solid fa-upload"></i> ' + esc(T('template')) + '</button>';
    h += '<button class="menu_button lbc-btn-warning" id="lbc-f-export"><i class="fa-solid fa-download"></i> ' + esc(T('exportJSON')) + '</button>';
    h += '<button class="menu_button lbc-btn-success" id="lbc-f-import"><i class="fa-solid fa-file-import"></i> ' + esc(T('importST')) + '</button>';
    h += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    if (!document.getElementById('lbc-file-template'))
        document.body.insertAdjacentHTML('beforeend', '<input type="file" id="lbc-file-template" accept=".json" style="display:none">');
    if (!document.getElementById('lbc-file-loadbook'))
        document.body.insertAdjacentHTML('beforeend', '<input type="file" id="lbc-file-loadbook" accept=".json" style="display:none">');

    applyPanelPosition();
    bindPanelEvents();
    renderBody();
}

function applyPanelPosition() {
    var $p = $('#lbc-panel');
    var wasOpen = $p.hasClass('lbc-open');
    if (wasOpen) $p.removeClass('lbc-open');
    $p.removeClass('lbc-mode-center');
    if (lbcSettings.panelPosition === 'center') $p.addClass('lbc-mode-center');
    if (wasOpen) { $p[0].offsetHeight; $p.addClass('lbc-open'); }
}

function bindPanelEvents() {
    lbcBindOptimizerEvents();
    $(document).on('click', '#lbc-panel-overlay, #lbc-h-close', function () { togglePanel(false); });
    $(document).on('keydown', function (e) { if (e.key === 'Escape' && $('#lbc-panel').hasClass('lbc-open')) togglePanel(false); });

    $(document).on('click', '.lbc-mode-btn', function () {
        var mode = $(this).data('mode'); lbcData.mode = mode;
        $('.lbc-mode-btn').removeClass('active'); $(this).addClass('active');
        $('#lbc-tabs').toggle(mode === 'advanced');
        if (mode === 'simple') lbcData.activeTab = 'overview';
        updateFooterButtons(); renderBody();
    });

    $(document).on('click', '.lbc-tab', function () {
        lbcData.activeTab = $(this).data('tab');
        $('.lbc-tab').removeClass('active'); $(this).addClass('active');
        updateFooterButtons(); renderBody();
    });

    $(document).on('click', '#lbc-f-generate', doUIGenerate);
    $(document).on('click', '#lbc-f-expand', doUIExpand);
    $(document).on('click', '#lbc-f-export', doUIExport);
    $(document).on('click', '#lbc-f-import', doUIImport);
    $(document).on('click', '#lbc-f-template', function () { $('#lbc-file-template').trigger('click'); });
    $(document).on('click', '#lbc-f-loadbook', function () { $('#lbc-file-loadbook').trigger('click'); });
    $(document).on('click', '#lbc-f-merge', function () { lbcShowMergeModal(); });
    $(document).on('click', '#lbc-h-reset', function () {
        if (!confirm(T('resetConfirm'))) return;
        resetData(); renderBody(); showStatus(T('resetDone'), 'info');
    });
    $(document).on('click', '#lbc-h-tr', doTranslateToggle);
    $(document).on('click', '#lbc-tr-idea', doTranslateIdea);

    $(document).on('change', '#lbc-file-template', function () {
        var file = this.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var json = JSON.parse(ev.target.result);
                var info = loadTemplateFromJSON(json);
                renderBody();
                showStatus(T('templateLoaded') + ': ' + info.count + ' ' + T('entriesWord'), 'success');
            } catch (e) { showStatus(e.message, 'error'); }
        };
        reader.readAsText(file); this.value = '';
    });

    $(document).on('change', '#lbc-file-loadbook', function () {
        var file = this.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var json = JSON.parse(ev.target.result);
                var imported = parseLorebookEntries(json);
                if (!imported.length) { showStatus(T('noEntriesInFile'), 'error'); return; }

                // If the user already has entries, ask whether to replace or merge.
                if (lbcData.entries && lbcData.entries.length) {
                    if (confirm(T('bookImportReplace'))) lbcData.entries = imported;
                    else lbcData.entries = lbcData.entries.concat(imported);
                } else {
                    lbcData.entries = imported;
                }

                // Carry over the lorebook name if present.
                if (json._name || json.name) lbcData.worldName = json._name || json.name;

                // Surface any non-builtin categories from the import as reusable buttons.
                if (!lbcData.customCategories) lbcData.customCategories = [];
                lbcData.entries.forEach(function (en) {
                    var c = (en.category || '').trim(); if (!c) return;
                    var lc = c.toLowerCase();
                    var builtin = ENTRY_CATEGORIES.some(function (x) { return x.toLowerCase() === lc; });
                    var have = lbcData.customCategories.some(function (x) { return x.toLowerCase() === lc; });
                    if (!builtin && !have) lbcData.customCategories.push(c);
                });

                // Jump to the entries view so the user sees what was loaded.
                lbcData.mode = 'advanced';
                lbcData.activeTab = 'entries';
                $('.lbc-mode-btn').removeClass('active');
                $('.lbc-mode-btn[data-mode="advanced"]').addClass('active');
                $('#lbc-tabs').show();
                $('.lbc-tab').removeClass('active');
                $('.lbc-tab[data-tab="entries"]').addClass('active');
                updateFooterButtons();
                renderBody();
                showStatus(T('bookImported') + ': ' + imported.length + ' ' + T('entriesWord'), 'success');
            } catch (e) { showStatus(e.message, 'error'); }
        };
        reader.readAsText(file); this.value = '';
    });

    $(document).on('click', '.lbc-gen-field-btn', async function () {
        if (lbcBusy) return;
        var key = $(this).data('field'), label = $(this).data('label');
        lbcBusy = true; $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { await doGenerateField(key, label); renderBody(); }
        catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-reconstruct-btn', async function () {
        if (lbcBusy) return;
        lbcBusy = true;
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('reconstructFields')));
        showStatus(T('reconstructing'), 'info');
        try {
            var res = await doReconstructWorld();
            renderBody();
            showStatus(res.applied + ' ' + T('reconstructDone'), 'success');
        } catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-autocat-btn', async function () {
        if (lbcBusy) return;
        if (!confirm(T('autoCategorizeConfirm'))) return;
        lbcBusy = true;
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('autoCategorize')));
        showStatus(T('autoCategorizing'), 'info');
        try {
            var res = await doAutoCategorize();
            renderBody();
            if (res.changed > 0) showStatus(res.changed + ' / ' + res.total + ' ' + T('autoCategorizeDone'), 'success');
            else showStatus(T('autoCategorizeNoChange'), 'success');
        } catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-addmore-field-btn', async function () {
        if (lbcBusy) return;
        var key = $(this).data('field'), label = $(this).data('label');
        lbcBusy = true; 
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { 
            await doAddMoreField(key, label); 
            renderBody(); 
            showStatus(T('fieldAddedMore'), 'success'); 
        } catch (e) { 
            showStatus(e.message, 'error'); 
        }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-enhance-field-btn', async function () {
        if (lbcBusy) return;
        var key = $(this).data('field'), label = $(this).data('label');
        lbcBusy = true; 
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { 
            await doEnhanceField(key, label); 
            renderBody(); 
            showStatus(T('fieldEnhanced'), 'success'); 
        } catch (e) { 
            showStatus(e.message, 'error'); 
        }
        lbcBusy = false;
    });

    $(document).on('click', '#lbc-gen-all-fields', async function () {
        if (lbcBusy) return; lbcBusy = true;
        $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + T('generating'));
        try { await doGenerateAllFields(); renderBody(); showStatus(T('allFieldsGen'), 'success'); }
        catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-lock-btn', function () {
        var key = $(this).data('key'); toggleLock(key);
        $(this).toggleClass('locked');
        $(this).html(isLocked(key) ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>');
    });

    $(document).on('input change', '.lbc-data-input', function () {
        var key = $(this).data('key'); if (key) lbcData[key] = $(this).val();
    });

    $(document).on('input', '#lbc-scale-slider', function () {
        lbcData.worldScale = parseInt($(this).val());
        var sc = SCALE_LABELS[lbcData.worldScale] || SCALE_LABELS[3];
        $('#lbc-scale-label').text(sc.label + ' (' + sc.entries + ' ' + T('entriesWord') + ')');
        $('#lbc-scale-desc').text(sc.desc);
    });

    $(document).on('click', '.lbc-add-entry-cat', async function (ev) {
        if (lbcBusy) return;
        // Ignore clicks that landed on the inline remove (×) of a custom-category pill.
        if ($(ev.target).closest('.lbc-del-custom-cat').length) return;
        var cat = $(this).data('cat');
        lbcBusy = true;
        $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try {
            await doGenerateSingleEntry(cat, '');
            renderBody(); showStatus(cat + ' ' + T('entryCreated'), 'success');
        } catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-add-entry-custom', async function () {
        if (lbcBusy) return;
        var cat = prompt(T('customCatPrompt'), '');
        if (cat === null) return;          // user cancelled
        cat = (cat || '').trim();
        if (!cat) return;                  // empty name

        // Remember it as a reusable button (skip built-ins and case-insensitive dupes).
        if (!lbcData.customCategories) lbcData.customCategories = [];
        var lc = cat.toLowerCase();
        var isBuiltin = ENTRY_CATEGORIES.some(function (c) { return c.toLowerCase() === lc; });
        var exists = lbcData.customCategories.some(function (c) { return c.toLowerCase() === lc; });
        if (!isBuiltin && !exists) lbcData.customCategories.push(cat);

        lbcBusy = true;
        var $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try {
            await doGenerateSingleEntry(cat, '');
            renderBody(); showStatus(cat + ' ' + T('entryCreated'), 'success');
        } catch (e) { showStatus(e.message, 'error'); renderBody(); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-del-custom-cat', function (ev) {
        ev.stopPropagation(); ev.stopImmediatePropagation(); ev.preventDefault();
        var cat = $(this).data('cat');
        lbcData.customCategories = (lbcData.customCategories || []).filter(function (c) { return c !== cat; });
        renderBody();
    });

    $(document).on('click', '.lbc-entry-regen', async function (ev) {
        ev.stopPropagation();
        if (lbcBusy) return;
        var idx = parseInt($(this).data('idx'));
        lbcBusy = true;
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { await doRegenerateEntry(idx); renderBody(); showStatus(T('entryRegenerated'), 'success'); }
        catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-entry-enhance', async function (ev) {
        ev.stopPropagation();
        if (lbcBusy) return;
        var idx = parseInt($(this).data('idx'));
        lbcBusy = true;
        $(this).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { 
            await doEnhanceEntry(idx); 
            renderBody(); 
            showStatus(T('entryEnhanced'), 'success'); 
        } catch (e) { 
            showStatus(e.message, 'error'); 
        }
        lbcBusy = false;
    });

    $(document).on('click', '#lbc-editor-enhance', async function () {
        if (lbcBusy) return;
        saveEntryEditor();
        var idx = lbcData.editingEntryIdx;
        lbcBusy = true;
        var $btn = $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try { 
            await doEnhanceEntry(idx); 
            renderBody(); 
            showStatus(T('entryEnhanced'), 'success'); 
        } catch (e) { 
            showStatus(e.message, 'error'); 
            $btn.prop('disabled', false).html('✨ ' + esc(T('enhanceEntry'))); 
        }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-entry-delete', function (ev) {
        ev.stopPropagation();
        var idx = parseInt($(this).data('idx'));
        if (!confirm(T('deleteConfirm') + ' "' + (lbcData.entries[idx].comment || '') + '"?')) return;
        lbcData.entries.splice(idx, 1); renderBody();
    });

    $(document).on('click', '.lbc-entry-edit', function (ev) {
        ev.stopPropagation();
        lbcData.editingEntryIdx = parseInt($(this).data('idx'));
        lbcData._edParents = [];               /* parents are a per-session choice */
        renderBody();
    });

    /* ── v1.10: LLM Edit ── */
    $(document).on('click', '#lbc-editor-llmedit', function () {
        var idx = lbcData.editingEntryIdx;
        if (idx < 0) return;
        saveEntryEditor();
        lbcShowLLMEditModal(idx);
    });

    /* ── v1.9: blank entry ── */
    $(document).on('click', '.lbc-add-blank', function () {
        if (lbcBusy) return;
        addBlankEntry('Concept');
    });

    /* ── v1.9: parent selection + generate-from-parents ── */
    $(document).on('change', '#lbc-ed-parent-add', function () {
        var v = parseInt($(this).val());
        if (isNaN(v)) return;
        /* keep the user's typed values across the re-render */
        saveEntryEditor();
        lbcData._edParents = lbcData._edParents || [];
        if (lbcData._edParents.indexOf(v) === -1) lbcData._edParents.push(v);
        renderBody();
    });

    $(document).on('click', '.lbc-parent-x', function (ev) {
        ev.stopPropagation();
        saveEntryEditor();
        var v = parseInt($(this).data('pidx'));
        lbcData._edParents = (lbcData._edParents || []).filter(function (i) { return i !== v; });
        renderBody();
    });

    $(document).on('click', '#lbc-ed-gen-parents', async function () {
        if (lbcBusy) return;
        var idx = lbcData.editingEntryIdx;
        if (idx < 0) return;
        lbcBusy = true;
        var $btn = $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('generating')));
        try {
            await doGenerateFromParents(idx);
            renderBody();
            showStatus(T('parentsGenerated'), 'success');
        } catch (e) {
            showStatus(e.message, 'error');
            $btn.prop('disabled', false).html('🧬 ' + esc(T('genFromParents')));
        }
        lbcBusy = false;
    });

    $(document).on('click', '.lbc-entry-card-header', function () {
        $(this).closest('.lbc-entry-card').toggleClass('lbc-collapsed');
    });

    $(document).on('click', '.lbc-cat-chip[data-cat]:not([data-cat^="__"])', function () {
        lbcData.categoryFilter = $(this).data('cat');
        $('.lbc-cat-chip[data-cat]:not([data-cat^="__"])').removeClass('active');
        $(this).addClass('active'); renderBody(); updateFooterButtons();
    });

    $(document).on('click', '#lbc-editor-save', function () {
        saveEntryEditor(); lbcData.editingEntryIdx = -1; renderBody();
    });
    $(document).on('click', '#lbc-editor-back', function () {
        saveEntryEditor(); lbcData.editingEntryIdx = -1; renderBody();
    });

    $(document).on('change', '#lbc-ed-category', function () {
        if ($(this).val() !== '__new__') return;
        var name = prompt(T('customCatPrompt'), '');
        name = (name || '').trim();
        var idx = lbcData.editingEntryIdx;
        if (!name) {
            // Cancelled / empty — revert the select to the entry's current category.
            if (idx >= 0 && lbcData.entries[idx]) $(this).val(lbcData.entries[idx].category);
            return;
        }
        // Remember as a reusable button (skip built-ins and case-insensitive dupes).
        if (!lbcData.customCategories) lbcData.customCategories = [];
        var lc = name.toLowerCase();
        var isBuiltin = ENTRY_CATEGORIES.some(function (c) { return c.toLowerCase() === lc; });
        var exists = lbcData.customCategories.some(function (c) { return c.toLowerCase() === lc; });
        if (!isBuiltin && !exists) lbcData.customCategories.push(name);
        // Save the rest of the editor, apply the new category, re-render the editor.
        saveEntryEditor();
        if (idx >= 0 && lbcData.entries[idx]) lbcData.entries[idx].category = name;
        renderBody();
    });
}

function togglePanel(show) {
    if (show && !lbcSettings.enabled) return;
    var $p = $('#lbc-panel'); var $ov = $('#lbc-panel-overlay');
    if (show) {
        $p.removeClass('lbc-open lbc-mode-center');
        if (lbcSettings.panelPosition === 'center') $p.addClass('lbc-mode-center');
        $ov.addClass('lbc-open'); $p[0].offsetHeight; $p.addClass('lbc-open');
        updateFooterButtons(); syncTrBtn(); renderBody();
    } else {
        $p.removeClass('lbc-open'); $ov.removeClass('lbc-open');
    }
}

function updateFooterButtons() {
    var has = lbcData.entries.length > 0;
    var $expBtn = $('#lbc-f-expand');
    $expBtn.toggle(has);

    if (has) {
        if (lbcData.mode === 'advanced' && lbcData.activeTab === 'entries' && lbcData.categoryFilter !== 'all') {
            $expBtn.html('<i class="fa-solid fa-layer-group"></i> Add 5 ' + esc(lbcData.categoryFilter));
        } else {
            $expBtn.html('<i class="fa-solid fa-layer-group"></i> ' + esc(T('expand')));
        }
    }

    $('#lbc-f-export').toggle(has);
    $('#lbc-f-import').toggle(has);
}

function showStatus(msg, type) {
    var $s = $('#lbc-status').text(msg).attr('class', 'lbc-status-bar ' + (type || 'info')).show();
    setTimeout(function () { $s.fadeOut(300); }, 4000);
}

function resetData() {
    var keys = Object.keys(lbcData);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k === 'mode' || k === 'activeTab' || k === '_translated' || k === '_trL') continue;
        if (k === 'entries') lbcData.entries = [];
        else if (k === 'locked') lbcData.locked = {};
        else if (k === 'worldScale') lbcData.worldScale = 3;
        else if (k === 'editingEntryIdx') { lbcData.editingEntryIdx = -1; lbcData._edParents = []; }
        else if (k === 'categoryFilter') lbcData.categoryFilter = 'all';
        else if (k === 'templateData') lbcData[k] = null;
        else if (typeof lbcData[k] === 'string') lbcData[k] = '';
        else lbcData[k] = null;
    }
}

/* ══════════════════════════════════════
   TRANSLATION TOGGLE
   ══════════════════════════════════════ */

async function doTranslateToggle() {
    if (lbcBusy) return;
    if (!translateFn) {
        if (typeof toastr !== 'undefined') toastr.warning(T('translateNA'));
        return;
    }
    if (lbcData._translated) {
        untranslateUI();
        untranslateAllEntries();
        renderFullUI();
        showStatus(T('translateOff'), 'info');
        return;
    }
    lbcBusy = true;
    var $btn = $('#lbc-h-tr').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
    showStatus(T('translating'), 'info');
    try {
        await translateUI();
        await translateAllEntries();
        renderFullUI();
        showStatus(T('translateDone'), 'success');
    } catch (e) {
        showStatus(e.message, 'error');
        if (typeof toastr !== 'undefined') toastr.error(e.message);
    }
    lbcBusy = false;
    $btn.prop('disabled', false);
    syncTrBtn();
}

function syncTrBtn() {
    var $b = $('#lbc-h-tr');
    if (lbcData._translated) $b.addClass('lbc-btn-tr-active').html('<i class="fa-solid fa-rotate-left"></i>');
    else $b.removeClass('lbc-btn-tr-active').html('<i class="fa-solid fa-language"></i>');
}

/* Translate the Simple-mode idea text INTO English (source auto-detected).
   This is the reverse of the UI/content translation: it lets a user write the
   idea in their own language, then hand the LLM an English prompt so every
   generated field comes back in clean English. */
async function doTranslateIdea() {
    if (lbcBusy) return;
    if (!translateFn) {
        showStatus(T('translateNA'), 'error');
        if (typeof toastr !== 'undefined') toastr.warning(T('translateNA'));
        return;
    }
    var $ta = $('#lbc-body').find('textarea[data-key="simpleIdea"]');
    var idea = (($ta.length ? $ta.val() : lbcData.simpleIdea) || '').toString();
    if (!idea.trim()) { showStatus(T('ideaEmpty'), 'error'); return; }
    lbcBusy = true;
    $('#lbc-tr-idea').addClass('lbc-generating')
        .html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('translatingIdea')));
    showStatus(T('translatingIdea'), 'info');
    try {
        var out = await translateFn(idea, 'en');
        lbcData.simpleIdea = (out === undefined || out === null) ? idea : String(out);
        showStatus(T('ideaTranslated'), 'success');
    } catch (e) {
        showStatus(e.message || String(e), 'error');
        if (typeof toastr !== 'undefined') toastr.error(e.message || String(e));
    } finally {
        lbcBusy = false;
        renderBody();
    }
}

function renderFullUI() {
    $('#lbc-title-text').text(T('title'));
    $('.lbc-mode-btn[data-mode="simple"]').html('✨ ' + esc(T('simple')));
    $('.lbc-mode-btn[data-mode="advanced"]').html('⚙️ ' + esc(T('advanced')));
    var tabNames = {
        overview: '🌍 ' + T('overview'), world: '🗺️ ' + T('world'),
        lore: '📜 ' + T('lore'), entries: '📋 ' + T('entries'),
        export: '💾 ' + T('exportTab')
    };
    $('.lbc-tab').each(function () { var t = $(this).data('tab'); if (tabNames[t]) $(this).html(tabNames[t]); });
    $('#lbc-f-generate').html('<i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('generate')));
    $('#lbc-f-expand').html('<i class="fa-solid fa-layer-group"></i> ' + esc(T('expand')));
    $('#lbc-f-template').html('<i class="fa-solid fa-upload"></i> ' + esc(T('template')));
    $('#lbc-f-merge').html('<i class="fa-solid fa-code-merge"></i> ' + esc(T('merge')));
    $('#lbc-f-export').html('<i class="fa-solid fa-download"></i> ' + esc(T('exportJSON')));
    $('#lbc-f-import').html('<i class="fa-solid fa-file-import"></i> ' + esc(T('importST')));
    syncTrBtn();
    updateFooterButtons();
    renderBody();
}

function saveEntryEditor() {
    var idx = lbcData.editingEntryIdx;
    if (idx < 0 || idx >= lbcData.entries.length) return;
    var e = lbcData.entries[idx];
    var v;
    v = $('#lbc-ed-comment').val(); if (v !== undefined) { e.comment = v; if (e._origComment !== undefined) e._origComment = v; }
    v = $('#lbc-ed-keys').val(); if (v !== undefined) e.key = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    v = $('#lbc-ed-keys2').val(); if (v !== undefined) e.keysecondary = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    v = $('#lbc-ed-content').val(); if (v !== undefined) { e.content = v; if (e._origContent !== undefined) e._origContent = v; }
    v = $('#lbc-ed-category').val(); if (v !== undefined && v !== '__new__') e.category = v;
    v = $('#lbc-ed-order').val(); if (v !== undefined) e.order = parseInt(v) || 100;
    v = $('#lbc-ed-position').val(); if (v !== undefined) e.position = parseInt(v) || 0;
    v = $('#lbc-ed-depth').val(); if (v !== undefined) e.depth = parseInt(v) || 4;
    e.constant = $('#lbc-ed-constant').is(':checked');
    e.selective = $('#lbc-ed-selective').is(':checked');
}

/* ══════════════════════════════════════
   UI FIELD BUILDER
   ══════════════════════════════════════ */

function fld(key, label, type, opts) {
    type = type || 'input'; opts = opts || {};
    var val = lbcData[key] || '';
    var locked = isLocked(key);
    var h = '<div class="lbc-field">';
    h += '<div class="lbc-field-label"><span>' + esc(label) + '</span>';
    h += '<span class="lbc-lock-btn' + (locked ? ' locked' : '') + '" data-key="' + esc(key) + '">';
    h += locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
    h += '</span>';

    if (!opts.noGen) {
        h += '<span class="lbc-gen-field-btn" data-field="' + esc(key) + '" data-label="' + esc(label) + '" title="Generate">🎲</span>';
    }
    
    if (opts.enhance) {
        h += '<span class="lbc-addmore-field-btn" data-field="' + esc(key) + '" data-label="' + esc(label) + '" title="' + esc(T('addMoreField')) + '">➕</span>';
        h += '<span class="lbc-enhance-field-btn" data-field="' + esc(key) + '" data-label="' + esc(label) + '" title="' + esc(T('enhanceField')) + '">✨</span>';
    }

    h += '</div>';
    if (type === 'textarea') {
        h += '<textarea class="lbc-textarea lbc-data-input" data-key="' + esc(key) + '" rows="' + (opts.rows || 3) + '" placeholder="' + esc(opts.placeholder || '') + '">' + esc(val) + '</textarea>';
    } else if (type === 'select' && opts.options) {
        h += '<select class="lbc-select lbc-data-input" data-key="' + esc(key) + '"><option value="">— Select —</option>';
        for (var i = 0; i < opts.options.length; i++) {
            var o = opts.options[i];
            var oid = typeof o === 'object' ? o.id : o;
            var olab = typeof o === 'object' ? o.label : o;
            h += '<option value="' + esc(oid) + '"' + (val === oid ? ' selected' : '') + '>' + esc(olab) + '</option>';
        }
        h += '</select>';
    } else {
        h += '<input class="lbc-input lbc-data-input" type="text" data-key="' + esc(key) + '" value="' + esc(val) + '" placeholder="' + esc(opts.placeholder || '') + '">';
    }
    h += '</div>';
    return h;
}

/* ══════════════════════════════════════
   RENDER
   ══════════════════════════════════════ */

function renderBody() {
    var $b = $('#lbc-body').empty();
    if (lbcData.editingEntryIdx >= 0 && lbcData.editingEntryIdx < lbcData.entries.length) {
        renderEntryEditor($b); return;
    }
    if (lbcData.mode === 'simple') renderSimple($b);
    else {
        switch (lbcData.activeTab) {
            case 'overview': renderOverview($b); break;
            case 'world': renderWorld($b); break;
            case 'lore': renderLore($b); break;
            case 'entries': renderEntries($b); break;
            case 'export': renderExport($b); break;
        }
    }
    updateFooterButtons();
}

function renderSimple($b) {
    var h = '';
    h += '<div class="lbc-section-title">💡 ' + esc(T('describeWorld'));
    if (translateFn) {
        h += '<span class="lbc-tr-idea" id="lbc-tr-idea" title="' + esc(T('translateIdeaHint')) + '">' +
            '<i class="fa-solid fa-language"></i> ' + esc(T('translateIdea')) + '</span>';
    }
    h += '</div>';
    h += '<textarea class="lbc-textarea lbc-simple-idea lbc-data-input" data-key="simpleIdea" rows="6" placeholder="' + esc(T('ideaPlaceholder')) + '">' + esc(lbcData.simpleIdea) + '</textarea>';
    if (lbcData.templateData) {
        h += '<div class="lbc-template-info"><strong>📋 ' + esc(T('templateLoaded')) + ':</strong> ' + esc(lbcData.templateName) +
            '<button class="menu_button lbc-btn-danger lbc-clear-template" style="font-size:10px!important;padding:2px 8px!important;margin-left:8px"><i class="fa-solid fa-trash"></i> ' + esc(T('clearTemplate')) + '</button></div>';
    }
    if (lbcData.entries.length > 0) {
        h += renderEntriesStats();
        h += renderEntriesList();
    }
    $b.html(h);
    $(document).off('click', '.lbc-clear-template').on('click', '.lbc-clear-template', function () {
        lbcData.templateData = null; lbcData.templateName = ''; renderBody();
    });
}

function renderOverview($b) {
    var h = '';
    h += '<button class="menu_button lbc-btn-primary" id="lbc-gen-all-fields" style="width:100%;font-size:12px!important;padding:6px!important;border-radius:8px!important;margin-bottom:10px">' +
        '<i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('genAllParams')) + '</button>';

    h += '<div class="lbc-section-title">🌍 ' + esc(T('worldIdentity')) + '</div>';
    h += fld('worldName', T('worldName'));
    h += fld('worldDescription', T('worldDescription'), 'textarea', { rows: 4, enhance: true });

    h += '<div class="lbc-section-title">🎭 ' + esc(T('worldType')) + '</div>';
    h += '<div class="lbc-cat-chips">';
    for (var i = 0; i < WORLD_TYPES.length; i++) {
        var wt = WORLD_TYPES[i];
        h += '<div class="lbc-cat-chip' + (lbcData.worldType === wt.id ? ' active' : '') + '" data-cat="__type__' + wt.id + '" title="' + esc(wt.desc) + '">' + wt.label + '</div>';
    }
    h += '</div>';

    h += '<div class="lbc-section-title">⏳ ' + esc(T('era')) + '</div>';
    h += fld('era', T('era'), 'select', {
        options: ERA_PRESETS.map(function (ep) { return { id: ep.id, label: ep.label + (ep.range ? ' (' + ep.range + ')' : '') }; })
    });
    if (lbcData.era === 'custom') {
        h += fld('eraCustom', T('eraCustom'));
    }

    h += '<div class="lbc-section-title">📐 ' + esc(T('scaleScope')) + '</div>';
    var sc = SCALE_LABELS[lbcData.worldScale] || SCALE_LABELS[3];
    h += '<div class="lbc-scale-wrap"><input type="range" id="lbc-scale-slider" min="1" max="5" value="' + lbcData.worldScale + '">';
    h += '<span class="lbc-scale-label" id="lbc-scale-label">' + esc(sc.label + ' (' + sc.entries + ' ' + T('entriesWord') + ')') + '</span></div>';
    h += '<div class="lbc-scale-desc" id="lbc-scale-desc">' + esc(sc.desc) + '</div>';

    h += '<div class="lbc-section-title">👤 ' + esc(T('userRoleLabel')) + '</div>';
    h += '<div class="lbc-cat-chips">';
    for (var r = 0; r < USER_ROLES.length; r++) {
        var ur = USER_ROLES[r];
        h += '<div class="lbc-cat-chip' + (lbcData.userRole === ur.id ? ' active' : '') + '" data-cat="__role__' + ur.id + '" title="' + esc(ur.desc) + '">' + ur.label + '</div>';
    }
    h += '</div>';
    h += fld('userRoleDescription', T('roleDetails'), 'textarea', { rows: 2, placeholder: T('roleDetailsPlaceholder'), enhance: true });

    if (lbcData.templateData) {
        h += '<div class="lbc-template-info"><strong>📋 ' + esc(T('templateLoaded')) + ':</strong> ' + esc(lbcData.templateName) +
            '<button class="menu_button lbc-btn-danger lbc-clear-template" style="font-size:10px!important;padding:2px 8px!important;margin-left:8px"><i class="fa-solid fa-trash"></i></button></div>';
    }

    $b.html(h);

    $(document).off('click', '[data-cat^="__type__"]').on('click', '[data-cat^="__type__"]', function () {
        lbcData.worldType = $(this).data('cat').replace('__type__', '');
        $('[data-cat^="__type__"]').removeClass('active'); $(this).addClass('active');
    });
    $(document).off('click', '[data-cat^="__role__"]').on('click', '[data-cat^="__role__"]', function () {
        lbcData.userRole = $(this).data('cat').replace('__role__', '');
        $('[data-cat^="__role__"]').removeClass('active'); $(this).addClass('active');
    });
    $(document).off('click', '.lbc-clear-template').on('click', '.lbc-clear-template', function () {
        lbcData.templateData = null; lbcData.templateName = ''; renderBody();
    });
}

function renderWorld($b) {
    var h = '';
    h += '<div class="lbc-section-title">🎨 ' + esc(T('toneThemes')) + '</div>';
    h += fld('tone', T('tone'), 'input', { enhance: true });
    h += fld('themes', T('themes'), 'textarea', { rows: 2, enhance: true });
    h += fld('mainConflict', T('mainConflict'), 'textarea', { rows: 2, enhance: true });
    h += '<div class="lbc-section-title">🗺️ ' + esc(T('geographyLoc')) + '</div>';
    h += fld('geography', T('geography'), 'textarea', { rows: 3, enhance: true });
    h += '<div class="lbc-section-title">⚔️ ' + esc(T('factionsOrg')) + '</div>';
    h += fld('factions', T('factions'), 'textarea', { rows: 3, enhance: true });
    $b.html(h);
}

function renderLore($b) {
    var h = '';
    h += '<div class="lbc-section-title">✨ ' + esc(T('magicTech')) + '</div>';
    h += fld('magicSystem', T('magicSystem'), 'textarea', { rows: 3, enhance: true });
    h += fld('techLevel', T('techLevel'), 'textarea', { rows: 2, enhance: true });
    h += '<div class="lbc-section-title">📜 ' + esc(T('historyBg')) + '</div>';
    h += fld('history', T('historyLabel'), 'textarea', { rows: 4, enhance: true });
    h += '<div class="lbc-section-title">⚖️ ' + esc(T('coreRulesLabel')) + '</div>';
    h += fld('coreRules', T('coreRules'), 'textarea', { rows: 3, enhance: true });
    $b.html(h);
}

function renderEntries($b) {
    var h = '';
    if (lbcData.entries.length === 0) {
        h += '<div style="text-align:center;padding:40px 20px;opacity:.4">';
        h += '<i class="fa-solid fa-book-open" style="font-size:48px;display:block;margin-bottom:12px"></i>';
        h += '<p>' + esc(T('noEntries')) + '</p></div>';
    } else {
        h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">';
        h += renderEntriesStats();
        h += '<button class="menu_button lbc-reconstruct-btn" style="font-size:11px!important;padding:5px 12px!important;border-radius:7px!important;white-space:nowrap" title="' + esc(T('reconstructConfirm')) + '"><i class="fa-solid fa-wand-sparkles"></i> ' + esc(T('reconstructFields')) + '</button>';
        h += '<button class="menu_button lbc-autocat-btn" style="font-size:11px!important;padding:5px 12px!important;border-radius:7px!important;white-space:nowrap" title="' + esc(T('autoCategorizeConfirm')) + '"><i class="fa-solid fa-tags"></i> ' + esc(T('autoCategorize')) + '</button>';
        h += '<button class="menu_button lbc-audit-btn" style="font-size:11px!important;padding:5px 12px!important;border-radius:7px!important;white-space:nowrap" title="' + esc(T('optAuditHint')) + '"><i class="fa-solid fa-stethoscope"></i> ' + esc(T('audit')) + '</button>';
        h += '<button class="menu_button lbc-optimize-btn" style="font-size:11px!important;padding:5px 12px!important;border-radius:7px!important;white-space:nowrap" title="' + esc(T('optOptimizeHint')) + '"><i class="fa-solid fa-bolt"></i> ' + esc(T('optimize')) + '</button>';
        h += '</div>';
        h += '<div class="lbc-cat-chips">';
        h += '<div class="lbc-cat-chip' + (lbcData.categoryFilter === 'all' ? ' active' : '') + '" data-cat="all">' + esc(T('allCat')) + '</div>';
        var cats = {};
        for (var ci = 0; ci < lbcData.entries.length; ci++) {
            var c = lbcData.entries[ci].category || 'Unknown';
            cats[c] = (cats[c] || 0) + 1;
        }
        for (var ck in cats) {
            h += '<div class="lbc-cat-chip' + (lbcData.categoryFilter === ck ? ' active' : '') + '" data-cat="' + esc(ck) + '">' + esc(ck) + ' (' + cats[ck] + ')</div>';
        }
        h += '</div>';
        h += renderEntriesList();
    }
    h += '<div class="lbc-section-title">➕ ' + esc(T('addEntryByCat')) + '</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    for (var ai = 0; ai < ENTRY_CATEGORIES.length; ai++) {
        h += '<button class="menu_button lbc-add-entry-cat" data-cat="' + esc(ENTRY_CATEGORIES[ai]) +
            '" style="font-size:10px!important;padding:3px 8px!important;border-radius:6px!important">' + esc(ENTRY_CATEGORIES[ai]) + '</button>';
    }
    // Remembered custom categories: one pill each, with a subtle inline × to forget it.
    var cc = lbcData.customCategories || [];
    for (var ci2 = 0; ci2 < cc.length; ci2++) {
        h += '<button class="menu_button lbc-add-entry-cat lbc-custom-cat" data-cat="' + esc(cc[ci2]) +
            '" style="font-size:10px!important;padding:3px 6px 3px 8px!important;border-radius:6px!important;' +
            'color:rgba(180,130,255,.95)!important;border-color:rgba(180,130,255,.35)!important;' +
            'display:inline-flex;align-items:center;gap:5px">' +
            '<span>' + esc(cc[ci2]) + '</span>' +
            '<span class="lbc-del-custom-cat" data-cat="' + esc(cc[ci2]) + '" title="Remove this custom category" ' +
            'style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;' +
            'border-radius:50%;font-size:9px;line-height:1;opacity:.5;' +
            'background:rgba(180,130,255,.18)">×</span>' +
            '</button>';
    }
    h += '<button class="menu_button lbc-add-entry-custom" title="' + esc(T('customCatPrompt')) +
        '" style="font-size:10px!important;padding:3px 8px!important;border-radius:6px!important;border-style:dashed!important;opacity:.85">' + esc(T('customCat')) + '</button>';
    h += '<button class="menu_button lbc-add-blank" title="' + esc(T('blankEntryHint')) +
        '" style="font-size:10px!important;padding:3px 8px!important;border-radius:6px!important;border-style:dashed!important;' +
        'color:rgba(120,200,150,.95)!important;border-color:rgba(120,200,150,.4)!important">✏️ ' + esc(T('blankEntry')) + '</button>';
    h += '</div>';
    $b.html(h);
}

function renderExport($b) {
    var h = '';
    h += '<div class="lbc-section-title">💾 ' + esc(T('exportImport')) + '</div>';
    if (lbcData.entries.length === 0) {
        h += '<p style="opacity:.4">' + esc(T('genFirst')) + '</p>';
    } else {
        h += renderEntriesStats();
        h += '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">';
        h += '<button class="menu_button lbc-btn-warning lbc-exp-json" style="flex:1"><i class="fa-solid fa-download"></i> ' + esc(T('downloadJSON')) + '</button>';
        h += '<button class="menu_button lbc-btn-success lbc-exp-import" style="flex:1"><i class="fa-solid fa-file-import"></i> ' + esc(T('importToST')) + '</button>';
        h += '</div>';
        h += '<div class="lbc-section-title">👁️ ' + esc(T('jsonPreview')) + '</div>';
        var preview = JSON.stringify(exportAsWorldInfo(), null, 2);
        h += '<textarea class="lbc-textarea" rows="15" readonly style="font-size:11px;font-family:monospace;opacity:.7">' + esc(preview.substring(0, 5000)) + '</textarea>';
    }
    $b.html(h);
    $(document).off('click', '.lbc-exp-json').on('click', '.lbc-exp-json', doUIExport);
    $(document).off('click', '.lbc-exp-import').on('click', '.lbc-exp-import', doUIImport);
}

function renderEntriesStats() {
    var cats = {};
    for (var i = 0; i < lbcData.entries.length; i++) {
        var c = lbcData.entries[i].category || 'Unknown';
        cats[c] = (cats[c] || 0) + 1;
    }
    var constCount = lbcData.entries.filter(function (e) { return e.constant; }).length;
    return '<div class="lbc-stats-bar">' +
        '<div class="lbc-stat"><span class="lbc-stat-num">' + lbcData.entries.length + '</span> ' + T('entriesWord') + '</div>' +
        '<div class="lbc-stat"><span class="lbc-stat-num">' + Object.keys(cats).length + '</span> ' + T('categories') + '</div>' +
        '<div class="lbc-stat"><span class="lbc-stat-num">' + constCount + '</span> ' + T('constantWord') + '</div>' +
        '</div>';
}

function renderEntriesList() {
    var h = '';
    for (var i = 0; i < lbcData.entries.length; i++) {
        var e = lbcData.entries[i];
        if (lbcData.categoryFilter !== 'all' && e.category !== lbcData.categoryFilter) continue;

        h += '<div class="lbc-entry-card">';
        h += '<div class="lbc-entry-card-header">';
        h += '<i class="fa-solid fa-chevron-down lbc-entry-expand"></i>';
        h += '<span class="lbc-entry-title">' + esc(e.comment || 'Untitled Entry') + '</span>';
        if (e.category) h += '<span class="lbc-entry-category">' + esc(e.category) + '</span>';
        if (e.constant) h += '<span class="lbc-entry-category" style="background:rgba(231,76,60,.1);color:rgba(231,76,60,.7);border-color:rgba(231,76,60,.2)">⚡ CONST</span>';
        h += '<div class="lbc-entry-actions">';
        h += '<span class="lbc-micro-btn lbc-entry-enhance" data-idx="' + i + '" title="' + esc(T('enhanceEntry')) + '">✨</span>';
        h += '<span class="lbc-micro-btn lbc-entry-edit" data-idx="' + i + '" title="' + esc(T('editEntry')) + '">✏️</span>';
        h += '<span class="lbc-micro-btn lbc-entry-regen" data-idx="' + i + '" title="Regenerate">🎲</span>';
        h += '<span class="lbc-micro-btn lbc-entry-delete" data-idx="' + i + '" style="color:rgba(231,76,60,.7)">✕</span>';
        h += '</div></div>';
        h += '<div class="lbc-entry-card-body">';
        if (e.key && e.key.length) {
            h += '<div class="lbc-entry-keys">';
            for (var ki = 0; ki < e.key.length; ki++) h += '<span class="lbc-entry-key">' + esc(e.key[ki]) + '</span>';
            h += '</div>';
        }
        h += '<div class="lbc-entry-content-preview">' + esc((e.content || '').substring(0, 300)) + '</div>';
        h += '<div style="margin-top:6px;font-size:10px;opacity:.3">' + T('order') + ': ' + (e.order || 100) +
            ' | ' + T('position') + ': ' + (e.position || 0) + ' | ' + T('depth') + ': ' + (e.depth || 4) + '</div>';
        h += '</div></div>';
    }
    return h;
}

function renderEntryEditor($b) {
    var idx = lbcData.editingEntryIdx;
    var e = lbcData.entries[idx];
    if (!e) { lbcData.editingEntryIdx = -1; renderBody(); return; }

    var h = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
    h += '<button class="menu_button" id="lbc-editor-back"><i class="fa-solid fa-arrow-left"></i> ' + esc(T('back')) + '</button>';
    h += '<div class="lbc-section-title" style="margin:0;flex:1">✏️ ' + esc(T('editEntry')) + ' #' + (idx + 1) + '</div>';
    h += '<button class="menu_button" id="lbc-editor-llmedit" title="' + esc(T('llmEditHint')) + '">✒️ ' + esc(T('llmEdit')) + '</button>';
    h += '<button class="menu_button lbc-btn-warning" id="lbc-editor-enhance" title="' + esc(T('enhanceEntry')) + '">✨ ' + esc(T('enhanceEntry')) + '</button>';
    h += '<button class="menu_button lbc-btn-success" id="lbc-editor-save"><i class="fa-solid fa-check"></i> ' + esc(T('save')) + '</button>';
    h += '</div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('titleComment')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-comment" value="' + esc(e.comment || '') + '"></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('category')) + '</div>';
    h += '<select class="lbc-select" id="lbc-ed-category">';

    // Build the option list: built-ins + remembered custom categories + any
    // category already used by other entries + this entry's own category.
    var catsForSelect = ENTRY_CATEGORIES.slice();
    function pushCat(c) {
        if (!c) return;
        var lc = String(c).toLowerCase();
        if (!catsForSelect.some(function (x) { return x.toLowerCase() === lc; })) catsForSelect.push(c);
    }
    (lbcData.customCategories || []).forEach(pushCat);
    lbcData.entries.forEach(function (en) { pushCat(en.category); });
    pushCat(e.category);

    for (var ci = 0; ci < catsForSelect.length; ci++) {
        h += '<option value="' + esc(catsForSelect[ci]) + '"' + (e.category === catsForSelect[ci] ? ' selected' : '') + '>' + esc(catsForSelect[ci]) + '</option>';
    }
    // Let the user create a brand-new custom category right here.
    h += '<option value="__new__">' + esc(T('customCat')) + '…</option>';
    h += '</select></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('primaryKeys')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-keys" value="' + esc((e.key || []).join(', ')) + '"></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('secondaryKeys')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-keys2" value="' + esc((e.keysecondary || []).join(', ')) + '"></div>';

    /* ── v1.9: Parent Entries — the new content is grown from these ── */
    h += '<div class="lbc-field"><div class="lbc-field-label" title="' + esc(T('parentEntriesHint')) + '">🧬 ' + esc(T('parentEntries')) + '</div>';
    h += '<div class="lbc-parent-chips" id="lbc-ed-parents">';
    var pIdxs = (lbcData._edParents || []).filter(function (i) { return i >= 0 && i < lbcData.entries.length && i !== idx; });
    for (var pi = 0; pi < pIdxs.length; pi++) {
        var pe = lbcData.entries[pIdxs[pi]];
        h += '<span class="lbc-parent-chip" data-pidx="' + pIdxs[pi] + '">'
            + esc(pe.comment || 'Untitled') + ' <span class="lbc-parent-x" data-pidx="' + pIdxs[pi] + '">×</span></span>';
    }
    var others = [];
    for (var oi = 0; oi < lbcData.entries.length; oi++) {
        if (oi === idx || pIdxs.indexOf(oi) >= 0) continue;
        others.push(oi);
    }
    if (others.length) {
        h += '<select class="lbc-select lbc-parent-add" id="lbc-ed-parent-add" style="width:auto;min-width:140px;font-size:11px!important">';
        h += '<option value="">' + esc(T('addParent')) + '</option>';
        for (var oj = 0; oj < others.length; oj++) {
            var oe = lbcData.entries[others[oj]];
            h += '<option value="' + others[oj] + '">#' + (others[oj] + 1) + ' ' + esc((oe.comment || 'Untitled').slice(0, 40)) + ' [' + esc(oe.category || '?') + ']</option>';
        }
        h += '</select>';
    } else if (!pIdxs.length) {
        h += '<span style="font-size:11px;opacity:.4">' + esc(T('noOtherEntries')) + '</span>';
    }
    if (pIdxs.length) {
        h += '<button class="menu_button lbc-btn-success" id="lbc-ed-gen-parents" style="font-size:11px!important;padding:4px 10px!important;border-radius:7px!important">🧬 ' + esc(T('genFromParents')) + '</button>';
    }
    h += '</div></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('content')) + '</div>';
    h += '<textarea class="lbc-textarea" id="lbc-ed-content" rows="12">' + esc(e.content || '') + '</textarea></div>';

    h += '<div class="lbc-input-row">';
    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('order')) + '</div><input class="lbc-num-input" id="lbc-ed-order" type="number" value="' + (e.order || 100) + '"></div>';
    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('position')) + '</div><select class="lbc-select" id="lbc-ed-position">' +
        '<option value="0"' + (e.position === 0 ? ' selected' : '') + '>0 — ' + esc(T('pos0')) + '</option>' +
        '<option value="1"' + (e.position === 1 ? ' selected' : '') + '>1 — ' + esc(T('pos1')) + '</option>' +
        '<option value="4"' + (e.position === 4 ? ' selected' : '') + '>4 — ' + esc(T('pos4')) + '</option>' +
        '</select></div>';
    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('depth')) + '</div><input class="lbc-num-input" id="lbc-ed-depth" type="number" value="' + (e.depth || 4) + '"></div>';
    h += '</div>';

    h += '<div class="lbc-check-row"><input type="checkbox" id="lbc-ed-constant"' + (e.constant ? ' checked' : '') + '> <label for="lbc-ed-constant">' + esc(T('constant')) + '</label></div>';
    h += '<div class="lbc-check-row"><input type="checkbox" id="lbc-ed-selective"' + (e.selective ? ' checked' : '') + '> <label for="lbc-ed-selective">' + esc(T('selective')) + '</label></div>';

    $b.html(h);
}

/* ══════════════════════════════════════
   UI ACTIONS
   ══════════════════════════════════════ */

async function doUIGenerate() {
    if (lbcBusy) return; lbcBusy = true;
    var $btn = $('#lbc-f-generate').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('generating')));
    showStatus(T('generatingEntries'), 'info');
    try {
        if (lbcData.mode === 'simple') await doSimpleGenerate();
        else await doAdvancedGenerate();
        renderBody();
        showStatus(lbcData.entries.length + ' ' + T('genSuccess'), 'success');
        if (lbcData.mode === 'advanced') {
            lbcData.activeTab = 'entries';
            $('.lbc-tab').removeClass('active').filter('[data-tab="entries"]').addClass('active');
            renderBody();
        }
    } catch (e) { showStatus(e.message, 'error'); E('Generate:', e); }
    lbcBusy = false;
    $btn.prop('disabled', false).html('<i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('generate')));
}

async function doUIExpand() {
    if (lbcBusy) return; lbcBusy = true;
    var $btn = $('#lbc-f-expand').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
    showStatus(T('expandingLore'), 'info');
    try {
        var ne = await doExpandEntries(5);
        renderBody(); showStatus(ne.length + ' ' + T('expandSuccess'), 'success');
    } catch (e) { showStatus(e.message, 'error'); }
    lbcBusy = false;
    
    $btn.prop('disabled', false);
    updateFooterButtons(); 
}

function doUIExport() {
    if (!lbcData.entries.length) { showStatus(T('noEntriesToExport'), 'error'); return; }
    var data = exportAsWorldInfo();
    var origName = lbcData._origWorldName || lbcData.worldName || 'lorebook';
    downloadJSON(data, origName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');
    showStatus(lbcData.entries.length + ' ' + T('exportSuccess'), 'success');
}

async function doUIImport() {
    if (lbcBusy) return; lbcBusy = true;
    var $btn = $('#lbc-f-import').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
    try {
        var name = await doImportToST();
        showStatus('"' + name + '" ' + T('importSuccess'), 'success');
        if (typeof toastr !== 'undefined') toastr.success(name + ' ' + T('importSuccess'), T('title'));
    } catch (e) { showStatus(e.message, 'error'); }
    lbcBusy = false;
    $btn.prop('disabled', false).html('<i class="fa-solid fa-file-import"></i> ' + esc(T('importST')));
}

/* ══════════════════════════════════════
   CHAT BUTTON & SETTINGS
   ══════════════════════════════════════ */

function buildChatButton() {
    if (document.getElementById('lbc-trigger')) return;
    var btn = '<div id="lbc-trigger" class="interactable" title="LoreBook Creator"><i class="fa-solid fa-book-atlas"></i></div>';
    var $l = $('#leftSendForm'); if ($l.length) $l.append(btn); else { var $f = $('#send_form'); if ($f.length) $f.prepend(btn); }
    $(document).on('click', '#lbc-trigger', function () { togglePanel(true); });
    syncBtn();
}

function syncBtn() { $('#lbc-trigger').toggle(!!(lbcSettings.enabled && lbcSettings.showButton)); }

function buildMenuItem() {
    if (document.getElementById('lbc-menu-item')) return;
    var $m = $('#extensionsMenu'); if (!$m.length) return;
    var item = '<div id="lbc-menu-item" class="list-group-item flex-container flexGap5 interactable" tabindex="0">' +
        '<div class="fa-fw fa-solid fa-book-atlas extensionsMenuExtensionButton"></div>' +
        '<span>LoreBook Creator</span></div>';
    $m.append(item);
    $(document).on('click', '#lbc-menu-item', function () { togglePanel(true); });
    syncMenuItem();
}

function syncMenuItem() { $('#lbc-menu-item').toggle(!!(lbcSettings.enabled && lbcSettings.showMenuItem)); }

function buildSettingsPanel() {
    var $c = $('#extensions_settings2'); if (!$c.length) $c = $('#extensions_settings'); if (!$c.length) return;
    var h = '<div id="lbc-settings"><div class="inline-drawer">';
    h += '<div class="inline-drawer-toggle inline-drawer-header"><b><i class="fa-solid fa-book-atlas"></i> LoreBook Creator</b>';
    h += '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>';
    h += '<div class="inline-drawer-content">';
    h += '<div class="lbc-srow"><label class="checkbox_label"><input type="checkbox" id="lbc-s-on"><span>Enable</span></label></div>';
    h += '<div class="lbc-srow"><label class="checkbox_label"><input type="checkbox" id="lbc-s-menu"><span>Show in extensions menu</span></label></div>';
    h += '<div class="lbc-srow"><label class="checkbox_label"><input type="checkbox" id="lbc-s-btn"><span>Show chat button</span></label></div>';
    h += '<hr>';
    h += '<div class="lbc-srow"><label>Panel Position</label><select id="lbc-s-pos" class="text_pole" style="max-width:200px"><option value="right">Right Drawer</option><option value="center">Center Modal</option></select></div>';
    h += '<hr>';
    h += '<div class="lbc-srow"><input type="button" class="menu_button" id="lbc-s-open" value="Open LoreBook Creator"></div>';
    h += '<small style="opacity:.4;display:block;margin-top:6px;font-size:11px">Create World Info lorebooks with LLM. Simple & Advanced modes. Template support. Translation via Chat Translation extension.</small>';
    h += '</div></div></div>';
    $c.append(h);

    $('#lbc-s-on').prop('checked', lbcSettings.enabled).on('change', function () { lbcSettings.enabled = this.checked; saveSett(); syncBtn(); syncMenuItem(); });
    $('#lbc-s-menu').prop('checked', lbcSettings.showMenuItem).on('change', function () { lbcSettings.showMenuItem = this.checked; saveSett(); syncMenuItem(); });
    $('#lbc-s-btn').prop('checked', lbcSettings.showButton).on('change', function () { lbcSettings.showButton = this.checked; saveSett(); syncBtn(); });
    $('#lbc-s-pos').val(lbcSettings.panelPosition).on('change', function () { lbcSettings.panelPosition = this.value; saveSett(); applyPanelPosition(); });
    $('#lbc-s-open').on('click', function () { togglePanel(true); });
}


/* ══════════════════════════════════════════════════════════════════════
   LOREBOOK OPTIMIZER  (LBC v1.7.0)

   Two-stage design:
     Stage 1 — lbcAudit()      pure JS, no LLM. Finds every mechanical defect
                               and computes real token cost. Instant, free,
                               deterministic, cannot hallucinate.
     Stage 2 — lbcLLMOptimize() LLM pass, but ONLY for judgment calls:
                               replacement keys, semantic duplicates,
                               canon contradictions. Sends a compact digest,
                               never the full book.
     Stage 3 — diff modal, user picks what to apply.

   Append this whole block to index.js (before the final closing lines).
   Requires the entry-model widening described in the integration notes.
   ══════════════════════════════════════════════════════════════════════ */

/* ── Token estimation ──────────────────────────────────────────────────
   Cheap but calibrated: Latin ≈ 4 chars/token, Cyrillic/CJK ≈ 2.2.
   Good enough to reason about a 4k budget; we never need exactness. */
function lbcEstTokens(str) {
    if (!str) return 0;
    var s = String(str);
    var nonAscii = (s.match(/[^\x00-\x7F]/g) || []).length;
    var ascii = s.length - nonAscii;
    return Math.ceil(ascii / 4 + nonAscii / 2.2);
}

function lbcEntryTokens(e) {
    return lbcEstTokens((e._origContent || e.content || '')) + lbcEstTokens(e.comment || '') + 8;
}

/* ── Category → order tier ────────────────────────────────────────────
   The ladder that replaces ad-hoc order values. Higher = higher priority
   = survives budget truncation. Within a tier we keep relative order. */
var LBC_ORDER_TIERS = {
    'Core Rule': 1000,
    'Core Concept': 940,
    'Creature / Species': 880,
    'Magic / Technology': 820,
    'Culture / Custom': 740,
    'Faction': 660,
    'Organization': 650,
    'Location': 560,
    'Character': 460,
    'Lore / Legend': 400,
    'Event / History': 350,
    'Item / Artifact': 260,
    'RP Prompt': 120,
    'Supplementary': 100
};
var LBC_TIER_STEP = 10;   // spacing between entries inside one tier

/* Keys that are too common to be safe triggers. A key here fires on
   ordinary prose and drags its whole entry into every prompt. */
var LBC_GENERIC_KEYS = [
    'man','men','woman','women','human','humans','people','person','society','world',
    'city','town','house','home','room','door','food','water','fire','light','dark',
    'time','life','death','love','hate','fear','war','peace','power','god','magic',
    'name','work','game','body','sex','group','new','old','big','small','the','and',
    'club','bar','size','growth','drug','sport','device','measure','scanner','history',
    'prompt','event','item','thing','place','area','system','rule','law','order'
];

/* Tunables. Exposed so they can live in settings later. */
var LBC_OPT = {
    bigEntryTokens: 700,      // above this → preventRecursion, needs gating
    collisionTokenAlarm: 800, // one keyword pulling more than this = alarm
    shortKeyLen: 4,           // keys this short get matchWholeWords
    constantBudget: 1200,     // always-on tokens we consider acceptable
    dupeKeyOverlap: 0.6       // ≥60% shared keys = suspected duplicate pair
};


/* ══════════════════════════════════════
   STAGE 1 — DETERMINISTIC AUDIT
   ══════════════════════════════════════ */

function lbcAudit() {
    var entries = lbcData.entries || [];
    var issues = [];
    var i, j, k;

    var add = function (sev, type, idx, msg, fix) {
        issues.push({ sev: sev, type: type, idx: (idx === undefined ? null : idx), msg: msg, fix: fix || null });
    };

    /* ── token accounting ── */
    var total = 0, constTok = 0;
    for (i = 0; i < entries.length; i++) {
        var t = lbcEntryTokens(entries[i]);
        total += t;
        if (entries[i].constant) constTok += t;
    }

    if (constTok > LBC_OPT.constantBudget) {
        add('warn', 'constant_bloat', null,
            constTok + ' tokens are ALWAYS in the prompt (' + entries.filter(function (e) { return e.constant; }).length +
            ' constant entries). Budget guideline: ' + LBC_OPT.constantBudget + '.', null);
    }

    /* ── build global key index ── */
    var keyIndex = {};   // lowercased key -> [entry idx]
    for (i = 0; i < entries.length; i++) {
        if (entries[i].constant) continue;            // constant ignores keys entirely
        var seen = {};
        var keys = entries[i].key || [];
        for (j = 0; j < keys.length; j++) {
            var lk = String(keys[j]).trim().toLowerCase();
            if (!lk) continue;
            if (seen[lk]) {
                add('info', 'dupe_key_self', i, 'Key "' + lk + '" is listed twice in the same entry.', { op: 'dedupe_self' });
                continue;
            }
            seen[lk] = 1;
            (keyIndex[lk] = keyIndex[lk] || []).push(i);
        }
    }

    /* ── key collisions: the #1 killer ── */
    for (k in keyIndex) {
        if (keyIndex[k].length < 2) continue;
        var owners = keyIndex[k];
        var cost = 0;
        for (i = 0; i < owners.length; i++) cost += lbcEntryTokens(entries[owners[i]]);

        // Entries deliberately placed in the same inclusion group are allowed to share keys.
        var groups = owners.map(function (o) { return entries[o].group || ''; });
        var sameGroup = groups[0] && groups.every(function (g) { return g === groups[0]; });
        if (sameGroup) continue;

        add(cost >= LBC_OPT.collisionTokenAlarm ? 'error' : 'warn', 'key_collision', null,
            'Key "' + k + '" fires ' + owners.length + ' entries at once (~' + cost + ' tok): ' +
            owners.map(function (o) { return '#' + o + ' ' + (entries[o].comment || ''); }).join(' | '),
            { op: 'deconflict', key: k, owners: owners });
    }

    /* ── per-entry checks ── */
    for (i = 0; i < entries.length; i++) {
        var e = entries[i];
        var tok = lbcEntryTokens(e);
        var keys2 = (e.key || []).filter(function (x) { return String(x).trim(); });

        // never fires
        if (!e.constant && keys2.length === 0) {
            add('error', 'no_keys', i, '"' + (e.comment || '?') + '" is not constant and has no keys — it can NEVER activate.', null);
        }

        // dead secondary keys: the single most common silent bug
        if ((e.keysecondary || []).length && !e.selective) {
            add('error', 'dead_secondary', i,
                '"' + (e.comment || '?') + '" has ' + e.keysecondary.length +
                ' secondary keys but selective=false — SillyTavern ignores them completely.',
                { op: 'enable_selective' });
        }

        // selective with nothing to select on
        if (e.selective && !(e.keysecondary || []).length) {
            add('warn', 'empty_selective', i,
                '"' + (e.comment || '?') + '" is selective but has no secondary keys — the flag does nothing.',
                { op: 'disable_selective' });
        }

        // big entry with no recursion guard → drags half the book in behind it
        if (tok >= LBC_OPT.bigEntryTokens && !e.preventRecursion) {
            add('warn', 'token_bomb', i,
                '"' + (e.comment || '?') + '" is ~' + tok + ' tok with preventRecursion=false — its text will recursively trigger other entries.',
                { op: 'prevent_recursion' });
        }

        // big entry with wide-open keys → should be gated behind selective
        if (tok >= LBC_OPT.bigEntryTokens && !e.selective && keys2.length > 6) {
            add('warn', 'ungated_bomb', i,
                '"' + (e.comment || '?') + '" is ~' + tok + ' tok with ' + keys2.length +
                ' broad keys. Consider selective + secondary keys as a gate.', null);
        }

        // generic / short keys
        for (j = 0; j < keys2.length; j++) {
            var kk = String(keys2[j]).trim().toLowerCase();
            if (LBC_GENERIC_KEYS.indexOf(kk) !== -1) {
                add('warn', 'generic_key', i,
                    'Key "' + kk + '" on "' + (e.comment || '?') + '" is a common word — it will misfire in ordinary prose.',
                    { op: 'llm_rekey', key: kk });
            } else if (kk.length <= LBC_OPT.shortKeyLen && e.matchWholeWords !== true) {
                add('info', 'short_key', i,
                    'Key "' + kk + '" is short — enable matchWholeWords or it matches inside other words.',
                    { op: 'whole_words' });
            }
        }

        // position/depth mismatch
        if (e.position !== 4 && e.depth && e.depth !== 4) {
            add('info', 'dead_depth', i, '"' + (e.comment || '?') + '": depth only applies to position 4 (@D).', null);
        }
    }

    /* ── suspected duplicate pairs (key-overlap heuristic; LLM confirms) ── */
    for (i = 0; i < entries.length; i++) {
        for (j = i + 1; j < entries.length; j++) {
            var a = (entries[i].key || []).map(function (x) { return String(x).toLowerCase(); });
            var b = (entries[j].key || []).map(function (x) { return String(x).toLowerCase(); });
            if (a.length < 2 || b.length < 2) continue;
            var shared = a.filter(function (x) { return b.indexOf(x) !== -1; }).length;
            var ratio = shared / Math.min(a.length, b.length);
            if (ratio >= LBC_OPT.dupeKeyOverlap && !(entries[i].group && entries[i].group === entries[j].group)) {
                add('error', 'suspected_dupe', i,
                    'DUPLICATE? #' + i + ' "' + entries[i].comment + '" and #' + j + ' "' + entries[j].comment +
                    '" share ' + Math.round(ratio * 100) + '% of their keys — both will always fire together.',
                    { op: 'group', pair: [i, j] });
            }
        }
    }

    /* ── order sanity ── */
    var orderBuckets = {};
    for (i = 0; i < entries.length; i++) {
        var o = entries[i].order || 100;
        (orderBuckets[o] = orderBuckets[o] || []).push(i);
    }
    for (k in orderBuckets) {
        if (orderBuckets[k].length >= 4) {
            add('warn', 'order_pileup', null,
                orderBuckets[k].length + ' entries all sit at order=' + k +
                ' — their priority under budget pressure is effectively random.',
                { op: 'reorder' });
            break;
        }
    }

    var sevRank = { error: 0, warn: 1, info: 2 };
    issues.sort(function (x, y) { return sevRank[x.sev] - sevRank[y.sev]; });

    return {
        issues: issues,
        stats: {
            entries: entries.length,
            totalTokens: total,
            constantTokens: constTok,
            errors: issues.filter(function (x) { return x.sev === 'error'; }).length,
            warns: issues.filter(function (x) { return x.sev === 'warn'; }).length,
            infos: issues.filter(function (x) { return x.sev === 'info'; }).length
        }
    };
}


/* ══════════════════════════════════════
   STAGE 1b — SAFE AUTO-FIX (no LLM)
   Everything here is mechanically correct and reversible.
   ══════════════════════════════════════ */

function lbcAutoFix(opts) {
    opts = opts || {};
    var entries = lbcData.entries || [];
    var log = [];
    var i, j;

    /* 1. Rebuild the order ladder from categories, preserving in-tier order. */
    if (opts.reorder !== false) {
        var byCat = {};
        for (i = 0; i < entries.length; i++) {
            var c = entries[i].category || 'Supplementary';
            (byCat[c] = byCat[c] || []).push(i);
        }
        for (var cat in byCat) {
            var base = LBC_ORDER_TIERS[cat];
            if (base === undefined) base = 300;               // unknown custom category
            var list = byCat[cat];
            // keep the author's existing relative ranking inside the tier
            list.sort(function (x, y) { return (entries[y].order || 100) - (entries[x].order || 100); });
            for (j = 0; j < list.length; j++) {
                var newOrder = base - j * LBC_TIER_STEP;
                if (newOrder < 10) newOrder = 10;
                if (entries[list[j]].order !== newOrder) {
                    entries[list[j]].order = newOrder;
                    log.push('#' + list[j] + ' order → ' + newOrder);
                }
            }
        }
    }

    /* 2. Repair selective / keysecondary coherence. */
    if (opts.selective !== false) {
        for (i = 0; i < entries.length; i++) {
            var e = entries[i];
            if ((e.keysecondary || []).length && !e.selective) {
                e.selective = true;
                if (e.selectiveLogic === undefined || e.selectiveLogic === null) e.selectiveLogic = 0; // AND_ANY
                log.push('#' + i + ' selective → true (revives ' + e.keysecondary.length + ' secondary keys)');
            } else if (e.selective && !(e.keysecondary || []).length) {
                e.selective = false;
                log.push('#' + i + ' selective → false (no secondary keys to gate on)');
            }
        }
    }

    /* 3. preventRecursion on heavy entries. */
    if (opts.recursion !== false) {
        for (i = 0; i < entries.length; i++) {
            if (lbcEntryTokens(entries[i]) >= LBC_OPT.bigEntryTokens && !entries[i].preventRecursion) {
                entries[i].preventRecursion = true;
                log.push('#' + i + ' preventRecursion → true');
            }
        }
    }

    /* 4. matchWholeWords for short keys. */
    if (opts.wholeWords !== false) {
        for (i = 0; i < entries.length; i++) {
            var hasShort = (entries[i].key || []).some(function (x) {
                return String(x).trim().length <= LBC_OPT.shortKeyLen;
            });
            if (hasShort && entries[i].matchWholeWords !== true) {
                entries[i].matchWholeWords = true;
                log.push('#' + i + ' matchWholeWords → true');
            }
        }
    }

    /* 5. Drop duplicate keys within a single entry. */
    if (opts.dedupeKeys !== false) {
        for (i = 0; i < entries.length; i++) {
            var seen = {}, out = [], keys = entries[i].key || [];
            for (j = 0; j < keys.length; j++) {
                var lk = String(keys[j]).trim();
                if (!lk) continue;
                if (seen[lk.toLowerCase()]) continue;
                seen[lk.toLowerCase()] = 1;
                out.push(lk);
            }
            if (out.length !== keys.length) {
                entries[i].key = out;
                log.push('#' + i + ' removed ' + (keys.length - out.length) + ' duplicate key(s)');
            }
        }
    }

    /* 6. Auto-group exact duplicate pairs so only one fires per generation. */
    if (opts.group !== false) {
        var audit = lbcAudit();
        var gid = 1;
        audit.issues.forEach(function (iss) {
            if (iss.type !== 'suspected_dupe' || !iss.fix || !iss.fix.pair) return;
            var p = iss.fix.pair;
            if (entries[p[0]].group || entries[p[1]].group) return;
            var name = 'auto_dupe_' + (gid++);
            entries[p[0]].group = name;
            entries[p[1]].group = name;
            entries[p[0]].useGroupScoring = true;
            entries[p[1]].useGroupScoring = true;
            log.push('#' + p[0] + ' + #' + p[1] + ' → inclusion group "' + name + '" (only one fires)');
        });
    }

    saveSett();
    return log;
}


/* ══════════════════════════════════════
   STAGE 2 — LLM PASS (judgment only)
   ══════════════════════════════════════ */

PROMPTS.optimizeKeys =
    '[OOC: You are a SillyTavern World Info / LoreBook OPTIMIZER. You are not writing lore. ' +
    'You are fixing keyword targeting so entries fire at the right time and stop blowing the token budget.\n' +
    'CRITICAL: IGNORE any user persona or chat character. Work ONLY on the data below.\n\n' +
    'HOW SILLYTAVERN ACTIVATION WORKS:\n' +
    '- An entry activates when any "key" appears in recent chat. A common word (e.g. "man", "club", "size") ' +
    'therefore fires constantly and wastes the budget.\n' +
    '- If selective=true, the entry needs a PRIMARY key AND a SECONDARY key present. This is the correct way to gate a large entry.\n' +
    '- Two entries sharing a key always fire together. That is only acceptable if they are in the same inclusion group.\n\n' +
    'RULES:\n' +
    '1. Replace over-generic keys with distinctive, multi-word ones ("cum bath club", not "club").\n' +
    '2. When several entries collide on one key, decide which ONE entry owns it (the most canonical/definitional one) ' +
    'and give the others narrower keys. Never leave the collision.\n' +
    '3. For any entry marked LARGE, propose selective=true plus 5-10 secondary keys that describe the SITUATION ' +
    'in which that entry is actually needed.\n' +
    '4. Keys must be words that would plausibly be typed in roleplay prose. No meta-jargon.\n' +
    '5. Keep keys in the SAME LANGUAGE as the entry content.\n' +
    '6. Do not invent new entries. Do not rewrite content. Only keys, keysecondary, selective, group.\n\n' +
    'DETECTED PROBLEMS:\n{{ISSUES}}\n\n' +
    'ENTRY DIGEST (index | category | tokens | current keys | opening text):\n{{DIGEST}}\n\n' +
    'Respond ONLY with valid JSON. Include ONLY entries you are changing:\n' +
    '{"patches":[{"index":0,"key":["..."],"keysecondary":["..."],"selective":true,"group":"","reason":"one short line"}],' +
    '"duplicates":[{"a":0,"b":1,"reason":"..."}],' +
    '"contradictions":[{"entries":[0,1],"issue":"one short line"}]}\n' +
    'ONLY valid JSON!]';

/* Build a compact digest. We send ~180 chars of each entry, never the full text —
   that is what keeps a 17k-token lorebook inside a single request. */
function lbcBuildDigest(indices) {
    var entries = lbcData.entries;
    return indices.map(function (i) {
        var e = entries[i];
        var tok = lbcEntryTokens(e);
        var txt = (e._origContent || e.content || '').replace(/\s+/g, ' ').trim().substring(0, 180);
        return i + ' | ' + (e.category || '?') + ' | ' + tok + 'tok' +
            (tok >= LBC_OPT.bigEntryTokens ? ' [LARGE]' : '') +
            (e.constant ? ' [CONSTANT - keys ignored]' : '') +
            ' | keys: [' + (e.key || []).join(', ') + ']' +
            ' | sec: [' + (e.keysecondary || []).join(', ') + ']' +
            ' | ' + txt;
    }).join('\n');
}

async function lbcLLMOptimize() {
    if (!genQuiet) throw new Error(T('noLLM'));
    if (!lbcData.entries.length) throw new Error(T('noEntriesToOptimize'));

    var audit = lbcAudit();

    // Only entries that actually have a problem worth an LLM opinion on.
    var relevant = {};
    audit.issues.forEach(function (iss) {
        if (['key_collision', 'generic_key', 'ungated_bomb', 'suspected_dupe', 'no_keys'].indexOf(iss.type) === -1) return;
        if (iss.idx !== null) relevant[iss.idx] = 1;
        if (iss.fix && iss.fix.owners) iss.fix.owners.forEach(function (o) { relevant[o] = 1; });
        if (iss.fix && iss.fix.pair) iss.fix.pair.forEach(function (o) { relevant[o] = 1; });
    });
    var indices = Object.keys(relevant).map(Number).sort(function (a, b) { return a - b; });
    if (!indices.length) return { patches: [], duplicates: [], contradictions: [], skipped: true };

    var issueText = audit.issues
        .filter(function (x) { return x.sev !== 'info'; })
        .slice(0, 40)
        .map(function (x) { return '- [' + x.sev + '] ' + x.msg; })
        .join('\n');

    // Chunk so we never overrun context. Key deconfliction needs global sight,
    // so every chunk also carries the full key registry.
    var CHUNK = 18;
    var allPatches = [], allDupes = [], allContra = [];

    for (var c = 0; c < indices.length; c += CHUNK) {
        var slice = indices.slice(c, c + CHUNK);
        var prompt = PROMPTS.optimizeKeys
            .replace('{{ISSUES}}', issueText || '(none)')
            .replace('{{DIGEST}}', lbcBuildDigest(slice));

        var raw = await lbcGenQuiet(prompt);
        var data = parseJSON(raw);
        if (!data) continue;

        (data.patches || []).forEach(function (p) {
            var idx = parseInt(p.index);
            if (isNaN(idx) || idx < 0 || idx >= lbcData.entries.length) return;
            if (slice.indexOf(idx) === -1) return;   // model wandered outside its chunk
            allPatches.push(p);
        });
        (data.duplicates || []).forEach(function (d) { allDupes.push(d); });
        (data.contradictions || []).forEach(function (d) { allContra.push(d); });
    }

    return { patches: allPatches, duplicates: allDupes, contradictions: allContra, audit: audit };
}

/* Apply only the patches the user ticked. */
function lbcApplyPatches(patches, selectedIdx) {
    var applied = 0;
    for (var i = 0; i < patches.length; i++) {
        if (selectedIdx && selectedIdx.indexOf(i) === -1) continue;
        var p = patches[i];
        var e = lbcData.entries[parseInt(p.index)];
        if (!e) continue;

        if (Array.isArray(p.key) && p.key.length) e.key = p.key.map(function (s) { return String(s).trim(); }).filter(Boolean);
        if (Array.isArray(p.keysecondary)) e.keysecondary = p.keysecondary.map(function (s) { return String(s).trim(); }).filter(Boolean);
        if (typeof p.selective === 'boolean') e.selective = p.selective;
        if (e.selective && (e.selectiveLogic === undefined || e.selectiveLogic === null)) e.selectiveLogic = 0;
        if (typeof p.group === 'string' && p.group) { e.group = p.group; e.useGroupScoring = true; }
        applied++;
    }
    saveSett();
    return applied;
}


/* ══════════════════════════════════════
   STAGE 3 — REPORT / DIFF MODAL
   ══════════════════════════════════════ */

var lbcPendingOpt = null;

function lbcRenderOptimizeModal(result, fixLog) {
    lbcPendingOpt = result;
    var a = result.audit || lbcAudit();
    var s = a.stats;

    var h = '<div id="lbc-opt-overlay"></div><div id="lbc-opt-modal">';
    h += '<div class="lbc-opt-head"><b><i class="fa-solid fa-bolt"></i> ' + esc(T('optimizeTitle')) + '</b>';
    h += '<button class="menu_button" id="lbc-opt-close"><i class="fa-solid fa-xmark"></i></button></div>';

    h += '<div class="lbc-opt-stats">';
    h += '<div class="lbc-stat"><span class="lbc-stat-num">' + s.totalTokens + '</span> tok total</div>';
    h += '<div class="lbc-stat"><span class="lbc-stat-num">' + s.constantTokens + '</span> always-on</div>';
    h += '<div class="lbc-stat lbc-sev-error"><span class="lbc-stat-num">' + s.errors + '</span> errors</div>';
    h += '<div class="lbc-stat lbc-sev-warn"><span class="lbc-stat-num">' + s.warns + '</span> warnings</div>';
    h += '</div>';

    /* Auto-Fix result banner: shown after a fix pass, so the user can see
       exactly what changed instead of the modal vanishing. */
    if (fixLog) {
        if (fixLog.length) {
            h += '<div class="lbc-opt-section">' + esc(T('optFixLog')) + ' (' + fixLog.length + ')</div>';
            h += '<div class="lbc-opt-fixlog">';
            for (var fi = 0; fi < fixLog.length; fi++) h += '<div>' + esc(fixLog[fi]) + '</div>';
            h += '</div>';
        } else {
            h += '<div class="lbc-opt-section">' + esc(T('optFixLog')) + '</div>';
            h += '<div class="lbc-opt-issues"><div class="lbc-opt-issue">' + esc(T('optNothingToFix')) + '</div></div>';
        }
    }

    /* issue list */
    h += '<div class="lbc-opt-section">' + esc(T('optIssues')) + '</div><div class="lbc-opt-issues">';
    a.issues.slice(0, 60).forEach(function (iss) {
        h += '<div class="lbc-opt-issue lbc-sev-' + iss.sev + '">' + esc(iss.msg) + '</div>';
    });
    if (!a.issues.length) h += '<div style="opacity:.5;padding:8px">' + esc(T('optClean2')) + '</div>';
    h += '</div>';

    /* contradictions — content-level, informational only */
    if (result.contradictions && result.contradictions.length) {
        h += '<div class="lbc-opt-section">' + esc(T('optContradictions')) + '</div><div class="lbc-opt-issues">';
        result.contradictions.forEach(function (c) {
            h += '<div class="lbc-opt-issue lbc-sev-warn">#' + (c.entries || []).join(' ↔ #') + ' — ' + esc(c.issue || '') + '</div>';
        });
        h += '</div>';
    }

    /* patch diff */
    h += '<div class="lbc-opt-section">' + esc(T('optProposed')) + '</div>';
    if (!result.patches || !result.patches.length) {
        // Distinguish "Audit only, LLM was never called" from "LLM ran, found nothing".
        var needsLLM = a.issues.some(function (x) {
            return ['key_collision', 'generic_key', 'suspected_dupe', 'no_keys', 'ungated_bomb'].indexOf(x.type) !== -1;
        });
        var msg = result.llmRan ? T('optNoPatches') : (needsLLM ? T('optRunOptimize') : T('optNoPatches'));
        h += '<div style="opacity:.5;padding:8px">' + esc(msg) + '</div>';
    } else {
        h += '<div class="lbc-opt-patches">';
        result.patches.forEach(function (p, pi) {
            var e = lbcData.entries[parseInt(p.index)];
            if (!e) return;
            h += '<label class="lbc-opt-patch"><input type="checkbox" class="lbc-opt-cb" data-pi="' + pi + '" checked>';
            h += '<div><b>#' + p.index + ' ' + esc(e.comment || '') + '</b>';
            if (p.reason) h += '<div class="lbc-opt-reason">' + esc(p.reason) + '</div>';
            if (p.key) {
                h += '<div class="lbc-opt-diff"><span class="lbc-old">− ' + esc((e.key || []).join(', ')) + '</span>';
                h += '<span class="lbc-new">+ ' + esc(p.key.join(', ')) + '</span></div>';
            }
            if (p.keysecondary && p.keysecondary.length) {
                h += '<div class="lbc-opt-diff"><span class="lbc-new">+ sec: ' + esc(p.keysecondary.join(', ')) + '</span></div>';
            }
            if (typeof p.selective === 'boolean' && p.selective !== e.selective) {
                h += '<div class="lbc-opt-diff"><span class="lbc-new">+ selective: ' + p.selective + '</span></div>';
            }
            h += '</div></label>';
        });
        h += '</div>';
    }

    h += '<div class="lbc-opt-foot">';
    // Auto-Fix is pointless once the mechanical issues are gone.
    var fixable = a.issues.some(function (x) {
        return ['dead_secondary', 'empty_selective', 'token_bomb', 'short_key',
                'dupe_key_self', 'order_pileup', 'suspected_dupe'].indexOf(x.type) !== -1;
    });
    if (fixable) {
        h += '<button class="menu_button" id="lbc-opt-autofix"><i class="fa-solid fa-screwdriver-wrench"></i> ' + esc(T('optAutoFix')) + '</button>';
    }
    // Offer the LLM pass straight from the modal when only judgment calls remain.
    if (!result.llmRan && !fixable && a.issues.length) {
        h += '<button class="menu_button lbc-optimize-btn"><i class="fa-solid fa-bolt"></i> ' + esc(T('optimize')) + '</button>';
    }
    h += '<div style="flex:1"></div>';
    if (result.patches && result.patches.length) {
        h += '<button class="menu_button lbc-btn-success" id="lbc-opt-apply"><i class="fa-solid fa-check"></i> ' + esc(T('optApply')) + '</button>';
    }
    h += '</div></div>';

    $('#lbc-opt-modal, #lbc-opt-overlay').remove();
    document.body.insertAdjacentHTML('beforeend', h);
}

/* ── modal events (bind once, inside bindPanelEvents) ── */
function lbcBindOptimizerEvents() {
    $(document).on('click', '#lbc-opt-close, #lbc-opt-overlay', function () {
        $('#lbc-opt-modal, #lbc-opt-overlay').remove();
        lbcPendingOpt = null;
    });

    $(document).on('click', '#lbc-opt-autofix', function () {
        var log = lbcAutoFix({});
        L('AutoFix log:', log);
        renderBody();                       // refresh the entry list behind the modal
        showStatus(T('optAutoFixed') + ' (' + log.length + ')', 'success');
        // Stay open and re-render with a fresh audit, so the user can see what
        // changed and what is left, instead of the modal disappearing.
        var carried = lbcPendingOpt || {};
        lbcRenderOptimizeModal({
            patches: carried.patches || [],
            duplicates: carried.duplicates || [],
            contradictions: carried.contradictions || [],
            llmRan: !!carried.llmRan,
            audit: lbcAudit()
        }, log);
    });

    $(document).on('click', '#lbc-opt-apply', function () {
        if (!lbcPendingOpt) return;
        var sel = [];
        $('.lbc-opt-cb:checked').each(function () { sel.push(parseInt($(this).data('pi'))); });
        var n = lbcApplyPatches(lbcPendingOpt.patches || [], sel);
        $('#lbc-opt-modal, #lbc-opt-overlay').remove();
        lbcPendingOpt = null;
        renderBody();
        showStatus(T('optApplied') + ': ' + n, 'success');
    });

    /* toolbar button (also rendered inside the modal footer) */
    $(document).on('click', '.lbc-optimize-btn', async function () {
        if (lbcBusy) return;
        $('#lbc-opt-modal, #lbc-opt-overlay').remove();   // if fired from inside the modal
        lbcPendingOpt = null;
        lbcBusy = true;
        var $b = $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + T('optimizing'));
        try {
            var res = await lbcLLMOptimize();
            res.llmRan = true;
            lbcRenderOptimizeModal(res);
        } catch (err) {
            E(err);
            showStatus(err.message, 'error');
        }
        lbcBusy = false;
        $b.prop('disabled', false).html('<i class="fa-solid fa-bolt"></i> ' + esc(T('optimize')));
    });

    /* audit-only: instant, no LLM call at all */
    $(document).on('click', '.lbc-audit-btn', function () {
        lbcRenderOptimizeModal({ patches: [], duplicates: [], contradictions: [], llmRan: false, audit: lbcAudit() });
    });
}

/* ══════════════════════════════════════
   LOREBOOK FROM LORE  (v1.11)

   Character Library hands over { world, entries, wholeWorld } from its
   lorebook browser; the user picks a mode, the LLM builds a NEW standalone
   lorebook out of that canon and it lands in the editor as a fresh draft.
   ══════════════════════════════════════ */

var lbcFLState = null;

var LBC_FL_MODES = {
    deep: 'DEEP-DIVE. Unpack the source entries into a full standalone lorebook: split dense entries apart, give every named person, place, faction and concept its own entry, and add the connective tissue (history, rules, relations) that the source implies but never states. Do NOT invent an unrelated new setting — stay inside exactly this material.',
    spin: 'SPIN-OFF. Grow a NEW corner of the same universe out of the source canon: a new location, faction, era or storyline that is consistent with the source entries and clearly connected to them, yet stands as its own lorebook. Reuse source names only where the connection needs them; the bulk of the entries must be new.',
    clean: 'RESTRUCTURE. Rebuild ONLY the source material into a clean standalone lorebook: deduplicate, harmonize naming, tone and terminology, fix trigger keys, split or merge entries where the structure demands it. Invent nothing beyond minimal connective wording.',
};

function lbcFLSourceBlock(entries) {
    var CONTENT_CAP = 700;
    return entries.map(function (e, i) {
        var c = String(e.content || '').replace(/\s+/g, ' ').trim();
        if (c.length > CONTENT_CAP) c = c.substring(0, CONTENT_CAP) + '…';
        return (i + 1) + '. ' + (e.title || 'Untitled') +
            ' (keys: ' + (e.keys || []).join(', ') + ')\n   ' + c;
    }).join('\n');
}

function lbcShowFromLoreModal(payload) {
    $('#lbc-fl-modal, #lbc-fl-overlay').remove();
    var entries = (payload && payload.entries) ? payload.entries : [];
    if (!entries.length) { showStatus(T('flNoSources'), 'error'); return; }
    lbcFLState = { world: payload.world || '', entries: entries, off: {} };

    var chips = entries.map(function (e, i) {
        var c = String(e.content || '').replace(/\s+/g, ' ').trim();
        return '<div class="lbc-fl-entry" data-i="' + i + '">'
            + '<div class="lbc-fl-etitle">' + esc(e.title || 'Untitled') + '</div>'
            + '<div class="lbc-fl-etext">' + esc(c.substring(0, 160)) + (c.length > 160 ? '…' : '') + '</div>'
            + '</div>';
    }).join('');

    var h = '<div id="lbc-fl-overlay"></div><div id="lbc-fl-modal">';
    h += '<div class="lbc-opt-head"><b><i class="fa-solid fa-book-medical"></i> ' + esc(T('flTitle')) + ' — ' + esc(lbcFLState.world) + '</b>';
    h += '<button class="menu_button" id="lbc-fl-close"><i class="fa-solid fa-xmark"></i></button></div>';
    h += '<div class="lbc-fl-body">';
    h += '<div class="lbc-opt-section">' + esc(T('flSources')) + ' (' + entries.length + ')</div>';
    h += '<div class="lbc-fl-entries">' + chips + '</div>';
    h += '<div class="lbc-fl-grid">';
    h += '<div><label class="lbc-fl-lbl">' + esc(T('flMode')) + '</label><select id="lbc-fl-mode" class="text_pole">';
    h += '<option value="deep" selected>' + esc(T('flModeDeep')) + '</option>';
    h += '<option value="spin">' + esc(T('flModeSpin')) + '</option>';
    h += '<option value="clean">' + esc(T('flModeClean')) + '</option></select></div>';
    h += '<div><label class="lbc-fl-lbl">' + esc(T('flCount')) + '</label><select id="lbc-fl-count" class="text_pole">';
    h += '<option value="10">~10</option><option value="20" selected>~20</option><option value="30">~30</option><option value="40">~40</option></select></div>';
    h += '</div>';
    h += '<label class="lbc-fl-lbl">' + esc(T('flName')) + '</label>';
    h += '<input id="lbc-fl-name" class="text_pole" />';
    h += '<label class="lbc-fl-lbl">' + esc(T('flFocus')) + '</label>';
    h += '<textarea id="lbc-fl-focus" class="text_pole" rows="2" placeholder="e.g. focus on House politics, ignore the war"></textarea>';
    h += '</div>';
    h += '<div class="lbc-fl-foot">';
    h += '<span id="lbc-fl-status" class="lbc-fl-muted"></span>';
    h += '<button class="menu_button" id="lbc-fl-gen"><i class="fa-solid fa-bolt"></i> ' + esc(T('flGenerate')) + '</button>';
    h += '</div></div>';

    $('body').append(h);
    $('#lbc-fl-close, #lbc-fl-overlay').on('click', function () {
        $('#lbc-fl-modal, #lbc-fl-overlay').remove(); lbcFLState = null;
    });
    $('#lbc-fl-modal').on('click', '.lbc-fl-entry', function () {
        var i = parseInt($(this).data('i'));
        lbcFLState.off[i] = !lbcFLState.off[i];
        $(this).toggleClass('lbc-fl-off', !!lbcFLState.off[i]);
    });
    $('#lbc-fl-gen').on('click', function () { lbcRunFromLore(); });
}

async function lbcRunFromLore() {
    if (!lbcFLState || lbcBusy) return;
    if (!genQuiet) { $('#lbc-fl-status').text(T('noLLM')); return; }

    var picked = lbcFLState.entries.filter(function (e, i) { return !lbcFLState.off[i]; });
    if (!picked.length) { $('#lbc-fl-status').text(T('flNoSources')); return; }

    var mode = $('#lbc-fl-mode').val() || 'deep';
    var focus = ($('#lbc-fl-focus').val() || '').trim();
    var forcedName = ($('#lbc-fl-name').val() || '').trim();

    var prompt = PROMPTS.lorebookFromLore
        .replace('{{SOURCE_WORLD}}', lbcFLState.world || 'unknown')
        .replace('{{SOURCE_ENTRIES}}', lbcFLSourceBlock(picked))
        .replace('{{MODE_TASK}}', LBC_FL_MODES[mode] || LBC_FL_MODES.deep)
        .replace('{{FOCUS_BLOCK}}', focus ? ('USER DIRECTIVE (obey): ' + focus + '\n\n') : '')
        .replace('{{TARGET_COUNT}}', $('#lbc-fl-count').val() || '20');

    lbcBusy = true;
    var $b = $('#lbc-fl-gen').prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(T('flBuilding')));
    $('#lbc-fl-status').text('');
    try {
        var raw = await lbcGenQuiet(prompt);
        var data = parseJSON(raw);
        if (!data || !data.entries || !Array.isArray(data.entries) || !data.entries.length)
            throw new Error(T('flFailed'));

        if (lbcData.entries && lbcData.entries.length) {
            if (!confirm(T('flReplaceConfirm'))) throw new Error('Cancelled.');
        }

        var built = normalizeEntries(data.entries);
        await translateEntriesIfNeeded(built);

        lbcData.entries = built;
        lbcData.worldName = forcedName || data.worldName || ((lbcFLState.world || 'Lore') + ' — Derived');
        lbcData.worldDescription = data.worldDescription || '';
        /* fresh draft, not an existing ST world */
        lbcData._origWorldName = lbcData.worldName;
        lbcData._origWorldDesc = lbcData.worldDescription;
        lbcData._loadedWorld = null;
        if (lbcData._translated && translateFn) {
            lbcData.worldName = await tr(lbcData.worldName);
            if (lbcData.worldDescription) lbcData.worldDescription = await tr(lbcData.worldDescription);
        }

        lbcAdoptCategories();
        $('#lbc-fl-modal, #lbc-fl-overlay').remove();
        lbcFLState = null;
        lbcShowEntries();
        showStatus(T('flDone') + ' — ' + built.length + ' ' + T('entriesWord'), 'success');
    } catch (err) {
        E('fromLore:', err);
        $('#lbc-fl-status').text(err.message);
    }
    lbcBusy = false;
    $b.prop('disabled', false).html('<i class="fa-solid fa-bolt"></i> ' + esc(T('flGenerate')));
}

/* ══════════════════════════════════════
   BRIDGE — public API for Character Library
     window.LorebookCreator.openWorld({ world })   // load an existing ST world
     window.LorebookCreator.open()                 // just open the panel
     window.LorebookCreator.createFromLore({ world, entries })  // build a NEW book from lore
   ══════════════════════════════════════ */

/* Pulls a world straight out of SillyTavern (no file picker) and turns it
   into editable lbcData.entries via the same parser the importer uses. */
async function lbcFetchWorld(name) {
    var headers = await getHeaders();
    var r = await fetch('/api/worldinfo/get', {
        method: 'POST', headers: headers, body: JSON.stringify({ name: name }),
    });
    if (!r.ok) throw new Error('Cannot load "' + name + '" (HTTP ' + r.status + ')');
    return await r.json();
}

function lbcAdoptCategories() {
    if (!lbcData.customCategories) lbcData.customCategories = [];
    lbcData.entries.forEach(function (en) {
        var c = (en.category || '').trim();
        if (!c) return;
        var lc = c.toLowerCase();
        var builtin = ENTRY_CATEGORIES.some(function (x) { return x.toLowerCase() === lc; });
        var have = lbcData.customCategories.some(function (x) { return x.toLowerCase() === lc; });
        if (!builtin && !have) lbcData.customCategories.push(c);
    });
}

function lbcShowEntries() {
    lbcData.mode = 'advanced';
    lbcData.activeTab = 'entries';
    $('.lbc-mode-btn').removeClass('active');
    $('.lbc-mode-btn[data-mode="advanced"]').addClass('active');
    $('#lbc-tabs').show();
    $('.lbc-tab').removeClass('active');
    $('.lbc-tab[data-tab="entries"]').addClass('active');
    if (typeof updateFooterButtons === 'function') updateFooterButtons();
    renderBody();
}

async function lbcOpenWorld(p) {
    var name = (typeof p === 'string') ? p : (p && (p.world || p.name));
    try {
        togglePanel(true);
        if (!name) return;

        if (lbcData.entries && lbcData.entries.length && lbcData.worldName !== name) {
            if (!confirm('Replace the ' + lbcData.entries.length + ' entries currently in the editor with "' + name + '"?')) {
                return;
            }
        }

        showStatus('Loading "' + name + '"...', 'info');
        var json = await lbcFetchWorld(name);
        var imported = parseLorebookEntries(json);
        if (!imported.length) { showStatus('"' + name + '" has no entries.', 'error'); return; }

        lbcData.entries = imported;
        lbcData.worldName = name;
        lbcData._origWorldName = name;
        lbcData._loadedWorld = name;   // marks this as an existing ST world, not a fresh draft

        lbcAdoptCategories();
        lbcShowEntries();
        showStatus('Loaded "' + name + '" — ' + imported.length + ' ' + T('entriesWord'), 'success');
    } catch (e) {
        E('openWorld:', e);
        showStatus('Failed: ' + e.message, 'error');
    }
}

function exposeLBCApi() {
    window.LorebookCreator = {
        version: '1.12.0',
        open: function () { togglePanel(true); },
        close: function () { togglePanel(false); },
        openWorld: lbcOpenWorld,
        load: lbcOpenWorld,
        createFromLore: function (p) { togglePanel(true); lbcShowFromLoreModal(p || {}); },
        getData: function () { return lbcData; },
    };
    L('Public API exposed (window.LorebookCreator)');
}
