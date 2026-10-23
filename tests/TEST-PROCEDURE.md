# Test procedure: label set

The test set has 31 labels: 28 generated fictional labels, 2 real sample images published by TTB, and 1 regression sample (a TTB malt beverage example used only as an OCR check).

## Files

| File | Role |
| --- | --- |
| `scripts/label-specs.js` | Source of truth. Application text, label text, style and expected result for each label. |
| `scripts/make-test-labels.js` | Draws the 28 generated labels into `generated/labels/` and rewrites `tests/expected-results.json`. |
| `tests/expected-results.json` | Generated from the specs and committed. Lists all 30 labels with expected field results. |
| `tests/samples/` | The 2 TTB sample images. Committed because they cannot be regenerated. Source: the TTB distilled spirits brand label page. |
| `generated/labels/` | Output images. Not committed. |

## Application text for each label

Every label has paste-ready application text in `tests/applications/<id>.txt` (also stored as `applicationText` in `expected-results.json`). Paste it into the app next to the label image to try the same case by hand. The files use three layouts in turn (different field names, extra lines such as permit numbers, and different ways to say Domestic) so the parser sees real variety. Generated from `scripts/label-specs.js`; do not edit by hand.

`npm test` checks that every text file parses back to the application its label was built from, and `npm run evaluate` runs the whole path: image to OCR, text to parser, both to the engine.

## Running it

```
npm test            # engine tests, plus a golden check of the expected results (no OCR)
npm run evaluate    # reads all 31 images with OCR, parses the application text, runs the engine, prints accuracy and timing
npm run verify      # version check, tests, evaluate, then a production build: run this before every push
```

`npm run evaluate` exits with an error if any known-bad label comes out Ready to Approve, or any bad field is called a match.

## Rebuilding the set

```
node scripts/make-test-labels.js
```

The script uses macOS system fonts (Georgia, Times New Roman, Arial, Trebuchet MS, Verdana), so run it on a Mac. Do not hand-edit `tests/expected-results.json`. Change the specs and rerun.

## Label groups

- `c01` to `c08`: clean labels. Expected Ready to Approve. `c07` (brand in capitals) and `c08` (curly apostrophe) check that harmless differences still match.
- `d01` to `d17`: one defect each (ABV, net contents, brand, class, bottler, country, government warning). None may be Ready to Approve.
- `q01` to `q03`: right text but a hard-to-read image (small, pale, tiny warning). None may be Ready to Approve.
- `r01`: the Malt & Hop regression sample. A red ellipse drawn over "5% ALC./VOL." defeats OCR there.
- `s01`, `s02`: TTB samples. Each shows a brand label and a back label in one image, which is a stress case because the app supports one label per image. The application text is copied from what the label shows, since TTB publishes no matching application.

## Expected results

Each entry has an `expected.fields` object and an `expected.overall`.

Field statuses: `match`, `mismatch`, `check` (field not found or uncertain, Needs Review) and `na` (not required, for example country of origin on a domestic product).

`overall` is `ready` only when every field is `match` or `na`. Otherwise it is `not-ready`.

## Scoring

1. A label with `overall: not-ready` that the engine calls Ready to Approve is a **failure**. This is the key measure. The target is zero.
2. A field expected to be `mismatch` or `check` that the engine calls `match` is a failure.
3. A field expected to be `match` that the engine calls `check` is an **extra review**. It is acceptable but is counted and reported.
4. A field expected to be `mismatch` that the engine calls `check` is acceptable. Needs Review is the safe side.

The government warning always carries an agent check for bold type and size, because OCR cannot read either. That check does not change the status above.

## Adding a label

1. Add a `make(...)` entry to `scripts/label-specs.js` with the defect described in one line.
2. Run `node scripts/make-test-labels.js`.
3. Run `npm test` and commit the spec and the updated `tests/expected-results.json`.

Real brand artwork is never used. TTB sample images are the one exception, agreed with the developer, because TTB published them as examples.

## Versions

Every push needs a new version in `package.json`: 0.2.x for small changes, a new minor number for bigger ones. `npm run verify` fails if there are unpushed commits and the version matches `origin/main`.
