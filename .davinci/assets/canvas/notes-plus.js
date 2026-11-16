/**
 * NOTES PLUS — resize, rich text, colour and anchoring for the canvas post-its
 * (CSS: canvas-styles.css, at the end of the annotation-note section)
 *
 * Loaded by davinci-canvas.js whenever `canvas.ribbon.features.notes` is on,
 * right after initializeAnnotationSystem() has built its notes. The canvas
 * still owns the note LIFECYCLE (create, drag, collapse, remove) and its
 * storage; this file enhances each note in place.
 *
 * ── WHAT IT ADDS ──────────────────────────────────────────────────────────
 *   1. RESIZE  — a corner grip; the note remembers its size.
 *   2. FORMAT  — bold / italic / underline / strikethrough / bulleted list,
 *                by button or by keyboard: ⌘B / ⌘I / ⌘U / ⌘⇧X / ⌘⇧8 (Ctrl
 *                works too), plus ⌘Z / ⌘⇧Z undo-redo inside the note. Every
 *                shortcut is intercepted rather than left to the browser —
 *                see SHORTCUTS for why.
 *   3. COLOUR  — yellow (default, unchanged) / green / orange / red, so a
 *                note's colour can carry meaning (question, decision, …).
 *   4. ANCHOR  — a note remembers the page element it was dropped on and
 *                travels with it on resize and scroll.
 *   5. SAFETY  — delete asks first, and keeps the last 10 in a bin.
 *   6. EXPORT  — Copy Notes puts the page's notes on the clipboard.
 *
 * ── WHY BOTH PANELS ARE CLOSED BY DEFAULT ─────────────────────────────────
 * A 200px post-it has room for ~9 lines of text. A permanent formatting row
 * plus a permanent swatch row would spend a quarter of that on chrome you
 * touch once per note, so each lives behind its own header toggle (`Aa` and a
 * dot painted with the note's current colour) and starts CLOSED — a note that
 * is never formatted or recoloured looks exactly like a plain one, only with
 * more room to write. Picking a colour closes the palette again, since that
 * choice is made once. The open/closed state is remembered per note AND as the
 * default for the next note created, so a designer who always wants the
 * formatting row does not reopen it every time.
 *
 * ── THE TEXTAREA IS STILL THE PLAIN-TEXT MIRROR ───────────────────────────
 * `saveNotesToStorage()` in davinci-canvas.js reads
 * `note.querySelector('.annotation-note__textarea').value` — so the textarea
 * MUST stay in the DOM (removing it would throw and take note POSITIONS down
 * with it). It stays, hidden: the contenteditable div is what you type into,
 * and every edit writes the flattened text back into the textarea and
 * re-dispatches `input` so the canvas persists as usual. Net effect: if this
 * file fails to load, every note is still there, as plain text, in place.
 *
 * ── WHY A SEPARATE STORAGE KEY ────────────────────────────────────────────
 * The canvas rewrites its own key with exactly five fields (id/text/left/top/
 * isCollapsed) on every save, so anything extra parked there would be wiped on
 * the next keystroke. Rich HTML, size and colour therefore live in a sidecar
 * map — `localStorage['davinci:notes-plus:<pathname>']`, keyed by note id.
 * Lose the sidecar and the notes degrade to plain default-yellow post-its
 * rather than disappearing.
 *
 * ── WHY A MutationObserver ────────────────────────────────────────────────
 * Notes appear three ways — restored from localStorage during canvas init,
 * created by the Add Note button, and (per tab context) hidden/shown — and
 * none of them fires an event. Observing <body> childList covers all of them
 * with one listener; adoption is idempotent via the `data-notes-plus` stamp.
 *
 * ⚠️ execCommand is formally deprecated but is still the only one-liner that
 * applies inline formatting to a live selection in every browser DaVinci runs
 * in. For a prototyping post-it that trade is deliberate; if it ever dies, the
 * fallback is to wrap the selection by hand — the storage format (plain HTML)
 * would not change.
 */
(function () {
    'use strict';

    var MIN_W = 180, MIN_H = 120;   // px — below this the panels + a text line stop fitting
    var EDGE  = 8;                  // px kept between a resized note and the viewport edge

    /* ── NOTE COLOURS ─────────────────────────────────────────────────────
       The paint itself lives in canvas-styles.css keyed on
       `[data-note-color]`; this list only decides which swatches exist. */
    var COLORS = ['yellow', 'green', 'orange', 'red'];
    var COLOR_TITLES = { yellow: 'Yellow', green: 'Green', orange: 'Orange', red: 'Red' };

    /* ── FORMATTING ───────────────────────────────────────────────────────
       Icons are <sf-symbol>, the canvas-wide convention: they inherit `color`
       and scale with the parent's `font-size`, so the states are carried by
       opacity on the button and nothing here needs a size or a fill. */
    var TOOLS = [
        { cmd: 'bold',                icon: 'bold',          title: 'Bold (⌘B)' },
        { cmd: 'italic',              icon: 'italic',        title: 'Italic (⌘I)' },
        { cmd: 'underline',           icon: 'underline',     title: 'Underline (⌘U)' },
        { cmd: 'strikeThrough',       icon: 'strikethrough', title: 'Strikethrough (⌘⇧X)' },
        { cmd: 'insertUnorderedList', icon: 'list.bullet',   title: 'Bulleted list (⌘⇧8)' }
    ];

    /* ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────
       The plain ⌘B / ⌘I / ⌘U are handled natively by contenteditable, but they
       are intercepted anyway for ONE reason: `styleWithCSS` is a document-wide
       sticky flag, so a native ⌘B would emit whatever the last command left it
       on — `<b>` after a text-size change, `<span style>` after a colour change.
       Routing every shortcut through exec() keeps the markup identical to the
       toolbar's, whatever happened before it.
       ⌘⇧X (strikethrough) and ⌘⇧8 (bulleted list) have no native binding at
       all; those two follow the Docs/Slack convention. Ctrl is accepted
       alongside ⌘ so the same keys work on a non-Mac keyboard.
       `code` is checked next to `key` because ⇧ rewrites the character: ⌘⇧8 is
       `key: '*'` on a US layout and something else again on ABNT2/ISO.

       ⌘Z / ⌘⇧Z are listed for a different reason than the rest: they are the
       browser's own job, and this handler exists to make sure they STAY that
       way. Every match is `preventDefault()` + `stopPropagation()`, so while the
       caret is in a note the key runs the note's undo and nothing else on the
       page — no other listener downstream can claim it. Ctrl+Y is the
       Windows/Linux redo and is `ctrlOnly` on purpose: on a Mac ⌘Y belongs to
       the browser (History), and stealing it would be exactly the bug this
       guards against. */
    var SHORTCUTS = [
        { key: 'b', code: 'KeyB',   shift: false, cmd: 'bold' },
        { key: 'i', code: 'KeyI',   shift: false, cmd: 'italic' },
        { key: 'u', code: 'KeyU',   shift: false, cmd: 'underline' },
        { key: 'x', code: 'KeyX',   shift: true,  cmd: 'strikeThrough' },
        { key: '8', code: 'Digit8', shift: true,  cmd: 'insertUnorderedList' },
        { key: 'z', code: 'KeyZ',   shift: false, cmd: 'undo' },
        { key: 'z', code: 'KeyZ',   shift: true,  cmd: 'redo' },
        { key: 'y', code: 'KeyY',   shift: false, cmd: 'redo', ctrlOnly: true }
    ];

    function shortcutFor(e) {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return null;
        var k = (e.key || '').toLowerCase();
        for (var i = 0; i < SHORTCUTS.length; i++) {
            var s = SHORTCUTS[i];
            if (!!e.shiftKey !== s.shift) continue;
            if (s.ctrlOnly && (e.metaKey || !e.ctrlKey)) continue;
            if (k === s.key || e.code === s.code) return s.cmd;
        }
        return null;
    }

    /* Text colour options, as TOKEN NAMES resolved at click time — the hex is
       read off the live MDS palette instead of being copied here, so a palette
       change is picked up for free. What lands in the note's HTML is a plain
       colour value, which is content, not code.
       Anything outside this set is reachable through the CUSTOM chip at the end
       of the row (a native colour input), so the presets stay a short list of
       the colours worth one click instead of trying to cover every case.
       ⚠️ White is deliberately offered even though it is near-invisible on
       three of the four note tints — it is there for a note parked over a dark
       screenshot, and the choice is the designer's to make. */
    var INKS = [
        { id: 'default', token: '--color-glyph-gray',   label: 'Default' },
        { id: 'white',   token: '--color-fill',         label: 'White' },
        { id: 'blue',    token: '--color-glyph-blue',   label: 'Blue' },
        { id: 'green',   token: '--color-glyph-green',  label: 'Green' },
        { id: 'orange',  token: '--color-glyph-orange', label: 'Orange' },
        { id: 'red',     token: '--color-glyph-red',    label: 'Red' }
    ];


    /* execCommand('fontSize') only speaks the legacy 1–7 scale. Left as
       `<font size>` ON PURPOSE (styleWithCSS off for this one command): the
       attribute is a HOOK, and canvas-styles.css maps each step to a real
       MDS type token, so note text can never drift off the type scale.
       Presentational hints lose to author rules, so those CSS rules win. */
    var SIZES = [
        { n: 1, label: 'Small' },
        { n: 3, label: 'Normal' },
        { n: 5, label: 'Large' },
        { n: 7, label: 'Larger' }
    ];

    function icon(name) { return '<sf-symbol name="' + name + '"></sf-symbol>'; }

    function tokenValue(name) {
        try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
        catch (e) { return ''; }
    }

    /* ── SIDECAR STORE ─────────────────────────────────────────────────── */

    function storeKey() { return 'davinci:notes-plus:' + window.location.pathname; }

    function readStore() {
        try { return JSON.parse(window.localStorage.getItem(storeKey())) || {}; }
        catch (e) { return {}; }
    }

    function writeStore(map) {
        try { window.localStorage.setItem(storeKey(), JSON.stringify(map)); }
        catch (e) { /* private mode / quota — the canvas plain-text copy still saves */ }
    }

    function patch(id, fields) {
        if (!id) return;
        var map = readStore();
        var entry = map[id] || {};
        for (var k in fields) { if (fields.hasOwnProperty(k)) entry[k] = fields[k]; }
        map[id] = entry;
        writeStore(map);
    }

    function drop(id) {
        var map = readStore();
        if (!(id in map)) return;
        delete map[id];
        writeStore(map);
    }

    /* Which panels a NEW note opens with — the last explicit choice made
       anywhere, so the preference follows the designer instead of resetting on
       every note. Global (not per page): it is a working habit, not content. */
    var PREFS_KEY = 'davinci:notes-plus:panels';

    function readPrefs() {
        try { return JSON.parse(window.localStorage.getItem(PREFS_KEY)) || {}; }
        catch (e) { return {}; }
    }

    function writePrefs(p) {
        try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }
        catch (e) { /* private mode */ }
    }

    /* ── SIZE ──────────────────────────────────────────────────────────── */

    function setSize(note, w, h) {
        note.style.setProperty('--davinci-note-w', Math.round(w) + 'px');
        note.style.setProperty('--davinci-note-h', Math.round(h) + 'px');
        note.setAttribute('data-note-sized', '');
    }

    function attachResize(note) {
        var grip = document.createElement('div');
        grip.className = 'davinci-note-grip';
        grip.title = 'Drag to resize';

        grip.addEventListener('mousedown', function (e) {
            // stopPropagation, not just preventDefault: the canvas drag handler
            // is bound to the NOTE and only bails out for the textarea and its
            // own buttons, so without this a resize would also move the note.
            e.preventDefault();
            e.stopPropagation();

            var r  = note.getBoundingClientRect();
            var sx = e.clientX, sy = e.clientY, w0 = r.width, h0 = r.height;
            var maxW = window.innerWidth  - r.left - EDGE;
            var maxH = window.innerHeight - r.top  - EDGE;

            function move(ev) {
                setSize(note,
                    Math.max(MIN_W, Math.min(maxW, w0 + ev.clientX - sx)),
                    Math.max(MIN_H, Math.min(maxH, h0 + ev.clientY - sy)));
            }
            function up() {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                document.body.classList.remove('davinci-note-resizing');
                var out = note.getBoundingClientRect();
                patch(note.id, { w: Math.round(out.width), h: Math.round(out.height) });
            }

            document.body.classList.add('davinci-note-resizing');
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });

        note.appendChild(grip);
    }

    /* ── COLLAPSIBLE PANELS ────────────────────────────────────────────────
       Both the formatting row and the colour palette are panels behind a
       header toggle, and both start closed — see the section header for why.
       State is a class on the note (so CSS owns the visibility), mirrored into
       the sidecar per note and, when toggled explicitly, into the global
       default for the next note. */
    var PANEL_CLASS = {
        bar:     'davinci-note--bar-open',
        palette: 'davinci-note--palette-open'
    };

    function isPanelOpen(note, which) {
        return note.classList.contains(PANEL_CLASS[which]);
    }

    function setPanel(note, which, open, remember) {
        note.classList.toggle(PANEL_CLASS[which], !!open);

        var toggle = note.querySelector('.davinci-note-toolbtn[data-panel="' + which + '"]');
        if (toggle) {
            toggle.classList.toggle('davinci-note-toolbtn--active', !!open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        var fields = {};
        fields[which === 'bar' ? 'barOpen' : 'paletteOpen'] = !!open;
        patch(note.id, fields);

        // An auto-close (after picking a colour) must NOT rewrite the default —
        // otherwise the palette would teach itself to stay shut forever.
        if (remember) {
            var p = readPrefs();
            p[which] = !!open;
            writePrefs(p);
        }
    }

    /* ── COLOUR ────────────────────────────────────────────────────────── */

    function colorOf(note) { return note.getAttribute('data-note-color') || 'yellow'; }

    function paintColorUI(note) {
        var active = colorOf(note);

        Array.prototype.forEach.call(note.querySelectorAll('.davinci-note-swatch'), function (d) {
            var on = d.getAttribute('data-color') === active;
            d.classList.toggle('davinci-note-swatch--active', on);
            d.setAttribute('aria-checked', on ? 'true' : 'false');
        });

        // The header toggle IS a swatch of the current colour — it answers
        // "what colour is this note" and "where do I change it" at once.
        var dot = note.querySelector('.davinci-note-toolbtn__dot');
        if (dot) dot.setAttribute('data-color', active);
        var toggle = note.querySelector('.davinci-note-toolbtn[data-panel="palette"]');
        if (toggle) toggle.title = 'Note colour — ' + COLOR_TITLES[active];
    }

    function setColor(note, color) {
        if (COLORS.indexOf(color) === -1) return;
        note.setAttribute('data-note-color', color);
        paintColorUI(note);
        patch(note.id, { color: color });
        setPanel(note, 'palette', false, false);   // picked once → get out of the way
    }

    function buildPalette(note) {
        var row = document.createElement('div');
        row.className = 'davinci-note-palette';
        row.setAttribute('role', 'radiogroup');
        row.setAttribute('aria-label', 'Note colour');
        row.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });

        COLORS.forEach(function (c) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'davinci-note-dot davinci-note-swatch';
            dot.setAttribute('data-color', c);
            dot.setAttribute('role', 'radio');
            dot.title = COLOR_TITLES[c];
            dot.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
            dot.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();     // the canvas expands a collapsed note on click
                setColor(note, c);
            });
            row.appendChild(dot);
        });
        return row;
    }

    /* ── HEADER TOGGLES ────────────────────────────────────────────────── */

    function buildToggles(note) {
        var wrap = document.createElement('div');
        wrap.className = 'davinci-note-toolbtns';

        function toggleBtn(panel, title, inner) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'davinci-note-toolbtn';
            b.setAttribute('data-panel', panel);
            b.setAttribute('aria-expanded', 'false');
            b.title = title;
            b.innerHTML = inner;
            b.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
            b.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setPanel(note, panel, !isPanelOpen(note, panel), true);
            });
            return b;
        }

        wrap.appendChild(toggleBtn('bar', 'Text formatting', icon('textformat.alt')));
        wrap.appendChild(toggleBtn('palette', 'Note colour',
            '<span class="davinci-note-dot davinci-note-toolbtn__dot" data-color="yellow"></span>'));
        // The swatches unfold to the RIGHT of that dot, in the header row
        // itself (designer's call): the dot IS the current colour, so the
        // choices read as a continuation of it instead of a detached row.
        // In-flow rather than a floating panel — at the 180px minimum width
        // the row still fits, so there is nothing to overflow or position.
        wrap.appendChild(buildPalette(note));
        return wrap;
    }

    /* ── RICH TEXT ─────────────────────────────────────────────────────── */

    function syncEmpty(rich) {
        rich.classList.toggle('davinci-note-rich--empty', rich.textContent.trim() === '');
    }

    function focusEnd(rich) {
        rich.focus();
        try {
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(rich);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) { /* focus alone is enough */ }
    }

    /* ── KEEPING THE SELECTION ALIVE ───────────────────────────────────────
       🐞 FIXED. Every command used to start with
       `if (!rich.contains(document.activeElement)) focusEnd(rich)`, and
       focusEnd COLLAPSES the caret to the end — so whenever anything had
       stolen focus from the note, "colour this word" silently became "colour
       nothing", and the designer had to select and click a second time (by
       then focus was back in the note, so it worked). Reported as: "não aplica
       na primeira; seleciono de novo, clico de novo, aí aplica."
       Two things caused the theft, and both are fixed: the header toggles and
       the colour swatches only called stopPropagation on mousedown, never
       preventDefault, so clicking them focused the button; and the fallback
       destroyed the selection instead of restoring it.
       The last range seen INSIDE this editable is now remembered (see the
       selectionchange listener in init) and put back when the live selection
       has wandered off. Collapsing to the end is the last resort only — for a
       note that has never been clicked into, where there is nothing to keep. */
    function rememberRange(rich, range) {
        rich.__dvNoteLastRange = range;
    }

    function selectionInside(rich) {
        try {
            var s = window.getSelection();
            if (!s || !s.rangeCount) return null;
            var r = s.getRangeAt(0);
            return rich.contains(r.commonAncestorContainer) ? r : null;
        } catch (e) { return null; }
    }

    function ensureSelection(rich) {
        if (selectionInside(rich)) {
            if (!rich.contains(document.activeElement)) rich.focus();  // focus without moving the caret
            return;
        }
        if (rich.__dvNoteLastRange) { putRangeBack(rich, rich.__dvNoteLastRange); return; }
        focusEnd(rich);
    }

    /* styleWithCSS is document-wide and sticky, so it is set explicitly on
       every call rather than once: `true` for colour (a clean <span style>),
       `false` for fontSize (keeps the <font size> hook the CSS maps). */
    function exec(cmd, value, useCss) {
        try { document.execCommand('styleWithCSS', false, !!useCss); } catch (e) { /* ignore */ }
        try { document.execCommand(cmd, false, value == null ? null : value); }
        catch (e) { /* unsupported command — nothing applied */ }
    }

    function syncBar(note) {
        var bar = note.querySelector('.davinci-note-bar');
        if (!bar) return;
        Array.prototype.forEach.call(bar.querySelectorAll('[data-cmd]'), function (btn) {
            var on = false;
            try { on = document.queryCommandState(btn.getAttribute('data-cmd')); } catch (e) { on = false; }
            btn.classList.toggle('davinci-note-bar__btn--active', on);
        });
    }

    /* One write, two destinations: the sidecar takes the HTML, the canvas
       textarea takes the flattened text and is nudged so the canvas persists
       text + position through its own code path. When only formatting changed
       the plain text is identical, so the canvas save is skipped — it would
       have nothing new to store. */
    function save(note, rich) {
        patch(note.id, { html: rich.innerHTML });
        var ta = note.querySelector('.annotation-note__textarea');
        if (!ta) return;
        var plain = rich.innerText != null ? rich.innerText : rich.textContent;
        if (ta.value !== plain) {
            ta.value = plain;
            ta.dispatchEvent(new Event('input'));
        }
    }

    function closeAllPops(except) {
        Array.prototype.forEach.call(document.querySelectorAll('.davinci-note-menu--open'), function (w) {
            if (w !== except) w.classList.remove('davinci-note-menu--open');
        });
    }

    /* ── SELECTION PARKING ─────────────────────────────────────────────────
       Everything in the bar cancels mousedown, which is enough to keep the
       selection alive for a plain click. The NATIVE colour input is the one
       exception: the OS picker takes focus, so the range has to be parked
       before it opens and put back before the command runs. Without this,
       "colour just this word" silently becomes "colour nothing". */
    function grabRange(rich) {
        try {
            var s = window.getSelection();
            if (!s || !s.rangeCount) return null;
            var r = s.getRangeAt(0);
            return rich.contains(r.commonAncestorContainer) ? r.cloneRange() : null;
        } catch (e) { return null; }
    }

    function putRangeBack(rich, range) {
        rich.focus();
        if (!range) { focusEnd(rich); return; }
        try {
            var s = window.getSelection();
            s.removeAllRanges();
            s.addRange(range);
        } catch (e) { /* focus alone is enough */ }
    }

    /* The "any colour" escape hatch at the end of the ink row: a real
       <input type="color"> (so the OS picker and its eyedropper come free),
       hidden behind a rainbow chip because a native swatch can't be styled
       into the round chips beside it and would read as "the current colour"
       rather than "pick one". */
    function buildCustomInk(note, rich, close) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'davinci-note-ink davinci-note-ink--custom';
        btn.title = 'Custom colour…';
        btn.innerHTML = '<span class="davinci-note-ink__chip davinci-note-ink__chip--custom"></span>';

        var input = document.createElement('input');
        input.type = 'color';
        input.className = 'davinci-note-ink__input';
        input.tabIndex = -1;
        input.setAttribute('aria-hidden', 'true');

        var parked = null;

        btn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            parked = grabRange(rich) || rich.__dvNoteLastRange;   // before the picker steals focus
        });
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            input.click();
        });
        // `change`, not `input`: applying on every drag of the OS picker would
        // stack one <span> per intermediate colour.
        input.addEventListener('change', function () {
            putRangeBack(rich, parked);
            exec('foreColor', input.value, true);
            close();
            save(note, rich);
        });

        var holder = document.createElement('span');
        holder.className = 'davinci-note-ink__custom';
        holder.appendChild(btn);
        holder.appendChild(input);
        return holder;
    }

    /* A dropdown inside the bar (text colour, text size). The trigger and every
       item cancel mousedown so the SELECTION inside the note survives the
       click — execCommand has nothing to act on otherwise, which is the whole
       point of "format only part of the text". */
    function buildMenu(note, rich, opts) {
        var wrap = document.createElement('div');
        wrap.className = 'davinci-note-menu';

        function close() { wrap.classList.remove('davinci-note-menu--open'); }

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'davinci-note-bar__btn';
        trigger.title = opts.title;
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.innerHTML = icon(opts.icon);
        trigger.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
        trigger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var open = wrap.classList.contains('davinci-note-menu--open');
            closeAllPops();
            wrap.classList.toggle('davinci-note-menu--open', !open);
        });

        var panel = document.createElement('div');
        panel.className = 'davinci-note-menu__panel ' + (opts.panelClass || '');
        panel.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });

        opts.items.forEach(function (it) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = it.className;
            item.title = it.title || it.label;
            if (it.html) item.innerHTML = it.html;
            else item.textContent = it.label;
            if (it.style) item.setAttribute('style', it.style);
            item.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                ensureSelection(rich);
                it.apply();
                close();
                save(note, rich);
            });
            panel.appendChild(item);
        });

        // Trailing controls that need their own element/wiring (the custom-colour
        // input), appended after the plain items.
        (opts.extras || []).forEach(function (make) { panel.appendChild(make(close)); });

        wrap.appendChild(trigger);
        wrap.appendChild(panel);
        return wrap;
    }

    function buildBar(note, rich) {
        var bar = document.createElement('div');
        bar.className = 'davinci-note-bar';
        bar.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });

        TOOLS.forEach(function (t) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'davinci-note-bar__btn';
            btn.setAttribute('data-cmd', t.cmd);
            btn.title = t.title;
            btn.innerHTML = icon(t.icon);

            // preventDefault on mousedown keeps the caret/selection inside the
            // editable div — execCommand has nothing to act on otherwise.
            btn.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                ensureSelection(rich);
                // useCss FALSE for the inline commands: `<b>/<i>/<u>/<strike>`
                // instead of a style-carrying <span> — shorter, semantic, and
                // what the same shortcut would have produced natively.
                exec(t.cmd, null, false);
                syncBar(note);
                save(note, rich);
            });
            bar.appendChild(btn);
        });

        bar.appendChild(buildMenu(note, rich, {
            title: 'Text colour',
            icon: 'paintpalette',
            panelClass: 'davinci-note-menu__panel--inks',
            items: INKS.map(function (ink) {
                return {
                    className: 'davinci-note-ink',
                    title: ink.label,
                    html: '<span class="davinci-note-ink__chip" style="background-color: var(' + ink.token + ')"></span>',
                    apply: function () { exec('foreColor', tokenValue(ink.token) || '#1d1d1f', true); }
                };
            }),
            extras: [function (close) { return buildCustomInk(note, rich, close); }]
        }));

        bar.appendChild(buildMenu(note, rich, {
            title: 'Text size',
            icon: 'textformat.size',
            panelClass: 'davinci-note-menu__panel--sizes',
            items: SIZES.map(function (s) {
                return {
                    className: 'davinci-note-size',
                    label: s.label,
                    html: '<font size="' + s.n + '">' + s.label + '</font>',
                    apply: function () { exec('fontSize', s.n, false); }
                };
            })
        }));

        return bar;
    }

    /* ── ADOPTION ──────────────────────────────────────────────────────── */

    function adopt(note) {
        if (!note || note.getAttribute('data-notes-plus')) return;
        var content = note.querySelector('.annotation-note__content');
        var header  = note.querySelector('.annotation-note__header');
        var ta      = note.querySelector('.annotation-note__textarea');
        if (!content || !header || !ta) return;   // not a canvas note — leave it alone

        note.setAttribute('data-notes-plus', '1');
        note.classList.add('davinci-note');

        var saved = readStore()[note.id] || {};
        var prefs = readPrefs();

        var rich = document.createElement('div');
        rich.className = 'davinci-note-rich';
        rich.contentEditable = 'true';
        rich.setAttribute('role', 'textbox');
        rich.setAttribute('aria-multiline', 'true');
        rich.setAttribute('data-placeholder', ta.placeholder || 'Type your note here...');
        // Authored locally by the designer, in their own browser — the only
        // writer of this key is the code above.
        if (typeof saved.html === 'string') rich.innerHTML = saved.html;
        else rich.textContent = ta.value || '';
        content.appendChild(rich);
        syncEmpty(rich);

        rich.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        rich.addEventListener('input', function () { syncEmpty(rich); save(note, rich); });
        rich.addEventListener('keyup', function () { syncBar(note); });
        rich.addEventListener('keydown', function (e) {
            var cmd = shortcutFor(e);
            if (!cmd) return;
            // preventDefault BEFORE running it: otherwise the browser applies its
            // own version on top and the note ends up double-wrapped.
            // stopPropagation so no document-level listener elsewhere on the page
            // can also claim the key while the caret is inside a note.
            e.preventDefault();
            e.stopPropagation();
            exec(cmd, null, false);
            syncBar(note);
            syncEmpty(rich);        // an undo can empty the note — bring the placeholder back
            save(note, rich);
        });
        // Paste as plain text: a note is not a place for a pasted stylesheet.
        rich.addEventListener('paste', function (e) {
            e.preventDefault();
            var cb = e.clipboardData || window.clipboardData;
            var text = cb ? cb.getData('text/plain') : '';
            try { document.execCommand('insertText', false, text); }
            catch (err) { rich.textContent += text; }
            syncEmpty(rich);
            save(note, rich);
        });

        header.insertBefore(buildToggles(note), header.firstChild);
        note.insertBefore(buildBar(note, rich), content);
        attachResize(note);

        if (saved.color) note.setAttribute('data-note-color', saved.color);
        paintColorUI(note);
        if (saved.w && saved.h) setSize(note, saved.w, saved.h);

        /* Restore where this note sat in the stack, and keep `topZ` ahead of
           every restored value so the first interaction still wins. */
        if (typeof saved.z === 'number') {
            applyZ(note, saved.z);
            if (saved.z > topZ) topZ = saved.z;
        }

        /* A note just created by Add Note comes to the front, above every existing
           note. Only that path sets the flag, so notes restored at load keep their
           saved stacking instead of all being re-topped in adoption order. */
        if (pendingNewNote) {
            pendingNewNote = false;
            bringToFront(note);
        }

        /* Put the note back on the element it was dropped on. A note that has no
           anchor yet — one just created, or one from before this existed — gets
           one derived from where it currently sits, so the relationship starts
           the moment the note appears rather than only after its first drag. */
        if (saved.anchor) {
            note.__dvNoteAnchor = { sel: saved.anchor, adx: saved.adx || 0, ady: saved.ady || 0,
                                  aw: saved.aw || 0, ah: saved.ah || 0 };
            placeFromAnchor(note);
        } else {
            /* ⚠️ NOT anchored here. Adoption happens while the canvas is still
               building: `initializeAnnotationSystem` creates the notes, and the
               PROTOTYPE's own JS only runs on `davinci:canvas:ready`, after this.
               So at this instant any JS-rendered region is still an empty box —
               a prototype that ships `<div id="mail-body">` empty and fills it on
               ready has nothing under the note's corner to anchor to yet. That is
               why some notes followed a resize and others did not: they were
               anchored against a page that had not been drawn.
               Deferred to settleAnchors(), which runs once the content exists. */
            note.__dvNoteNeedsAnchor = true;
        }

        // Per-note state wins; a note that has never been touched follows the
        // global default; with neither, both panels stay closed.
        setPanel(note, 'bar',
            typeof saved.barOpen === 'boolean' ? saved.barOpen : !!prefs.bar, false);
        setPanel(note, 'palette',
            typeof saved.paletteOpen === 'boolean' ? saved.paletteOpen : !!prefs.palette, false);
    }

    function sweep() {
        var notes = document.querySelectorAll('.annotation-note:not([data-notes-plus])');
        Array.prototype.forEach.call(notes, adopt);
        syncNoteControls();   // notes come and go; the eye + Copy follow them
    }

    /* ── STACKING ORDER: THE ONE YOU TOUCH COMES TO THE FRONT ──────────────
       Every note shares one z-index (9990, from the CSS), so with several of
       them the winner was whichever the canvas happened to append LAST — and
       clicking a note that had been created earlier left it buried under its
       neighbours, sometimes with the neighbour's body covering the text you were
       about to read. Reported with a screenshot of three notes overlapping.

       So the note you interact with is raised above the others, the way any
       window manager behaves. Kept as a RELATIVE bump on top of the CSS floor
       (`--davinci-note-z`), never an absolute number, so the whole set stays inside
       the band the stacking comment in canvas-styles.css reserves: raising a
       note must not put it over the undo toast or the Live Editor.
       ⚠️ The order is remembered per note in the sidecar (`z`), or a reload
       would reshuffle everything back to DOM order and lose the arrangement the
       designer just made. `topZ` starts above whatever the stored notes use. */
    var Z_FLOOR = 0;          // offset from the CSS floor, not an absolute z-index
    var Z_CEILING = 8;        // 9990 + 8 stays clear of the toast band (10000+)
    var topZ = Z_FLOOR;

    // Set by the Add Note click, consumed by adopt(): a freshly created note is raised
    // above every existing one, so a new note never appears buried under an old one.
    var pendingNewNote = false;

    function applyZ(note, z) {
        note.style.setProperty('--davinci-note-z', String(z));
        note.setAttribute('data-note-raised', '');
    }

    function bringToFront(note) {
        var mine = parseInt(note.style.getPropertyValue('--davinci-note-z'), 10);
        if (mine === topZ && topZ > Z_FLOOR) return;   // already on top: nothing to write
        topZ = topZ + 1;
        /* Past the ceiling the whole set is renumbered from the floor, keeping
           the order — an ever-climbing counter would eventually cross into the
           toast's band and a note would cover its own Undo. */
        if (topZ > Z_CEILING) {
            var notes = Array.prototype.slice.call(document.querySelectorAll('.annotation-note'));
            notes.sort(function (a, b) {
                return (parseInt(a.style.getPropertyValue('--davinci-note-z'), 10) || 0) -
                       (parseInt(b.style.getPropertyValue('--davinci-note-z'), 10) || 0);
            });
            topZ = Z_FLOOR;
            notes.forEach(function (n) {
                if (n === note) return;
                applyZ(n, topZ);
                patch(n.id, { z: topZ });
                topZ = Math.min(topZ + 1, Z_CEILING - 1);
            });
            topZ = Z_CEILING;
        }
        applyZ(note, topZ);
        patch(note.id, { z: topZ });
    }

    /* ── KEEPING A NOTE ON THE THING IT IS ABOUT ───────────────────────────
       The canvas stores a note's position as `left`/`top` PIXELS and the element
       is `position: fixed`, so the note is pinned to the VIEWPORT, not to the
       page. Resize the window and the content reflows underneath while the note
       stays at 420px — the comment now points at whatever moved into that spot.
       Reported as "ao redimensionar o navegador eu perco a referência de onde o
       post-it foi posicionado".

       So a note remembers the ELEMENT it was dropped on, plus its offset from
       that element's box, and is re-placed from the anchor's current rect on
       every resize and scroll — the same contract the Open Questions pins use.
       Two deliberate consequences:
         · a note now SCROLLS WITH the content instead of floating over it. That
           is the point: an annotation that stays put while the page moves is
           pointing at the wrong thing a second later.
         · no viewport clamp (the pins have one). Clamping would drag the note off
           its anchor to keep it on screen, which is the very relationship this
           exists to preserve.
       ⚠️ The pixel position stays in storage as the FALLBACK. An anchor can go
       away — a drawer closes, a prototype is edited, a row is filtered out — and
       a note whose anchor cannot be resolved must still land where it was, not at
       0,0. */

    /* DaVinci chrome and the notes themselves must be invisible to the hit test,
       or a note would anchor to itself (it is the topmost thing at its own
       corner) or to the ribbon it happens to overlap. A workspace plugin that
       draws its own overlay opts out with `data-davinci-no-anchor`. */
    var NOT_ANCHORABLE = '.annotation-note, .davinci-note-toast, .davinci-live-editor-ui,' +
                         '#liveEditorBtn, [data-davinci-no-anchor],' +
                         '.prototype-ribbon, .top-navbar, footer';

    function pageElementAt(x, y) {
        var list = [];
        try { list = document.elementsFromPoint(x, y) || []; } catch (e) { return null; }
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (el.closest && el.closest(NOT_ANCHORABLE)) continue;
            if (el === document.body || el === document.documentElement) continue;
            return el;
        }
        return null;
    }

    /* The nearest ancestor that can be found again later. Deliberately an
       identifier walk and NOT a generated `nth-child` path: a path through a
       prototype's markup breaks the next time a row, a column or a wrapper is
       added, and it breaks SILENTLY — the note would quietly re-anchor to a
       different cell. An id (or a class that matches exactly one element) is
       either there on the next load or it is not, and when it is not we fall
       back to pixels. The anchor gets coarser (a panel or a form instead of one
       cell) and the note still travels with the block it was dropped on.
       ⚠️ UNIQUE OR NOTHING, checked against the live document. `.mail__row`
       matches four rows; anchoring to "the first one" would look right on the
       page it was authored on and wrong everywhere else. */
    function uniqueSelector(el) {
        if (el.id) {
            var byId = '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
            try { if (document.querySelectorAll(byId).length === 1) return byId; } catch (e) { /* bad id */ }
        }
        // Classes are tried one at a time, then the full set: a single
        // distinctive class (`.mail-frame`) is far more durable than the whole
        // list, which changes the moment a state class is toggled on the element.
        var cls = Array.prototype.slice.call(el.classList).filter(function (c) {
            return c.indexOf('davinci-note') !== 0 && c.indexOf('annotation-note') !== 0;
        });
        var tries = cls.map(function (c) { return '.' + c; });
        if (cls.length > 1) tries.push('.' + cls.join('.'));
        for (var i = 0; i < tries.length; i++) {
            try { if (document.querySelectorAll(tries[i]).length === 1) return tries[i]; }
            catch (e) { /* unusable class name */ }
        }
        return null;
    }

    function stableAnchorFor(el) {
        for (var n = el; n && n !== document.body; n = n.parentElement) {
            var sel = uniqueSelector(n);
            if (sel) return sel;
        }
        return null;
    }

    function resolveAnchor(sel) {
        if (!sel) return null;
        var el = null;
        try { el = document.querySelector(sel); } catch (e) { el = null; }
        return el && el.getClientRects().length ? el : null;
    }

    /* Re-derive the anchor from where the note now sits. Measured a few pixels
       INSIDE the note's top-left corner rather than exactly on it: a corner
       often lands on a border or a gap between two elements, which anchors the
       note to a wrapper instead of the thing under it. */
    /* The anchor is cached ON THE ELEMENT as well as stored. placeAll() runs per
       note on every scroll frame, and reading localStorage + JSON.parse per note
       per frame is exactly the kind of cost that turns a smooth scroll janky. */
    function setAnchor(note, sel, a) {
        note.__dvNoteAnchor = sel ? a : null;
        patch(note.id, sel ? { anchor: sel, adx: a.adx, ady: a.ady, aw: a.aw, ah: a.ah }
                            : { anchor: null });
    }

    function reanchor(note) {
        var r = note.getBoundingClientRect();
        /* A note with no box — hidden by the Show Notes switch, or belonging to
           another tab context — would hit-test at 0,0 and anchor to whatever sits
           in the page's top-left corner. Leave its stored anchor alone. */
        if (!r.width || !r.height) return;
        var el = pageElementAt(r.left + 6, r.top + 6);
        var sel = el ? stableAnchorFor(el) : null;
        var host = sel ? resolveAnchor(sel) : null;
        if (!host) { setAnchor(note, null); return; }
        var hr = host.getBoundingClientRect();
        /* The anchor's SIZE is recorded with the offset, which is what lets the
           offset be scaled later — see placeFromAnchor. */
        setAnchor(note, sel, {
            sel: sel,
            adx: Math.round(r.left - hr.left),
            ady: Math.round(r.top - hr.top),
            aw: Math.round(hr.width),
            ah: Math.round(hr.height)
        });
    }

    /* ⚠️ The offset is SCALED by how much the anchor itself resized, not applied
       raw. A raw offset only survives an anchor that MOVED; the reported case is
       an anchor that also SHRANK — the email body went from 1040px to 720px wide
       while the note kept its 820px offset, which put it outside the block and
       back over the panel next door, which is the bug all over again. Scaling
       keeps the note at the same place *within* the block (78% across stays 78%
       across). An anchor that only moved scales by 1 and lands exactly where it
       was, so nothing drifts in the common case. */
    function placeFromAnchor(note) {
        var a = note.__dvNoteAnchor;
        if (!a) return false;
        var host = resolveAnchor(a.sel);
        if (!host) return false;                  // anchor gone → the pixel fallback stands
        var hr = host.getBoundingClientRect();
        var sx = a.aw > 0 ? hr.width / a.aw : 1;
        var sy = a.ah > 0 ? hr.height / a.ah : 1;
        note.style.left = Math.round(hr.left + (a.adx || 0) * sx) + 'px';
        note.style.top  = Math.round(hr.top + (a.ady || 0) * sy) + 'px';
        return true;
    }

    /* Anchor every note that is still waiting, now that the prototype has had a
       chance to render. Runs more than once on purpose (canvas:ready, window
       load, and two delayed passes): different prototypes fill their regions at
       different moments — some on ready, some after a fetch — and a note anchored
       against an empty box is worse than one anchored a second late. Each note is
       processed at most once, so the extra passes cost a flag check. */
    function settleAnchors() {
        Array.prototype.forEach.call(
            document.querySelectorAll('.annotation-note[data-notes-plus]'), function (note) {
                if (!note.__dvNoteNeedsAnchor) return;
                var r = note.getBoundingClientRect();
                if (!r.width || !r.height) return;      // hidden: try again next pass
                reanchor(note);
                if (note.__dvNoteAnchor) note.__dvNoteNeedsAnchor = false;
            });
    }

    var placePending = false;
    function placeAll() {
        if (placePending) return;
        placePending = true;
        requestAnimationFrame(function () {
            placePending = false;
            Array.prototype.forEach.call(
                document.querySelectorAll('.annotation-note[data-notes-plus]'), placeFromAnchor);
        });
    }

    /* ── THE BIN ───────────────────────────────────────────────────────────
       Deleting a note used to be instant and final: the canvas dropped the
       element and rewrote its storage key, this plugin pruned the sidecar, and
       the text was gone with no copy anywhere. That cost a real note.
       Now every delete passes through a confirmation, and what it deletes is
       kept — the last 10 notes, page and all, under one global key. So even a
       confirmed delete is reversible, and a delete you regret an hour later is
       still there. */
    var TRASH_KEY = 'davinci:notes-plus:trash';
    var TRASH_MAX = 10;

    function readTrash() {
        try { return JSON.parse(window.localStorage.getItem(TRASH_KEY)) || []; }
        catch (e) { return []; }
    }

    function writeTrash(list) {
        try { window.localStorage.setItem(TRASH_KEY, JSON.stringify(list.slice(0, TRASH_MAX))); }
        catch (e) { /* private mode */ }
    }

    function toTrash(note) {
        var rich = note.querySelector('.davinci-note-rich');
        var ta = note.querySelector('.annotation-note__textarea');
        var side = readStore()[note.id] || {};
        var entry = {
            id: note.id,
            page: window.location.pathname,
            // The tab context the canvas filed it under. Restoring into the wrong one puts
            // the note back in storage but leaves it hidden, which reads as Undo failing.
            context: note.getAttribute('data-note-context') || 'main',
            title: document.title || '',
            deletedAt: new Date().toISOString(),
            text: rich ? (rich.innerText || rich.textContent || '') : (ta ? ta.value : ''),
            html: rich ? rich.innerHTML : '',
            color: colorOf(note),
            left: note.style.left,
            top: note.style.top,
            w: side.w,
            h: side.h
        };
        var list = readTrash();
        list.unshift(entry);
        writeTrash(list);
        return entry;
    }

    /* Restoring means handing the note back to the CANVAS, not re-creating the
       element here: the canvas keeps its notes in a private array, and a DOM
       node it doesn't know about would be dropped from storage on its next
       save. It exposes `restoreNote` for exactly this.
       ⚠️ The sidecar is patched FIRST. The canvas appends the element, which
       trips the <body> observer, and the adopt() that follows reads the rich
       HTML, colour and size straight back out of the sidecar — so it has to be
       there before the note exists. */
    function canvasKeyFor(pathname, context) {
        var api = window.DaVinciNotes;
        if (!api || typeof api.storageKeyFor !== 'function') return null;
        // 'main' for anything binned before the context was recorded — a note that lived
        // under a tab comes back on the main one rather than not coming back at all.
        return api.storageKeyFor(pathname, context || 'main');
    }

    function noteRecord(entry) {
        return {
            id: entry.id,
            text: entry.text || '',
            left: entry.left || '120px',
            top: entry.top || '120px',
            isCollapsed: false
        };
    }

    function restoreFromTrash(entry) {
        if (!entry) return false;
        var api = window.DaVinciNotes;
        var samePage = (entry.page || '') === window.location.pathname;

        patch(entry.id, {
            html: entry.html, color: entry.color,
            w: entry.w, h: entry.h
        });

        // On this page the canvas can simply build it again — no storage write, no
        // reload, and the note is back under the cursor rather than after a flash.
        if (samePage && api && typeof api.restoreNote === 'function') {
            writeTrash(readTrash().filter(function (t) { return t.id !== entry.id; }));
            api.restoreNote(noteRecord(entry), entry.context);
            hideToast();
            return true;
        }

        // Another page: seed that page's storage so it turns up the next time it loads.
        var key = canvasKeyFor(entry.page || window.location.pathname, entry.context);
        if (!key) return false;
        var list;
        try { list = JSON.parse(window.localStorage.getItem(key)) || []; } catch (e) { list = []; }
        if (!list.some(function (n) { return n.id === entry.id; })) {
            list.push(noteRecord(entry));
            try { window.localStorage.setItem(key, JSON.stringify(list)); } catch (e) { return false; }
        }
        writeTrash(readTrash().filter(function (t) { return t.id !== entry.id; }));
        return samePage ? true : 'restored-elsewhere';
    }

    /* ── CONFIRMATION ──────────────────────────────────────────────────────
       An in-note panel rather than window.confirm(): a native dialog steals
       focus from the whole page (and reads as a browser error), while this
       keeps the note — and the text at risk — visible behind it.
       An EMPTY note skips the question entirely; there is nothing to lose, and
       asking every time would train the reflex that makes the guard useless.

       This is the `confirmRemove` hook davinci-canvas.js calls from its own
       remove handler. Returning true means "I am handling it" and the canvas
       stands down until `proceed()` runs; returning false lets it delete
       immediately, which is what happens for a note this file never adopted. */
    function closeConfirm(note) {
        var panel = note.querySelector('.davinci-note-confirm');
        if (panel) panel.remove();
    }

    function askDelete(note, proceed) {
        if (!note.getAttribute('data-notes-plus')) return false;   // not ours
        if (note.querySelector('.davinci-note-confirm')) return true;   // already asking

        var rich = note.querySelector('.davinci-note-rich');
        var text = rich ? (rich.textContent || '').trim() : '';
        if (!text) { commitDelete(note, proceed, true); return true; }   // nothing to bin or undo

        var panel = document.createElement('div');
        panel.className = 'davinci-note-confirm';
        panel.innerHTML =
            '<p class="davinci-note-confirm__msg">Delete this note?' +
            '<span class="davinci-note-confirm__sub">Its text will be removed from the page.</span></p>' +
            '<div class="davinci-note-confirm__actions">' +
            '<button type="button" class="davinci-note-confirm__btn davinci-note-confirm__btn--keep">Keep</button>' +
            '<button type="button" class="davinci-note-confirm__btn davinci-note-confirm__btn--go">Delete</button>' +
            '</div>';
        panel.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });

        panel.querySelector('.davinci-note-confirm__btn--keep').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            closeConfirm(note);
        });
        panel.querySelector('.davinci-note-confirm__btn--go').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            closeConfirm(note);
            commitDelete(note, proceed);
        });

        note.appendChild(panel);
        return true;
    }

    function commitDelete(note, proceed, silent) {
        // `silent` is the empty-note path: no text means nothing to recover, so
        // it skips the bin and the Undo toast instead of adding noise to both.
        var entry = silent ? null : toTrash(note);
        drop(note.id);          // the sidecar goes with the note
        proceed();              // the canvas owns the element and its notes array
        if (entry) showUndo(entry);
    }

    /* ── TOAST ─────────────────────────────────────────────────────────────
       One transient strip, reused by everything that needs to report back: the
       delete/undo pair and the copy action. `msg` is always plugin-authored
       text with numbers in it — note CONTENT never goes in here, so there is
       nothing to escape.
       It can be dismissed by hand (× or Esc) as well as by the timer — a toast
       you can't shut up is worse than no toast. ⚠️ For a delete, dismissing
       only hides the affordance: the note STAYS in the bin, so
       `NotesPlus.restore()` still brings it back afterwards. */
    var toastEl = null, toastTimer = null;

    function hideToast() {
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        if (toastEl) { toastEl.remove(); toastEl = null; }
    }

    function showToast(msg, action) {
        hideToast();

        toastEl = document.createElement('div');
        toastEl.className = 'davinci-note-toast';
        toastEl.innerHTML =
            '<span class="davinci-note-toast__msg">' + msg + '</span>' +
            (action ? '<button type="button" class="davinci-note-toast__btn">' +
                icon(action.icon) + ' ' + action.label + '</button>' : '') +
            '<button type="button" class="davinci-note-toast__close" title="Dismiss">' +
            icon('xmark') + '</button>';

        if (action) {
            toastEl.querySelector('.davinci-note-toast__btn').addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                action.run();
            });
        }
        toastEl.querySelector('.davinci-note-toast__close').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            hideToast();
        });

        document.body.appendChild(toastEl);
        // Long on purpose: 3s is enough to see it, not to think about it.
        toastTimer = setTimeout(hideToast, 12000);
    }

    function showUndo(entry) {
        showToast('Note deleted', {
            label: 'Undo',
            icon: 'arrow.uturn.left',
            run: function () { restoreFromTrash(entry); }
        });
    }

    /* ── COPYING THE NOTES OUT ─────────────────────────────────────────────
       A post-it is where a review comment is WRITTEN, but the comment has to
       end up somewhere else — a Quip doc, a ticket, a message. Without this the
       only way out was opening each note and copying it by hand, which is why
       nobody did it.
       The clipboard gets BOTH flavours in one go: `text/html` (a numbered list
       that keeps the bold/colour/size, so a paste into Quip or Mail arrives
       formatted) and `text/plain` derived from the same content by the browser.
       ⚠️ Done with a selection + execCommand('copy') rather than
       navigator.clipboard.write: the async API needs a SECURE context, and
       prototypes are opened from file:// as often as from localhost — there it
       silently does nothing. A selection copy works in both, and carries the
       rich flavour for free because the browser reads the rendered HTML. */

    function htmlToText(html) {
        var d = document.createElement('div');
        d.innerHTML = html || '';
        // <br> and list/block boundaries have to become real newlines, or the
        // plain flavour arrives as one run-on line.
        Array.prototype.forEach.call(d.querySelectorAll('br'), function (br) {
            br.parentNode.replaceChild(document.createTextNode('\n'), br);
        });
        // 🐞 The list needs a break BEFORE it too, not only after each item:
        // without this the first bullet welded itself to the line above
        // ("com segunda linha- item um").
        Array.prototype.forEach.call(d.querySelectorAll('ul, ol'), function (l) {
            l.insertBefore(document.createTextNode('\n'), l.firstChild);
        });
        Array.prototype.forEach.call(d.querySelectorAll('li'), function (li) {
            li.insertBefore(document.createTextNode('- '), li.firstChild);
            li.appendChild(document.createTextNode('\n'));
        });
        Array.prototype.forEach.call(d.querySelectorAll('p, div'), function (b) {
            b.appendChild(document.createTextNode('\n'));
        });
        return (d.textContent || '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /* Reading order, not creation order: notes are dropped freely on the page,
       so two sitting side by side are almost never on the same exact pixel. A
       40px band groups them into rows the way the eye does, then it is
       left-to-right inside the row. */
    function readingOrder(a, b) {
        var ra = Math.round(a.top / 40), rb = Math.round(b.top / 40);
        return ra !== rb ? ra - rb : a.left - b.left;
    }

    function collectPage() {
        var out = [];
        /* Every note ON THE PAGE, including any hidden by a tab context — NOT
           only the visible ones. The export is about the page, not the viewport,
           and silently dropping a note is worse than including one you happen
           not to be looking at; the toast reports the count, so a mismatch with
           what's on screen is noticeable. (The BUTTON is gated on notes EXISTING
           — see notesInContext() — not on their being shown, so Copy stays put
           with notes toggled off. That gate decides whether you can ask, not what
           the answer contains.) */
        Array.prototype.forEach.call(document.querySelectorAll('.annotation-note'), function (note) {
            var rich = note.querySelector('.davinci-note-rich');
            var ta = note.querySelector('.annotation-note__textarea');
            var html = rich ? rich.innerHTML : '';
            var text = htmlToText(html) || (ta ? ta.value : '');
            if (!text.trim()) return;                 // an empty note carries nothing
            out.push({
                color: colorOf(note),
                html: html,
                text: text.trim(),
                top: parseFloat(note.style.top) || 0,
                left: parseFloat(note.style.left) || 0
            });
        });
        return out.sort(readingOrder);
    }

    /* Notes on the OTHER pages of the prototype, read straight from storage —
       the canvas key holds the plain text, the sidecar the rich HTML and the
       colour. Positions are unknown-but-stored, so ordering still works. */
    function collectOtherPages() {
        var here = window.location.pathname;
        var pages = [];
        try {
            for (var i = 0; i < window.localStorage.length; i++) {
                var k = window.localStorage.key(i);
                // `<prefix>-annotations-<pathname>-<context>`; the context is the
                // last segment, so the path is everything before the final dash.
                var m = k && k.match(/^.*-annotations-(\/.*)-[^-]*$/);
                if (!m) continue;                     // also skips the toggle-state key
                var path = m[1];
                if (path === here) continue;
                var raw = [];
                try { raw = JSON.parse(window.localStorage.getItem(k)) || []; } catch (e) { raw = []; }
                if (!raw.length) continue;
                var side = {};
                try { side = JSON.parse(window.localStorage.getItem('davinci:notes-plus:' + path)) || {}; }
                catch (e) { side = {}; }
                var notes = raw.map(function (n) {
                    var extra = side[n.id] || {};
                    var html = typeof extra.html === 'string' ? extra.html : null;
                    return {
                        color: extra.color || 'yellow',
                        html: html !== null ? html : escapeText(n.text || ''),
                        text: (html !== null ? htmlToText(html) : (n.text || '')).trim(),
                        top: parseFloat(n.top) || 0,
                        left: parseFloat(n.left) || 0
                    };
                }).filter(function (n) { return !!n.text; }).sort(readingOrder);
                if (notes.length) pages.push({ page: path, notes: notes });
            }
        } catch (e) { /* storage unavailable — current page still copies */ }
        return pages.sort(function (a, b) { return a.page < b.page ? -1 : 1; });
    }

    function escapeText(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function countNotes(sections) {
        return sections.reduce(function (n, s) { return n + s.notes.length; }, 0);
    }

    function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }

    /* The colour label is emitted only for green/orange/red. Yellow is the
       DEFAULT — a note nobody classified — so tagging it would put "[Yellow]"
       in front of most lines and say nothing. */
    function tagFor(color) { return color === 'yellow' ? '' : '[' + COLOR_TITLES[color] + '] '; }

    function buildPayload(sections) {
        var stamp = new Date().toISOString().slice(0, 10);
        var text = [], html = [];
        var multi = sections.length > 1;

        sections.forEach(function (s) {
            var heading = (s.title || s.page) + (multi ? '  (' + s.page + ')' : '');
            text.push('Notes — ' + heading);
            text.push(s.url || s.page);
            text.push(stamp, '');
            html.push('<p><strong>Notes — ' + escapeText(heading) + '</strong><br>' +
                      '<span style="color:#86868b">' + escapeText(s.url || s.page) + ' · ' + stamp + '</span></p>');
            html.push('<ol>');
            s.notes.forEach(function (n, i) {
                var tag = tagFor(n.color);
                // Continuation lines are indented so a multi-line note stays
                // visibly attached to its number in the plain flavour.
                text.push((i + 1) + '. ' + tag + n.text.replace(/\n/g, '\n   '));
                text.push('');
                html.push('<li>' + (tag ? '<strong>' + escapeText(tag.trim()) + '</strong> ' : '') + n.html + '</li>');
            });
            html.push('</ol>');
        });

        return { text: text.join('\n').replace(/\n{3,}/g, '\n\n').trim(), html: html.join('') };
    }

    function currentSection() {
        return {
            page: window.location.pathname,
            title: document.title || window.location.pathname,
            url: window.location.href,
            notes: collectPage()
        };
    }

    /* Copy via a selection over an off-screen render of the HTML.
       ⚠️ Off-screen, NOT display:none — a hidden element has no selectable
       content, so the copy would come back empty. And the caller's own
       selection is saved and put back: copying must not eat the text you had
       highlighted in a note. */
    function copyRich(payload) {
        var holder = document.createElement('div');
        holder.setAttribute('style', 'position:fixed;left:-9999px;top:0;width:60rem;white-space:pre-wrap;');
        holder.innerHTML = payload.html;
        document.body.appendChild(holder);

        var ok = false, sel = null, saved = null;
        try {
            sel = window.getSelection();
            saved = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
            var range = document.createRange();
            range.selectNodeContents(holder);
            sel.removeAllRanges();
            sel.addRange(range);
            ok = document.execCommand('copy');
        } catch (e) { ok = false; }

        try {
            if (sel) {
                sel.removeAllRanges();
                if (saved) sel.addRange(saved);
            }
        } catch (e) { /* nothing to restore */ }
        holder.remove();

        // Last resort: plain text only, and async, so it can't be reported on.
        if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(payload.text);
            ok = true;
        }
        return ok;
    }

    function copyEverything() {
        var sections = [currentSection()].concat(collectOtherPages());
        sections = sections.filter(function (s) { return s.notes.length; });
        var total = countNotes(sections);
        if (!total) { showToast('No notes to copy'); return 0; }
        var ok = copyRich(buildPayload(sections));
        showToast(ok ? plural(total) + ' copied from ' + sections.length + ' pages'
                     : 'Could not copy — try NotesPlus.text() in the console');
        return ok ? total : 0;
    }

    function copyThisPage() {
        var section = currentSection();
        if (!section.notes.length) { showToast('No notes to copy'); return 0; }
        if (!copyRich(buildPayload([section]))) {
            showToast('Could not copy — try NotesPlus.text() in the console');
            return 0;
        }
        var elsewhere = countNotes(collectOtherPages());
        showToast(plural(section.notes.length) + ' copied', elsewhere ? {
            // Offered only when there IS more elsewhere — the all-pages path
            // surfaces exactly when it becomes relevant, so it needs no button
            // of its own in the ribbon.
            label: 'Copy all (' + (section.notes.length + elsewhere) + ')',
            icon: 'doc.on.doc',
            run: copyEverything
        } : null);
        return section.notes.length;
    }

    /* ── RIBBON CONTROLS: EYE + COPY FOLLOW THE NOTES ──────────────────────
       Both live in the notes group after Add Note, and both hide when the page
       has no notes for the current context — the group shrinks to its label and
       the plus, which is all you can do with no notes anyway.
       Both use the SAME gate, notesInContext(): a note that EXISTS here, shown or
       hidden. Copy in particular does not care whether notes are on screen — it
       reads them from the DOM and storage regardless, so a review can copy notes
       out with them toggled off, and the control has to still be there to click.
       They differ in ONE way. Copy is a notes-plus-only feature, so its template
       ships it `display:none` and this reveals it. The eye is the CORE show/hide
       toggle (davinci-canvas.js owns its behaviour); it must work even if this
       module never loads, so its template ships it VISIBLE and this only hides it
       when there is nothing to toggle. */

    /* A note EXISTS for the current context, shown or not.
       Reads inline display, NOT visibility: a note hidden by the Show Notes toggle
       carries the `annotation-note--hidden` CLASS and still counts (you can copy
       it, and you need the eye to bring it back), while a note in another tab
       context carries an inline display:none and does not (it belongs to a tab
       we're not on). Rects would conflate the two — both are display:none — and
       would also hide both controls the instant notes are toggled off, which is
       exactly when Copy must stay and the eye must stay. */
    function notesInContext() {
        var notes = document.querySelectorAll('.annotation-note');
        for (var i = 0; i < notes.length; i++) {
            if (notes[i].style.display !== 'none') return true;
        }
        return false;
    }

    /* The template ships Copy with `display: none` so a workspace where this
       module never loads is left with no dead control. That means showing it has
       to name a real display value — clearing the inline style would fall back to
       the stylesheet, which knows nothing about note presence. */
    function syncCopyButton() {
        var btn = document.getElementById('davinci-note-copy');
        if (btn) btn.style.display = notesInContext() ? 'inline-flex' : 'none';
    }

    function syncVisibilityButton() {
        var toggle = document.getElementById('hideNotesToggle');
        var ctrl = toggle && toggle.closest('.davinci-note-visibility');
        if (ctrl) ctrl.style.display = notesInContext() ? 'inline-flex' : 'none';
    }

    function syncNoteControls() {
        syncVisibilityButton();
        syncCopyButton();
    }

    /* The controls are authored in the ribbon template (parts/header.html), inside
       the same `features.notes` block as Add Note — so there is nothing to inject
       and nothing to wait for. This only binds behaviour to them. */
    function wireNoteControls() {
        var btn = document.getElementById('davinci-note-copy');
        if (btn && !btn.getAttribute('data-notes-plus-watched')) {
            btn.setAttribute('data-notes-plus-watched', '1');
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                copyThisPage();
            });
        }

        /* Flipping Show Notes changes nothing the <body> childList observer can
           see (the canvas only adds a class to each note) and the canvas fires
           no event of its own, so the toggle is listened to directly. The extra
           pass on a task boundary is insurance only: init() runs after
           initializeAnnotationSystem, so the canvas's own handler is registered
           first and has already applied the class by the time ours measures. */
        var toggle = document.getElementById('hideNotesToggle');
        if (toggle && !toggle.getAttribute('data-notes-plus-watched')) {
            toggle.setAttribute('data-notes-plus-watched', '1');
            toggle.addEventListener('change', function () {
                syncNoteControls();
                setTimeout(syncNoteControls, 0);
            });
        }

        /* ── ADD NOTE TURNS SHOW NOTES BACK ON ─────────────────────────────
           Adding a note with the switch off left the ribbon lying: the canvas
           applies `annotation-note--hidden` on toggle CHANGE and at load, never
           on create, so the new note appeared on the page while the switch still
           read "off" — and the copy button, which trusts the switch, stayed
           hidden next to a note you could plainly see.
           So the GESTURE owns the state: asking for a note means wanting to see
           notes. Bound to the button rather than to the note appearing, because
           a note restored from storage at load must NOT override the saved
           preference — only the click does.
           `change` is dispatched, not just `.checked` set, so the canvas unhides
           the notes it already has and persists the new state through its own
           handler. */
        var add = document.getElementById('addNoteBtn');
        if (add && !add.getAttribute('data-notes-plus-watched')) {
            add.setAttribute('data-notes-plus-watched', '1');
            add.addEventListener('click', function () {
                // Mark the note the canvas is about to create so adopt() raises it above
                // every existing note. Set BEFORE the toggle early-return below, and cleared
                // by adopt(); the canvas appends the note synchronously in its own click
                // handler, so the flag is already set when the observer's sweep adopts it.
                pendingNewNote = true;
                var t = document.getElementById('hideNotesToggle');
                if (!t || t.checked) return;
                t.checked = true;
                t.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        syncNoteControls();
    }


    /* ── INIT ──────────────────────────────────────────────────────────── */

    var started = false;

    function init() {
        if (started || !document.body) return;
        started = true;

        sweep();
        new MutationObserver(sweep).observe(document.body, { childList: true });

        /* The ribbon template has already rendered by the time the canvas calls
           this, so the controls are simply there to bind. The late pass covers the
           notes-hidden class the canvas applies in a setTimeout(…, 100). */
        wireNoteControls();
        setTimeout(syncNoteControls, 1500);

        // Hand the canvas our delete guard. It calls this from its own remove
        // handler and stands down while the question is on screen.
        if (window.DaVinciNotes) window.DaVinciNotes.confirmRemove = askDelete;

        // One listener for every note: keeps the bar's active states honest as
        // the caret moves (⌘B with no toolbar click included) AND remembers the
        // live range, which is what lets a command restore the selection if
        // anything steals focus before the click lands (see ensureSelection).
        document.addEventListener('selectionchange', function () {
            var sel = window.getSelection && window.getSelection();
            var node = sel && sel.anchorNode;
            var el = node ? (node.nodeType === 1 ? node : node.parentNode) : null;
            var rich = el && el.closest ? el.closest('.davinci-note-rich') : null;
            if (!rich) return;
            syncBar(rich.closest('.annotation-note'));
            try {
                if (sel.rangeCount) rememberRange(rich, sel.getRangeAt(0).cloneRange());
            } catch (e) { /* nothing to remember */ }
        });

        // CAPTURE phase: every control inside a note cancels propagation to keep
        // the canvas from dragging the note, so a bubble-phase listener here
        // would never see the click that should dismiss an open dropdown.
        document.addEventListener('mousedown', function (e) {
            if (!e.target.closest || !e.target.closest('.davinci-note-menu')) closeAllPops();
        }, true);

        /* Raise the note being touched. CAPTURE on `mousedown`, for two reasons:
           the note's own children stop propagation (so a bubble listener would
           miss a click on the text, a swatch or the resize grip — the very
           moments you need the note on top), and mousedown fires BEFORE the drag
           starts, so a note dragged from under another comes up as it moves
           rather than after it lands. */
        document.addEventListener('mousedown', function (e) {
            var note = e.target && e.target.closest && e.target.closest('.annotation-note');
            if (note && note.getAttribute('data-notes-plus')) bringToFront(note);
        }, true);

        /* Keyboard-only path: tabbing into a note's text or pressing a shortcut
           must raise it too, or a note focused without the mouse stays buried. */
        document.addEventListener('focusin', function (e) {
            var note = e.target && e.target.closest && e.target.closest('.annotation-note');
            if (note && note.getAttribute('data-notes-plus')) bringToFront(note);
        });

        /* ── RE-ANCHOR AFTER A DRAG ────────────────────────────────────────
           The canvas owns the drag itself (it writes left/top on mousemove) and
           its `hasDragged` flag is closure-private, so the move is detected the
           only way available from out here: compare the note's position at
           mousedown with its position at mouseup. Anything else — a click on the
           text, a swatch, the resize grip — leaves it unchanged and re-anchoring
           is skipped, which matters because re-anchoring writes to storage. */
        var dragFrom = null;
        document.addEventListener('mousedown', function (e) {
            var note = e.target && e.target.closest && e.target.closest('.annotation-note');
            dragFrom = (note && note.getAttribute('data-notes-plus'))
                ? { note: note, left: note.style.left, top: note.style.top }
                : null;
        }, true);

        document.addEventListener('mouseup', function () {
            var d = dragFrom;
            dragFrom = null;
            if (!d || !d.note.isConnected) return;
            if (d.note.style.left === d.left && d.note.style.top === d.top) return;  // not a move
            reanchor(d.note);
        }, true);

        /* Re-place every note when the page geometry changes. `scroll` in the
           CAPTURE phase so a note anchored inside a scrolling container (a table
           body) follows it too — a scroll event from a nested element does not
           bubble. Coalesced through rAF in placeAll(), because both of these
           fire in bursts. */
        window.addEventListener('resize', placeAll);
        window.addEventListener('scroll', placeAll, true);

        /* The content a note anchors to may appear at any of these moments. */
        document.addEventListener('davinci:canvas:ready', settleAnchors);
        window.addEventListener('load', settleAnchors);
        setTimeout(settleAnchors, 400);
        setTimeout(settleAnchors, 1500);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllPops();
        }, true);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var open = document.querySelector('.davinci-note-confirm');
            if (open) closeConfirm(open.closest('.annotation-note'));
            // Esc also dismisses the Undo toast — the keyboard way out of it.
            hideToast();
        }, true);
    }

    window.NotesPlus = {
        init: init,
        refresh: sweep,
        colors: COLORS,
        /* What each note is pinned to, and whether it resolves right now — the
           first thing to look at when a note does not follow a resize.
           `anchor: null` + `waiting: true` means it is still on raw pixels. */
        anchors: function () {
            return Array.prototype.map.call(
                document.querySelectorAll('.annotation-note[data-notes-plus]'), function (n) {
                    var a = n.__dvNoteAnchor;
                    return {
                        id: n.id,
                        anchor: a ? a.sel : null,
                        resolves: a ? !!resolveAnchor(a.sel) : false,
                        offset: a ? [a.adx, a.ady] : null,
                        anchorSize: a ? [a.aw, a.ah] : null,
                        waiting: !!n.__dvNoteNeedsAnchor,
                        text: ((n.querySelector('.davinci-note-rich') || {}).textContent || '')
                                .trim().slice(0, 40)
                    };
                });
        },
        /* Re-derive every anchor from where the notes sit right now. The way out
           when a note is pinned to something unhelpful: place them, run this. */
        reanchorAll: function () {
            Array.prototype.forEach.call(
                document.querySelectorAll('.annotation-note[data-notes-plus]'), reanchor);
            return this.anchors();
        },
        /* Programmatic recolour, mostly for the console: NotesPlus.setColor('note-…', 'red') */
        setColor: function (noteId, color) {
            var note = document.getElementById(noteId);
            if (note) setColor(note, color);
        },
        /* Open/close a panel from code: NotesPlus.panel('note-…', 'bar', true) */
        panel: function (noteId, which, open) {
            var note = document.getElementById(noteId);
            if (note && PANEL_CLASS[which]) setPanel(note, which, open, true);
        },
        /* ── COPYING THE NOTES OUT ──────────────────────────────────────────
           The ribbon's **Copy Notes** button is `copy()`. The rest is for the
           console:
             NotesPlus.copy()      → this page → clipboard (rich + plain)
             NotesPlus.copyAll()   → every page that has notes
             NotesPlus.text()      → the plain-text version, RETURNED not
                                     copied, so it can be inspected or piped
             NotesPlus.notes()     → the raw list (colour, text, position) */
        copy: copyThisPage,
        copyAll: copyEverything,
        text: function (all) {
            var sections = all ? [currentSection()].concat(collectOtherPages()) : [currentSection()];
            return buildPayload(sections.filter(function (s) { return s.notes.length; })).text;
        },
        notes: function (all) {
            return all ? [currentSection()].concat(collectOtherPages()) : currentSection().notes;
        },
        /* ── RECOVERING A DELETED NOTE ──────────────────────────────────────
           The Undo toast covers the moment after a delete; these two cover
           "an hour later", from the console:
             NotesPlus.trash()            → the last 10 deleted notes, newest
                                            first: page, date and text
             NotesPlus.restore()          → put the most recent one back
             NotesPlus.restore(2)         → by position in that list
             NotesPlus.restore('note-…')  → by id
           A note restored onto the page you are looking at reappears in place;
           one from another page is written into that page's storage. */
        trash: function () {
            return readTrash().map(function (t, i) {
                return {
                    index: i, id: t.id, page: t.page, deletedAt: t.deletedAt,
                    text: (t.text || '').replace(/\s+/g, ' ').slice(0, 120)
                };
            });
        },
        restore: function (which) {
            var list = readTrash();
            if (!list.length) return 'the bin is empty';
            var entry = null;
            if (which == null) entry = list[0];
            else if (typeof which === 'number') entry = list[which];
            else entry = list.filter(function (t) { return t.id === which; })[0];
            if (!entry) return 'not in the bin — run NotesPlus.trash() to see what is';
            var out = restoreFromTrash(entry);
            if (out === 'restored-elsewhere') return 'restored on ' + entry.page + ' — open that page to see it';
            return out ? true : 'could not restore: the canvas storage key for that page is unknown';
        }
    };

    /* No self-start: davinci-canvas.js calls NotesPlus.init() right after
       initializeAnnotationSystem(), so adoption runs against notes that already
       exist and the ribbon is already on the page. Starting on DOMContentLoaded
       would race both. */
})();
