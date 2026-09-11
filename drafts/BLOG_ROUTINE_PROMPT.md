# Blog routine — corrected scheduled-task prompt

Paste this into the Trigger's prompt field (Claude Code on the web →
this environment's Scheduled Tasks), replacing the previous version.
It fixes the three things that went wrong the first time this ran:
duplicate topic, wrong voice, no real upload.

---

Produce a draft blog post package for biteinsight.co.uk.

Before starting, read docs/BLOG_POST_TEMPLATE.md and follow its
structure and rules exactly.

1. Research
   - The real content source is the Supabase project "Bite Insight"
     (id bfkxjgbvsygvenmciasg), table public.blog_posts. Query every
     row (title, slug, excerpt, category, status) to see what's
     already covered or drafted. Do NOT rely on local repo files for
     this — this repo has no blog content of its own.
   - Choose one relevant topic for our audience that isn't already
     covered by an existing row, published or draft. Use web search
     to gather key points, examples and sources.

2. Draft
   - Write a complete post of 1,500–3,500 words: headline, intro, body
     sections, conclusion. Conversational, human tone. No dashes of
     any kind in the copy (see docs/BLOG_POST_TEMPLATE.md).
   - Output the body as a sequence of the template's blocks using the
     exact class names. No <html>/<body> wrapper, no inline styles.
   - Write a short AI summary (2-4 sentences) for the ai_summary field.

3. Images
   - Use the Magnific stock library to find a hero image plus one
     image per main section that genuinely benefits from one.
   - Download and resize each to a reasonable size (max ~1600px edge).

4. Audio
   - Use ElevenLabs directly (api.elevenlabs.io — already connected as
     an API credential in this environment, proxy-injected, no key
     needed in the prompt or session).
   - Voice: id nqjdE3SY6EzSAFVCxO3s ("Glenn", the site's actual
     narrator voice — do not substitute a stock/catalog voice).
   - Model: eleven_multilingual_v2.
   - voice_settings: stability 0.3, similarity_boost 0.85, style 1.0,
     use_speaker_boost true, speed 1.05.
   - output_format: mp3_44100_128.
   - Send the final article text (headings and body only, no HTML
     markup) as one request if it fits ElevenLabs' length limit for
     this model, otherwise split sensibly and concatenate.

5. Upload real assets (this is the step that was missing before)
   - Upload the images and the audio file to Supabase Storage, bucket
     "blog-images" (already connected as an API credential in this
     environment, host bfkxjgbvsygvenmciasg.supabase.co).
   - Path convention, matching existing posts:
     - images: blog/<epoch-ms>-<slug-ish-name>.<ext>
     - audio: blog/audio/<epoch-ms>-<Title_With_Underscores>.mp3
   - Public URL pattern:
     https://bfkxjgbvsygvenmciasg.supabase.co/storage/v1/object/public/blog-images/<path>
   - Use these real URLs everywhere: inline <img> src in the body,
     featured_image_url, and audio_url. Never leave Magnific/stock
     placeholder links or local repo-relative paths in the final
     content — always end with real, publicly reachable URLs.

6. Insert into Supabase
   - Insert a new row into public.blog_posts with status = 'draft'
     (never 'published' — that stays a manual decision by Glenn).
     Match the real schema: title, slug, excerpt, body, category,
     categories, featured_image_url, author ('Bite Insight Team'),
     author_id ('c18da159-509f-4529-8e07-baf2c57d9c4e', Glenn's
     profile — matches every existing post), meta_title,
     meta_description, reading_time_mins, ai_summary, sources (jsonb
     array of {url, title, source}), audio_url, is_featured (false).
   - This makes the post reviewable on the live site immediately,
     which is the actual point of the routine.

7. Hand over
   - Also commit the body HTML, the preview page, and a metadata file
     to a claude/ branch and open a draft PR titled
     "Blog draft: <headline>", as a paper trail alongside the live
     draft row. PR description: topic and why it was chosen, sources,
     AI summary, image table, the Supabase row id, and confirmation
     that images/audio are hosted on Storage (not placeholder links).

The run is only complete when: the Supabase draft row exists with
real hosted image/audio URLs, and the PR contains the matching body,
preview page, and metadata. If any step fails (e.g. a Magnific or
ElevenLabs call errors), retry once, then continue with the
remaining steps and put the exact error at the top of the PR
description. Never skip a step silently.
