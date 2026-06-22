# Bite Insight — Blog Post HTML Template

Reference for generating blog post **body HTML** that renders with the same
styling as posts built in the website editor. Give this to the routine so its
output matches the live site.

---

## How the body works

A post's body is **only the sequence of blocks below**, one after another. Do
**not** wrap it in `<html>`, `<body>`, `<article>`, or `.blog-article-body` — the
page adds that wrapper. Output just the blocks.

Other fields (title, excerpt, category, featured image) are stored separately,
not in the body.

### Hard rules
- **No inline `style=""` attributes** anywhere. All styling comes from classes.
- **No `<h1>`** in the body (the post title is a separate field). Use `<h2>` for
  section headings and `<h3>` for sub-headings.
- **Bullet lists must be a plain `<ul>` with no class** — that is what gets the
  branded lightning-bolt marker. A `<ul class="...">` will not.
- Use `<strong>` for bold and `<a href="...">` for links. Nothing else inline.
- **Copy style:** no dashes of any kind (`-`, `–`, `—`). Write plain, human,
  conversational sentences. Rephrase instead of using a dash.
- Use real HTML entities for quotes/apostrophes is optional; straight quotes are
  fine.
- Separate major sections with a divider: `<hr class="article-divider">`.

---

## Core text blocks

```html
<h2>Section heading</h2>

<h3>Sub-heading</h3>

<p>A paragraph of body copy. Use <strong>bold</strong> for emphasis and
<a href="https://example.com">links</a> where useful.</p>

<!-- Bullet list — MUST be class-less to get the branded bolt marker -->
<ul>
  <li>First point</li>
  <li>Second point</li>
  <li>Third point</li>
</ul>

<!-- Numbered list (plain numbers) -->
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>

<!-- Divider between sections -->
<hr class="article-divider">

<!-- Pull quote -->
<blockquote>A short, punchy quote that stands out from the body copy.</blockquote>

<!-- Image with optional caption -->
<figure>
  <img src="https://full-url-to-image.jpg" alt="Describe the image">
  <figcaption>An optional caption shown under the image.</figcaption>
</figure>
```

---

## Rich components

Use these to break up long articles. Copy the markup exactly and swap the text.

### Stat callout
One headline figure with a supporting note. Wrap the emphasised figure in
`<span class="article-stat-num">`.

```html
<div class="article-stat">
  <p class="article-stat-lead"><span class="article-stat-num">73%</span> of UK adults are familiar with the term "ultra-processed food"</p>
  <p class="article-stat-pill">...but only <strong>13%</strong> can correctly categorise food items as ultra-processed</p>
</div>
```

### Numbers card
A grid of big figures. Each tile is a figure; an optional paragraph can sit under
it. Sub-title and a top paragraph are optional.

```html
<div class="article-numbers">
  <p class="article-numbers-subtitle">Optional eyebrow</p>          <!-- optional -->
  <h3 class="article-numbers-title">The UK's UPF in Numbers</h3>
  <p class="article-numbers-text">Optional intro paragraph.</p>     <!-- optional -->
  <div class="article-numbers-grid">
    <div class="article-numbers-item">
      <span class="article-numbers-stat">50%+</span>
      <p class="article-numbers-item-text">of daily calories from UPFs</p>   <!-- optional -->
    </div>
    <div class="article-numbers-item"><span class="article-numbers-stat">66%</span></div>
    <div class="article-numbers-item"><span class="article-numbers-stat">70%+</span></div>
    <div class="article-numbers-item"><span class="article-numbers-stat">41%</span></div>
  </div>
</div>
```

### Card grid
White cards in a responsive grid (1 to 4 across by card count, 5+ wraps).
Each card: an optional sub-title eyebrow, a title, an optional note, an optional
paragraph, and an optional bullet list. Title is the only required part.

```html
<div class="article-cardgrid">
  <div class="article-cardgrid-card">
    <div class="article-cardgrid-head">
      <p class="article-cardgrid-label">Group 1</p>                 <!-- optional sub-title -->
      <h4 class="article-cardgrid-title">Unprocessed or minimally processed</h4>
      <p class="article-cardgrid-note">(Used to cook with.)</p>     <!-- optional note -->
    </div>
    <p class="article-cardgrid-text">Optional body paragraph.</p>   <!-- optional -->
    <ul class="article-cardgrid-list"><li>Fresh fruit</li><li>Vegetables</li><li>Eggs</li></ul>  <!-- optional -->
  </div>
  <div class="article-cardgrid-card">
    <div class="article-cardgrid-head">
      <h4 class="article-cardgrid-title">Processed culinary ingredients</h4>
    </div>
    <ul class="article-cardgrid-list"><li>Olive oil</li><li>Butter</li><li>Salt</li></ul>
  </div>
</div>
```

### Numbered panel
A teal panel of auto-numbered steps. Each item is a title with an optional
paragraph below it. The numbers are added automatically.

```html
<div class="article-numlist">
  <div class="article-numlist-item"><div class="article-numlist-content">
    <p class="article-numlist-title">First item title</p>
    <p class="article-numlist-desc">Optional supporting paragraph.</p>   <!-- optional -->
  </div></div>
  <div class="article-numlist-item"><div class="article-numlist-content">
    <p class="article-numlist-title">Second item title</p>
  </div></div>
</div>
```

### Temperature gauge / scale
A vertical gradient bar with bubble cards pointing at it. Each bubble: optional
sub-title, a title, optional note, optional paragraph, optional bullet list.
Add `article-gauge--reversed` to the wrapper to flip the gradient (red at top).

```html
<div class="article-gauge">
  <div class="article-gauge-bar" aria-hidden="true" contenteditable="false"></div>
  <div class="article-gauge-bubbles">
    <div class="article-gauge-bubble">
      <p class="article-gauge-label">Group 1</p>
      <h4 class="article-gauge-title">Unprocessed or minimally processed</h4>
      <ul class="article-gauge-list"><li>Fresh fruit</li><li>Vegetables</li><li>Eggs</li></ul>
    </div>
    <div class="article-gauge-bubble">
      <p class="article-gauge-label">Group 2</p>
      <h4 class="article-gauge-title">Processed culinary ingredients</h4>
      <p class="article-gauge-note">(Used to cook with, not eaten on their own.)</p>
      <ul class="article-gauge-list"><li>Olive oil</li><li>Butter</li><li>Salt</li></ul>
    </div>
  </div>
</div>
```

### Accordion (FAQ)
Expandable rows. Add `open` to the first `<details>` to have it expanded.

```html
<div class="article-accordion">
  <details open>
    <summary>First question (open by default)</summary>
    <div class="article-accordion-body"><p>Answer copy goes here.</p></div>
  </details>
  <details>
    <summary>Second question</summary>
    <div class="article-accordion-body"><p>Hidden answer copy.</p></div>
  </details>
</div>
```

### Table

```html
<table>
  <thead>
    <tr><th>Column A</th><th>Column B</th></tr>
  </thead>
  <tbody>
    <tr><td>Row 1</td><td>Value</td></tr>
    <tr><td>Row 2</td><td>Value</td></tr>
  </tbody>
</table>
```

### The Bottom Line (conclusion)
End most articles with this. It gets a light-teal end section on the page.

```html
<div class="article-conclusion">
  <h2 class="article-conclusion-title">The Bottom Line</h2>
  <p class="article-conclusion-lead">Summarise the key takeaway in one or two punchy sentences that leave the reader with a clear, confident next step.</p>
</div>
```

---

## Example article skeleton

```html
<p>Opening paragraph that sets up the topic and hooks the reader.</p>

<h2>The first thing to understand</h2>
<p>Explain it plainly.</p>

<div class="article-stat">
  <p class="article-stat-lead"><span class="article-stat-num">96%</span> of UK adults do not eat the recommended 30g of fibre a day</p>
  <p class="article-stat-pill">The average intake is just <strong>18g</strong></p>
</div>

<h2>How it breaks down</h2>
<p>Lead into the groups.</p>

<div class="article-cardgrid">
  <div class="article-cardgrid-card">
    <div class="article-cardgrid-head"><h4 class="article-cardgrid-title">Vegetables</h4></div>
    <ul class="article-cardgrid-list"><li>Broccoli</li><li>Spinach</li><li>Carrots</li></ul>
  </div>
  <div class="article-cardgrid-card">
    <div class="article-cardgrid-head"><h4 class="article-cardgrid-title">Fruits</h4></div>
    <ul class="article-cardgrid-list"><li>Apples</li><li>Berries</li><li>Pears</li></ul>
  </div>
</div>

<hr class="article-divider">

<h2>What to do about it</h2>
<div class="article-numlist">
  <div class="article-numlist-item"><div class="article-numlist-content">
    <p class="article-numlist-title">Swap white rice for brown rice</p>
    <p class="article-numlist-desc">Doubles the plant diversity in one move.</p>
  </div></div>
  <div class="article-numlist-item"><div class="article-numlist-content">
    <p class="article-numlist-title">Add a handful of seeds to breakfast</p>
  </div></div>
</div>

<div class="article-conclusion">
  <h2 class="article-conclusion-title">The Bottom Line</h2>
  <p class="article-conclusion-lead">Small, steady swaps beat any crash plan. Pick one change this week and let it stick.</p>
</div>
```
