# Deploying the AI chatbot's API key

The chatbot's frontend and PHP backend deploy automatically like the rest
of the site (git push → GitHub Actions → Hostinger). The **API key does
not** — it's gitignored on purpose, so it never ends up in the public
GitHub repo. It needs to be placed on the server by hand, once.

## 1. Get an OpenRouter API key

1. Go to https://openrouter.ai and sign in (or create an account)
2. Go to **Keys** → **Create Key**
3. Copy the key (starts with `sk-or-v1-...`)

## 2. Put it in `chat-config.php` — locally, for local testing

1. In `chatbot/`, copy `chat-config.example.php` to a new file named
   `chat-config.php` (same folder)
2. Replace `PASTE_YOUR_OPENROUTER_API_KEY_HERE` with your real key
3. This file is gitignored — it will **never** be committed or pushed,
   which is deliberate

## 3. Upload that one file to Hostinger manually

Since it's gitignored, the normal `git push` deploy will never send it to
the server. Upload it yourself, once:

1. Log into Hostinger **hPanel → File Manager**
2. Navigate to `public_html/chatbot/`
3. Upload your local `chat-config.php` into that folder
4. Confirm it's really there (not `chat-config.example.php` by mistake)

That's it — `chat.php` on the server will pick it up automatically on the
next request. No redeploy needed for future code changes to `chat.php`
itself either, since PHP files run live; only this one secret file needed
the manual step.

## Verifying it worked

Visit `https://shashwatyadav.in` in a normal (non-incognito) browser tab,
open the chat bubble, and send a message. If it replies normally, it's
working. If you get "Sorry, something went wrong on my end," open your
browser's Network tab, find the request to `/chatbot/chat.php`, and check
the response body — it'll say exactly what's missing (e.g. still the
placeholder key, or the file isn't there at all).
