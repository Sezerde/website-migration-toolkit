# Website Migration Toolkit

A set of small tools I built to speed up a tedious, error-prone part of migrating university web content to a new platform: finding, downloading, and re-linking the files scattered across legacy pages.

Based on my own experience handling complex pages, this cut the work from roughly 1–2 days of manual effort down to about 10–15 minutes for the most link-heavy cases.

## The Problem

During a website migration project, the most time-consuming task was dealing with links. A single legacy page — often a professor's personal site — could contain hundreds of links mixing internal subpages, external links, and downloadable files (PDFs, slides, datasets, code). Each file had to be located, re-hosted in Google Drive, and have its old URL swapped for the new one. Doing this by hand was slow, repetitive, and easy to get wrong.

I built this toolkit to automate the parts that could be automated, while keeping a human in the loop for the ambiguous cases to reduce errors.

## How It Works

The workflow has three stages. I wrote stages 1 and 3; stage 2 uses an existing browser extension.

### 1. Link Analyzer (`bookmarklet.js`) — *client-side*

A JavaScript bookmarklet that runs in the browser with no installation. It scans every link on the current page, uses a regular expression to classify each one by file extension, and color-codes them in place:

- **Blue** — internal subpage (needs to be rebuilt)
- **Yellow** — external link (can be ignored)
- **Green** — a file (needs to be downloaded and re-hosted)

It also copies a grouped, de-duplicated list of all URLs to the clipboard for reference. Because it requires zero setup, non-technical staff can use it just by clicking a bookmark.

### 2. Bulk Download — *existing tool*

Once the files are identified, a browser extension (such as DownThemAll!) handles downloading them in bulk, filtered to the relevant domain. 

### 3. Automated Link Replacement (`apps-script/replace-links.gs`) — *server-side*

A Google Apps Script that runs against a Google Doc containing the old page content. It matches each old file link against the files now hosted in a Google Drive folder and swaps in the new URLs automatically, then color-codes the results so a reviewer can see what happened at a glance:

- **Green** — link successfully replaced
- **Red** — replacement failed (e.g. it was a subpage, or the file wasn't downloaded)
- **Orange** — name collision detected; left untouched for manual review

A full step-by-step user guide is in the [`docs/`](docs/) folder.

## Design Decisions

A few choices worth calling out, since they shaped how the tool behaves:

- **Two-pass approach to avoid bad replacements.** The script scans the whole document first to build a map of filenames and detect collisions *before* changing anything. This means it never replaces a link it isn't confident about — it would rather flag an ambiguous case than guess wrong.
- **Two kinds of collision are handled separately:** files that share a name within the source document, and files that share a name inside the Drive folder. Both are flagged orange and logged with their original URL so they're easy to find and fix by hand.
- **Fuzzy fallback, but only when it's safe.** If an exact filename match isn't found, the script tries a prefix-based search — but only accepts the result if there's exactly one match. Anything ambiguous is flagged rather than resolved automatically.
- **Real-world URL cleanup.** Filenames are extracted with query strings, fragments, and URL encoding stripped out, since legacy links rarely come clean.

## Known Limitations

This tool solves one specific problem and doesn't pretend to do more:

- It matches files by name, so it **cannot** disambiguate multiple different files that share the exact same name. These are deliberately flagged orange and left for manual handling.
- It works best when a site has a predictable URL structure for pages versus files.
- Links without file extensions may be misclassified as subpages and need a manual check.

## Notes

Domain-specific values (the university domain, the Drive folder ID) are left as placeholders so the tools can be reused in other migrations.
