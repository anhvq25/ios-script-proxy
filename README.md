<div align="center">

# 📱 iOS Script Proxy

### Debug **your own app** on a real device with JS interceptor scripts

**Inspect requests · Mock your API · Force UI states · Strip caches while testing**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Platform](https://img.shields.io/badge/iOS%20%7C%20Android%20%7C%20macOS-lightgrey)

</div>

---

## 🔍 What is this?

A personal collection of small **JavaScript interceptor scripts** for debugging
**apps you build yourself**, directly on the device — no Xcode breakpoints, no
rebuild, no root/jailbreak. Each script hooks the `onRequest` / `onResponse` of
an HTTP(S) connection so you can watch and tweak the traffic of **your own app**
while you develop it.

Typical things you do with it while building your app:

- 🐛 **See exactly what your app sends** — URL, method, headers, body
- 🧪 **Mock your own API** before the backend endpoint exists
- 🎛️ **Force a UI state** — flip a feature flag your app reads, to test a screen
- 🚫 **Strip cache headers** (`ETag` / `If-None-Match`) so the server always
  returns a full body while you debug a response
- 📋 **Pretty-print / decode** your own JSON, JWT, etc. in the proxy log

> ⚠️ **Scope.** These scripts are for **debugging traffic and apps you own or
> are authorized to test**. They are **not** for modifying, unlocking, or faking
> data of third-party apps or paid services you don't own. See
> [Disclaimer](#️-disclaimer).

---

## ▶️ How to run a script

These scripts use the standard **`onRequest` / `onResponse`** interceptor API,
runnable on-device by any proxy engine that supports JS scripting.

1. Install an on-device HTTP(S) debugging proxy and trust its CA certificate.
2. Open **Rules → Script → Add**.
3. Paste a script, set the URL pattern to **your own app's API**
   (e.g. `https://api.myapp.example.com/*`), turn it on.
4. Open your app — the script runs on matching requests.

> Tested against **Moni Proxy** (a Proxyman/Charles-style on-device debugger) —
> [moniproxy.com](https://moniproxy.com/) — but any engine implementing the same
> `onRequest`/`onResponse` API works.

---

## ✨ The scripting API (cheat-sheet)

```js
// Runs before the request leaves your device.
async function onRequest(context, request) {
  // request.url, request.method, request.headers, request.body
  console.log(request.method, request.url);
  return request;            // return null to block the request
}

// Runs after the response arrives, before your app sees it.
async function onResponse(context, request, response) {
  // response.statusCode, response.headers, response.body (string)
  return response;
}
```

- `request` / `response` are plain objects — mutate and `return` them.
- `response.body` is a **string**: `JSON.parse` it, edit, then `JSON.stringify`
  back before returning.
- `context.session` is a scratch object that persists across `onRequest` /
  `onResponse` of the same connection.
- `console.log(...)` prints to the proxy's log console.

---

## 📂 Structure

```
scripts/        # drop your .js interceptor scripts here
```

Each script is a single self-contained `.js` file. Add a top comment describing
what it does and the URL pattern it expects.

---

## 🔗 Related

Looking for ready-made, general-purpose interceptor scripts (ad-block, mocking,
rewrite, decode)? See the companion collection:
👉 **[awesome-moni-scripts](https://github.com/anhvq25/awesome-moni-scripts)**

---

## 📖 Purpose

> **Learning, demo and reference material only.** This repository is provided
> **solely for education, technique demonstration and reference** — to
> understand how HTTP(S) interceptor scripting works while debugging **apps you
> build yourself** or traffic you are authorized to test.

## 🚫 Prohibited use

These scripts are strictly **prohibited** from being used to:

- ❌ Hack, crack, trick, or tamper with apps/services you do **not** own.
- ❌ Bypass payments, unlock paid features, or forge subscriptions /
  entitlements / balances / permissions of third-party services.
- ❌ Forge data, defeat authentication, or evade limits of services you are not
  authorized to use.
- ❌ Attack, scrape or disrupt any service without authorization.

---

## ⚖️ Disclaimer

These scripts are for **educational, debugging and personal-development**
purposes, on **traffic and apps you own or are authorized to test**. Do **not**
use them to bypass paid features, forge data, or modify services you don't own.
You are responsible for complying with the Terms of Service of any app and the
laws of your jurisdiction. The authors accept no liability for misuse.
Licensed under [MIT](LICENSE).
