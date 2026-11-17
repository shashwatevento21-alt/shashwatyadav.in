# Cutover: shashwatyadav.in becomes redirect-only, shashwatyadav.com becomes the site

Status: **NOT EXECUTED.** Phases 0 to 4 are done (backups, static site on .com, WordPress cleanup, chatbot and /classes/ prepared).
This file is the plan for the cutover itself. Nothing here has been run.

Branch note: keep `migration/com-deploy` unmerged and never push to `main` until step 8. `main` deploys to .in.

## What exists today (state before cutover)

| Thing | .in | .com |
|---|---|---|
| Static site | live, deployed from `main` | live, uploaded in Phase 2 |
| /chatbot/ | live (same key file) | live, copied server-side (key file identical, mode 600) |
| /classes/ | **the app's front door** | a second front door to the SAME app (`$appPath` = absolute path of the one app folder) |
| The app (Laravel) | `~/domains/shashwatyadav.in/creator-platform`, one copy, one cron | not copied. Uses that same folder |
| .env | APP_URL and Google redirect point at .in | unchanged |

Because `.env` still says .in, the app on .com currently sends logins and links to .in. That is expected until step 2 below.

## Manual steps for you (before the window, takes about 10 minutes)

These cannot be done by script. Do them the day before.

1. **Google Cloud Console, APIs and Services, Credentials, the OAuth client used by Live Classes.** Under *Authorised redirect URIs* **add** (do not remove the .in ones yet):
   - `https://shashwatyadav.com/classes/auth/google/callback` (student sign-in)
   - `https://shashwatyadav.com/classes/admin/google-calendar/callback` (admin Calendar connect; the app builds this one from APP_URL)
   Under *Authorised JavaScript origins* add `https://shashwatyadav.com` if that list is not empty.
2. **OAuth consent screen**: add `shashwatyadav.com` to *Authorised domains*, and set the app home page, privacy policy and terms links to the .com pages (`/`, `/privacy-policy`, `/terms`).
3. **Google Apps Script (contact form web app)**: open the script and check that it does not restrict by origin or domain. (The form posts from the browser; if it has an allow-list, add `https://shashwatyadav.com`.) If it has no check, nothing to do.
4. **Search Console**: add `https://shashwatyadav.com` as a property (domain or URL-prefix), so it is verified before the move. Keep the .in property.
5. **hPanel**: do NOT delete or park the .in domain at any time. The one Laravel app and its cron live inside the .in folder.

## The cutover window (about 15 minutes; do steps 1 to 6 in one sitting)

All commands run on the server over SSH. Open a session first:

```bash
ssh -i ~/.ssh/hostinger_creator_platform_deploy -p 65002 u322722500@145.79.211.227
```

Shorthand used below (paste once at the start of the session):

```bash
IN=/home/u322722500/domains/shashwatyadav.in/public_html
APP=/home/u322722500/domains/shashwatyadav.in/creator-platform
TS=$(date +%Y%m%d_%H%M%S); echo $TS
```

### Step 0. Stage the new files (can be done earlier, changes nothing live)

From your PC, in the repo folder `E:\Claud\shashwatyadav.in` on branch `migration/com-deploy`:

```bash
ssh -i ~/.ssh/hostinger_creator_platform_deploy -p 65002 u322722500@145.79.211.227 "mkdir -p ~/cutover_stage"
scp -i ~/.ssh/hostinger_creator_platform_deploy -P 65002 migration/cutover/* u322722500@145.79.211.227:~/cutover_stage/
```

### Step 1. Back up everything that is about to change

```bash
mkdir -p ~/backups/cutover_$TS && cd ~/backups/cutover_$TS && umask 077
cp -p $APP/.env ./env.bak                       # the old .env (never print it)
cp -p $IN/.htaccess ./in_root.htaccess.bak
cp -p $IN/classes/.htaccess ./in_classes.htaccess.bak
cp -p $IN/creators/.htaccess ./in_creators.htaccess.bak
cp -p $IN/blog/.htaccess ./in_blog.htaccess.bak
ls $IN/chatbot/.htaccess 2>/dev/null || echo "no chatbot/.htaccess today (rollback = delete the new one)"
ls $IN/robots.txt $IN/sitemap-migration.xml 2>&1 | head -2   # normally "No such file" for both
chmod 600 env.bak; ls -l
```

Also take a fresh database dump (the app's DB; credentials are read from `.env` inside the script and never printed). Use the same snapshot routine as before (`mysqldump --single-transaction`, 2 connections) and save it as `~/backups/cutover_$TS/app_db.sql`. Confirm it is non-empty and ends with a "Dump completed" line.

### Step 2. Switch the app to .com (`.env` and caches)

```bash
cd $APP
sed -i -E 's#^APP_URL=.*#APP_URL=https://shashwatyadav.com/classes#' .env
sed -i -E 's#^GOOGLE_REDIRECT_URI=.*#GOOGLE_REDIRECT_URI=https://shashwatyadav.com/classes/auth/google/callback#' .env
# The after-login return address defaults to https://shashwatyadav.in/courses/ in production; set it explicitly:
grep -q '^LIVE_CLASSES_RETURN_URL=' .env \
  && sed -i -E 's#^LIVE_CLASSES_RETURN_URL=.*#LIVE_CLASSES_RETURN_URL=https://shashwatyadav.com/courses/#' .env \
  || printf '\nLIVE_CLASSES_RETURN_URL=https://shashwatyadav.com/courses/\n' >> .env
# Check ONLY the four keys that changed (values are plain URLs, no secrets):
grep -E '^(APP_URL|GOOGLE_REDIRECT_URI|LIVE_CLASSES_RETURN_URL|SESSION_DOMAIN|SESSION_PATH)=' .env
php artisan route:clear && php artisan config:clear && php artisan view:clear
php artisan route:cache && php artisan config:cache && php artisan view:cache
php artisan queue:restart
```

Notes on the keys that do NOT change:
- `SESSION_DOMAIN=null` (cookie is host-only, so it follows whichever host serves the page), `SESSION_PATH=/classes`, `SESSION_SECURE_COOKIE=true`: leave.
- CORS: `LIVE_CLASSES_ALLOWED_ORIGINS` is empty in production on purpose. The Courses page and the API are on the same origin on .com, so no CORS entry is needed. Leave it empty.
- `PORTFOLIO_BASE_URL` is empty in production (root-relative links). Leave.
- `MAIL_FROM_ADDRESS` stays `support@shashwatyadav.in`: that mailbox lives on .in and is deliberately not moved.
- **Scheduler/cron: change nothing.** The single hPanel cron (`schedule:run` every minute, inside the .in folder's app) keeps running. Do NOT create a second cron under .com. There is still only one app, so jobs, emails and Calendar events are not duplicated.

Quick check right now (the app answers on .com and the forms now point at .com):

```bash
curl -s https://shashwatyadav.com/classes/login | grep -o -E 'action="[^"]*"|href="[^"]*auth/google"' | sort -u
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://shashwatyadav.com/classes/live-classes/api/sessions
```

Both must show `https://shashwatyadav.com/classes/...` and `200 application/json`. If not, go to Rollback A immediately.

### Step 3. Turn on the .in redirects (do this straight after step 2, within a few minutes)

The staged files are in `~/cutover_stage`. These were tested on the live server on 2026-11-16 (55 of 55 cases passed, including GET, HEAD and POST handling).

```bash
cp ~/cutover_stage/in-classes.htaccess  $IN/classes/.htaccess
cp ~/cutover_stage/in-creators.htaccess $IN/creators/.htaccess
cp ~/cutover_stage/in-blog.htaccess     $IN/blog/.htaccess
cp ~/cutover_stage/in-chatbot.htaccess  $IN/chatbot/.htaccess
cp ~/cutover_stage/in-root.htaccess     $IN/.htaccess        # last: this one switches the static pages
```

### Step 4. robots.txt and the migration sitemap on .in

```bash
cp ~/cutover_stage/in-robots.txt          $IN/robots.txt
cp ~/cutover_stage/sitemap-migration.xml  $IN/sitemap-migration.xml
curl -s https://shashwatyadav.in/robots.txt; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://shashwatyadav.in/sitemap-migration.xml
```

`robots.txt` and `sitemap-migration.xml` are exempt from the redirects (first rules in `in-root.htaccess`), so they stay on .in. The sitemap lists the 38 old URLs (22 pages plus the redirected blog and legacy ones) so Google re-crawls them and finds the 301s. Keep them for about 6 months. Do not list .in sitemaps anywhere except Search Console for the .in property.

### Step 5. Verify (all must pass; run from your PC)

Every old address must give a single 301 straight to its final address, and that address must give 200.

```bash
chk(){ # old-url  expected-final-url
  r=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$1"); f=$(curl -s -L -o /dev/null -w "%{http_code} %{url_effective} hops=%{num_redirects}" "$1")
  [ "$r" = "301 $2" ] && echo "$f" | grep -q "^200 $2 hops=1$" && echo "OK   $1" || echo "FAIL $1 -> $r | $f"; }
I=https://shashwatyadav.in; C=https://shashwatyadav.com
chk $I/ $C/
chk $I/about $C/about;  chk $I/about.html $C/about;  chk $I/services $C/services;  chk $I/skills $C/skills
chk $I/certifications $C/certifications;  chk $I/contact $C/contact;  chk $I/privacy-policy $C/privacy-policy;  chk $I/terms $C/terms
chk $I/courses/ $C/courses/;  chk $I/courses/google-ads/ $C/courses/google-ads/;  chk $I/courses/meta-ads/ $C/courses/meta-ads/
chk $I/courses/claude-mastery/ $C/courses/claude-mastery/;  chk $I/courses/master-classes/ $C/courses/master-classes/
chk $I/meta-ads-lead-generation-master-class/ $C/meta-ads-lead-generation-master-class/
chk $I/portfolio/ $C/portfolio/
for s in chaitanya-greens-residential-2026 commercial-real-estate-meta-google-2026 hospital-multi-treatment-2026 life-educare-school-marketing-2026 residential-real-estate-meta-ads-2026 salon-academy-admissions-2026 vasarsha-reality-residential-2026; do chk $I/portfolio/$s/ $C/portfolio/$s/; done
chk $I/portfolio/sample-case-study/ $C/portfolio/
# legacy
chk $I/training $C/courses/;  chk $I/expertise $C/skills;  chk $I/creators-platform $C/courses/;  chk $I/live-classes $C/courses/
chk "$I/live-classes?course=google-ads" "$C/courses/?course=google-ads#upcoming-classes"
for s in n8n-automation ai-content-creation-tools seo-geo wordpress-elementor conversion-tracking social-media-marketing; do chk $I/courses/$s/ $C/courses/; done
chk $I/courses/claude-mastery/claude-ai-mastery-course-syllabus.pdf $C/courses/claude-mastery/
chk $I/creators/ $C/courses/;  chk $I/creators/login $C/classes/login
# blog
for p in blog/ blog/category/blog/ blog/hello-world/ blog/sample-post/; do chk $I/$p $C/blog/; done
# app and chatbot
chk $I/classes/login $C/classes/login
# these two only need the first hop (the target itself answers 302 to the Courses page / 405 to a GET, by design):
chk1(){ r=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$1"); [ "$r" = "301 $2" ] && echo "OK   $1" || echo "FAIL $1 -> $r"; }
chk1 $I/classes/ $C/classes/;  chk1 $I/chatbot/chat.php $C/chatbot/chat.php
# catch-all
chk $I/some-unknown-page $C/some-unknown-page
# the new site itself
curl -s -o /dev/null -w "com /classes/login  %{http_code}\n" $C/classes/login
curl -s -o /dev/null -w "com sessions API    %{http_code} %{content_type}\n" $C/classes/live-classes/api/sessions
curl -s -X POST $C/chatbot/chat.php -H 'Content-Type: application/json' -d '{"message":"hi"}' | head -c 200; echo
curl -s -o /dev/null -w "com /wp-admin/      %{http_code} (login page after 1 hop)\n" -L $C/wp-admin/
# .in keeps only these two files
curl -s -o /dev/null -w "in robots.txt       %{http_code}\n" $I/robots.txt;  curl -s -o /dev/null -w "in sitemap          %{http_code}\n" $I/sitemap-migration.xml
```

Then, in a browser (once): open `https://shashwatyadav.com/courses/`, click **Log in**, complete Google sign-in, and confirm you land back on `https://shashwatyadav.com/courses/` signed in and that **My Classes** works. Then check the app log has no new errors:

```bash
tail -n 20 $APP/storage/logs/laravel.log | cut -c1-200
```

Known, expected after cutover:
- Everyone signed in on .in is signed out (cookie is host-only) and signs in again on .com.
- Old emailed signed links (email verification, etc.) from .in cannot validate on a different host: re-send them if a student needs one.
- Calendar events and emails already sent contain .in links. They keep working through the 301s.
- The enrolment email text still says "on shashwatyadav.in" and its calendar-file UID ends in `@shashwatyadav.in` (hard-coded in `app/Mail/LiveClassEnrolledMail.php`). Cosmetic; change later with `.\deploy.ps1` from the app repo.

### Step 6. Search Console

1. Property `https://shashwatyadav.com`: submit `https://shashwatyadav.com/sitemap-pages.xml` and `https://shashwatyadav.com/sitemap_index.xml`.
2. Property `https://shashwatyadav.in`: submit `https://shashwatyadav.in/sitemap-migration.xml`, then use **Settings, Change of address** and select the .com property.
3. Leave the .in property in place; do not remove it.

### Step 7. Disable the .in deploy workflow (do this BEFORE any merge to main)

The repo's `main` deploys the whole repository to the .in web root. Left on, the next push to `main` would upload the old `.htaccess` and pages over the redirect-only .in.

```bash
gh workflow disable "Deploy to Hostinger" --repo shashwatevento21-alt/shashwatyadav.in
gh workflow list --repo shashwatevento21-alt/shashwatyadav.in
```

(or GitHub, Actions, "Deploy to Hostinger", the three-dot menu, **Disable workflow**.) Confirm it shows as disabled.

### Step 8. Make the repo match the live state (only after step 7)

1. In `deploy-com.yml` change the trigger branch from `migration/com-deploy` to `main`.
2. Leave the repo's root `.htaccess` as it is. It is the old .in rule file and is never uploaded to .com (the .com `.htaccess` is edited on the server by hand). The real .in redirect file is `migration/cutover/in-root.htaccess`; the workflow for .in stays disabled, so the old file can never overwrite it.
3. Create the .com FTP account in hPanel (Files, FTP Accounts, directory `/home/u322722500/domains/shashwatyadav.com/public_html`) and add GitHub secrets `COM_FTP_SERVER`, `COM_FTP_USERNAME`, `COM_FTP_PASSWORD`.
4. Merge `migration/com-deploy` into `main` (this triggers the .com deploy only, because the .in workflow is disabled).
5. Run `workflow_dispatch` once and check `https://shashwatyadav.com/` still serves the static home page and `/wp-admin/` still loads.

## Rollback plan

Decision rule: if anything in step 5 fails and is not fixed within 10 minutes, roll back. Rollback is safe at any point; the app, the database and the .com site are never deleted or moved by the cutover.

### Rollback A: app only (step 2 went wrong, .in redirects not yet on)

```bash
cd $APP
cp -p ~/backups/cutover_$TS/env.bak .env && chmod 600 .env
php artisan route:clear && php artisan config:clear && php artisan view:clear
php artisan route:cache && php artisan config:cache && php artisan view:cache
php artisan queue:restart
curl -s https://shashwatyadav.in/classes/login | grep -o 'action="[^"]*"' | head -1     # must show the .in address again
```

### Rollback B: full (redirects on, then a problem)

Run in this order. Everything comes from the backups taken in step 1.

```bash
# 1. put the .in pages and folders back
cp -p ~/backups/cutover_$TS/in_root.htaccess.bak     $IN/.htaccess
cp -p ~/backups/cutover_$TS/in_classes.htaccess.bak  $IN/classes/.htaccess
cp -p ~/backups/cutover_$TS/in_creators.htaccess.bak $IN/creators/.htaccess
cp -p ~/backups/cutover_$TS/in_blog.htaccess.bak     $IN/blog/.htaccess
rm -f $IN/chatbot/.htaccess                           # did not exist before the cutover
rm -f $IN/robots.txt $IN/sitemap-migration.xml        # did not exist before the cutover
# 2. put the app back on .in (Rollback A commands above)
# 3. verify .in is itself again
for p in / /about /courses/ /classes/login /classes/live-classes/api/sessions /blog/; do curl -s -o /dev/null -w "$p %{http_code} %{redirect_url}\n" https://shashwatyadav.in$p; done
```

Expected after rollback: `/`, `/about`, `/courses/`, `/classes/login`, the API and `/blog/` return 200 on .in (the old `/live-classes` and legacy URLs 301 inside .in as before). .com keeps working as before the cutover (static pages, blog, chatbot; its `/classes/` front door points at the app, which is back on .in addresses).

4. Re-enable the deploy workflow if it was disabled: `gh workflow enable "Deploy to Hostinger" --repo shashwatevento21-alt/shashwatyadav.in`.
5. If Search Console change of address was already submitted, cancel it in Settings; it can be re-submitted later.
6. Leave the Google Cloud redirect URIs for .com in place (harmless). Keep the .in ones.

### Rollback C: files only, if just one redirect rule is wrong

Edit only that rule in the staged file, re-copy that one file, and re-run the step 5 list. No other change is needed.

## Things to remember afterwards

- The app and its cron stay in the .in folder. Never remove the .in domain from hosting. Moving the app into the .com folder is a separate, later project.
- `storage/logs/laravel.log` is about 100 MB. Not part of this migration, but it should be rotated.
- The OpenRouter model used by the chatbot (`liquid/lfm-2.5-2.6b:free`) was retired by OpenRouter, so the chatbot returns an error on both domains. Needs a replacement model (a decision, separate from the cutover).
- After about 6 months, if Search Console shows the .in URLs gone from the index, `sitemap-migration.xml` can be removed. Keep the 301 redirects as long as the domain is owned.
