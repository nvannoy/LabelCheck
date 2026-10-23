# LabelCheck

A browser-only prototype that helps a TTB compliance agent check an alcohol label image against its COLA application text. Built as a take-home assessment. Not affiliated with or endorsed by TTB.

Live: https://labelcheck-grtwrx.netlify.app/

Quick links: [Setup and running](#setup-and-running), [Approach](#approach), [Tools](#tools), [Assumptions](#assumptions), [Limitations](#limitations).

This is a proof of concept. It runs on Netlify's default subdomain, and a custom domain is not needed to evaluate it. A production deployment would run in Treasury's Azure tenant (see [Moving to Azure Static Web Apps](#moving-to-azure-static-web-apps)).

## How this was built

Claude Code wrote most of the code in this repository. The developer reviewed it and is expected to be able to explain every part. Simple code is preferred over clever code.

## Approach

AI reads, code judges, the agent decides.

- **Read:** Tesseract (tesseract.js) runs in a web worker in the browser and returns words with positions and confidence. The OCR engine, WebAssembly core, language data and font are all served from the app's own origin. Nothing leaves the browser and nothing loads from a CDN.
- **Judge:** plain JavaScript rules in `src/engine` compare what was read with the application text. Each of the seven fields is one entry in `src/engine/fields.js` (id, label, rule sentence, comparator). Every rule sentence cites the regulation it comes from; the summaries are in `docs/rules-reference.md`.
- **Decide:** the app never approves a label. "Label verified" and "Issues found" are the agent's own buttons, and nothing is preselected.

Rules the engine follows:

- The government warning is compared word for word against 27 CFR 16.21. The app also checks from the image whether "GOVERNMENT WARNING:" is bolder than the rest of the warning (stroke thickness compared inside the warning, so no scale is needed). It is an estimate that can only make a result worse, never better: a title that clearly is not bolder sends the warning to Needs review. The agent still confirms what the app could not settle, and always confirms legibility and contrast.
- Alcohol content and net contents are compared as exact numbers (net contents after unit conversion). No fuzzy matching.
- Brand name ignores capitals, punctuation and apostrophes. Bottler name and address use a looser match and can only ever return Check, never Mismatch.
- Anything uncertain (low OCR confidence, field not found, a small or low-contrast image) is **Check**, never a match.

## How a label is read

1. The image is split at a blank vertical gap into panels (for example a brand label and a back label side by side).
2. Each panel is upscaled, stretched to full contrast and read, and the words are mapped back to whole-image positions.
3. Only if alcohol content or net contents has no candidate, the front panel is read again in sparse-text mode. This finds small boxed text, such as white text on a blue box, that the normal pass skips. The first result is shown straight away with a "taking a closer look" message while this runs. Inverting the colors was tried first and never added a word.

## Screens

Screens follow the mockups in `docs/mockup/`.

- **Intake:** paste (Ctrl+V or Cmd+V), drop or choose a label image. OCR starts the moment the image arrives and the read time is shown. Paste the application text and the app finds up to six fields (brand, class and type, alcohol content, net contents, bottler, country). Each can be edited. A Domestic or Imported toggle decides whether country of origin is required.
- **Review (compact):** the image with a numbered box per field, seven field rows with one expanded, and a tier: Likely reject, Needs review or Ready to approve. Tab, arrow keys and the mouse share one focus. A- and A+ change the text size, which is the only thing stored in localStorage.
- **Review (full):** a Full screen button, two columns on wide screens, and a "What the app read" table.
- **Decision:** drafted notes can be edited and copied. Next label clears the image, the application text and the notes.
- **Tour:** a short guided tour on a made-up sample label opens every time the app opens (Skip tour or Esc closes it; the Tour button on the first screen brings it back). Nothing about it is stored. A "show this when the app opens" checkbox is a possible addition after approval: see `docs/future-work.md`.
- **Debug page:** the OCR probe is at `/?probe`.

## Application text format

Paste labeled lines, one field per line. Spellings the parser accepts include `Brand Name`, `Class/Type`, `Alcohol Content` or `ABV`, `Net Contents`, `Applicant`, `Bottler` or `Name and Address`, and `Country of Origin` or `Origin`. Other lines (permit numbers, dates) are ignored and counted. `Origin: Domestic` or `United States` means a domestic product. Ready-made examples for every test label are in `tests/applications/`.

## Setup and running

```
npm install     # also copies the OCR engine and font into public/ (postinstall)
npm run dev
npm run build
npm test
npm run evaluate
npm run verify  # version check, tests, evaluate, production build, browser checks
```

`public/ocr/` is generated by `scripts/copy-ocr.js` and is not committed. The tour's sample label and the recorded read of it (`src/tour/`) are committed because the app ships them; `node scripts/make-tour-sample.js` redraws them on a Mac. Hosting is static: `netlify.toml` and `public/_headers` are the only hosting files, so moving to another static host means porting those two. Every push needs a new version in `package.json`; `npm run verify` fails if the version matches `origin/main`.

## Tools

| Tool | Role | Why |
| --- | --- | --- |
| Vite and React (JSX, no TypeScript) | App shell and UI | Small, common and fast to build. Output is plain static files. |
| tesseract.js 7 | OCR in the browser | Runs on the agent's machine, so label images never leave it. The worker, WASM core and language data are served from this app's own origin. |
| Own edit-distance code (`src/engine/text.js`) | Fuzzy matching | It is 15 lines and easy to audit, so no library is needed. |
| Vitest | Engine tests | Runs the same pure engine code that the evaluation script uses in Node. |
| Atkinson Hyperlegible (self-hosted) | Font | Built for legibility, and self-hosted so nothing loads from a CDN. |
| `@napi-rs/canvas` | Test-label generator and evaluation script (dev dependency only) | Draws fictional test labels with bundled fonts, so they look the same on every OS. |
| Netlify | Static hosting | Static files only. `netlify.toml` and `public/_headers` are the only hosting files. |
| Claude Code | Wrote most of the code | See "How this was built". |

## Security

`public/_headers` sets a strict Content Security Policy: `default-src 'self'`, `connect-src 'self'`, `worker-src 'self' blob:`, and `'wasm-unsafe-eval'` for OCR's WebAssembly. No backend, no analytics, no cookies. Label images and application text stay in memory and disappear on Next label or reload.

## Moving to Azure Static Web Apps

The app is static files only, with no functions, so moving hosts means porting two files. Nothing in `src/` changes.

1. Build: `npm ci && npm run build`. The output is the `dist/` folder.
2. In the Static Web Apps setup use app location `/`, API location empty and output location `dist`.
3. Replace `netlify.toml` and `public/_headers` with a `staticwebapp.config.json` in `public/` that carries the same headers:

```json
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  },
  "routes": [
    { "route": "/ocr/*", "headers": { "Cache-Control": "public, max-age=2592000" } },
    { "route": "/fonts/*", "headers": { "Cache-Control": "public, max-age=2592000" } }
  ]
}
```

4. Check the deployed site: the page response carries the Content-Security-Policy, and the browser Network tab shows no request to any other host.

## Testing

The test set has 33 labels: 30 generated fictional labels (one defect each, plus clean ones), 2 TTB spirits sample images, and 1 TTB malt beverage image used as an OCR regression check. Every label has paste-ready application text. The procedure, scoring rules and files are in `tests/TEST-PROCEDURE.md`. The stakeholder QA plan (`tests/qa/`) maps every requirement in the brief to a test case; its automated cases run with `npm run verify` and the manual ones are recorded in `tests/qa/RESULTS.md`.

The key measure is that no known-bad label may come out Ready to approve. Extra Needs review results are acceptable.

## Results

Last run on macOS (`npm run verify`, version 0.2.16):

- 219 tests pass, and the browser checks (`npm run e2e`) pass: no sideways scrolling at 440 and 360 px with larger text, no "Ready to approve" flash while the bold check runs, no failed requests or console errors.
- **0 of 22 known-bad labels called Ready to approve.** No bad field was called a match.
- 215 of 231 field results (93%) were exactly as expected. Every miss went to review, the safe direction.
- 5 of 11 clean labels came out Ready to approve. The other 6 went to review.
- The stakeholder QA plan's 24 label cases: 19 pass, 5 recorded as accepted extra reviews, 0 fail (`tests/qa/RESULTS.md` has every case).
- Reading time in Node: median about 2.1 s, mean about 2.4 s, slowest about 5 s (second-pass labels).
- OCR engine load on the deployed site: 2 to 5 s once per page load. Files under `/ocr/` and `/fonts/` are cached for 30 days.

The clean-label count fell from 7 of 11 to 5 of 11 when the test labels were redrawn with bundled open-licence fonts (so every computer draws the same labels). Tesseract reads the decimal point in "1.75 L" less reliably in these fonts and reads one all-capitals bold brand with low confidence. Both go to review, never to a pass. No rule was loosened to recover the count.

### Results per platform

The generator and the evaluation are meant to give the same result on every system. The GitHub Actions workflow (`.github/workflows/verify.yml`) runs `npm ci` and `npm run verify` on all three. Only macOS has been run by hand; Windows and Linux numbers come from the workflow and are not filled in until it has run.

| Platform | Tests | Known-bad Ready | Clean labels Ready | Field results as expected |
| --- | --- | --- | --- | --- |
| macOS (local, Node 25) | 219 pass | 0 of 22 | 5 of 11 | 215 of 231 (93%) |
| Windows (CI) | not yet run | | | |
| Linux (CI) | not yet run | | | |

Machine for timings: Intel Core i7-1068NG7 (4 cores, 8 threads), 32 GB RAM, macOS. An ordinary office PC may be slower.

## Assumptions

- The app is for desktop and laptop users with a mouse and keyboard. Touch screens are not a target.
- One label image per application. Two labels side by side in one image work only when there is a blank vertical gap between them.
- Distilled spirits rules (27 CFR Part 5 and Part 16). Beer and wine rules are not covered. The two TTB spirits samples and one malt beverage image are real government examples kept in `tests/samples/` as the one exception to using generated labels only.
- The app is standalone, with no COLA integration. The agent copies the label image and the application text from the COLA record.
- The application text is pasted as labeled lines (see above).
- The seven fields come from the brief.
- An ordinary office PC is the speed benchmark (about 5 seconds to read and check).
- Bottler name and address and country of origin are best-effort fields.

## Limitations

- **Batch upload is not built.** It was a stretch goal in the brief. It needs a queue, per-label results and a summary screen, and the prototype keeps to one label at a time so that every result stays a human decision.
- **One image per application.** Several images per application are not supported. Two labels side by side in one image work only when there is a blank vertical gap between them.
- **Distilled spirits only.** Beer and wine rules are not covered.
- **Skew and glare are not corrected.** Images should be straight and evenly lit.
- **The app errs toward review.** 6 of 11 clean labels went to Needs review. Each had a reason: a brand printed in a decorative or all-capitals font that OCR reads with low confidence, a bottler printed in a decorative font, or capital letters and punctuation differing in the warning. The result is safe, but an agent will see extra reviews.
- The browser reads slightly slower and less accurately than Node. For example, the TTB ABC sample is read with the brand matching in the browser but flagged in Node. The cause is not yet explained.
- Where a field is genuinely missing, the second pass adds 1 to 2 s. The slowest browser case measured was 4.4 s and the slowest Node case reached 6.0 s once under load, so the 5 s target is met on this machine only some of the time, with no margin for a slower PC. The first result is shown before the second pass finishes.
- OCR struggles with stylized fonts, outlined letters, pale text on pale backgrounds and artwork behind text. Skewed or glare-affected images are not supported.
- Boldness is estimated by comparing stroke thickness, calibrated on generated labels in five font families. It is not judged for letters under about 14 px tall, so most small, low-resolution labels (like the TTB samples) get "cannot tell". Contrast and "same field of vision" are always left to the agent.
- **Minimum type size and characters per inch (27 CFR 5.53 and 16.22) are not checked.** An image carries no real-world scale and the application data does not give one, so there is nothing to measure against. A first version asked the agent to type the label width; that was removed because it is not part of the application data and needs extra steps.
- Images under 500 px wide or with very low contrast turn every match into Check.
- The TTB malt beverage sample has a red ellipse drawn over its alcohol content, which defeats the normal pass. The second pass recovers it, but it is a stress case and not a typical label.
