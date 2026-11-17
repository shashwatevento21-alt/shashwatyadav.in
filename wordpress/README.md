# Shashwat Blog Layout (WordPress plugin for shashwatyadav.com)

Gives the blog (`/blog/`, the posts and `/category/blog/`) the same header and footer as the static site, with a card-style
blog index. Everything else on the WordPress side (Divi, Elementor pages such as `/seo/`, wp-admin) is untouched: the plugin only swaps
the template for those three kinds of address.

Installed at `wp-content/plugins/shashwat-blog-layout/` on the server (uploaded by hand over SSH; it is not part of the GitHub deploy).

## Files

- `shashwat-blog-layout.php`: switch, template routing, Divi stylesheet/script removal for these pages.
- `templates/blog.php`: blog index and category page. `templates/single.php`: a post. `_head.php`, `_foot.php`, `_cta.php`: shared parts.
- `partials/header.html`, `partials/footer.html`: **generated** from the static `index.html` by `wordpress/build-partials.ps1`.
- `assets/blog.css`: all styles, scoped under `body.sbl`.

## Go live / roll back (needs SSH, run in `~/domains/shashwatyadav.com/public_html`)

- Preview (nobody else sees it): add `?sbpreview=<token>` to `/blog/`, a post or `/category/blog/`. Token: `wp option get shashwat_blog_layout_token`.
  Preview responses are never cached and are `noindex`.
- Go live: `wp option update shashwat_blog_layout_live 1 && wp litespeed-purge all`
- Roll back at once: `wp option update shashwat_blog_layout_live 0 && wp litespeed-purge all` (or `wp plugin deactivate shashwat-blog-layout`).

## When the static header or footer changes

Run `powershell -File wordpress\build-partials.ps1`, upload the two files in `partials/` to the plugin folder, then `wp litespeed-purge all`.

## Notes

- SEO is untouched: title, description, canonical and schema still come from Rank Math through `wp_head()`; post text is output with
  `the_content()` exactly as written. Only the card excerpts use the post's Rank Math description (first words of the post if none).
- Templates run inside a function on purpose: WordPress keeps globals such as `$more`, `$pages` and `$id` that a template must not overwrite.
- The index headline and intro text are in `templates/blog.php`. Category chips only show when there are two or more categories.
