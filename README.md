# Sehaj's Website — template

**Starting point:** this is a copy of the design and code of
[alessia-website](https://github.com/SehajroopSingh/alessia-website), taken as a template.
All the page text and photos are still Alessia's — replace them with your own.
Her personal PDFs (`documents/`) were not copied, so links to them on the CV, Work and
Thinking pages will be empty until you add your own files. `BRIEF.md` is her content
brief; keep the structure ideas or delete it.

Preview locally: `python3 -m http.server 4180`, then open http://localhost:4180.

---

# Alessia Canuto — Personal Website

An editorial-style personal website: warm, magazine-like, and built with **plain HTML, CSS
and JavaScript** — no frameworks, no build step, nothing to install. If you can edit a
text file, you can edit this site.

## What's in the folder

| File / folder | What it is |
|---|---|
| `index.html` | Homepage (hero, central question, The Work — six case-study cards, figures, recent writing, the veil, contact) |
| `about.html` | About page (essay, "How I work", FAQ) |
| `work.html` | All case studies, with category filters |
| `thinking.html` | Writing & research — academic papers and articles, grouped by institution/publication |
| `journey.html` | Interactive map of cities, with year filters |
| `cv.html` | Expandable CV + document library |
| `contact.html` | Contact details + contact form |
| `css/style.css` | **All** the styling. Colours & fonts are at the very top. |
| `js/main.js` | All the interactivity (menu, animations, filters, form) |
| `images/` | Photos (portraits, journey pictures) |
| `documents/` | CV, thesis and certificate PDFs |
| `BRIEF.md` | The working design/content brief — read before structural changes |

## How to preview the site

Just double-click `index.html` — it opens in your browser. Every page works locally.

## Common edits

### Change any text
Open the page in a text editor (TextEdit, VS Code, Notepad), find the sentence, change
it, save, refresh the browser. The HTML files have big `═══ SECTION ═══` comment banners
so you can find each section quickly.

### Change the colours or fonts
Open `css/style.css`. The first block (called **1. DESIGN TOKENS**) contains every
colour and font. For example, change `--accent` to recolour the default accent, or the three Action colours
(`--analyse`, `--translate`, `--build`) to re-code the whole taxonomy at once.

### Add a real photo (replacing a placeholder)
1. Put the photo in the `images/` folder (e.g. `images/portrait.jpg`).
2. Find the placeholder in the HTML — placeholders are `<div class="arch-frame">` or
   `<div class="ph …">` blocks, each with a comment right above explaining the swap.
3. Replace the block with an `<img>` tag as the comment shows, e.g.
   `<img class="arch-frame" src="images/portrait.jpg" alt="Portrait of Alessia Canuto" style="object-fit: cover;">`

### Add the CV PDF (or a thesis)
1. Put the file in `documents/` (e.g. `documents/alessia-canuto-cv.pdf`).
2. In `cv.html` (and `thinking.html` for the thesis), find the "PDF — coming soon" card —
   a comment above it shows the exact download link to paste in.

### Add a new paper or article to Thinking
The Thinking page is a "bento" archive in two parts — Academic writing, then Articles &
opinion writing — grouped by institution or publication. In `thinking.html`, copy one
whole `<article class="bento-card"> … </article>` block into the right group and edit
the title, date, summary and link (label it `PDF` for a PDF, `Read article` otherwise).
Academic cards also hold an `Abstract, question, methodology & findings` section.
Add `bento-card--wide` to a card's class to make it twice as wide (useful for filling
a gap at the end of a group). Each group's dark tile shows the institution's name as
text; a comment inside it shows how to swap in an official logo image.

### Add a new case study to Work
The Work page is deliberately limited to six case studies — two per Action
(see BRIEF.md before adding more). To swap or edit one, copy a whole
`<article class="case"> … </article>` block. Give it:
- a unique `id="..."` (so it can be linked to),
- `data-categories="..."` — one of the three Actions: `analyse`, `translate`, `build`.
Focus areas (ESG & Sustainability, AI, Socioeconomic Development, Behavioural
Science) are plain-text tags in the `focus-tags` span — never coloured.

### Edit the pre-typed contact messages
In `js/main.js`, find `starters = { … }` (section 6). Each entry is the text inserted
when a visitor picks that topic. The visitor can always edit it before sending.

### If your edits don't show up in the browser
Every page loads `css/style.css?v=6` and `js/main.js?v=6`. If you change the CSS or
JavaScript and a browser stubbornly shows the old version, bump the number (`?v=7`)
in all the HTML files — a find-and-replace of `?v=6` → `?v=7` across the folder.

### Turn a scroll "scene" on or off
On desktop, three homepage sections **pin in place** while you scroll: the central
question (its areas light up one by one), the six case-study cards (they stack up like
a hand of cards), the system→outcome diagram (connects node by node) and the closing
"Let's talk" stamp. Each one is marked with a `data-scene` attribute in `index.html` and
a comment right above it — **delete the attribute to switch that scene off**. On phones, and for visitors who prefer reduced
motion, the page automatically behaves like a normal scrolling page.

### Edit a case-study card
Each of the six case studies appears twice, as the same colour card: small on the
homepage (`index.html`, search for `deck-card`) and expanded on the Work page
(`work.html`, each `<article class="case colour-card ...">`). Both show the same
fields — number / Action, organisation, role, project type and title — so if you
change one of those, change it in both places. A card's colour comes from its class — `colour-card--violet` /
`--amethyst` (Analyse), `--green` / `--lime` (Translate), `--blue` / `--sky` (Build) —
and its background photo is the `<img>` inside `colour-card-bg` (the `images/case-*.jpg`
files). The photo is tinted to the card's colour automatically, so any photo works.

### Change the words on the rotating badge
The little spinning stamp on the homepage hero lives in `index.html` — search for
`orbit-badge`. The words are inside the `<textPath>` tag. Keep the text roughly the
same length so it fits the circle.

### Change navigation or footer links
The header and footer are repeated at the top/bottom of **every** HTML page (that's the
one trade-off of having no build step). If you rename a page, update the links in all
seven files — a find-and-replace across the folder takes seconds.

## How the contact form works

There's no server, so the form composes the email in the **visitor's own email app**
(a `mailto:` link to alessiacanuto@hotmail.com) with their message pre-filled. If you
later want messages delivered without an email app, sign up at
[formspree.io](https://formspree.io) (free tier), then in `contact.html` add
`action="https://formspree.io/f/YOUR-ID" method="POST"` to the `<form>` tag and delete
the submit handler in `js/main.js` (section 6b).

## Publishing the site (free, via GitHub Pages)

1. Create a repository on github.com (e.g. `sehaj-website`).
2. Upload this whole folder (or push it with git).
3. In the repo: **Settings → Pages → Source: Deploy from a branch → main → / (root)**.
4. The site appears at `https://<username>.github.io/sehaj-website/` in a minute or two.
   A custom domain (e.g. alessiacanuto.com) can be connected on the same settings page.

## Design notes (for future edits)

- **Serif** (Playfair Display) is for headlines and quotes; **sans-serif** (DM Sans) is for
  labels, body text and interface. Both load from Google Fonts (see the `<link>` tags
  in each page's `<head>`).
- Animations are subtle on purpose, and automatically switch off for visitors whose
  system asks for reduced motion.
- Every homepage section arrives in its own way — the arch wipes up, the question's
  areas wipe open sideways, the six case-study cards stack up like a hand of cards,
  the diagram pops together, and the article rules draw themselves. These all live in one commented block of
  `css/style.css` (section 19c) if you ever want to adjust or remove one.
- Each inner page has its own signature too (section 19d of the CSS): About's text
  sharpens from a blur ("the veil lifts") with a reading-progress line under the header;
  Work's case-study cards rise into place and filters re-deal the results with a
  live count; Thinking's archive cards cascade in by group; Journey's map
  assembles west-to-east while its routes march like a flight path; the CV's documents
  lay down like papers; and the Contact form assembles field by field.
- **Printing works**: any page prints as a clean black-on-white document (navigation,
  buttons and decoration are stripped, and CV accordions open automatically). Until the
  CV PDF exists, "print the CV page" is a perfectly presentable stand-in.
- Small details that are easy to miss but deliberate: the browser-tab icon
  (`images/favicon.svg`), the drop cap on
  the About page, the faint paper grain over the background, and the colophon line in
  the footer. Each is marked with a comment where it lives.
- Every number shown on the site is real. Please keep it that way — the site's
  credibility depends on it. Where something isn't available yet (photos, PDFs, article
  links) there's an elegant placeholder instead of an invention.
