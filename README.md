# CyberFortix DNS Resolution Simulator (static, no backend)

A fully client-side, animated DNS training lab. Type real `dig` / `nslookup`
style commands into a simulated terminal and watch a diagram animate the
query traveling down the DNS hierarchy (Recursive Resolver → Root → TLD →
Authoritative) and the answer traveling back up.

No real DNS lookups happen, there is no server, and nothing is sent over
the network. Only a strict allow-list of commands (`dig`, `nslookup`,
`help`, `clear`) will run — everything else is rejected in the terminal.

## Run it

There's no build step and no server required. Either:

- Double-click `index.html` to open it directly in a browser, or
- Serve the folder locally, e.g. `python3 -m http.server 8000` and open
  `http://localhost:8000`

## Deploy it

Because it's plain HTML/CSS/JS, this works as-is on **GitHub Pages**,
Netlify, Vercel, or any static host — just push the three files
(`index.html`, `style.css`, `script.js`) to a repo and enable Pages.

## Try these commands in the terminal

```
dig cyberfortix.lab A
dig cyberfortix.lab AAAA
dig portal.cyberfortix.lab CNAME
dig training.cyberfortix.lab A
dig cyberfortix.lab MX
dig cyberfortix.lab NS
dig cyberfortix.lab TXT
dig cyberfortix.lab A +trace
dig cyberfortix.lab MX +short
nslookup cyberfortix.lab
help
clear
```

## Project structure

```
.
├── index.html   # markup
├── style.css    # all styling
├── script.js    # DNS record data + dig/nslookup/trace logic + UI wiring
└── README.md
```

## About hiding the answer data

The zone records in `script.js` are stored base64-encoded instead of as a
plain JavaScript object, so a quick "View Page Source" or skim of the file
doesn't hand someone the answer key at a glance.

**Be aware this is light obfuscation, not real security.** Since there is
no backend, the data has to be present in the browser for the page to
work at all — anyone who opens DevTools and runs `atob(...)` on the
encoded string, or sets a breakpoint, will see it immediately. If you
need the records to be genuinely inaccessible to whoever is using the
page, that only works with a server-side backend that never sends the
raw answer to the browser (which is what the earlier Flask version did).

## Notes

- All zone data lives in the encoded config at the top of `script.js` —
  decode it, edit the JSON, and re-encode with base64 to change records.
- The animation is a simplified, educational depiction of DNS resolution,
  not a byte-for-byte protocol trace.
- Every function (`buildSteps`, `makeDigOutput`, `makeTraceOutput`,
  `handleDig`, `handleNslookup`, `processCommand`) is a direct 1:1 port
  of the original Python logic — behavior is unchanged, only the runtime
  moved from a Flask server into the browser.
