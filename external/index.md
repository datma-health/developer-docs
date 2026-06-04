---
layout: default
title: Imported Docs
permalink: /external/
---

# Imported Docs

{% include docs-nav.html %}

Use this section for docs copied or synchronized from private repositories.

## How to organize imported content

- Create one folder per source repository under `external/`.
- Keep file names stable to avoid broken links.
- Prefer `index.md` for each repo folder for clean URLs.

## Example layout

```text
external/
  analytics-service/
    index.md
    endpoints.md
  model-training/
    index.md
```

Update navigation links in `_config.yml` as you add top-level pages.
