/* ============================================================
   CyberFortix DNS Resolution Simulator — client-side engine
   ============================================================
   Everything here runs in the browser: there is no backend.

   NOTE ON THE ENCODED CONFIG BELOW
   ---------------------------------
   The zone data is stored base64-encoded (see _CFG) instead of as a
   plain object, so that right-click → "View Page Source" and a casual
   skim of this file don't hand someone the answer key at a glance.

   This is light obfuscation for a training exercise, NOT real
   security. Anything that runs in a browser can always be read by
   whoever is running that browser — a single line typed into the
   DevTools console (atob(...) then JSON.parse) reveals it instantly,
   and a breakpoint would show it mid-execution regardless of how it's
   stored. If you need the answer key to be genuinely inaccessible to
   the person using the page, it has to live on a server you control,
   which means bringing a backend back.
   ============================================================ */

const _CFG_B64 = "eyJyZWNvcmRzIjp7ImN5YmVyZm9ydGl4LmxhYnxBIjpbIjEwLjEwLjEwLjEwIl0sImN5YmVyZm9ydGl4LmxhYnxBQUFBIjpbIjIwMDE6ZGI4OjEwOjoxMCJdLCJjeWJlcmZvcnRpeC5sYWJ8TlMiOlsibnMxLmN5YmVyZm9ydGl4LmxhYi4iLCJuczIuY3liZXJmb3J0aXgubGFiLiJdLCJjeWJlcmZvcnRpeC5sYWJ8VFhUIjpbIlwidj1zcGYxIGluY2x1ZGU6X3NwZi5jeWJlcmZvcnRpeC5sYWIgfmFsbFwiIl0sImN5YmVyZm9ydGl4LmxhYnxNWCI6WyIxMCBtYWlsMS5jeWJlcmZvcnRpeC5sYWIuIiwiMjAgbWFpbDIuY3liZXJmb3J0aXgubGFiLiJdLCJwb3J0YWwuY3liZXJmb3J0aXgubGFifENOQU1FIjpbInRyYWluaW5nLmN5YmVyZm9ydGl4LmxhYi4iXSwidHJhaW5pbmcuY3liZXJmb3J0aXgubGFifEEiOlsiMTAuMTAuMTAuMzAiXSwibWFpbDEuY3liZXJmb3J0aXgubGFifEEiOlsiMTAuMTAuMTAuMjAiXSwibWFpbDIuY3liZXJmb3J0aXgubGFifEEiOlsiMTAuMTAuMTAuMjEiXSwibnMxLmN5YmVyZm9ydGl4LmxhYnxBIjpbIjEwLjEwLjEwLjUzIl0sIm5zMi5jeWJlcmZvcnRpeC5sYWJ8QSI6WyIxMC4xMC4xMC41NCJdfSwicmVzb2x2ZXIiOnsibmFtZSI6InJlc29sdmVyMS5jeWJlcmZvcnRpeC5sYWIiLCJpcCI6IjEwLjEwLjEwLjUzIn0sInJvb3QiOnsibmFtZSI6ImEucm9vdC1zZXJ2ZXJzLmxhYiIsImlwIjoiMTk4LjQxLjAuNCJ9LCJ0bGQiOnsibmFtZSI6ImEubGFiLXNlcnZlcnMubGFiIiwiaXAiOiIxOTIuNS42LjMwIn0sImF1dGgiOnsibmFtZSI6Im5zMS5jeWJlcmZvcnRpeC5sYWIiLCJpcCI6IjEwLjEwLjEwLjUzIn0sImFsbG93ZWRUeXBlcyI6WyJBIiwiQUFBQSIsIkNOQU1FIiwiTVgiLCJOUyIsIlRYVCJdLCJhbGxvd2VkQ29tbWFuZHMiOlsiZGlnIiwibnNsb29rdXAiLCJoZWxwIiwiY2xlYXIiXX0=";

const _CFG = JSON.parse(decodeURIComponent(escape(atob(_CFG_B64))));

const RESOLVER = _CFG.resolver;
const ROOT_SERVER = _CFG.root;
const TLD_SERVER = _CFG.tld;
const AUTH_SERVER = _CFG.auth;
const ALLOWED_TYPES = _CFG.allowedTypes;
const ALLOWED_COMMANDS = _CFG.allowedCommands;
const DNS_RECORDS = _CFG.records; // key: "domain|TYPE" -> array of values


/* ============================================================
   HELPERS  (ported 1:1 from the original Python engine)
   ============================================================ */

function normalizeDomain(domain) {
    return domain.toLowerCase().replace(/\.+$/, "");
}

function lookupRecord(domain, type) {
    const key = domain + "|" + type;
    return Object.prototype.hasOwnProperty.call(DNS_RECORDS, key) ? DNS_RECORDS[key] : null;
}

function padEnd(str, len) {
    return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function buildSteps(domain, recordType, found) {
    const authStep = found
        ? `Authoritative server ${AUTH_SERVER.name} returns the ${recordType} record for ${domain}.`
        : `Authoritative server ${AUTH_SERVER.name} has no ${recordType} record for ${domain} — NXDOMAIN.`;

    return [
        `Student machine builds a DNS query for ${domain} (${recordType}) and sends it to its configured resolver.`,
        `Recursive resolver ${RESOLVER.ip} checks its cache — no entry found. Starting a full recursive lookup.`,
        `Resolver asks a root server (${ROOT_SERVER.ip}) who is responsible for the .lab TLD. Root refers it onward.`,
        `Resolver asks the .lab TLD server (${TLD_SERVER.ip}) for the authoritative servers of this zone.`,
        authStep,
        "Response starts its return trip back through the resolution chain.",
        "Response continues back up toward the recursive resolver.",
        `Resolver ${RESOLVER.ip} caches the result (TTL 300s).`,
        "Resolver delivers the final answer to the student machine."
    ];
}

function makeDigOutput(domain, recordType, values, short) {
    if (short) {
        return values.join("\n");
    }

    const domainDot = domain + ".";
    const answers = values
        .map(function (value) { return padEnd(domainDot, 32) + " 300 IN " + recordType + " " + value; })
        .join("\n");

    return (
        "; <<>> DiG 9.18.0-CyberFortix <<>> " + domain + " " + recordType + "\n" +
        ";; global options: +cmd\n" +
        ";; Got answer:\n" +
        ";; ->>HEADER<<- opcode: QUERY, status: NOERROR\n" +
        ";; flags: qr rd ra; QUERY: 1, ANSWER: " + values.length + ", AUTHORITY: 0, ADDITIONAL: 0\n\n" +
        ";; QUESTION SECTION:\n" +
        ";" + domainDot + "    IN    " + recordType + "\n\n" +
        ";; ANSWER SECTION:\n" +
        answers + "\n\n" +
        ";; Query time: 4 msec\n" +
        ";; SERVER: " + AUTH_SERVER.ip + "#53(" + AUTH_SERVER.ip + ") (UDP)\n" +
        ";; WHEN: CyberFortix Training Simulation\n"
    );
}

function makeTraceOutput(domain, recordType, values, found) {
    const domainDot = domain + ".";
    const lines = [
        "; <<>> DiG 9.18.0-CyberFortix <<>> " + domain + " " + recordType + " +trace",
        ";; global options: +cmd",
        "",
        ".            518400  IN  NS  " + ROOT_SERVER.name + ".",
        ";; Received referral from root (" + ROOT_SERVER.ip + ") — delegating .lab",
        "",
        "lab.         172800  IN  NS  " + TLD_SERVER.name + ".",
        ";; Received referral from .lab TLD (" + TLD_SERVER.ip + ") — delegating cyberfortix.lab",
        ""
    ];

    if (found) {
        values.forEach(function (value) {
            lines.push(padEnd(domainDot, 28) + " 300  IN  " + recordType + "  " + value);
        });
        lines.push("");
        lines.push(";; Received " + values.length + " answer(s) from authoritative server " + AUTH_SERVER.name + " (" + AUTH_SERVER.ip + ")");
    } else {
        lines.push(";; Authoritative server " + AUTH_SERVER.name + " (" + AUTH_SERVER.ip + ") reports NXDOMAIN for " + domain + " " + recordType);
    }

    return lines.join("\n");
}


/* ============================================================
   COMMAND TOKENIZER  (small shlex.split equivalent)
   ============================================================ */

function tokenize(command) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = re.exec(command)) !== null) {
        tokens.push(match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : match[3]));
    }
    return tokens;
}


/* ============================================================
   DIG
   ============================================================ */

function handleDig(parts) {
    if (parts.length < 2) {
        return {
            output: "Usage: dig <domain> [A|AAAA|CNAME|MX|NS|TXT] [+short] [+trace]",
            error: true,
            blocked: false,
            animation: null
        };
    }

    const domain = normalizeDomain(parts[1]);
    let recordType = "A";
    let short = false;
    let trace = false;

    for (let i = 2; i < parts.length; i++) {
        const item = parts[i];
        const itemUpper = item.toUpperCase();

        if (ALLOWED_TYPES.indexOf(itemUpper) !== -1) {
            recordType = itemUpper;
        } else if (item.toLowerCase() === "+short") {
            short = true;
        } else if (item.toLowerCase() === "+trace") {
            trace = true;
        } else {
            return {
                output: "Unsupported dig option or record type: " + item,
                error: true,
                blocked: false,
                animation: null
            };
        }
    }

    const values = lookupRecord(domain, recordType);
    const found = values !== null;
    const safeValues = found ? values : [];

    let output;
    if (trace) {
        output = makeTraceOutput(domain, recordType, safeValues, found);
    } else if (!found) {
        output =
            "; <<>> DiG 9.18.0-CyberFortix <<>> " + domain + " " + recordType + "\n" +
            ";; global options: +cmd\n" +
            ";; Got answer:\n" +
            ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN\n\n" +
            ";; QUESTION SECTION:\n" +
            ";" + domain + ".    IN    " + recordType + "\n\n" +
            ";; ANSWER SECTION:\n" +
            "No simulated " + recordType + " record exists for " + domain + ".\n";
    } else {
        output = makeDigOutput(domain, recordType, safeValues, short);
    }

    return {
        output: output,
        error: !found,
        blocked: false,
        animation: {
            record_type: recordType,
            domain: domain,
            values: safeValues,
            found: found,
            steps: buildSteps(domain, recordType, found)
        }
    };
}


/* ============================================================
   NSLOOKUP
   ============================================================ */

function handleNslookup(parts) {
    if (parts.length !== 2) {
        return {
            output: "Usage: nslookup <domain>",
            error: true,
            blocked: false,
            animation: null
        };
    }

    const domain = normalizeDomain(parts[1]);
    const values = lookupRecord(domain, "A");
    const found = values !== null;
    const addresses = found ? values : [];

    let output;
    if (!found) {
        output =
            "Server:     " + AUTH_SERVER.ip + "\n" +
            "Address:    " + AUTH_SERVER.ip + "#53\n\n" +
            "** server can't find " + domain + ": NXDOMAIN";
    } else {
        output = "Server:     " + AUTH_SERVER.ip + "\nAddress:    " + AUTH_SERVER.ip + "#53\n\nNon-authoritative answer:\n";
        addresses.forEach(function (address) {
            output += "\nName:    " + domain + "\nAddress: " + address + "\n";
        });
        output = output.trim();
    }

    return {
        output: output,
        error: !found,
        blocked: false,
        animation: {
            record_type: "A",
            domain: domain,
            values: addresses,
            found: found,
            steps: buildSteps(domain, "A", found)
        }
    };
}


/* ============================================================
   COMMAND PROCESSOR — strict allow-list
   ============================================================ */

const HELP_TEXT =
`CyberFortix DNS Simulation Lab

AVAILABLE COMMANDS  (nothing else will run here)
=================================================

dig <domain> A|AAAA|CNAME|MX|NS|TXT
dig <domain> <TYPE> +short
dig <domain> <TYPE> +trace

nslookup <domain>

help
clear


PRACTICE
========

1) Find the IPv4 address:
   dig cyberfortix.lab A

2) Find the IPv6 address:
   dig cyberfortix.lab AAAA

3) Find the portal alias:
   dig portal.cyberfortix.lab CNAME

4) Resolve the CNAME target:
   dig training.cyberfortix.lab A

5) Find the incoming mail servers:
   dig cyberfortix.lab MX

6) Find the zone's name servers:
   dig cyberfortix.lab NS

7) Read the SPF/TXT record:
   dig cyberfortix.lab TXT

8) Watch a full referral trace:
   dig cyberfortix.lab A +trace

9) Try short output:
   dig cyberfortix.lab MX +short

10) Try nslookup:
    nslookup cyberfortix.lab
`;

function processCommand(command) {
    command = command.trim();

    if (!command) {
        return { output: "", error: false, blocked: false, animation: null };
    }

    let parts;
    try {
        parts = tokenize(command);
    } catch (e) {
        return { output: "Invalid command syntax.", error: true, blocked: false, animation: null };
    }

    if (parts.length === 0) {
        return { output: "", error: false, blocked: false, animation: null };
    }

    const cmd = parts[0].toLowerCase();

    if (ALLOWED_COMMANDS.indexOf(cmd) === -1) {
        const allowed = ALLOWED_COMMANDS.join(", ");
        return {
            output: "'" + cmd + "' is not an available command in this simulator.\nOnly these run here: " + allowed + ". Type 'help' for details.",
            error: true,
            blocked: true,
            animation: null
        };
    }

    if (cmd === "dig") return handleDig(parts);
    if (cmd === "nslookup") return handleNslookup(parts);
    if (cmd === "help") return { output: HELP_TEXT, error: false, blocked: false, animation: null };
    if (cmd === "clear") return { output: "", error: false, blocked: false, animation: null };
}


/* ============================================================
   UI WIRING
   ============================================================ */

const input = document.getElementById("commandInput");
const output = document.getElementById("output");

const progressFill = document.getElementById("progressFill");
const narration = document.getElementById("narration");

const resultCard = document.getElementById("resultCard");
const resultBadge = document.getElementById("resultBadge");
const resultText = document.getElementById("resultText");
const resultExplain = document.getElementById("resultExplain");
const multiList = document.getElementById("multiList");
const copyBtn = document.getElementById("copyBtn");

const LINE_FOR_STEP = [null, 0, 1, 2, 3, 3, 2, 1, 0];
const DIR_FOR_STEP = [null, "fwd", "fwd", "fwd", "fwd", "back", "back", "back", "back"];
const ACTIVE_NODE_FOR_STEP = ["client", "resolver", "root", "tld", "auth", "tld", "root", "resolver", "client"];
const STEP_MS = 480;

let history = [];
let historyIndex = -1;
let animating = false;

document.querySelectorAll(".cmd-chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
        input.value = btn.dataset.cmd;
        input.focus();
    });
});

copyBtn.addEventListener("click", function () {
    const value = resultText.textContent;
    if (!value) return;
    navigator.clipboard.writeText(value).then(function () {
        copyBtn.textContent = "copied";
        setTimeout(function () { copyBtn.textContent = "copy"; }, 1200);
    });
});

input.addEventListener("keydown", function (event) {

    if (event.key === "ArrowUp") {
        event.preventDefault();
        if (history.length === 0) return;
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (history.length === 0) return;
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = historyIndex === history.length ? "" : history[historyIndex];
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        const partial = input.value.trim().toLowerCase();
        if (!partial) return;
        const match = ALLOWED_COMMANDS.find(function (c) { return c.startsWith(partial); });
        if (match) input.value = match + " ";
        return;
    }

    if (event.key !== "Enter") return;
    if (animating) return;

    const command = input.value.trim();
    if (!command) return;

    input.value = "";
    history.push(command);
    historyIndex = history.length;

    if (command.toLowerCase() === "clear") {
        output.innerHTML = "";
        resetVisualizer();
        return;
    }

    addCommand(command);

    const result = processCommand(command);
    addResult(result.output, result.error, result.blocked);

    if (result.animation) {
        animate(result.animation);
    }
});

function addCommand(command) {
    const div = document.createElement("div");
    div.className = "cmd";
    div.innerHTML = '<span class="prompt-inline">student@cyberfortix:~$</span> ' + escapeHTML(command);
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

function addResult(text, isError, isBlocked) {
    const div = document.createElement("div");
    div.className = isBlocked ? "blocked" : (isError ? "bad" : "good");
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

function clearActive() {
    ["client", "resolver", "root", "tld", "auth"].forEach(function (n) {
        document.getElementById("node-" + n).classList.remove("active");
    });
}

function animate(data) {
    resultCard.style.display = "none";
    animating = true;
    input.placeholder = "resolving…";

    const steps = data.steps;
    let i = 0;

    function playStep() {
        clearActive();

        const lineIdx = LINE_FOR_STEP[i];
        const dir = DIR_FOR_STEP[i];

        if (lineIdx !== null) {
            const pkt = document.getElementById("packet" + lineIdx);
            pkt.classList.remove("fwd", "back", "animate");
            void pkt.offsetWidth;
            pkt.textContent = dir === "fwd" ? "QUERY" : "ANSWER";
            pkt.classList.add(dir, "animate");
        }

        document.getElementById("node-" + ACTIVE_NODE_FOR_STEP[i]).classList.add("active");

        narration.innerHTML =
            '<div class="step-count">Step ' + (i + 1) + ' of ' + steps.length + '</div>' +
            '<div class="step-text">' + escapeHTML(steps[i]) + '</div>';

        progressFill.style.width = (((i + 1) / steps.length) * 100) + "%";

        i++;

        if (i < steps.length) {
            setTimeout(playStep, STEP_MS);
        } else {
            setTimeout(function () {
                clearActive();
                showResult(data);
                animating = false;
                input.placeholder = "type a command…";
                input.focus();
            }, STEP_MS);
        }
    }

    playStep();
}

function showResult(data) {
    multiList.innerHTML = "";
    resultCard.style.display = "block";

    if (data.found === false) {
        resultCard.classList.add("error");
        resultBadge.textContent = "NXDOMAIN";
        resultText.textContent = data.domain + " — no " + data.record_type + " record";
        resultExplain.textContent = "The authoritative server has no matching record. This is the simulated equivalent of a real NXDOMAIN response.";
        copyBtn.style.display = "none";
        return;
    }

    resultCard.classList.remove("error");
    copyBtn.style.display = "inline-block";

    const type = data.record_type;
    resultBadge.textContent = type + " RECORD";
    resultText.textContent = data.values[0];

    const explanations = {
        A: "Hostname resolved to an IPv4 address — this is what a browser or app uses to open the connection.",
        AAAA: "Hostname resolved to an IPv6 address, the newer addressing scheme with a much larger address space.",
        CNAME: "This hostname is an alias. The resolver now needs to look up the target hostname's own A record to get an IP.",
        MX: "These are the mail servers responsible for accepting email for this domain, ordered by preference (lower number = tried first).",
        NS: "These are the name servers authoritative for this zone — the servers other resolvers will ask directly.",
        TXT: "Free-form text published in DNS, commonly used for domain verification and email anti-spoofing (SPF/DKIM/DMARC)."
    };

    resultExplain.textContent = explanations[type] || "";

    if (data.values.length > 1 || type === "MX" || type === "NS" || type === "TXT") {
        data.values.forEach(function (value, index) {
            const row = document.createElement("div");
            row.className = "multi-row";

            let pref = "";
            if (type === "MX" && index === 0) pref = "preferred";

            row.innerHTML =
                "<span>" + escapeHTML(value) + "</span>" +
                (pref ? '<span class="pref">' + pref + "</span>" : "");

            multiList.appendChild(row);
        });
    }
}

function resetVisualizer() {
    clearActive();
    progressFill.style.width = "0%";
    resultCard.style.display = "none";
    narration.innerHTML =
        '<div class="step-count">Idle</div>' +
        '<div class="step-text">Run a dig or nslookup command to start a resolution.</div>';
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

/* Light deterrent against casual DevTools / view-source snooping.
   This does NOT provide real protection — see the note at the top
   of this file — it only discourages the most casual attempts. */
document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
document.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) { e.preventDefault(); return; }
    if (e.ctrlKey && key === "u") { e.preventDefault(); return; }
});
