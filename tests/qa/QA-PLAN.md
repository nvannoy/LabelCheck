# LabelCheck QA plan: stakeholder requirements

Source: `LabelCheck-QA-Plan.pdf` in this folder (written by Great Works, 23 Oct 2026, for v0.2.11 or newer). This file is the same plan as a working document, with a column showing how each case is checked here.

Every case quotes the requirement, lists the steps and says what a pass looks like. **Any known-bad label that shows Ready to approve is a release blocker, whatever else passes.**

## How to run

- **App:** the live site, https://labelcheck-grtwrx.netlify.app/. Write down the version shown next to "LabelCheck".
- **Time:** about 90 minutes, on desktop Chrome or Edge, with the files below.
- **Files:** clone the repository. The three real samples are in `tests/samples/`. Application text for every label is in `tests/applications/<id>.txt`. The generated images (c, d and q series) are not on GitHub: draw them on a Mac with `node scripts/make-test-labels.js`, which writes `generated/labels/`. `npm run evaluate` does this for you on a Mac.
- **The tour opens first.** A guided tour opens every time the app opens. Press Esc or Skip tour before a run. Pasting a label or text also closes it.
- **One run:** paste the image on the page (Ctrl+V or Cmd+V) or use Choose an image. Wait for "Read in". Paste the application text. Press Start review (or Enter).
- **Results:** write Pass, Fail or Blocked per case. Record version, browser, computer, date and tester.
- **Safe direction:** on a known-bad label, Check or Mismatch is a pass and Ready to approve is a fail. On a clean label, Check is acceptable but must be recorded as an extra review.

## How each case is checked in this repository

| Mark | Meaning | Where |
| --- | --- | --- |
| **Auto: evaluate** | Real OCR on the label image, then the engine | `npm run evaluate` (`tests/qa/label-cases.js`) |
| **Auto: test** | Engine, source and repository checks that need no browser | `npm test` (`tests/qa.test.js` and the other test files) |
| **Auto: e2e** | Scripted Chrome or Edge against the built site: larger text at 440 and 360 px, banner never shows "Ready to approve" before the bold check ends, no failed requests or console errors | `npm run e2e` (`tests/e2e/run.js`) |
| **Browser** | Run by hand, or scripted against a built copy, in a real browser | `tests/qa/RESULTS.md` |
| **Human** | Needs a person or a specific machine | `tests/qa/RESULTS.md` |

`npm run verify` runs the version check, all tests, the evaluation (including the QA label cases) and a production build.

## Test data

| ID | Image | What it tests | Expected result |
| --- | --- | --- | --- |
| c01 | generated, clean bourbon | Everything correct | Ready to approve |
| c05 | generated, clean imported tequila | Imported, country of origin present | Ready to approve |
| c07 | generated | Brand in capitals, application in mixed case | Ready to approve, Brand Match |
| c08 | generated | Curly versus straight apostrophe in the brand | Ready to approve, Brand Match |
| d01 | generated | Label 40%, application 45% | Likely reject, Alcohol content Mismatch |
| d04 | generated | Label 1 L, application 1.75 L | Likely reject, Net contents Mismatch |
| d06 | generated | A different brand on the label | Not Match for Brand |
| d13 | generated | Warning says "truck" for "car" | Warning Mismatch |
| d14 | generated | Warning clause (2) missing | Warning Mismatch |
| d15 | generated | "Government Warning:" in mixed case | Warning Mismatch |
| d16 | generated | No warning on the label | Warning Check, never Match |
| d18 | generated | Warning title not bold | Not Ready to approve |
| d19 | generated | Whole warning in bold | Not Ready to approve |
| q01 | generated | Image about 450 px wide | Low-resolution flag, nothing Ready |
| q02 | generated | Pale gray text on white | Nothing Ready |
| q03 | generated | Very small warning text | Warning Check, never Match |
| s01 | `ttb-brand-label-new1.jpg` | TTB ABC rye sample, front and back in one image | Ideal Ready to approve; Needs review accepted |
| s02 | `ttb-brand-label-new2.jpg` | TTB imported rum sample | Ideal Ready to approve; Needs review accepted |
| r01 | `ttb-malt-and-hop-honey-huckleberry.png` | Malt beverage, white text on blue | Ideal Ready to approve; Needs review accepted |

## Sarah Chen, Deputy Director: speed and simplicity

Run S1 and S2 on an ordinary office PC, not a developer machine.

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| S1 | "If we can't get results back in about 5 seconds, nobody's going to use it." | Paste c01, c04, s01, d05 and q02 one at a time. Write down each "Read in" time. Press Start review each time. | Every read under 5 s, median under 3 s. Results under 1 s after Start review. Record the computer. | Human (office PC). Node timings in `npm run evaluate`. |
| S2 | Engine start, once per page load | Hard-reload and time until the page can read. Reload again and time it. | First load under 10 s, second under 5 s. Reading can start as soon as the image arrives. | Human |
| S3 | "something my mother could figure out"; "Clean, obvious, no hunting for buttons." | Give someone who has never seen the app the URL, c01 and its text. Say only "check this label". Do not help. | They reach Label verified and copy the notes within 3 minutes, without help. Note every pause. | Human |
| S4 | Two steps, one Start | Count the steps and buttons on the first screen. | Two numbered steps (image, text) and one Start review button. No hidden menus. | Browser |
| S5 | "Half our team is over 50." | Press A+ twice on the intake screen, start a review, reload, press A- until back to normal. | Text grows on both screens with nothing cut off and no sideways scrolling. The size is remembered after a reload. | Browser |
| S6 | Larger view for older eyes | On the review screen press Full screen, then Compact view, then press Esc. | Full screen shows two columns and the "What the app read" table. Compact view and Esc both return to the narrow layout. | Browser (Esc: Human) |
| S7 | Status must not depend on color | Turn on grayscale (Chrome DevTools, Rendering, Achromatopsia). Review d01. | Match, Check, Mismatch and Not required still differ by symbol and border: solid check, dashed question mark, thick cross, gray dash. | Auto: test (symbols and borders). Grayscale view: Human |
| S8 | Readable contrast | Check body text, status labels and buttons with a contrast tool. | Normal text is at least 4.5 to 1. | Auto: test (every color pair in the stylesheet) |
| S9 | "a lot of what we do is just... matching" | Run c01, then d01. | c01: every field Match without typing anything. d01: Alcohol content shows both values side by side and a reason sentence. | Auto: evaluate. Browser |
| S10 | "If there was some way to handle batch uploads, that would be huge." | Look for batch upload. Read the README limitations. | Batch is not built. The README says so and gives the reason. | Auto: test (README) |

## Marcus Williams, IT: standalone, private, behind a firewall

Run with Chrome DevTools open (F12).

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| M1 | "we're not looking to integrate with COLA directly" | Open the live URL in a private window. | The app works with no sign-in and no integration prompt. | Browser |
| M2 | "We're not storing anything sensitive for this exercise." | Run c01 through Label verified and Copy notes. Check Local storage, Session storage, IndexedDB, Cache storage and Cookies. Press Next label. Run another label and reload halfway. | Local storage holds only the text size. Nothing else holds a label image, application text or notes. After Next label or a reload they are gone. | Auto: test (source). Browser |
| M3 | "our network blocks outbound traffic to a lot of domains"; "our firewall blocked connections to their ML endpoints" | Network tab, Preserve log, reload, run c01 and s01. Sort by Domain. | Every request goes to the app's own address. No fonts, scripts, analytics or OCR files from a CDN. | Auto: test (source). Browser |
| M4 | Reading must not need the network | After the page and OCR engine have loaded, set Network to Offline. Paste a label and text, press Start review. | Reading and review still work offline. | Human (offline toggle) |
| M5 | A policy that enforces the above | Read the page's response headers. Run a full review and read the Console. | A Content-Security-Policy header with `default-src 'self'` and `connect-src 'self'`. No policy violations or red errors in the Console. | Auto: test (`public/_headers`). Browser (live headers, Console) |
| M6 | "We're on Azure now after the migration in 2019." | Look for a `netlify/functions` folder or Netlify-only features. Read the README migration section. | None found. Only `netlify.toml` and `public/_headers` are host-specific. The README lists the migration steps. | Auto: test |
| M7 | "Think of this as a standalone proof-of-concept" | Read the README and the footer on every screen. | The footer reads "Prototype built for a take-home assessment. Not affiliated with or endorsed by TTB." The README states assumptions, limitations and measured results. | Auto: test. Browser |

## The tour (added after the plan was written)

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| T1 | A tour with a sample label that can be ignored | Open the app. Press Esc. Press the Tour button. Press Skip tour. | The tour opens at launch. Esc and Skip tour close it and leave the first screen empty and ready. The Tour button brings it back. | Browser |
| T2 | The tour walks through a whole review | Step through all 11 steps with Next and with the Enter key. | Each step points at the part of the screen it describes. The sample shows Likely reject with one mismatch (net contents). The arrow keys do not move the review behind the tour. | Auto: test (sample result, steps). Browser |
| T3 | The tour never gets in the way of real work | Open the tour, then paste a real label or text. | The tour closes and the pasted label or text is used. The sample is gone. | Browser |
| T4 | The tour stores nothing | Run the tour, close it, and look at Local storage. | Only the text size is stored. | Auto: test. Browser |

## Dave Morrison, senior agent: judgment and no extra burden

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| D1 | "STONE'S THROW" versus "Stone's Throw": "You need judgment." | Run c07 and c08. | Brand shows Match on both. | Auto: evaluate, test |
| D2 | A different brand is not waved through | Run d06. | Brand is not Match. Mismatch or Check is a pass. | Auto: evaluate, test |
| D3 | "Just don't make my life harder in the process." | Run c01 with the keyboard only: paste, Enter to start, arrow keys and Tab between fields, Enter to mark one reviewed, Tab to Label verified. | The whole review works without the mouse and without clicking first. The focus ring is always visible. | Browser |
| D4 | No shortcuts that hide mistakes | Look through the review screen and decision area on d01. | No "confirm all" or approve-everything control exists. | Auto: test |
| D5 | Uncertain results go to a person, with a reason | Press Label verified on d01 (Likely reject). Run q01 and d16. | Label verified on a Likely reject label asks for confirmation first. Uncertain fields show Check with a plain reason. Nothing uncertain shows Match. | Auto: test, evaluate. Browser |
| D6 | Notes the agent can use | Press Issues found on d01. Edit the notes. Press Copy notes. Paste into a text editor. | The notes list each flagged field with its reason, can be edited, and paste correctly. The Network tab shows nothing was sent. | Auto: test (notes). Browser. Paste check: Human |

## Jenny Park, junior agent: the government warning

A warning that cannot be read must never be treated as correct.

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| J1 | "word-for-word" | Run c01. Open the Government warning row. | The wording line says it matches the statute word for word and the title is in capital letters. | Auto: evaluate, test |
| J2 | "Smaller font, different wording, burying it in tiny text." (different wording) | Run d13 ("truck"), d14 (clause 2 missing) and d17 (clauses swapped). | Each shows Warning Mismatch, and the reason names what differs. | Auto: evaluate, test |
| J3 | "all caps and bold" (capitals) | Run d15. | Warning Mismatch. The reason says GOVERNMENT WARNING: must be in capital letters. | Auto: evaluate, test |
| J4 | A missing warning | Run d16. | Warning is Check with "not found", never Match. The tier is not Ready to approve. | Auto: evaluate, test |
| J5 | "all caps and bold" (bold) | Run d18 and d19, then c01. | d18 and d19 are not Ready to approve. The bold estimate and the by-eye list are shown. On c01 the by-eye list still appears. | Auto: evaluate, test |
| J6 | "burying it in tiny text" | Run q03. | Warning is Check, never Match. | Auto: evaluate, test |
| J7 | "it would be amazing if the tool could handle images that aren't perfectly shot" | Run q01 and q02. Then photograph a label on a screen at an angle, or with glare, and run it. | q01 shows the low-resolution flag. No field is Ready to approve on q01 or q02. The angled photo does not crash the app and does not give Ready to approve. Skew and glare are a documented limitation. | Auto: evaluate. Browser (synthetic skew and glare). Real photo: Human |
| J8 | Bold and size always left to the agent | Run c01, s01 and s02. Look at the Warning row (its three lines, and the by-eye items in the drafted notes). | The warning row shows Check bold when the wording matches, and its lines name the title's boldness and legibility. | Browser (see deviation below) |

## The brief: fields, errors, documentation and code

| ID | Requirement | Steps | Pass when | Checked by |
| --- | --- | --- | --- | --- |
| B1 | "Your app should handle labels containing information like the example below": all seven fields | Run c01. Count the rows. | Seven rows: brand name, class and type, alcohol content, net contents, bottler name and address, country of origin, government warning. | Auto: test |
| B2 | Country of origin only for imports | Run c05, d11, d12. On c01 press Imported. | Country shows Not required for a domestic product. c05 Match. d11 Check. d12 Mismatch. Setting c01 to Imported makes Country required. | Auto: evaluate, test |
| B3 | Number fields are exact | Run d01, d03, d04, d05. On c01 change net contents to 75 cl, then 0.75 L. | d01 and d04 Mismatch. d03 and d05 Check. 75 cl and 0.75 L both still Match 750 mL. | Auto: evaluate, test |
| B4 | Application text can be pasted as one block | Paste c01, c02, c03. Delete the Net Contents line. Paste an unrelated paragraph. | "Found 6 of 6 fields" for full blocks, "Found 5 of 6" with an Add button for a missing one, "Found 0 of 6" for unrelated text, with no crash. | Auto: test. Browser |
| B5 | "User experience and error handling" | Choose a .txt file as the image. Choose a blank white image. Choose a 220 px wide image. Press Start review with nothing entered. Paste text before any image. | Plain messages in each case: not an image, nothing could be read, low resolution, a prompt for what is missing. Pasted text goes in the text box. No blank screen and no red Console errors. | Browser |
| B6 | "We encourage you to create or source additional test labels" | In a clone run `npm install` then `npm run verify`. | The version check, all tests, the evaluation and the build pass. The evaluation prints 0 known-bad labels Ready to approve and 0 bad fields called a match. The numbers match the README. | Browser (clean clone) |
| B7 | A README with setup, approach, tools and assumptions | Read the README. Follow its setup steps on a clean clone. | Setup, approach, tools, assumptions, limitations, test results and the AI-use statement are all there. The setup steps work as written. The live URL opens. | Auto: test. Browser (clean clone) |
| B8 | "A working core application with clean code is preferred over ambitious but incomplete features. Document any trade-offs or limitations." | Read the README limitations. Open `src/engine` and `src/engine/fields.js`. | Limitations match what testing found (batch, skew and glare, bold and size, one image). The engine has no browser code. Each field is one entry in `fields.js`. | Auto: test |
| B9 | The sample label in the brief | Run s01, s02, r01. Record each field's status. | No field wrongly shows Match. A Check is acceptable and recorded. A wrong Mismatch on a correct field is a Fail. | Auto: evaluate |
| B10 | Repository hygiene | Browse the repository on GitHub. | No secrets, no personal data, no real brand artwork. The history is small, clear commits. CLAUDE.md and docs are present. | Auto: test |

## Known gaps

Record these when seen. They are known limits, not new failures, unless the README fails to say so.

- Net contents on the ABC sample (s01): "750 ML" was not read in earlier builds. Record what the current build shows.
- Extra reviews: about 4 of 11 clean labels are sent to Needs review (c07, s01, s02, r01). A clean label sent to review is acceptable. A bad label passed is not.
- Bottler and country of origin are best effort and lean toward Check.
- Not built: batch upload, several images per application, beer and wine rules, skew and glare correction.
- Bold of the warning is estimated or left for the agent to check by eye. Minimum type size is not checked (see below).
- Timing varies by computer. Record the machine with every timing.

## Where this repository differs from the plan as written

These came up while building the QA checks. They are decisions, not defects, except where marked fixed.

- **J8, type size (decision, 22 Oct 2026):** the plan says the by-eye list names "bold type, size and legibility". Minimum type size and characters per inch are no longer listed or measured. The image carries no real-world scale and the application data gives none, so neither the app nor a person could check them. The README says so.
- **J8, the "Check bold" pill:** it shows when the warning wording matches. When the bold estimate is clear, the by-eye list drops the bold item. When it cannot tell, the item stays.
- **J2, d14 (fixed in 0.2.12):** a warning with a whole clause missing was Check. It is now Mismatch when the rest was read clearly, and Check when the read was unsure.
- **D5 (fixed in 0.2.12):** Label verified on a Likely reject label had no confirmation. It now asks first.
- **M5 and B5 (fixed in 0.2.12):** Tesseract printed notes such as "Estimating resolution as 437" as red Console errors. They are silenced.
- **B6 (fixed in 0.2.12):** `npm run verify` failed on a fresh clone because the generated labels do not exist there. The evaluation now draws them first (macOS) or skips them with a message.

## Release blockers

| Blocker | Case |
| --- | --- |
| A known-bad label (d or q series) shows Ready to approve | J2 to J7, B3 |
| A request goes to any other site, or label data is stored | M2, M3 |
| The app crashes or shows a blank screen on bad input | B5 |
| A read takes over 5 s on an ordinary office PC with no explanation in the README | S1 |
| The live URL does not load, or the README's steps do not work | B7 |

## Sign-off

| Entry | Value |
| --- | --- |
| App version tested | |
| Browser and computer | |
| Tester and date | |
| Cases passed, failed, blocked | |
| Blockers open | |
| Ready to submit | yes or no |
