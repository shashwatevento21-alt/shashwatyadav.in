# Rollback: shashwatyadav.com redesign

Two independent switches. Use whichever matches what you see; both are safe to run at any time.

## 0. Before go-live (the preview stage)
Nothing public has changed. The preview lives only in `public_html/_preview/` and the blog plugin's new design only shows with the secret
preview link. To remove it all:

```bash
ssh -i ~/.ssh/hostinger_creator_platform_deploy -p 65002 u322722500@145.79.211.227 "rm -rf ~/domains/shashwatyadav.com/public_html/_preview && cp ~/backups/robots_pre_redesign.txt ~/domains/shashwatyadav.com/public_html/robots.txt"
```

## 1. After go-live: the static pages (one command)
`main` was tagged `pre-redesign` before the merge. Reverting the merge commit and pushing makes the .com workflow upload the old pages
and old assets again (the workflow only uploads, so the new theme files simply stay unused on the server):

```bash
cd E:/Claud/shashwatyadav.in && git checkout main && git revert -m 1 ed6c01f6ebef8634ed684ee20dee2131a413584a --no-edit && git push origin main
```

(`ed6c01f6ebef8634ed684ee20dee2131a413584a` is printed in the go-live report; `git log --merges -1` shows it.) Afterwards purge the cache:

```bash
ssh -i ~/.ssh/hostinger_creator_platform_deploy -p 65002 u322722500@145.79.211.227 "cd ~/domains/shashwatyadav.com/public_html && wp litespeed-purge all"
```

If GitHub Actions is unavailable, the same files are in the server backup taken just before go-live
(`~/backups/site_pre_redesign_20261117_061603.tar.gz`): extract it over `public_html` and purge the cache.

## 2. After go-live: the blog (instant, no deploy)
The blog plugin keeps the old design in the plugin and switches with one option:

```bash
ssh -i ~/.ssh/hostinger_creator_platform_deploy -p 65002 u322722500@145.79.211.227 "cd ~/domains/shashwatyadav.com/public_html && wp option update shashwat_blog_layout_design old && wp litespeed-purge all"
```

The old blog design needs `assets/css/style.css` and `assets/js/tailwind-config.js` on the server; those two files are deliberately never deleted.

## What is NOT touched by the redesign
`/classes/` (Live Classes app), `/chatbot/`, WordPress files and `.htaccess`, the sitemaps and `robots.txt` (except the one
`Disallow: /_preview/` line, removed together with the preview folder).

## Go-live record (2026-11-17)
Merge commit `ed6c01f` on main (tag `pre-redesign` = 02c7540). Server backup: `~/backups/site_pre_redesign_20261117_061603.tar.gz`
(static pages, assets, robots.txt, .htaccess, blog plugin). The blog plugin option `shashwat_blog_layout_design` is `new`.
