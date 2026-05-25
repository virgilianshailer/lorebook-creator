/*
 *  LoreBook Creator v1.4.0 — SillyTavern Extension
 *  Create World Info / LoreBook entries via LLM with simple & advanced modes.
 *  Full translation support via Chat Translation extension.
 *  Template loading, era/type/scale parameters, per-field LLM generation,
 *  user role, category system, export/import, generated content translation.
 *  Added: Enhance & Expand entries and text fields.
 *  Added: Add More / Extend (➕) to append new entities to existing fields.
 *  Fix: Prevent User Persona / Character description leaking into generation.
 */

/* ══════════════════════════════════════
   MODULE GLOBALS
   ══════════════════════════════════════ */

var LBC_MODULE = 'lorebook-creator';
var lbcSettings = null;
var extSettings = null;
var saveFn = null;
var scriptModule = null;
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
    entryEnhanced: 'Entry enhanced and expanded!',
    enhanceEntry: 'Enhance & Expand',
    fieldEnhanced: 'Field enhanced and expanded!',
    enhanceField: 'Enhance & Expand field',
    addMoreField: 'Add More / Extend',
    fieldAddedMore: 'New data added to field!'
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

    enhanceEntry:
        '[OOC: You are a creative world-building assistant. Your task is to deeply ENHANCE and EXPAND the following LoreBook entry.\n\n' +
        'WORLD CONTEXT:\n{{WORLD_PARAMS}}\n\n' +
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
        'ONLY JSON!]'
};

/* ══════════════════════════════════════
   DEFAULTS
   ══════════════════════════════════════ */

var LBC_DEFAULTS = {
    enabled: true,
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
        L('Ready! quiet:', !!genQuiet, 'translate:', !!translateFn);
    } catch (e) { E('Init:', e); }
}

async function loadModules() {
    try {
        var m = await import('../../../extensions.js');
        extSettings = m.extension_settings;
        saveFn = m.saveSettingsDebounced;
    } catch (e) { E('ext.js:', e.message); }
    try {
        scriptModule = await import('../../../../script.js');
        if (typeof scriptModule.generateQuietPrompt === 'function') genQuiet = scriptModule.generateQuietPrompt;
    } catch (e) { E('script.js:', e.message); }
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
    if (scriptModule && typeof scriptModule.getRequestHeaders === 'function')
        try { return scriptModule.getRequestHeaders(); } catch (e) {}
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
            probability: e.probability
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

    var prompt = PROMPTS.enhanceEntry
        .replace('{{WORLD_PARAMS}}', gatherWorldParams())
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
   ENTRY NORMALIZATION
   ══════════════════════════════════════ */

function normalizeEntry(raw) {
    return {
        comment: raw.comment || 'Untitled Entry',
        key: Array.isArray(raw.key) ? raw.key : (typeof raw.key === 'string' ? raw.key.split(',').map(function (s) { return s.trim(); }) : []),
        keysecondary: Array.isArray(raw.keysecondary) ? raw.keysecondary : [],
        content: raw.content || '',
        category: raw.category || 'Supplementary',
        constant: !!raw.constant,
        selective: !!raw.selective,
        order: parseInt(raw.order) || 100,
        position: parseInt(raw.position) || 0,
        depth: parseInt(raw.depth) || 4,
        disable: false,
        probability: (raw.probability !== undefined && raw.probability !== null) ? (parseInt(raw.probability) || 100) : 100
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
            constant: !!e.constant, selective: !!e.selective, selectiveLogic: 0,
            addMemo: true, order: e.order || 100, position: e.position || 0,
            disable: !!e.disable, probability: e.probability || 100, useProbability: true,
            depth: e.depth || 4, sticky: 0, vectorized: false, ignoreBudget: false,
            excludeRecursion: false,
            preventRecursion: (e.category === 'Core Rule' || e.category === 'Core Concept'),
            displayIndex: i, matchPersonaDescription: false, matchCharacterDescription: false,
            matchCharacterPersonality: false, matchCharacterDepthPrompt: false,
            matchScenario: false, matchCreatorNotes: false, delayUntilRecursion: 0,
            outletName: '', group: '', groupOverride: false, groupWeight: 100,
            scanDepth: null, caseSensitive: null, matchWholeWords: null,
            useGroupScoring: null, automationId: '',
            role: e.position === 4 ? 0 : null,
            cooldown: null, delay: null, triggers: [],
            characterFilter: { isExclude: false, names: [], tags: [] }
        };
    }
    return result;
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
    if (scriptModule && typeof scriptModule.getRequestHeaders === 'function') {
        try {
            var rh = scriptModule.getRequestHeaders();
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
    $(document).on('click', '#lbc-h-reset', function () {
        if (!confirm(T('resetConfirm'))) return;
        resetData(); renderBody(); showStatus(T('resetDone'), 'info');
    });
    $(document).on('click', '#lbc-h-tr', doTranslateToggle);

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

    $(document).on('click', '.lbc-add-entry-cat', async function () {
        if (lbcBusy) return;
        var cat = $(this).data('cat');
        lbcBusy = true;
        $(this).prop('disabled', true).html('<i class="fa-solid fa-circle-notch fa-spin"></i>');
        try {
            await doGenerateSingleEntry(cat, '');
            renderBody(); showStatus(cat + ' ' + T('entryCreated'), 'success');
        } catch (e) { showStatus(e.message, 'error'); }
        lbcBusy = false;
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
        lbcData.editingEntryIdx = parseInt($(this).data('idx')); renderBody();
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
}

function togglePanel(show) {
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
        else if (k === 'editingEntryIdx') lbcData.editingEntryIdx = -1;
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
    v = $('#lbc-ed-category').val(); if (v !== undefined) e.category = v;
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
    h += '<div class="lbc-section-title">💡 ' + esc(T('describeWorld')) + '</div>';
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
    h += '<button class="menu_button lbc-btn-warning" id="lbc-editor-enhance" title="' + esc(T('enhanceEntry')) + '">✨ ' + esc(T('enhanceEntry')) + '</button>';
    h += '<button class="menu_button lbc-btn-success" id="lbc-editor-save"><i class="fa-solid fa-check"></i> ' + esc(T('save')) + '</button>';
    h += '</div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('titleComment')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-comment" value="' + esc(e.comment || '') + '"></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('category')) + '</div>';
    h += '<select class="lbc-select" id="lbc-ed-category">';
    
    var catsForSelect = ENTRY_CATEGORIES.slice();
    if (e.category && catsForSelect.indexOf(e.category) === -1) {
        catsForSelect.push(e.category); 
    }
    
    for (var ci = 0; ci < catsForSelect.length; ci++) {
        h += '<option value="' + esc(catsForSelect[ci]) + '"' + (e.category === catsForSelect[ci] ? ' selected' : '') + '>' + esc(catsForSelect[ci]) + '</option>';
    }
    h += '</select></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('primaryKeys')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-keys" value="' + esc((e.key || []).join(', ')) + '"></div>';

    h += '<div class="lbc-field"><div class="lbc-field-label">' + esc(T('secondaryKeys')) + '</div>';
    h += '<input class="lbc-input" id="lbc-ed-keys2" value="' + esc((e.keysecondary || []).join(', ')) + '"></div>';

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
    $(document).on('click', '#lbc-trigger', function () { if (lbcSettings.enabled) togglePanel(true); });
    syncBtn();
}

function syncBtn() { $('#lbc-trigger').toggle(!!(lbcSettings.enabled && lbcSettings.showButton)); }

function buildSettingsPanel() {
    var $c = $('#extensions_settings2'); if (!$c.length) $c = $('#extensions_settings'); if (!$c.length) return;
    var h = '<div id="lbc-settings"><div class="inline-drawer">';
    h += '<div class="inline-drawer-toggle inline-drawer-header"><b><i class="fa-solid fa-book-atlas"></i> LoreBook Creator</b>';
    h += '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>';
    h += '<div class="inline-drawer-content">';
    h += '<div class="lbc-srow"><label class="checkbox_label"><input type="checkbox" id="lbc-s-on"><span>Enable</span></label></div>';
    h += '<div class="lbc-srow"><label class="checkbox_label"><input type="checkbox" id="lbc-s-btn"><span>Show chat button</span></label></div>';
    h += '<hr>';
    h += '<div class="lbc-srow"><label>Panel Position</label><select id="lbc-s-pos" class="text_pole" style="max-width:200px"><option value="right">Right Drawer</option><option value="center">Center Modal</option></select></div>';
    h += '<hr>';
    h += '<div class="lbc-srow"><input type="button" class="menu_button" id="lbc-s-open" value="Open LoreBook Creator"></div>';
    h += '<small style="opacity:.4;display:block;margin-top:6px;font-size:11px">Create World Info lorebooks with LLM. Simple & Advanced modes. Template support. Translation via Chat Translation extension.</small>';
    h += '</div></div></div>';
    $c.append(h);

    $('#lbc-s-on').prop('checked', lbcSettings.enabled).on('change', function () { lbcSettings.enabled = this.checked; saveSett(); syncBtn(); });
    $('#lbc-s-btn').prop('checked', lbcSettings.showButton).on('change', function () { lbcSettings.showButton = this.checked; saveSett(); syncBtn(); });
    $('#lbc-s-pos').val(lbcSettings.panelPosition).on('change', function () { lbcSettings.panelPosition = this.value; saveSett(); applyPanelPosition(); });
    $('#lbc-s-open').on('click', function () { togglePanel(true); });
}
