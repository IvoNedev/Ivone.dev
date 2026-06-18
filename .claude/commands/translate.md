Find the file `$ARGUMENTS.md` inside any subfolder of `Reddit/` (e.g. `Reddit/prorevenge/$ARGUMENTS.md`). Use Glob to search `Reddit/*/$ARGUMENTS.md`. Take note of which subfolder it lives in — that is the category name.

**Step 1 — Format the English text**

The file may or may not be formatted. Apply light formatting only:
- Break the text into natural paragraphs with a blank line between them where the topic or thought shifts.
- Do not add headers, bullet points, bold, or any other markdown — blank lines between paragraphs only.
- Do not rewrite or change any words.

Overwrite the file with the formatted English text.

**Step 2 — Translate to Bulgarian**

Translate the formatted English text into Bulgarian following these rules:
- Translate word-for-word as closely as possible.
- When you encounter idioms, phrasal verbs, slang, or expressions that don't map directly, translate their **meaning** naturally in Bulgarian — don't force a literal translation that sounds unnatural.
- Keep sentence rhythm close to the original — this will be read aloud for a YouTube video, so it should sound natural when spoken.
- Preserve the same paragraph breaks from Step 1.

Append the Bulgarian translation to the end of the same file, separated by:

---

**Step 3 — Update the log**

Create or update `Reddit/log.md`. Each line is one story in this format:

`{number}.md - {Category} - {one short punchy summary in English} - Translated`

Where `{Category}` is the subfolder name with the first letter capitalized (e.g. `prorevenge` → `ProRevenge`).

- If the file doesn't exist, create it.
- If an entry for this story number already exists, replace that line.
- Otherwise append a new line at the end.
- The summary should be punchy and short — like a headline, not a full sentence.

**Output format**

Print the result as two clearly labelled blocks:

---
**English (formatted)**

<formatted English text>

---
**Bulgarian**

<Bulgarian translation>
