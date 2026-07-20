// ============================================================================
// Latevzn — on-device database
// ----------------------------------------------------------------------------
// All of your writing is stored on THIS device only — there is no server.
// We use the browser's built-in database (IndexedDB) through a small, friendly
// library called Dexie. Dexie is loaded from a local file in index.html
// (vendor/dexie.min.js), so it keeps working with no internet connection.
//
// This file sets up the tables and gives the rest of the app a few simple jobs:
//   - "responses": append-only entries (save a new entry, list past entries).
//   - "states": save-in-place values (write a value for a key, read it back).
// ============================================================================

// Dexie is loaded as a normal <script> before this module runs, so it is
// available as a global. We read it from the window here.
const Dexie = window.Dexie;

// Create (or open) a database named "latevzn".
const db = new Dexie('latevzn');

// Describe the shape of the data. The string lists the fields we can search by:
//   ++id        an automatic, ever-increasing id (the row's unique number)
//   sectionId   which section the entry belongs to
//   blockId     which prompt within the section
//   createdAt   when it was saved (a timestamp)
// The entry's "text" is also stored on each row; it just isn't listed here
// because we never need to search by it.
db.version(1).stores({
  responses: '++id, sectionId, blockId, createdAt',
});

// Version 2 adds a second table, "states", for save-in-place values. Each row
// is one input's current value, looked up by a text "key":
//   key        the unique name of the input (the primary key)
//   updatedAt  when it was last changed (a timestamp)
// The "value" itself is stored on the row but isn't listed here because we never
// search by it. Bumping to version 2 leaves the existing "responses" table (and
// everything already saved in it) untouched.
db.version(2).stores({
  states: 'key, updatedAt',
});

// Version 3 adds a third table, "photos", for the Photo Plates section:
//   ++id       an automatic, ever-increasing id
//   createdAt  when the photo was saved (a timestamp), so we can sort by newest
// The image itself is stored on the row as a "blob" but isn't listed here
// because we never search by it. Adding a new version and listing only the new
// table leaves the existing "responses" and "states" tables — and everything
// already saved in them — completely untouched.
db.version(3).stores({
  photos: '++id, createdAt',
});

// Version 4 adds a fourth table, "archive", for the Archive contact sheet. It is
// separate from "photos" so the two boards never mix. Each row holds:
//   ++id       an automatic, ever-increasing id
//   createdAt  when it was saved (a timestamp), so we can sort by newest
// The image "blob" and the short "note" are stored on the row but aren't listed
// here because we never search by them. Listing only the new table leaves the
// existing "responses", "states", and "photos" tables — and everything already
// saved in them — completely untouched.
db.version(4).stores({
  archive: '++id, createdAt',
});

// Save a brand-new entry. This is "append-only": every call adds a new row and
// nothing that was saved before is ever changed or removed.
export async function addResponse({ sectionId, blockId, text }) {
  return db.responses.add({
    sectionId,
    blockId,
    text,
    createdAt: Date.now(), // milliseconds since 1970 — easy to sort and format
  });
}

// Get the past entries for one prompt, newest first.
export async function listResponses(sectionId, blockId) {
  const rows = await db.responses
    .where('sectionId')
    .equals(sectionId)
    .and((row) => row.blockId === blockId)
    .sortBy('createdAt'); // oldest → newest
  return rows.reverse(); // flip to newest → oldest
}

// ---- Save-in-place values (the "states" table) ---------------------------

// Save a value for a key. This is "update-in-place": Dexie's put() finds the
// row with this key and replaces it, so writing the same key again overwrites
// the previous value instead of adding a second row.
export async function setState(key, value) {
  return db.states.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

// Read back the value saved for a key. Returns undefined if nothing is saved.
export async function getState(key) {
  const row = await db.states.get(key);
  return row ? row.value : undefined;
}

// ---- Photos (the "photos" table) -----------------------------------------

// Save a new photo (a shrunk image blob). Append-only, like responses: every
// call adds a new row and never changes an earlier one.
export async function addPhoto(blob) {
  return db.photos.add({
    blob,
    createdAt: Date.now(),
  });
}

// Get all saved photos, newest first.
export async function listPhotos() {
  return db.photos.orderBy('createdAt').reverse().toArray();
}

// Remove one photo by its id. This deletes a row only — it does not change the
// database structure, so the Dexie version stays the same.
export async function deletePhoto(id) {
  return db.photos.delete(id);
}

// ---- Archive (the "archive" table) ---------------------------------------
// Same shape as photos, but a separate board, and each row also carries a short
// text note.

// Save a new archive image (a shrunk image blob) with its note.
export async function addArchiveItem({ blob, note }) {
  return db.archive.add({
    blob,
    note: note || '',
    createdAt: Date.now(),
  });
}

// Get all archive images, newest first.
export async function listArchive() {
  return db.archive.orderBy('createdAt').reverse().toArray();
}

// Update just the note on one archive row (leaves the image and date as-is).
export async function updateArchiveNote(id, note) {
  return db.archive.update(id, { note });
}

// Remove one archive image (and its note) by its id.
export async function deleteArchiveItem(id) {
  return db.archive.delete(id);
}

// ---- Backup (read-only) --------------------------------------------------

// Read EVERY row from both tables, for the backup/export feature. This only
// reads — toArray() never changes or deletes anything.
export async function readAllData() {
  const responses = await db.responses.toArray();
  const states = await db.states.toArray();
  return { responses, states };
}
