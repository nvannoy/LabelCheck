# Possible additions after the proof of concept is approved

Things that were left out on purpose so the prototype keeps to its rules (see `CLAUDE.md`). None are built.

## Remember the tour preference

**What:** a checkbox on the tour, "Show this tour when the app opens", that remembers the choice, so the tour stops opening itself for people who have seen it.

**Why it is not built:** it needs one more value in the browser's localStorage. Rule 4 in `CLAUDE.md` says the only thing written there is the text size, and the QA plan's case M2 checks exactly that. The owner chose to store nothing for the proof of concept. Today the tour opens every time the app opens and can be closed with Skip tour or Esc. The Tour button on the first screen brings it back.

**What it would take once approved:**

- Change rule 4 in `CLAUDE.md` to allow two settings: the text size and "tour on or off". No label image, application text or notes, ever.
- Store one key (for example `labelcheck-tour`) in a try/catch, the same way `src/ui/useTextSize.js` does, and read it when the app opens to decide whether to start the tour.
- Add the checkbox to the last tour step and the first one.
- Update QA case M2 and its automated check in `tests/qa.test.js` to expect the two keys, and the README statement about what is stored.
