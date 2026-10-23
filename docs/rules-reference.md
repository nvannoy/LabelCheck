# Rules reference: distilled spirits labels

Source: eCFR text of 27 CFR Part 5 and Part 16 as of 2026-10-01. Part 5 was renumbered, so older section numbers (for example the old 5.32 to 5.38 series) no longer apply. Each field's rule sentence in the engine config should cite a section from this file.

This file summarizes the rules in plain words. It is not legal advice and the app never approves a label on its own. Read the full text on ecfr.gov before relying on a detail.

## How each rule is checked

| Kind | Meaning |
| --- | --- |
| Code check | The engine compares the label text with the application text and returns Match, Check or Mismatch. |
| Agent check | The app cannot judge it from OCR. It is always flagged for the agent to confirm by eye. |

## Fields

### Brand name (27 CFR 5.64)
- A brand name is required. If the product has none, the bottler, distiller or importer name in the name and address statement counts as the brand.
- A brand name may not be misleading about age, origin, identity or other characteristics. Agent check.
- Code check: case, punctuation and apostrophe differences still match (rule 6 in CLAUDE.md).

### Class and type (27 CFR 5.63(a)(2), standards of identity in 5.141 to 5.156)
- Required, in the same field of vision as the brand name and alcohol content.
- Code check: normalized text match against the application.

### Alcohol content (27 CFR 5.65)
- Must be a percentage of alcohol by volume, in one of three forms:
  - Alcohol X percent by volume
  - X percent alcohol by volume
  - Alcohol by volume X percent
- Allowed abbreviations: "alc" for alcohol, "%" for percent, "/" in place of "by", "vol" for volume, with or without a period. Examples: "40% alc/vol", "Alc 40% by vol".
- Proof may also appear, but only if it is in the same field of vision as the percentage statement.
- Products with solid fruit or similar material that absorbs spirits must say "Bottled at X percent alcohol by volume."
- A plus or minus 0.3 point tolerance applies to the real content of the bottle against the labeled number. It is not a tolerance between the label and the application, so the engine compares the numbers exactly.
- Code check: number compared exactly, no fuzzy matching.

### Net contents (27 CFR 5.70)
- Required on a label. "Liter" may be spelled "litre" or written "L". Milliliters may be written "ml", "mL" or "ML" (with or without a period).
- U.S. customary equivalents and metric equivalents such as centiliters may appear, in the same field of vision as the metric statement.
- Code check: number and unit compared exactly after unit normalization, no fuzzy matching.

### Bottler name and address (27 CFR 5.63(b)(1), 5.66, 5.67, 5.68)
- Domestic spirits (5.66): the name must follow a phrase for the function performed, such as "bottled by", "packed by", "distilled by", "blended by", "produced by". The address is the city and State. Street, zip code, phone and website are optional.
- Spirits bottled after import (5.67) and imported in a container (5.68) have their own wording.
- If more than one party performed different functions, the label may not suggest one party did all of them.
- Code check: looser fuzzy match that leans toward Needs Review. Best-effort field.

### Country of origin, imports only (27 CFR 5.69)
- Section 5.69 only points to U.S. Customs and Border Protection rules (19 CFR parts 102 and 134).
- Best-effort field. Required only when the application is for an import.

### Government warning (27 CFR 16.21 and 16.22)
- Statutory text, word for word:

  GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.
- Must be separate and apart from all other information.
- "GOVERNMENT WARNING" must be in capital letters and bold. The rest of the statement may not be bold.
- Code check: exact word match after normalizing only whitespace and line breaks. "GOVERNMENT WARNING:" must be all caps.
- The app estimates bold type from stroke thickness, and, when the agent enters the label width, type size and characters per inch. Estimates can only make a result worse. The agent confirms the rest.
- Agent check: letters not compressed, separate and apart, contrasting background.
- Minimum type size, by container size (16.22(b)):
  - 237 mL or less: at least 1 mm
  - over 237 mL up to 3 L: at least 2 mm
  - over 3 L: at least 3 mm
- Maximum characters per inch (16.22(a)(4)): 40 for 1 mm type, 25 for 2 mm, 12 for 3 mm.
- Type size and characters per inch cannot be measured from an image alone; they need the label's real width.

## Rules that apply to every mandatory item

### Legibility (27 CFR 5.52). Agent checks.
- Readily legible to potential consumers under ordinary conditions.
- Separate and apart from additional information, except the brand name. It may sit among other text only if it is substantially more conspicuous. Brief optional phrases attached to the class or type or to the name and address are allowed (for example "premium vodka").
- Color must contrast with the background. Black on white or cream, or white or cream on black, are the examples given.
- Any capitalization is allowed (all caps, all lower case, mixed). The government warning rules above are stricter.

### Type size (27 CFR 5.53). Agent check.
- Every capital and lowercase letter of mandatory information must be at least 2 mm tall on containers over 200 mL, and at least 1 mm tall on containers of 200 mL or less.
- The wine chapter says 187 mL. That does not apply to spirits. Do not copy it.

### Visibility (27 CFR 5.54). Agent check.
- Mandatory information must be readily visible and not covered or obscured.

### Field of vision (27 CFR 5.63(a)). Agent check.
- Brand name, class or type, and alcohol content must be viewable together on a single side of the container (for a round container, a side is 40 percent of the circumference).
- With one image per application the app cannot tell which side of the container a label is on, so it asks the agent to confirm.
- Name and address and net contents may appear anywhere on the container (5.63(b)).

## Not yet covered
- Conditional statements in 5.63(c): neutral spirits percentage, coloring or wood treatment, age, state of distillation, FD&C Yellow No. 5, cochineal or carmine, sulfites, aspartame. Out of scope for the seven fields in CLAUDE.md.
- Standards of fill (5.203) and prohibited or misleading statements (5.101 to 5.130). Agent judgment.
- Beer, malt beverage and wine rules. Out of scope.
