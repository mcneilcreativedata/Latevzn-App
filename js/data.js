// ============================================================================
// Latevzn — section data
// ----------------------------------------------------------------------------
// This is the SINGLE place that defines the field guide's sections.
// To rename a section, reorder them, or change its short description,
// just edit this list. The home screen and the section screens both read
// from here, so a change here updates the whole app.
//
// Each section has:
//   id    — a short, lowercase "slug" used in the web address (no spaces).
//           Keep it unique. It's safe to leave these as they are.
//   title — the name shown on screen.
//   blurb — a short line shown on the section's placeholder screen.
// ============================================================================

export const SECTIONS = [
  {
    id: 'your-working-method',
    title: 'Your Working Method',
    blurb: 'How you actually make pictures — your habits, tools, and process.',
  },
  {
    id: 'why-i-photograph',
    title: 'Why I Photograph',
    blurb: 'The reasons and feelings that keep you coming back to the camera.',
  },
  {
    id: 'what-my-work-is-telling-me',
    title: 'What My Work Is Telling Me',
    blurb: 'Patterns and messages you notice across your own photographs.',
  },
  {
    id: 'photo-plates',
    title: 'Photo Plates',
    blurb: 'Selected images you want to study and return to.',
  },
  {
    id: 'how-to-make-fewer-middle-photos',
    title: 'How to Make Fewer Middle Photos',
    blurb: 'Cutting the in-between shots so the strong ones stand out.',
  },
  {
    id: 'study-library',
    title: 'Study Library',
    blurb: 'References, photographers, and ideas you are learning from.',
  },
  {
    id: 'watch-one-scene',
    title: 'Watch One Scene',
    blurb: 'Staying with a single scene long enough to truly see it.',
  },
  {
    id: 'attracting-the-right-clients',
    title: 'Attracting the Right Clients',
    blurb: 'Notes on the people and work you want to draw toward you.',
  },
  {
    id: 'bio-experiments',
    title: 'Bio Experiments',
    blurb: 'Trying out ways to describe yourself and your work.',
  },
  {
    id: 'monthly-review',
    title: 'Monthly Review',
    blurb: 'A regular look back at what you made and learned.',
  },
  {
    id: 'archive',
    title: 'Inspiration',
    blurb: 'A place for older notes and finished reflections.',
  },
];

// A small helper so other files can look up one section by its id.
export function getSection(id) {
  return SECTIONS.find((section) => section.id === id);
}
