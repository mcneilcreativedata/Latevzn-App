// ============================================================================
// Latevzn — app logic
// ----------------------------------------------------------------------------
// This file draws the screens and wires everything together:
//   1. Shows the home screen (a list of the guide's sections).
//   2. Shows a placeholder screen when you tap into a section.
//   3. Turns on the "service worker" so the app can work offline.
//
// It is written in plain JavaScript and runs straight in the browser —
// there is no build step.
// ============================================================================

import { SECTIONS, getSection } from './data.js';
import { startRouter } from './router.js';
import { addResponse, listResponses, setState, getState, readAllData, addPhoto, listPhotos, deletePhoto } from './db.js';

// The element on the page where every screen is drawn.
const appEl = document.getElementById('app');

// ---- The one section that is wired up so far -----------------------------
// For now the section and its prompt live here as plain constants. Note that
// the address slug (`route`) and the database id (`sectionId`) are allowed to
// differ — the home screen links to `your-working-method`, but entries are
// stored under `working-method`.
const WORKING_METHOD = {
  route: 'your-working-method', // matches the id in data.js (the web address)
  sectionId: 'working-method',  // how entries are labelled in the database
  blockId: 'this-week-noticed', // which prompt within the section
  prompt: 'This week I noticed:',
};

// ---- The "Why I Photograph" section --------------------------------------
// Unlike Working Method, this section is "save-in-place": it holds the person's
// current answers and overwrites each one when it changes. Each input has its
// own key in the "states" table. To change the intro passage, the prompt, or a
// check-in label later, edit them here.
const WHY_I_PHOTOGRAPH = {
  route: 'why-i-photograph', // matches the id in data.js (the web address)

  // The static passage shown at the top, as separate paragraphs.
  passage: [
    'I do not believe my voice is something I invent all at once. I believe it is something I uncover through repetition, attention, curiosity, and the photographs I keep returning to.',
    'Right now, my strongest pull seems to be toward images that preserve what it felt like to exist somewhere: a room, a doorway, a window, a quiet interaction, a body inside a space, a patch of light across a wall.',
    'I am drawn to film because it asks me to slow down. But film is not the entire identity. It is one way of practicing attention.',
    'I want to make work that feels personal without becoming closed off. I want to attract clients who are not just asking for photographs, but responding to a way of seeing.',
  ],

  rewritePrompt: 'Rewrite this in my own words:',
  rewriteKey: 'why-i-photograph:rewrite',

  checkinHeading: 'Quick check-in',
  // Each item stores two values: whether its box is ticked, and its answer.
  checkins: [
    {
      label: 'What would I photograph even if nobody saw it?',
      checkedKey: 'why-i-photograph:checkin-1:checked',
      answerKey: 'why-i-photograph:checkin-1:answer',
    },
    {
      label: 'What kinds of scenes make me instinctively reach for the camera?',
      checkedKey: 'why-i-photograph:checkin-2:checked',
      answerKey: 'why-i-photograph:checkin-2:answer',
    },
    {
      label: 'What kind of client would understand this work without needing me to over-explain it?',
      checkedKey: 'why-i-photograph:checkin-3:checked',
      answerKey: 'why-i-photograph:checkin-3:answer',
    },
  ],
};

// ---- The "What My Work Is Telling Me" section ----------------------------
// Same save-in-place pattern as Why I Photograph. Each item shows a fixed
// title + description (read-only), then two saved inputs: a single-choice
// picker (Agree / Unsure / Disagree) and an evidence text box. The keys below
// are how each input is stored in the "states" table. To change the wording
// later, edit it here.
const WHAT_MY_WORK = {
  route: 'what-my-work-is-telling-me', // matches the id in data.js

  // The single-choice options, shown left to right under each item.
  choiceOptions: [
    { value: 'agree', label: 'Agree' },
    { value: 'unsure', label: 'Unsure' },
    { value: 'disagree', label: 'Disagree' },
  ],
  evidenceLabel: 'Evidence from my own images:',

  items: [
    {
      title: 'Atmosphere before subject',
      description: 'Your strongest images often make the viewer notice the room, light, air, and silence before they fully settle on the subject. This is not a weakness; it may be part of your point of view.',
    },
    {
      title: 'People in places',
      description: 'The people in your images often feel connected to the architecture around them. The environment does not simply decorate the portrait; it becomes part of the portrait.',
    },
    {
      title: 'Thresholds',
      description: 'Doorways, windows, balconies, stairs, and interior/exterior transitions keep appearing. These spaces suggest movement, memory, waiting, privacy, and possibility.',
    },
    {
      title: 'Quiet over spectacle',
      description: 'Your work often becomes strongest when it does not try too hard to impress. Stillness may be one of your strongest tools.',
    },
    {
      title: 'Light as character',
      description: 'You often let light do emotional work. The question going forward is how to make sure light serves the idea rather than becoming the whole idea.',
    },
  ],
};

// ---- The "Attracting the Right Clients" section --------------------------
// Save-in-place, like the sections above. Two checkbox lists plus two free-text
// boxes. Each checkbox and box is stored under its own key in the "states"
// table. To change the wording later, edit it here.
const ATTRACTING_CLIENTS = {
  route: 'attracting-the-right-clients', // matches the id in data.js
  intro: 'The goal is alignment, not volume.',

  positioningHeading: 'Possible positioning language',
  positioning: [
    'Narrative portraits rooted in light, atmosphere, and place.',
    'Cinematic portraits and quiet stories on film and digital.',
    'People, places, and ordinary moments photographed with atmosphere.',
    'Narrative portrait photographer based in NYC.',
    'Light. Place. People. Quiet stories.',
  ],

  favoriteLabel: 'My favorite version / edits',
  favoriteKey: 'attracting-the-right-clients:favorite-version',

  clientTypesHeading: 'Aligned client types to test',
  clientTypes: [
    'Couples who want documentary feeling over posed perfection',
    'Artists and musicians',
    'Independent restaurants or cafes with atmosphere',
    'Boutique hotels and interior spaces',
    'Small fashion or lifestyle brands',
    'Writers, designers, makers, and creative professionals',
    'Editorial stories about people and place',
  ],

  respondedLabel: 'Who has responded well to my work so far?',
  respondedKey: 'attracting-the-right-clients:responded-well',
};

// ---- The "Bio Experiments" section ---------------------------------------
// Save-in-place: one checkbox list plus one free-text box.
const BIO_EXPERIMENTS = {
  route: 'bio-experiments', // matches the id in data.js
  intro: 'Try language. Do not marry it too soon.',

  bios: [
    'Narrative Portrait Photographer | NYC | Book below',
    'Quiet stories on film + digital | NYC',
    'Narrative portraits rooted in light, place, and atmosphere | NYC',
    'Light. Place. People. | NYC',
    'Cinematic portraits + quiet documentary work | NYC',
  ],

  mostTrueLabel: 'What feels most true right now?',
  mostTrueKey: 'bio-experiments:most-true',
};

// ---- The "Photo Plates" section ------------------------------------------
// A simple photo journal: add a photo, it is shrunk and saved on the device,
// and saved photos show newest first.
const PHOTO_PLATES = {
  route: 'photo-plates', // matches the id in data.js
  maxSide: 1600,         // longest side (in pixels) to shrink photos down to
  jpegQuality: 0.8,      // JPEG quality when re-saving the shrunk photo
};

// ---- The "How to Make Fewer Middle Photos" section -----------------------
// Save-in-place: two text boxes and two checkbox groups.
const HOW_TO_FEWER = {
  route: 'how-to-make-fewer-middle-photos', // matches the id in data.js

  aboutLabel: 'This photograph is about ___',
  aboutKey: 'how-to-make-fewer-middle-photos:about',

  dominanceChecks: [
    { label: 'Environment dominates', key: 'how-to-make-fewer-middle-photos:environment-dominates:checked' },
    { label: 'Person dominates', key: 'how-to-make-fewer-middle-photos:person-dominates:checked' },
  ],

  choseLabel: 'What I chose and why',
  choseKey: 'how-to-make-fewer-middle-photos:what-i-chose:answer',

  processChecks: [
    { label: 'Wide version made', key: 'how-to-make-fewer-middle-photos:wide-made:checked' },
    { label: 'Close version made', key: 'how-to-make-fewer-middle-photos:close-made:checked' },
    { label: 'I chose the stronger frame', key: 'how-to-make-fewer-middle-photos:chose-stronger:checked' },
    { label: "I can explain why it's stronger in one sentence", key: 'how-to-make-fewer-middle-photos:can-explain:checked' },
  ],
};

// ---- The "Study Library" section -----------------------------------------
// Save-in-place: three checkbox groups (each item shows a name/title with a
// short read-only description) plus one notes box. Keys are stable per index;
// the descriptions are display only and are not stored.
const STUDY_LIBRARY = {
  route: 'study-library', // matches the id in data.js

  groups: [
    {
      heading: 'Cinematographers',
      keyPrefix: 'study-library:cinematographer',
      items: [
        { label: 'Roger Deakins', description: 'Simplicity, negative space, precise framing, clean visual decisions. Watch: No Country for Old Men, Skyfall, 1917, Blade Runner 2049' },
        { label: 'Greig Fraser', description: 'Darkness, atmosphere, selective light, mood without over-explaining. Watch: The Batman, Dune, Lion' },
        { label: 'Hoyte van Hoytema', description: 'Scale, natural light, distance, human figures inside large worlds. Watch: Her, Interstellar, Oppenheimer' },
        { label: 'Christopher Doyle', description: 'Color, repetition, hallways, mood, imperfect emotional energy. Watch: In the Mood for Love, Chungking Express' },
        { label: 'Bradford Young', description: 'Soft naturalism, intimacy, skin, shadow, emotional restraint. Watch: Arrival, Selma' },
      ],
    },
    {
      heading: 'Photographers',
      keyPrefix: 'study-library:photographer',
      items: [
        { label: 'Todd Hido', description: 'Homes, windows, loneliness, weather, emotional atmosphere.' },
        { label: 'Saul Leiter', description: 'Layering, reflections, color, obstruction, everyday poetry.' },
        { label: 'Alec Soth', description: 'Quiet narrative documentary, people and place, emotional distance.' },
        { label: 'Rinko Kawauchi', description: 'Ordinary beauty, light, small details, delicacy.' },
        { label: 'Gregory Crewdson', description: 'Constructed scenes where every object contributes to story.' },
        { label: 'Harry Gruyaert', description: 'Color relationships, light, place, strong graphic compositions.' },
        { label: 'Cig Harvey', description: 'Domestic poetry, color, mood, intimate visual language.' },
      ],
    },
    {
      heading: 'Film Study List',
      keyPrefix: 'study-library:film',
      items: [
        { label: 'Perfect Days', description: 'Routine, quiet, windows, small gestures.' },
        { label: 'Past Lives', description: 'Distance between people, restrained emotion, framing.' },
        { label: 'Aftersun', description: 'Memory, imperfection, nostalgia, fragments.' },
        { label: 'Moonlight', description: 'Color, intimacy, skin, silence.' },
        { label: 'Her', description: 'Warmth, solitude, negative space, city interiors.' },
        { label: 'Columbus', description: 'Architecture, emotional distance, people inside spaces.' },
        { label: 'In the Mood for Love', description: 'Hallways, repetition, color, restraint.' },
        { label: 'Paris, Texas', description: 'Landscape, loneliness, scale.' },
        { label: 'The Holdovers', description: 'Warm interiors, period feeling, character and place.' },
        { label: 'A Ghost Story', description: 'Stillness, time, waiting, empty rooms.' },
      ],
    },
  ],

  notesLabel: 'Notes',
  notesKey: 'study-library:notes',
};

// ---- The "Watch One Scene" section ---------------------------------------
// Append-only: each Save adds a new dated entry made of several fields. The
// fields are packed into one JSON string and stored via addResponse(), so the
// database helpers do not change.
const WATCH_ONE_SCENE = {
  route: 'watch-one-scene', // matches the id in data.js
  sectionId: 'watch-one-scene',
  blockId: 'entry',
  fields: [
    { key: 'filmTitle', label: 'Film title', rows: 1 },
    { key: 'sceneTimestamp', label: 'Scene or timestamp', rows: 1 },
    { key: 'oneFrame', label: 'One frame that made me stop', rows: 2 },
    { key: 'whyCamera', label: 'Why is the camera here?', rows: 2 },
    { key: 'environmentRole', label: 'What role does the environment play?', rows: 2 },
    { key: 'feelingRemains', label: 'What feeling remains after the scene?', rows: 2 },
    { key: 'tryThisWeek', label: 'What I could try in my own work this week', rows: 2 },
  ],
};

// ---- The "Monthly Review" section ----------------------------------------
// Append-only: each Save adds a new dated entry with five short answers.
const MONTHLY_REVIEW = {
  route: 'monthly-review', // matches the id in data.js
  sectionId: 'monthly-review',
  blockId: 'entry',
  fields: [
    { key: 'imageStayed', label: 'Which image stayed with me?', rows: 2 },
    { key: 'driftedToward', label: 'What I drifted toward?', rows: 2 },
    { key: 'feltForced', label: 'What felt forced?', rows: 2 },
    { key: 'tryNextMonth', label: "What I'd like to try once next month?", rows: 2 },
    { key: 'keptFun', label: 'Did I keep this fun?', rows: 1 },
  ],
};

// A tiny helper to safely show text without it being treated as HTML.
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Screen: Home --------------------------------------------------------
// Draws the list of sections. Each one links to its placeholder screen.
function renderHome() {
  const items = SECTIONS.map((section) => `
    <li class="card">
      <a class="card-link" href="#/section/${section.id}">
        <span class="card-title">${escapeHtml(section.title)}</span>
        <span class="card-arrow" aria-hidden="true">›</span>
      </a>
    </li>
  `).join('');

  // A separate "Backup" card, shown last. It isn't a guide chapter, so it is
  // not part of the SECTIONS list above — we add it here on its own.
  const backupCard = `
    <li class="card">
      <a class="card-link" href="#/section/backup">
        <span class="card-title">Backup</span>
        <span class="card-arrow" aria-hidden="true">›</span>
      </a>
    </li>
  `;

  appEl.innerHTML = `
    <section class="screen">
      <p class="intro">Your photography reflection journal. Choose a section to begin.</p>
      <ul class="card-list">
        ${items}
        ${backupCard}
      </ul>
    </section>
  `;
}

// ---- Screen: Section placeholder -----------------------------------------
// Shows the section title, its short blurb, and a clear "coming soon" note.
function renderSection(id) {
  // Backup is its own small screen, not one of the guide chapters, so handle it
  // before looking the id up in the sections list.
  if (id === 'backup') {
    renderBackup();
    return;
  }

  const section = getSection(id);

  // If the address points to a section we do not know, go back home.
  if (!section) {
    window.location.hash = '#/';
    return;
  }

  // The sections that are actually built get their real screens; the rest
  // still show the placeholder.
  if (id === WORKING_METHOD.route) {
    renderWorkingMethod(section);
    return;
  }
  if (id === WHY_I_PHOTOGRAPH.route) {
    renderWhyIPhotograph(section);
    return;
  }
  if (id === WHAT_MY_WORK.route) {
    renderWhatMyWork(section);
    return;
  }
  if (id === ATTRACTING_CLIENTS.route) {
    renderAttractingClients(section);
    return;
  }
  if (id === BIO_EXPERIMENTS.route) {
    renderBioExperiments(section);
    return;
  }
  if (id === HOW_TO_FEWER.route) {
    renderHowToFewer(section);
    return;
  }
  if (id === STUDY_LIBRARY.route) {
    renderStudyLibrary(section);
    return;
  }
  if (id === WATCH_ONE_SCENE.route) {
    renderEntryChapter(section, WATCH_ONE_SCENE);
    return;
  }
  if (id === MONTHLY_REVIEW.route) {
    renderEntryChapter(section, MONTHLY_REVIEW);
    return;
  }
  if (id === PHOTO_PLATES.route) {
    renderPhotoPlates(section);
    return;
  }

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>
      <p class="intro">${escapeHtml(section.blurb)}</p>
      <div class="placeholder">
        <p><strong>Coming soon.</strong></p>
        <p>This section isn't built yet — it's a placeholder for now.</p>
      </div>
    </section>
  `;
}

// ---- Screen: Your Working Method -----------------------------------------
// Shows the prompt with a writing box and a Save button, then lists past
// entries (newest first) underneath.
function renderWorkingMethod(section) {
  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <div class="entry-form">
        <label class="prompt-label" for="entry-text">${escapeHtml(WORKING_METHOD.prompt)}</label>
        <textarea id="entry-text" class="entry-input" rows="5"
          placeholder="Write your reflection…"></textarea>
        <button id="save-entry" class="save-button" type="button">Save</button>
      </div>

      <ul id="entries" class="entries"></ul>
    </section>
  `;

  const textarea = document.getElementById('entry-text');
  const saveButton = document.getElementById('save-entry');

  // Save the current text as a new entry, then clear the box and refresh.
  saveButton.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) {
      // Nothing written — gently focus the box and do nothing else.
      textarea.focus();
      return;
    }

    saveButton.disabled = true;
    try {
      await addResponse({
        sectionId: WORKING_METHOD.sectionId,
        blockId: WORKING_METHOD.blockId,
        text,
      });
      textarea.value = '';
      await refreshEntries();
      textarea.focus();
    } finally {
      saveButton.disabled = false;
    }
  });

  // Show whatever has been saved before.
  refreshEntries();
}

// Re-draw the list of past entries (newest first).
async function refreshEntries() {
  const listEl = document.getElementById('entries');
  if (!listEl) {
    return;
  }

  const entries = await listResponses(
    WORKING_METHOD.sectionId,
    WORKING_METHOD.blockId
  );

  if (entries.length === 0) {
    listEl.innerHTML = `
      <li class="entries-empty">No entries yet. Your saved reflections will appear here.</li>
    `;
    return;
  }

  listEl.innerHTML = entries.map((entry) => `
    <li class="entry">
      <p class="entry-date">${escapeHtml(formatDate(entry.createdAt))}</p>
      <p class="entry-text">${escapeHtml(entry.text)}</p>
    </li>
  `).join('');
}

// Turn a stored timestamp into a friendly date and time.
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// ---- Screen: Why I Photograph --------------------------------------------
// Shows the intro passage, a "rewrite" box, and three check-in items. Each
// input saves itself in place: text boxes save when they lose focus, the
// checkboxes save the moment they are toggled. On open, every input is filled
// in from whatever was saved before.
async function renderWhyIPhotograph(section) {
  const data = WHY_I_PHOTOGRAPH;

  const passageHtml = data.passage
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

  const checkinsHtml = data.checkins.map((item, index) => {
    const answerId = `checkin-answer-${index}`;
    return `
      <li class="checkin-item">
        <label class="checkin-head">
          <input type="checkbox" class="checkin-checkbox"
            data-key="${item.checkedKey}" />
          <span class="checkin-label">${escapeHtml(item.label)}</span>
        </label>
        <textarea id="${answerId}" class="entry-input checkin-answer" rows="3"
          data-key="${item.answerKey}"
          placeholder="Write your answer…"></textarea>
      </li>
    `;
  }).join('');

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <div class="passage">${passageHtml}</div>

      <div class="entry-form">
        <label class="prompt-label" for="rewrite-text">${escapeHtml(data.rewritePrompt)}</label>
        <textarea id="rewrite-text" class="entry-input" rows="5"
          data-key="${data.rewriteKey}"
          placeholder="Write your rewrite…"></textarea>
      </div>

      <h3 class="prompt-label">${escapeHtml(data.checkinHeading)}</h3>
      <ul class="checkin-list">${checkinsHtml}</ul>

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  // Load the saved values into every input, then turn on auto-saving.
  await loadStateInputs();
  wireStateAutoSave();
}

// Fill every save-in-place input from the database. Shared by all
// "save-in-place" screens (Why I Photograph, What My Work Is Telling Me).
// Handles three kinds of input:
//   - text areas / text inputs marked with data-key  → value
//   - checkboxes marked with data-key                → checked (true/false)
//   - radio buttons marked with data-choice-key      → the chosen option
async function loadStateInputs(root = appEl) {
  // Text areas (writing boxes, evidence boxes) all carry a data-key.
  const textareas = root.querySelectorAll('textarea[data-key]');
  for (const textarea of textareas) {
    const value = await getState(textarea.dataset.key);
    textarea.value = value ?? '';
  }

  // Checkboxes.
  const checkboxes = root.querySelectorAll('input[type="checkbox"][data-key]');
  for (const checkbox of checkboxes) {
    const value = await getState(checkbox.dataset.key);
    checkbox.checked = value === true;
  }

  // Single-choice radio groups. The three radios in a group share one
  // data-choice-key; the saved value is the chosen option's value.
  const radios = root.querySelectorAll('input[type="radio"][data-choice-key]');
  for (const radio of radios) {
    const value = await getState(radio.dataset.choiceKey);
    radio.checked = value === radio.value;
  }
}

// Make each save-in-place input save itself when it changes. Shared helper.
function wireStateAutoSave(root = appEl) {
  const textareas = root.querySelectorAll('textarea[data-key]');
  textareas.forEach((textarea) => {
    // "change" fires when the box loses focus after an edit.
    textarea.addEventListener('change', async () => {
      await setState(textarea.dataset.key, textarea.value);
      flashSaved();
    });
  });

  const checkboxes = root.querySelectorAll('input[type="checkbox"][data-key]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      await setState(checkbox.dataset.key, checkbox.checked);
      flashSaved();
    });
  });

  const radios = root.querySelectorAll('input[type="radio"][data-choice-key]');
  radios.forEach((radio) => {
    // Only the newly-selected radio fires "change"; save its value.
    radio.addEventListener('change', async () => {
      await setState(radio.dataset.choiceKey, radio.value);
      flashSaved();
    });
  });
}

// Briefly show "Saved" after a value is written.
let savedTimer;
function flashSaved() {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) {
    return;
  }
  statusEl.textContent = 'Saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    statusEl.textContent = '';
  }, 1500);
}

// ---- Screen: Backup ------------------------------------------------------
// Reads everything from both tables and lets you save it as one JSON file.
// This screen only READS your data — it never changes or deletes anything.

// Holds the data read when the screen opens, so the button can build the file
// immediately on tap. On iOS the share sheet must be opened during the tap,
// with no waiting first, so we read ahead of time here.
let backupData = null;

async function renderBackup() {
  backupData = null;

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">Backup</h2>
      <p class="intro">Save a copy of everything you've written to a file you can keep off your phone. This only reads your data — nothing is changed or deleted.</p>
      <button id="backup-button" class="save-button" type="button" disabled>Back up my data</button>
      <p class="save-hint"><span class="save-status" id="backup-status"></span></p>
    </section>
  `;

  const button = document.getElementById('backup-button');

  // Read the data now, while the screen opens, so the tap handler below can
  // build and share the file with nothing to wait for.
  backupData = await readAllData();
  button.disabled = false;

  button.addEventListener('click', () => {
    exportBackup(backupData);
  });
}

// Build the backup file and hand it to the phone's share sheet, or download it
// if sharing files isn't supported. Runs straight through to the share call so
// it stays inside the user's tap.
function exportBackup(data) {
  const now = new Date();
  const backup = {
    app: 'Latevzn',
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    responses: data.responses,
    states: data.states,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `latevzn-backup-${localDateStamp(now)}.json`;
  const blob = new Blob([json], { type: 'application/json' });

  // Try the phone's native share sheet first (so you can Save to Files, etc.).
  const file = new File([blob], filename, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator
      .share({ files: [file], title: 'Latevzn backup' })
      .then(() => setBackupStatus('Backup shared.'))
      .catch((error) => {
        // Closing the share sheet is not an error — just note it and stop.
        if (error && error.name === 'AbortError') {
          setBackupStatus('Backup cancelled.');
          return;
        }
        // Anything else: fall back to a normal download.
        downloadBlob(blob, filename);
      });
    return;
  }

  // No file sharing (e.g. on a computer) — download the file instead.
  downloadBlob(blob, filename);
}

// Trigger a normal browser download of the file.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setBackupStatus('Backup file downloaded.');
}

// Build a YYYY-MM-DD stamp from the phone's local date (so an evening backup
// isn't labelled the next day), used in the filename.
function localDateStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setBackupStatus(text) {
  const statusEl = document.getElementById('backup-status');
  if (statusEl) {
    statusEl.textContent = text;
  }
}

// Build a list of saved checkboxes. Each item is { key, label }; the key is the
// data-key used to save/restore that checkbox's ticked state. Reuses the
// existing check-in row styles, so no new CSS is needed.
function checkboxListHtml(items) {
  const rows = items.map((item) => `
    <li>
      <label class="checkin-head">
        <input type="checkbox" class="checkin-checkbox" data-key="${item.key}" />
        <span class="checkin-label">${escapeHtml(item.label)}</span>
      </label>
    </li>
  `).join('');
  return `<ul class="checkin-list">${rows}</ul>`;
}

// Like checkboxListHtml, but each item also shows a short read-only description
// under its name. Items are { key, label, description }. Used by Study Library.
function describedCheckboxListHtml(items) {
  const rows = items.map((item) => `
    <li>
      <label class="checkin-head">
        <input type="checkbox" class="checkin-checkbox" data-key="${item.key}" />
        <span class="checkin-text">
          <span class="checkin-label">${escapeHtml(item.label)}</span>
          <span class="checkin-sub">${escapeHtml(item.description)}</span>
        </span>
      </label>
    </li>
  `).join('');
  return `<ul class="checkin-list">${rows}</ul>`;
}

// ---- Screen: How to Make Fewer Middle Photos -----------------------------
// Save-in-place: two text boxes and two checkbox groups.
async function renderHowToFewer(section) {
  const data = HOW_TO_FEWER;

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <div class="entry-form">
        <label class="prompt-label" for="about-text">${escapeHtml(data.aboutLabel)}</label>
        <textarea id="about-text" class="entry-input" rows="2"
          data-key="${data.aboutKey}"
          placeholder="Write here…"></textarea>
      </div>

      ${checkboxListHtml(data.dominanceChecks)}

      <div class="entry-form">
        <label class="prompt-label" for="chose-text">${escapeHtml(data.choseLabel)}</label>
        <textarea id="chose-text" class="entry-input" rows="4"
          data-key="${data.choseKey}"
          placeholder="Write here…"></textarea>
      </div>

      ${checkboxListHtml(data.processChecks)}

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  await loadStateInputs();
  wireStateAutoSave();
}

// ---- Screen: Study Library -----------------------------------------------
// Save-in-place: three groups of described checkboxes plus a notes box.
async function renderStudyLibrary(section) {
  const data = STUDY_LIBRARY;

  const groupsHtml = data.groups.map((group) => {
    const items = group.items.map((item, index) => ({
      label: item.label,
      description: item.description,
      key: `${group.keyPrefix}-${index + 1}:checked`,
    }));
    return `
      <h3 class="prompt-label">${escapeHtml(group.heading)}</h3>
      ${describedCheckboxListHtml(items)}
    `;
  }).join('');

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      ${groupsHtml}

      <div class="entry-form">
        <label class="prompt-label" for="library-notes">${escapeHtml(data.notesLabel)}</label>
        <textarea id="library-notes" class="entry-input" rows="5"
          data-key="${data.notesKey}"
          placeholder="Write here…"></textarea>
      </div>

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  await loadStateInputs();
  wireStateAutoSave();
}

// ---- Screen: append-only entry chapters (Watch One Scene, Monthly Review) -
// A form with several fields and a Save button. Each Save packs the fields into
// one JSON string and stores it as a new dated row via addResponse(), so the
// database helpers are unchanged. Past entries show newest first.
async function renderEntryChapter(section, config) {
  const fieldsHtml = config.fields.map((field, index) => {
    const fieldId = `entry-field-${index}`;
    return `
      <div class="entry-form">
        <label class="prompt-label" for="${fieldId}">${escapeHtml(field.label)}</label>
        <textarea id="${fieldId}" class="entry-input" rows="${field.rows || 2}"
          data-field="${field.key}"
          placeholder="Write here…"></textarea>
      </div>
    `;
  }).join('');

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      ${fieldsHtml}
      <button id="save-entry" class="save-button" type="button">Save</button>

      <ul id="entries" class="entries"></ul>
    </section>
  `;

  const saveButton = document.getElementById('save-entry');
  const textareas = Array.from(appEl.querySelectorAll('textarea[data-field]'));

  saveButton.addEventListener('click', async () => {
    // Collect the field values into one object.
    const values = {};
    let hasSomething = false;
    textareas.forEach((textarea) => {
      const value = textarea.value.trim();
      values[textarea.dataset.field] = value;
      if (value) {
        hasSomething = true;
      }
    });

    // If the whole form is empty, do nothing.
    if (!hasSomething) {
      textareas[0].focus();
      return;
    }

    saveButton.disabled = true;
    try {
      await addResponse({
        sectionId: config.sectionId,
        blockId: config.blockId,
        text: JSON.stringify(values),
      });
      // Clear the form for the next entry, then refresh the list.
      textareas.forEach((textarea) => { textarea.value = ''; });
      await refreshEntryList(config);
      textareas[0].focus();
    } finally {
      saveButton.disabled = false;
    }
  });

  await refreshEntryList(config);
}

// Re-draw the past entries for an append-only chapter (newest first).
async function refreshEntryList(config) {
  const listEl = document.getElementById('entries');
  if (!listEl) {
    return;
  }

  const entries = await listResponses(config.sectionId, config.blockId);

  if (entries.length === 0) {
    listEl.innerHTML = `
      <li class="entries-empty">No entries yet. Your saved entries will appear here.</li>
    `;
    return;
  }

  listEl.innerHTML = entries.map((entry) => {
    // The stored text is a JSON object of the field values.
    let values = {};
    try {
      values = JSON.parse(entry.text);
    } catch (error) {
      values = {};
    }

    // Show each field that has a value, in the chapter's field order.
    const fieldsHtml = config.fields
      .filter((field) => values[field.key])
      .map((field) => `
        <p class="entry-field">
          <span class="entry-field-label">${escapeHtml(field.label)}</span>
          ${escapeHtml(values[field.key])}
        </p>
      `).join('');

    return `
      <li class="entry">
        <p class="entry-date">${escapeHtml(formatDate(entry.createdAt))}</p>
        ${fieldsHtml}
      </li>
    `;
  }).join('');
}

// ---- Screen: Photo Plates ------------------------------------------------
// Add a photo from the phone, shrink it, save it on the device, and show the
// saved photos newest first.
async function renderPhotoPlates(section) {
  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <button id="add-plate" class="save-button" type="button">Add a plate</button>
      <!-- Hidden file picker. accept="image/*" (with no "capture") lets the
           phone offer both the camera and the photo library. -->
      <input id="plate-input" type="file" accept="image/*" hidden />

      <ul id="plates" class="plate-list"></ul>
    </section>
  `;

  const addButton = document.getElementById('add-plate');
  const fileInput = document.getElementById('plate-input');
  const listEl = document.getElementById('plates');

  // The button just opens the hidden file picker.
  addButton.addEventListener('click', () => fileInput.click());

  // One listener on the whole list handles the little "×" remove button on any
  // photo (now or after the list is re-drawn).
  listEl.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('.plate-remove');
    if (!removeButton) {
      return; // a click somewhere other than a remove button
    }
    const plate = removeButton.closest('.plate');
    if (!plate) {
      return;
    }

    // A simple confirm so an accidental tap can't wipe a photo.
    if (!window.confirm('Delete this photo?')) {
      return;
    }

    await deletePhoto(Number(plate.dataset.id));

    // Free this photo's object URL (in case its image hadn't finished loading,
    // which is when it would normally be revoked), then take it off screen.
    const image = plate.querySelector('.plate-img');
    if (image) {
      URL.revokeObjectURL(image.src);
    }
    plate.remove();

    // If that was the last photo, re-draw so the empty-state line shows.
    if (!listEl.querySelector('.plate')) {
      await refreshPhotos();
    }
  });

  // When a photo is chosen, shrink it, save it, then refresh the list.
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      return;
    }

    addButton.disabled = true;
    try {
      const blob = await shrinkImage(file);
      await addPhoto(blob);
      // Clear the input so picking the same file again still fires "change".
      fileInput.value = '';
      await refreshPhotos();
    } catch (error) {
      console.warn('Could not save photo:', error);
    } finally {
      addButton.disabled = false;
    }
  });

  await refreshPhotos();
}

// Shrink an image file: draw it to a canvas at roughly maxSide on its longest
// edge (never enlarging a smaller image) and export a JPEG. Returns a Blob.
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { maxSide, jpegQuality } = PHOTO_PLATES;
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const scale = Math.min(1, maxSide / longest); // never scale up
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not create image blob.'));
          }
        },
        'image/jpeg',
        jpegQuality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };

    img.src = url;
  });
}

// Re-draw the saved photos (newest first).
async function refreshPhotos() {
  const listEl = document.getElementById('plates');
  if (!listEl) {
    return;
  }

  const photos = await listPhotos();

  if (photos.length === 0) {
    listEl.innerHTML = `
      <li class="entries-empty">No plates yet. Add a photo and it will appear here.</li>
    `;
    return;
  }

  listEl.innerHTML = photos.map((photo) => `
    <li class="plate" data-id="${photo.id}">
      <img class="plate-img" alt="Saved plate" />
      <button class="plate-remove" type="button" aria-label="Remove photo">×</button>
    </li>
  `).join('');

  // Point each image at its blob via an object URL, and free that URL as soon
  // as the browser has painted the image, so no URLs are leaked.
  const images = listEl.querySelectorAll('.plate-img');
  photos.forEach((photo, index) => {
    const image = images[index];
    const objectUrl = URL.createObjectURL(photo.blob);
    image.onload = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  });
}

// ---- Screen: Attracting the Right Clients --------------------------------
// Save-in-place: two checkbox lists and two free-text boxes. Reuses the shared
// load/auto-save helpers.
async function renderAttractingClients(section) {
  const data = ATTRACTING_CLIENTS;

  const positioningItems = data.positioning.map((label, index) => ({
    label,
    key: `${data.route}:positioning-${index + 1}:checked`,
  }));
  const clientTypeItems = data.clientTypes.map((label, index) => ({
    label,
    key: `${data.route}:client-type-${index + 1}:checked`,
  }));

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <p class="intro">${escapeHtml(data.intro)}</p>

      <h3 class="prompt-label">${escapeHtml(data.positioningHeading)}</h3>
      ${checkboxListHtml(positioningItems)}

      <div class="entry-form">
        <label class="prompt-label" for="favorite-version">${escapeHtml(data.favoriteLabel)}</label>
        <textarea id="favorite-version" class="entry-input" rows="3"
          data-key="${data.favoriteKey}"
          placeholder="Write here…"></textarea>
      </div>

      <h3 class="prompt-label">${escapeHtml(data.clientTypesHeading)}</h3>
      ${checkboxListHtml(clientTypeItems)}

      <div class="entry-form">
        <label class="prompt-label" for="responded-well">${escapeHtml(data.respondedLabel)}</label>
        <textarea id="responded-well" class="entry-input" rows="3"
          data-key="${data.respondedKey}"
          placeholder="Write here…"></textarea>
      </div>

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  await loadStateInputs();
  wireStateAutoSave();
}

// ---- Screen: Bio Experiments ---------------------------------------------
// Save-in-place: one checkbox list and one free-text box.
async function renderBioExperiments(section) {
  const data = BIO_EXPERIMENTS;

  const bioItems = data.bios.map((label, index) => ({
    label,
    key: `${data.route}:bio-${index + 1}:checked`,
  }));

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <p class="intro">${escapeHtml(data.intro)}</p>

      ${checkboxListHtml(bioItems)}

      <div class="entry-form">
        <label class="prompt-label" for="most-true">${escapeHtml(data.mostTrueLabel)}</label>
        <textarea id="most-true" class="entry-input" rows="3"
          data-key="${data.mostTrueKey}"
          placeholder="Write here…"></textarea>
      </div>

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  await loadStateInputs();
  wireStateAutoSave();
}

// ---- Screen: What My Work Is Telling Me ----------------------------------
// Five fixed items, each with a read-only title + description, then two saved
// inputs: a single-choice picker (Agree / Unsure / Disagree) and an evidence
// box. Saves in place, exactly like Why I Photograph.
async function renderWhatMyWork(section) {
  const data = WHAT_MY_WORK;

  const itemsHtml = data.items.map((item, index) => {
    const number = index + 1;
    const choiceKey = `${data.route}:item-${number}:choice`;
    const evidenceKey = `${data.route}:item-${number}:evidence`;
    const groupName = `choice-item-${number}`;
    const evidenceId = `evidence-${number}`;

    const optionsHtml = data.choiceOptions.map((option) => `
      <label class="choice-option">
        <input type="radio" name="${groupName}" value="${option.value}"
          data-choice-key="${choiceKey}" />
        <span>${escapeHtml(option.label)}</span>
      </label>
    `).join('');

    return `
      <li class="checkin-item">
        <h3 class="checkin-label">${escapeHtml(item.title)}</h3>
        <p class="item-desc">${escapeHtml(item.description)}</p>

        <div class="choice" role="radiogroup" aria-label="${escapeHtml(item.title)}">
          ${optionsHtml}
        </div>

        <label class="prompt-label" for="${evidenceId}">${escapeHtml(data.evidenceLabel)}</label>
        <textarea id="${evidenceId}" class="entry-input" rows="3"
          data-key="${evidenceKey}"
          placeholder="Write your evidence…"></textarea>
      </li>
    `;
  }).join('');

  appEl.innerHTML = `
    <section class="screen">
      <a class="back-link" href="#/">‹ Back</a>
      <h2 class="screen-title">${escapeHtml(section.title)}</h2>

      <ul class="checkin-list">${itemsHtml}</ul>

      <p class="save-hint">Your changes save automatically. <span class="save-status" id="save-status" aria-live="polite"></span></p>
    </section>
  `;

  // Load saved values into every input, then turn on auto-saving.
  await loadStateInputs();
  wireStateAutoSave();
}

// ---- Decide which screen to draw -----------------------------------------
function render(route) {
  if (route.name === 'section') {
    renderSection(route.params.id);
  } else {
    renderHome();
  }
  // Jump back to the top whenever the screen changes.
  window.scrollTo(0, 0);
}

// ---- Offline support: register the service worker ------------------------
// The service worker is a small background script that caches the app so it
// can open without an internet connection. We only register it if the
// browser supports it.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Was a service worker already in charge when this page loaded? If so, a
  // later change of controller means a NEW version has taken over, and we
  // refresh once so the page starts using it. On the very first visit there is
  // no controller yet, so we skip the refresh and avoid an extra reload.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) {
      return;
    }
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    // Relative path so it works on GitHub Pages sub-folders too.
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

// ---- Start the app -------------------------------------------------------
startRouter(render);
registerServiceWorker();
