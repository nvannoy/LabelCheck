# QA results

Plan: `tests/qa/QA-PLAN.md` (41 cases).

| Entry | Value |
| --- | --- |
| App version tested | 0.2.12 (production build, the same files that are deployed; the live site shows 0.2.11 until this is pushed) |
| Browser and computer | In-app Chromium browser pane, viewport emulated at 1280 by 800, on a MacBook (Intel Core i7-1068NG7, 8 threads, 32 GB, macOS). Node 25 for the evaluation. |
| Tester and date | Claude Code (automated checks and a scripted browser run), 23 Oct 2026. Not a human tester: see "Not run" below. |
| Cases passed, failed, blocked | 37 pass, 0 fail, 4 blocked (S1, S2, S3, M4) |
| Blockers open | None. S1 needs an office PC and is the one to watch. |
| Ready to submit | Not until a human has run S1, S2 and S3 on an ordinary office PC |

## How the cases were run

- `npm run verify` (version check, 203 tests, evaluation of all 33 labels including the 24 QA label cases, production build): all pass. The same command also passes on a fresh clone after `npm ci`.
- Browser cases were run against a local copy of the production build with a scripted browser, using real key presses where the case is about the keyboard, and screenshots to check layout.
- The live site's response headers were read with `curl` (M5).

## Results

| ID | Result | Evidence |
| --- | --- | --- |
| S1 | Blocked | Not run on an office PC. Node reads: mean 2.3 s, median 2.0 s, slowest 4.7 s (d03, d05 where the second pass runs). In the browser pane the reads were 2.5 to 4.4 s earlier in the day, but 6 to 17 s in this QA run, when the computer was busy (load average about 4, pane in the background). That run is not a fair timing, so the case is blocked, not failed. Results appeared 46 to 77 ms after Start review. |
| S2 | Blocked | Needs a visible browser on an office PC. Engine start measured earlier at 2 to 5 s on this laptop. |
| S3 | Blocked | Needs a person who has never seen the app. |
| S4 | Pass | Two numbered steps ("Label image", "Application text") and one Start review button. |
| S5 | Pass | A+ twice gives 20 px text, no sideways scrolling, size stored as 1.25 and still 20 px after a reload. Two quick clicks of A- now move two steps (fixed in 0.2.12). |
| S6 | Pass | Full screen gives two columns and the read table; Compact view returns to the narrow layout. The Esc step was not run (the browser pane has no real fullscreen). |
| S7 | Pass | Each result has its own symbol, wording and border (solid, dashed, thick, thin), tested in `tests/qa.test.js`. The grayscale emulation step was not run. |
| S8 | Pass | Every text and background color pair in the stylesheet is at least 4.5 to 1 (16 pairs, `tests/qa.test.js`). A contrast tool was not run on the rendered page. |
| S9 | Pass | c01: seven rows, all Match or Not required, nothing typed. d01: Likely reject, "Application says 45% Alc./Vol." beside "Label says 40%", reason "The label states 40% but the application says 45%." |
| S10 | Pass | Batch is not built. The README says so and gives the reason. |
| M1 | Pass | No sign-in or integration prompt. (A private window was not used.) |
| M2 | Pass | After c01 through Label verified and Copy notes: Local storage holds only `labelcheck-text-size`; Session storage empty; IndexedDB none; Cache storage none; no cookies. After Next label the image, text and notes are gone. |
| M3 | Pass | 448 requests over the session, all to the app's own address (blob and own files). None matched `https://` or `.com`. No fonts, scripts or OCR files from another host. |
| M4 | Blocked | The browser pane cannot be set offline. All OCR files are loaded from the app's own address (M3), but offline use was not tried. |
| M5 | Pass | Live headers: `content-security-policy` with `default-src 'self'` and `connect-src 'self'`, plus `x-content-type-options` and `referrer-policy`. Console: the Tesseract notes ("Estimating resolution...") that showed as red errors are silenced in 0.2.12; a full review printed no errors. |
| M6 | Pass | No `netlify/functions`; `netlify.toml` has no functions, forms or identity; the README has "Moving to Azure Static Web Apps" with steps and the config. |
| M7 | Pass | Footer text present on both screens. README states assumptions, limitations and results. |
| D1 | Pass | c08 Match. c07 is Check, not Match: OCR reads the large all-capitals brand at low confidence. That is an accepted extra review under the plan's safe-direction rule and is recorded here. With a perfect text read, c07 is Match. |
| D2 | Pass | d06: brand Check, not Match. |
| D3 | Pass | Paste (simulated paste events), Enter started the review, two Down arrows plus Enter marked a check reviewed, four Tabs reached Label verified with a visible focus ring (3 px solid), Enter pressed it and the notes opened. Nothing was clicked. |
| D4 | Pass | No confirm-all or approve-all control in the source. No decision is preselected. |
| D5 | Pass | Label verified on d01 (Likely reject) shows "The app found 1 mismatch on this label. Mark it verified anyway?" with "No, go back" focused first. Check results show a plain reason. (Added in 0.2.12.) |
| D6 | Pass | Issues found on d01 lists the mismatch with its reason; notes are editable; Copy notes shows "Copied". Pasting into a text editor was not run (the pane blocks clipboard reads). No network requests were made. |
| J1 | Pass | c01 warning row: "Wording matches the statute word for word, and the title is in capital letters." |
| J2 | Pass | d13 Mismatch ("truck" where the statute has "car"). d14 Mismatch ("Clause (2) of the warning is missing", fixed in 0.2.12). d17 Mismatch. |
| J3 | Pass | d15 Mismatch: `"GOVERNMENT WARNING:" must be in capital letters.` |
| J4 | Pass | d16 Check, "not found", tier Needs review. |
| J5 | Pass | d18 and d19 are Needs review, with the bold estimate ("title strokes are about as thick as the rest") and the by-eye list shown. c01 still shows the by-eye list (legibility). |
| J6 | Pass | q03 Check, "The print is very small, so the read may be wrong" (small-print rule added in 0.2.12; before it was a Mismatch). |
| J7 | Pass | q01 low-resolution flag, q02 low-contrast flag, both Needs review. A synthetic 8 degree skew and a glare blotch on c01 did not crash the app and gave Needs review. A real photographed label was not run. |
| J8 | Pass | With a deviation: the plan expects the by-eye list to name "bold type, size and legibility". Size is no longer listed or measured, by owner decision on 22 Oct 2026 (no scale in the image or the data); the README says so. The warning row shows Check bold when the wording matches, and the by-eye list names legibility, plus bold when the estimate cannot tell. |
| B1 | Pass | Seven rows in the expected order. |
| B2 | Pass | c05 Match; d11 Check; d12 Mismatch; c01 is Not required; Imported on c01 without a country gives Check. |
| B3 | Pass | d01 and d04 Mismatch; d03 and d05 Check; 75 cl and 0.75 L both Match 750 mL. |
| B4 | Pass | "Found 6 of 6 fields" for the full blocks; 5 of 6 with an Add button when a line is removed; 0 for unrelated text, no crash. Pasting anywhere sends text to the text box. |
| B5 | Pass | .txt file: "That file is not an image." Blank white image: "Nothing could be read from this image." 220 px image: "The image is only 220 px wide, so small text may be misread." Start review with nothing entered is disabled with "Add a label image to start." Text pasted before any image goes in the text box. No blank screen. |
| B6 | Pass | On a fresh clone: `npm ci`, then `npm run verify` passes (203 tests, evaluation 0 of 22 bad labels Ready, 0 bad fields Match, 24 QA label cases with 0 fail, build). The evaluation drew the generated labels itself (fixed in 0.2.12; it failed on a fresh clone before). The README numbers match. |
| B7 | Pass | Setup, approach, tools, assumptions, limitations, results and the AI-use statement are in the README. The setup steps worked on the fresh clone. The live URL opens and serves the app. |
| B8 | Pass | The README limitations list batch, one image, spirits only, skew and glare, and the bold and size limits. `src/engine` has no browser code (tested). Each field is one entry in `fields.js`. |
| B9 | Pass | s01: brand Check, bottler Check, the rest Match (net contents now reads and matches). s02: warning Check (capital letters or punctuation differ), the rest Match. r01: class and bottler Check, the rest Match. No field wrongly shows Match. All three are Needs review, which the plan accepts. |
| B10 | Pass | No secrets or generated images tracked (tested). CLAUDE.md and docs present. Small, single-purpose commits. |

## Release blockers

| Blocker | Status |
| --- | --- |
| A known-bad label shows Ready to approve | None: 0 of 22 |
| A request goes to another site, or label data is stored | None |
| The app crashes or shows a blank screen on bad input | None |
| A read takes over 5 s on an ordinary office PC with no explanation in the README | Not measured on an office PC (S1). The README states the timings and that an office PC may be slower. |
| The live URL does not load, or the README's steps do not work | None |

## Not run in this pass

- S1 and S2 on an ordinary office PC (a visible browser, no other load).
- S3, the first-time-user test.
- S6 Esc, S7 grayscale emulation, S8 with a contrast tool, M4 offline, D6 paste into a text editor, and J7 with a real photographed label.
- All of these need a person or a setting the scripted browser does not have. Run the same plan against the live site once 0.2.12 is deployed.

## Findings and fixes from this pass (all in 0.2.12)

- d14 (J2): a whole missing clause is now a Mismatch, and very small print is sent to Check (q03, J6).
- Label verified on a Likely reject label now asks for confirmation (D5).
- Tesseract's notes no longer appear as Console errors, and the canvas warning is gone (M5, B5).
- `npm run verify` now works on a fresh clone (B6).
- The README now lists batch and the other limits, and the Azure migration steps (S10, B8, M6).
- Two quick clicks on A- or A+ now move two steps (S5).
