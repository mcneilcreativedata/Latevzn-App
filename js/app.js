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
import { addResponse, listResponses, setState, getState } from './db.js';

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

  appEl.innerHTML = `
    <section class="screen">
      <p class="intro">Your photography reflection journal. Choose a section to begin.</p>
      <ul class="card-list">
        ${items}
      </ul>
    </section>
  `;
}

// ---- Screen: Section placeholder -----------------------------------------
// Shows the section title, its short blurb, and a clear "coming soon" note.
function renderSection(id) {
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
