/* live-editor-system.js — Canvas feature module (CSS: live-editor-system.css) */
/* ============================================================ */
/**
 * LIVE EDITOR v1.0 — Sketch-Measure-style spec inspector + in-place style
 * editor (DEV TOOL).
 *
 * ── ORIGIN ─────────────────────────────────────────────────────────────────
 * THIS FILE IS THE CANONICAL COPY. The Live Editor is a DaVinci Canvas feature;
 * edit it here, and it reaches every workspace through the marketplace like the
 * rest of the canvas runtime.
 *
 * It began as a workspace plugin component in the VMT prototype workspace
 * (Venturus-UIUX/vmt-davinci — plugins/plugins.js `proj-live-editor` section,
 * plugins/proj-live-editor.css, plugins/proj-live-editor-icons.js), which was the
 * reference implementation for the initial port. That copy is now HISTORY, not
 * upstream: VMT consumes this one, so nothing flows back the other way and there
 * is no sync to maintain. If a fix is needed, it belongs here.
 *
 * What changed in the port, for anyone comparing against that original:
 *   · the ribbon button is rendered by parts/header.html and bound by
 *     bindRibbonButton(), not injected next to #changeHistoryBtn
 *   · the glyph picker writes an <sf-symbol> `name` (DaVinci has no mask-image
 *     icons and no local SVG directory) — see openGlyphPicker/applyAttr
 *   · iconTargets() skips <sf-symbol> internals (insideSfSymbol)
 *   · workspace-specific couplings dropped: table column resizing via a global
 *     table component, a bespoke tooltip runtime (now a native `title`), and the
 *     packaged offline/ bundle branch in the export prompt
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Design-system agnostic: pick any element on a prototype to
 * see a devtools-style box-model overlay + a specs panel with computed colors,
 * spacing, and typography RESOLVED BACK to the project's CSS custom-property
 * tokens (e.g. `#F56300` → `--color-fill-orange`, `16px` → `--space-mp`), plus
 * the icon name for `<sf-symbol>` / legacy `<img>` icons. Click any value to
 * copy it.
 *
 * Toggle: a discreet "Live Editor" button in the DaVinci ribbon (left of
 * "Change History", when that one is present) or ⌘I (same shortcut opens and closes).
 *
 * SELECTION works like a browser inspector. The panel opens INERT: the prototype
 * behaves normally and hovering does nothing. Arm the CROSSHAIR in the panel header
 * and the pointer becomes a picker — hover outlines the element under it, a click
 * SELECTS it and fills the panel, and the crosshair disarms so clicks go back to the
 * prototype. PIN it — the button beside it — to stay armed and walk several elements;
 * the two are one compound control, so pinning arms and disarming unpins. HOLDING
 * Option is the momentary version: it arms the crosshair if it's off and holds it on
 * through a pick, and does nothing once the pin is already on. That makes ⌥+click the
 * one-off shortcut too — arm, pick, disarm, in one gesture, with the hover outline
 * showing what you are about to get. There is deliberately no second gesture for
 * picking (⇧+click was one, and it had no hover preview). Esc disarms without dropping
 * the selection. Hover never fills the panel: it only moves the outline, so the specs
 * you are reading never change under you.
 *
 * To MEASURE, select an element and HOLD Control: gap-distance lines are drawn from
 * that selection to whatever the pointer is over (Sketch-Measure style), and hover is
 * tracked for the duration even with the crosshair off. Release to clear.
 * The panel states what the pointer will do right now in its view bar, so the mode is
 * never something you have to remember. DaVinci's own chrome is never a
 * target — the preview ribbon, annotation notes, the change-history drawer and the
 * info modal are skipped (see isCanvasChrome), while the navbar/subheader/footer stay
 * inspectable because those are the design system's components.
 *
 * The panel is KEYBOARD-OPERABLE once something is selected. Each editable value is a
 * span that only swaps for a real <input> when you activate it, so the spans are the
 * tab stops: Tab/⇧Tab walks the fields in order (Padding T→R→B→L and so on, opening
 * each as it arrives), Enter opens a closed one and commits an open one, Escape
 * reverts the edit in progress. See markTabStops / stepFromInlineEdit.
 *
 * The specs panel is draggable + minimizable and stays interactive while picking
 * (it is opaque to the inspector, so hovering the panel hovers nothing rather than
 * highlighting whatever sits beneath it); its ✕ turns the Live Editor off. MINIMIZED
 * it collapses to a compact strip of its own controls — no title, no body — and
 * picking an element from there opens it straight back up, since a pick you can't
 * read is a pick that looks like it failed. A dock
 * button (right of minimize) pins the panel as a full-height right sidebar that
 * pushes the canvas content left instead of floating; docked is the DEFAULT for
 * first-time users, and the dock-vs-float choice is saved in localStorage (per
 * user, across all prototypes). Esc exits
 * picking / closes.
 * Public API: window.DaVinciLiveEditor (alias window.DvLiveEditor) —
 * { bindRibbonButton, toggle, start, stop, select, close, rulers, clearGuides }.
 *
 * Self-bootstrapping (does not rely on `davinci:canvas:ready`). The canvas loads this
 * pair — live-editor-system.js + live-editor-system.css — through loadResource() in
 * davinci-canvas.js, gated on the ribbon's `features.liveEditor` flag; the ribbon
 * button itself is markup in parts/header.html, adopted here by bindRibbonButton().
 */
(function () {
    'use strict';

    // Where this bundle lives, captured while the script is still executing —
    // the Glyph picker needs it to lazy-load its name index and to build glyph
    // previews without any project path hardcoded (see loadIconIndex/iconsDir).
    var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';

    var picking = false;
    var selected = null;
    var distAnchor = null;
    var hovered = null;
    var ancestorsLine = null; // the Ancestors row's fixed element line (deepest-first),
                            // anchored the first time a render's element doesn't
                            // already sit on it. Reused as-is (never recomputed)
                            // for as long as the displayed element stays somewhere
                            // on that same line — climbing to an ancestor or coming
                            // back down to a prior point never drops anything.
                            // Reset to null to force a fresh anchor: a fresh pick
                            // (onClick), Clear selection, or Esc-to-clear.
    var lastAncestorChain = []; // ancestor elements for the currently rendered
                                  // panel, selected-first (el...html) — data-ancestor-index
                                  // in the Ancestors row indexes into this array, since
                                  // DOM elements can't round-trip through a data attr
    var ancestorsOpen = false;      // Ancestors tree expanded? The collapsed Ancestors row is a
                                  // button showing just the current element + level
                                  // count; opening it reveals the whole line as a
                                  // devtools-style tree (<html> first, indented down
                                  // to the origin). Survives re-renders since
                                  // ancestorChainHtml reads it on every render.
    var pickPointerStyleEl = null; // scoped stylesheet that forces pointer-events
                                    // back on everywhere while picking — some canvas/
                                    // prototype chrome (e.g. navbar placeholder controls,
                                    // dividers) sets pointer-events:none, which makes
                                    // elementsFromPoint skip right over them no matter how
                                    // precisely the cursor lands. Only active while picking.
    var ui = null;
    var tokenMaps = null;
    var rafPending = false;
    var rafEl = null;
    var dragging = false;
    var docked = false;       // docked = pinned as a right sidebar (vs floating);
                              // preference persists per user across all prototypes
    var DOCK_KEY = 'davinci:live-editor-dock';
    // The whole box model — margin ring, border tint, dashed content/padding outlines,
    // WxH badge — behind the SIZE group's "Bounding box" switch.
    //
    // ALWAYS starts OFF, and deliberately NOT persisted, unlike dock/rulers/position.
    // It was remembered at first, which meant turning it on once left every later
    // session opening with the box drawn over everything hovered — indistinguishable
    // from it being the default. It's a "let me look at the spacing on this one thing"
    // mode, not a standing preference, so it resets with the session.
    var showGuides = false;
    var RATIO_KEY = 'davinci:live-editor-ratio-lock';
    // ── Inspect mode (the crosshair) ──
    // The tool opens INERT: hover does nothing and clicks reach the prototype as
    // usual, so opening the panel never gets in the way of driving the prototype.
    // Arming inspect mode — the crosshair button, or holding ⌥ — is what
    // turns the pointer into a picker: hover outlines whatever is under it, and a
    // click SELECTS that element and fills the panel. Same model as a browser
    // inspector.
    //
    // Hover deliberately does NOT fill the panel any more. A panel that re-rendered
    // on every mousemove never held still long enough to read, and it left "which
    // element am I actually editing?" ambiguous. Now the panel only ever shows the
    // SELECTED element, which is also why this file no longer needs a "freeze"
    // concept: there is nothing for hover to disturb.
    var inspecting = false;
    // Sticky arming. Unpinned, a click selects and disarms — right for "just show me
    // this one thing". Pinned, the crosshair stays armed so several elements can be
    // walked in a row. Toggled by the pin button next to the crosshair, and forced on
    // for as long as Option/Alt is HELD (see onKey), a momentary override that
    // replaces the old Ctrl-tap freeze — a gesture nobody guessed at. Control is the
    // MEASURE key now, not this one.
    // NOT persisted, unlike the tool's other preferences: the pin can't be on
    // without the crosshair being armed (they are one compound control), and arming
    // deliberately resets every time the tool opens so the prototype is usable
    // straight away. A remembered pin would therefore restore as a lit pin over a
    // dark crosshair — a state the pair is defined not to have.
    var inspectPinned = false;
    var altHeldPin = false;      // Option/Alt is down: acting as a momentary pin
    var altArmedByHold = false;  // ...and it was that hold which ARMED the crosshair,
                                 // so releasing has to disarm again
    var measuring = false;       // Control is down: hover measures against the selection
    // Where a FLOATING panel was left, and whether it was minimized. Both are
    // per-user across prototypes like the dock choice. Position is stored in
    // viewport coords and re-clamped on load, because the window it was saved from
    // may have been larger — an unclamped restore can drop the panel (and its drag
    // handle) off-screen with no way back.
    var POS_KEY = 'davinci:live-editor-panel-pos';
    var MIN_KEY = 'davinci:live-editor-panel-min';
    // ── Rulers (⌃R) ──
    // Sketch-style rulers along the top/left edges that you drag guide lines out
    // of. Fully independent of `showGuides`'s box-model outlines: ruler guides are
    // hidden only by an explicit action (the ruler right-click, or turning the rulers
    // off), never by the bounding-box switch. See applyRulerGuidesVisibility.
    //
    // Guides are stored in DOCUMENT coordinates, not viewport: a viewport-fixed
    // guide slides against the content as you scroll, which is useless for
    // checking an alignment. The layer is translated by the scroll offset on every
    // scroll/resize (see positionRulers) so guides stay pinned to the page.
    var RULERS_KEY = 'davinci:live-editor-rulers';    // on/off
    var RULER_GUIDES_KEY = 'davinci:live-editor-ruler-guides'; // per-prototype guide positions
    var RULER_ESNAP_KEY = 'davinci:live-editor-ruler-element-snap'; // snap-to-elements on/off
    var RULER_SIZE = 20;          // thickness of each ruler strip, in px
    var RULER_SNAP = 4;           // px from an element edge that a drag snaps to it
    var rulersOn = false;
    var rulerGuides = [];         // [{ axis:'x'|'y', pos:<document px> }]
    var rulerDrag = null;         // in-flight create/move; see startGuideDrag
    var rulerHoverIndex = null;   // guide under the pointer, or null — drives the
                                  // neighbour-distance readout
    var hiddenGuides = false;     // explicit hide (ruler right-click → Hide guides),
                                  // as opposed to the panel's Guides switch. Session
                                  // only — deliberately NOT persisted, so a hide
                                  // can't outlive the reload that would explain it.
    var rulerMenu = null;         // open context menu element, or null
    // Snap to ELEMENTS — the edges + centre of whatever element is under the
    // cursor. Persistent (toggled from the ruler's right-click menu) and ON by
    // default: a guide is almost always being placed AGAINST something in the UI,
    // so snapping is the normal case, not the exception. ⌘ while dragging INVERTS
    // it for that one drag — the escape hatch for "this guide goes at 137, not on
    // the edge 3px away", and equally the way to snap once while the toggle is off.
    var elementSnap = true;
    // Dimensions padlock: while on, editing W or H moves the other one too,
    // KEEPING THE ELEMENT'S PROPORTION (the ratio is sampled when the edit
    // opens, not per keystroke — otherwise rounding would drift the shape as
    // you type). Persisted per user like the dock/guides prefs, since it's a
    // working preference, not a property of any element.
    var ratioLock = false;
    var activeEditor = null;      // open color-picker popover (default OR :hover state
                                  // value), or null — color is the only property still
                                  // edited via a floating popover
    var activeEditorTarget = null; // the row/side chip that opened activeEditor — lets
                                  // onDocClickCapture detect "clicked the same chip
                                  // again" and treat it as toggle-close instead of
                                  // close-then-reopen
    var colorSwatchJustBlurred = false; // set on the <input type="color"> swatch's
                                  // blur (its native picker just closed); consumed
                                  // by the very next document click so that click
                                  // dismisses only the native picker, not the
                                  // whole Edit Color popover — see onDocClickCapture
    var activeInlineEdit = null;  // { target, prop, startVal, gen, el } — the one
                                  // row/side currently swapped to an <input> in place
                                  // (devtools-style); `el` is the element it targets
    var pendingFocus = null;      // { key, index, open } — where the keyboard should
                                  // land after the NEXT renderPanel. Every commit
                                  // rebuilds ui.body.innerHTML, so the focused node is
                                  // destroyed mid-interaction; only the keyboard paths
                                  // (Tab/Enter/Escape) queue this, so a mouse commit
                                  // never yanks focus back. See restorePendingFocus.
    // Box → Border's middle chip (border-style) — a closed set of valid CSS
    // border-style keywords, edited via openInlineEdit's 'select' kind.
    var BORDER_STYLE_OPTIONS = 'none,solid,dashed,dotted,double,groove,ridge,inset,outset';
    var STROKE_POS_OPTIONS = 'layout,inside,center,outside';
    // Which of the four the element is currently drawing. An active outline wins
    // (that's what the other three positions are made of) and its offset says
    // which one: 0 → outside, -w → inside, anything between → center.
    function strokePositionOf(cs) {
        var w = parseFloat(cs.outlineWidth) || 0;
        if (!w || !cs.outlineStyle || cs.outlineStyle === 'none') return 'layout';
        var off = parseFloat(cs.outlineOffset) || 0;
        if (off >= -0.5) return 'outside';
        if (off <= -(w - 0.5)) return 'inside';
        return 'center';
    }
    function outlineOffsetFor(pos, w) {
        if (pos === 'inside') return (-w) + 'px';
        if (pos === 'center') return (-w / 2) + 'px';
        return '0px';
    }
    // Moving a stroke between `layout` and the outline-drawn positions. Going to
    // an outline, the element's own border is made TRANSPARENT rather than
    // removed: it keeps occupying exactly the space it did, so nothing reflows,
    // but it stops painting and can't double up with the outline. Coming back,
    // that transparency is dropped and the outline cleared.
    function setStrokePosition(tgt, pos) {
        var cs = getComputedStyle(tgt.el, tgt.pseudo || null);
        var wasOutline = strokePositionOf(cs) !== 'layout';
        var w = wasOutline ? (parseFloat(cs.outlineWidth) || 0) : (parseFloat(cs.borderTopWidth) || 0);
        var style = wasOutline ? cs.outlineStyle : cs.borderTopStyle;
        var color = wasOutline ? cs.outlineColor : cs.borderTopColor;
        if (style === 'none') style = 'solid';
        if (pos === 'layout') {
            ['outlineWidth', 'outlineStyle', 'outlineColor', 'outlineOffset', 'borderColor'].forEach(function (p) {
                tgtWrite(tgt, p, '');
                unlogEdit(tgt.el, p, false, tgt.pseudo);
            });
            if (wasOutline && w > 0) {
                tgtWrite(tgt, 'borderWidth', w + 'px');
                tgtWrite(tgt, 'borderStyle', style);
                tgtWrite(tgt, 'borderColor', color);
                tgtLog(tgt, 'borderWidth', w + 'px', false);
                tgtLog(tgt, 'borderStyle', style, false);
                tgtLog(tgt, 'borderColor', color, false);
            }
            return;
        }
        if (!w) w = 1;
        tgtWrite(tgt, 'outlineWidth', w + 'px');
        tgtWrite(tgt, 'outlineStyle', style);
        tgtWrite(tgt, 'outlineColor', color);
        tgtWrite(tgt, 'outlineOffset', outlineOffsetFor(pos, w));
        tgtLog(tgt, 'outlineWidth', w + 'px', false);
        tgtLog(tgt, 'outlineStyle', style, false);
        tgtLog(tgt, 'outlineColor', color, false);
        tgtLog(tgt, 'outlineOffset', outlineOffsetFor(pos, w), false);
        if (!wasOutline && (parseFloat(cs.borderTopWidth) || 0) > 0) {
            tgtWrite(tgt, 'borderColor', 'transparent');
            tgtLog(tgt, 'borderColor', 'transparent', false);
        }
    }
    // Starter shadow for an element that has none yet (see openInlineEdit), and
    // the bare-number shorthand: typing just "9" in the Shadow row means "a 9px
    // shadow" to a designer, but is not a valid box-shadow to the CSSOM, which
    // drops it without a word. Expand N → `0 Npx (2N)px rgba(0,0,0,0.2)`:
    // downward offset, twice that as blur, a soft neutral tint.
    var SHADOW_TEMPLATE = 'rgba(0, 0, 0, 0.2) 0px 2px 6px 0px';
    function shadowFromNumber(v) {
        var m = /^\s*(-?\d+(?:\.\d+)?)(?:px)?\s*$/.exec(v);
        if (!m) return null;
        var n = parseFloat(m[1]);
        return 'rgba(0, 0, 0, 0.2) 0px ' + n + 'px ' + (n * 2) + 'px 0px';
    }
    var inlineEditGen = 0;        // bumped on every new inline edit so a stale, already
                                  // superseded commit (deferred past a fresh click) can
                                  // detect it's stale and skip re-rendering over it
    var hoverOverrides = null;    // { el, id, props: {prop: value} } — live :hover
                                  // preview for the CURRENT subject only (switching to a
                                  // new element drops the previous one's hover preview)
    var hoverStyleEl = null;      // single injected <style> holding hoverOverrides'
                                  // rule — inline styles can't target :hover, so hover
                                  // edits work by writing a scoped stylesheet rule
    var hoverIdSeq = 0;           // sequence for the data-live-editor-hover-id scoping attr
    var editLog = [];             // { el, selector, text, prop, value, isHover } — every
                                  // live edit made this session, ACROSS elements (not just
                                  // the current subject); feeds the "Copy prompt for Claude"
                                  // footer button. Upserted by (el, prop, isHover); an entry
                                  // is removed when its override is reset/reverted back out.
                                  // Cleared only on an explicit Clear or on closeLiveEditor().
    // CSS-inherited properties the Live Editor edits. Editing a retargeted ANCESTOR
    // (e.g. a <tr> via the Ancestors row) on one of these would otherwise
    // silently do nothing wherever a descendant declares its own value —
    // inheritance loses to ANY rule on the descendant, however weak
    // (e.g. a `table td { color: ... }` rule beats an inherited value from a
    // `<tr>`'s inline style every time). Every other editable prop
    // (backgroundColor, border*, boxShadow, opacity, width/height,
    // padding/margin) is NOT inherited, so an ancestor edit correctly
    // affecting only the ancestor is the right behavior there, not a bug.
    var INHERITED_PROPS = { color: 1, fontSize: 1, fontWeight: 1, lineHeight: 1, fontFamily: 1 };
    var cascadeOverrides = null;  // { el, id, props: {prop: value} } — forces an
                                  // inherited-prop edit on `el` to actually reach
                                  // its descendants, same single-slot-per-subject
                                  // model as hoverOverrides (switching to a new
                                  // subject drops the previous cascade)
    var cascadeStyleEl = null;    // single injected <style> holding cascadeOverrides'
                                  // scoped `[data-live-editor-cascade-id] *` rule
    var cascadeIdSeq = 0;         // sequence for the data-live-editor-cascade-id scoping attr
    // Row-border mirror. In the SEPARATED borders model (`border-collapse:
    // separate`) the CSS spec says borders set on rows,
    // row groups, columns and column groups are IGNORED — the browser never
    // paints them, even though the element really carries the value and
    // getComputedStyle reports it back. So editing a retargeted <tr>'s Border
    // looked completely dead in the UI. Fix: keep writing the inline style on
    // the row (so the panel's display, Reset and edit log all keep working
    // unchanged) and MIRROR it onto that row's CELLS through a scoped
    // stylesheet, which is where a border on a row actually can paint — the
    // same technique hoverOverrides/cascadeOverrides already use.
    var rowBorderTargets = [];    // [{ el, id }] — every row-ish element currently mirroring
    var rowBorderStyleEl = null;  // single injected <style> holding all their rules
    var rowBorderIdSeq = 0;       // sequence for the data-live-editor-rowborder-id attr
    // Column mirror. A table COLUMN is not a DOM element — its cells are spread
    // across separate <tr>s — and even the <col> element only accepts
    // width/background/border/visibility per the CSS spec, so a column can't be
    // a normal element pick. Same idea as the row-border mirror, generalized to
    // EVERY property: the panel subject stays a real representative CELL (so all
    // read/write/reset/overlay sites keep working unchanged), and whatever inline
    // style that cell carries is MIRRORED across every cell in its column through
    // a scoped stylesheet rule. Toggled from the panel's Column row.
    // Scope is a GRID RANGE, not a child index: `start`/`span` are columns of the
    // table's rendered grid (colspan/rowspan resolved — see tableGridMap), so a
    // grouped double header targets the right cells. `headerOnly` restricts the
    // scope to the <thead> band. See columnScopeOptions for how the level is picked.
    var colScope = null;          // { table, id, cell, start, span, headerOnly, kind, label } | null
    var colStyleEl = null;        // single injected <style> holding the column rule
    var colIdSeq = 0;             // sequence for the data-live-editor-col-id attr
    var lastIconTargets = [];     // icon TARGETS the Icons section's rows edit, in
                                  // render order — each { el, pseudo } where pseudo is
                                  // null for a real child element or '::before'/'::after'
                                  // for a pseudo-element glyph. data-icon-target indexes
                                  // into it (see editTargetFrom; same round-trip problem
                                  // as lastAncestorChain, DOM nodes can't ride a data attr)
    // Pseudo-element overrides. Half the icon buttons in this project draw their
    // glyph with `::before { content:''; mask: url(...) }` on the BUTTON — there is
    // no child element at all (compare prototypes/es-individuals, which uses a
    // real <span>). A pseudo-element has no `.style`, so an edit to it can only
    // be expressed as a stylesheet rule: same scoped-rule technique as
    // hoverOverrides/cascadeOverrides, keyed by data-live-editor-pseudo-id.
    var pseudoOverrides = [];     // [{ el, id, pseudo, props: {prop: value} }]
    var pseudoStyleEl = null;     // single injected <style> holding all their rules
    var pseudoIdSeq = 0;          // sequence for the data-live-editor-pseudo-id attr

    // ── helpers ──────────────────────────────────────────────
    function f(v) { return parseFloat(v) || 0; }
    function px(v) { return (Math.round(v * 100) / 100) + 'px'; }
    function round2(n) { return Math.round(n * 100) / 100; }
    function kebab(p) { return p.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // The element the panel is showing: the selection, and nothing else —
    // never the live-tracking hover, since that would make edits jump between
    // elements as the mouse moves. Editing is unavailable during plain hover.
    function editSubject() { return selected; }
    // Most editable rows write to the panel's subject. The Icons section is the
    // exception: its rows edit an icon that is PART of the subject — a child
    // element (a button's glyph span, its 8.5px active dot, both nearly
    // impossible to hit with the pointer) or a `::before`/`::after` pseudo
    // element (no node to hit at all). Each icon group carries
    // data-icon-target, so a click inside it resolves to that icon instead.
    // Returns a TARGET: { el, pseudo } — pseudo null means "the element itself".
    // The panel keeps showing the subject either way (see `panelEl` in the
    // editors): you're editing a part of what you selected, not retargeting.
    function editTargetFrom(node) {
        var grp = node && node.closest ? node.closest('[data-icon-target]') : null;
        if (grp) {
            var t = lastIconTargets[parseInt(grp.getAttribute('data-icon-target'), 10)];
            if (t && document.contains(t.el)) return t;
        }
        var subj = editSubject();
        return subj ? { el: subj, pseudo: null } : null;
    }
    // ── pseudo-element writes ────────────────────────────────
    function ensurePseudoStyleEl() {
        if (pseudoStyleEl) return pseudoStyleEl;
        pseudoStyleEl = document.createElement('style');
        pseudoStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(pseudoStyleEl);
        return pseudoStyleEl;
    }
    function rewritePseudoStyle() {
        pseudoOverrides = pseudoOverrides.filter(function (o) {
            return document.contains(o.el) && Object.keys(o.props).length;
        });
        ensurePseudoStyleEl().textContent = pseudoOverrides.map(function (o) {
            var decls = Object.keys(o.props).map(function (p) {
                return kebab(p) + ': ' + o.props[p] + ' !important;';
            }).join(' ');
            return '[data-live-editor-pseudo-id="' + o.id + '"]' + o.pseudo + ' { ' + decls + ' }';
        }).join('\n');
    }
    function pseudoRecord(el, pseudo, create) {
        for (var i = 0; i < pseudoOverrides.length; i++) {
            if (pseudoOverrides[i].el === el && pseudoOverrides[i].pseudo === pseudo) return pseudoOverrides[i];
        }
        if (!create) return null;
        if (!el.hasAttribute('data-live-editor-pseudo-id')) {
            el.setAttribute('data-live-editor-pseudo-id', 'p' + (++pseudoIdSeq));
        }
        var rec = { el: el, id: el.getAttribute('data-live-editor-pseudo-id'), pseudo: pseudo, props: {} };
        pseudoOverrides.push(rec);
        return rec;
    }
    function setPseudoStyleProp(el, pseudo, prop, value) {
        var rec = pseudoRecord(el, pseudo, true);
        if (value) rec.props[prop] = value;
        else delete rec.props[prop];
        rewritePseudoStyle();
    }
    function clearPseudoOverrides() {
        pseudoOverrides.length = 0;
        if (pseudoStyleEl) pseudoStyleEl.textContent = '';
    }
    // ── target-aware read/write (element OR pseudo-element) ──
    // The editors used to assume the write target is an element with a `.style`.
    // These four keep that path byte-identical while letting a pseudo target use
    // its scoped rule instead.
    function tgtComputed(t, prop) { return getComputedStyle(t.el, t.pseudo || null)[prop]; }
    // The current OVERRIDE (what this session set), which is also what makes a
    // row's label light up as edited and what Escape restores.
    function tgtOverride(t, prop) {
        if (!t.pseudo) return t.el.style[prop] || '';
        var rec = pseudoRecord(t.el, t.pseudo, false);
        return (rec && rec.props[prop]) || '';
    }
    function tgtWrite(t, prop, value) {
        if (t.pseudo) setPseudoStyleProp(t.el, t.pseudo, prop, value);
        else commitStyleProp(t.el, prop, value);
    }
    function tgtLog(t, prop, value, isHover) {
        logEdit(t.el, prop, value, isHover, t.pseudo);
    }

    // ── token resolution (computed values → CSS custom-property names) ──
    function eachRule(rules, cb) {
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (r.type === 1) { cb(r); }                                   // STYLE_RULE
            else if (r.type === 3 && r.styleSheet) {                       // IMPORT_RULE
                try { eachRule(r.styleSheet.cssRules, cb); } catch (e) {}
            } else if (r.cssRules) {                                       // media/supports groups
                try { eachRule(r.cssRules, cb); } catch (e) {}
            }
        }
    }
    function parseColorToRgb(v) {
        if (!v) return null;
        v = v.trim();
        if (v.charAt(0) === '#') {
            var hex = v.slice(1);
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            if (hex.length >= 6) {
                var r = parseInt(hex.slice(0, 2), 16),
                    g = parseInt(hex.slice(2, 4), 16),
                    b = parseInt(hex.slice(4, 6), 16);
                if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
                return r + ',' + g + ',' + b;
            }
            return null;
        }
        var m = v.match(/rgba?\(([^)]+)\)/i);
        if (m) {
            var p = m[1].split(',');
            if (p.length >= 3) return parseInt(p[0], 10) + ',' + parseInt(p[1], 10) + ',' + parseInt(p[2], 10);
        }
        return null;
    }
    function lengthToPx(v, rootFont) {
        if (!v) return null;
        v = v.trim();
        if (/^-?\d*\.?\d+px$/.test(v)) return parseFloat(v);
        if (/^-?\d*\.?\d+rem$/.test(v)) return parseFloat(v) * rootFont;
        return null;
    }
    function buildTokenMaps() {
        if (tokenMaps) return tokenMaps;
        var all = {};
        var sheets = document.styleSheets;
        for (var s = 0; s < sheets.length; s++) {
            var rules;
            try { rules = sheets[s].cssRules; } catch (e) { continue; }
            if (!rules) continue;
            eachRule(rules, function (rule) {
                var sel = rule.selectorText || '';
                if (sel.indexOf(':root') === -1 && sel.trim() !== 'html') return;
                var st = rule.style;
                for (var k = 0; k < st.length; k++) {
                    var prop = st[k];
                    if (prop.charAt(0) === '-' && prop.charAt(1) === '-') {
                        var val = st.getPropertyValue(prop).trim();
                        if (val && !(prop in all)) all[prop] = val;
                    }
                }
            });
        }
        var rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        var color = {}, space = {}, font = {}, len = {};
        Object.keys(all).forEach(function (tok) {
            var val = all[tok];
            var rgb = parseColorToRgb(val);
            if (rgb && !(rgb in color)) color[rgb] = tok;
            var pxv = lengthToPx(val, rootFont);
            if (pxv != null) {
                var key = Math.round(pxv);
                if (tok.indexOf('--space') === 0 && !(key in space)) space[key] = tok;
                if (tok.indexOf('--font-size') === 0 && !(key in font)) font[key] = tok;
                if (!(key in len)) len[key] = tok;
            }
        });
        tokenMaps = { all: all, color: color, space: space, font: font, len: len, rootFont: rootFont };
        return tokenMaps;
    }
    function rgbToHex(rgbStr) {
        var p = rgbStr.split(',');
        function h(n) { n = Math.max(0, Math.min(255, parseInt(n, 10))); var x = n.toString(16); return x.length < 2 ? '0' + x : x; }
        return ('#' + h(p[0]) + h(p[1]) + h(p[2])).toUpperCase();
    }
    function isTransparent(c) {
        if (!c || c === 'transparent') return true;
        var m = c.match(/rgba?\(([^)]+)\)/i);
        if (m) { var p = m[1].split(','); if (p.length >= 4 && parseFloat(p[3]) === 0) return true; }
        return false;
    }

    // ── :hover state resolution ──────────────────────────────
    // getComputedStyle only reports the current (default) state. To show what a
    // property becomes on hover, we scan every stylesheet for rules whose
    // selector contains ":hover", strip the pseudo-class, and test whether the
    // element matches the remainder. The winning declaration is chosen by CSS
    // specificity, ties broken by document order (mirrors the cascade).
    function forEachStyleRule(cb) {
        var sheets = document.styleSheets;
        for (var s = 0; s < sheets.length; s++) {
            var rules;
            try { rules = sheets[s].cssRules; } catch (e) { continue; }
            if (!rules) continue;
            eachRule(rules, cb);
        }
    }
    // Crude but adequate specificity: IDs · (classes/attrs/pseudo-classes) · elements.
    function specificity(sel) {
        var a = (sel.match(/#[\w-]+/g) || []).length;
        var b = (sel.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?/g) || []).length;
        var c = (sel.replace(/\([^)]*\)/g, '').match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
        return a * 10000 + b * 100 + c;
    }
    // Pre-collect every style rule once (with document order), so the per-state
    // lookups below don't re-walk all stylesheets each time.
    var allRulesCache = null;
    function allRules() {
        if (allRulesCache) return allRulesCache;
        var out = [], ord = 0;
        forEachStyleRule(function (rule) {
            ord++;
            if (rule.selectorText) out.push({ rule: rule, order: ord });
        });
        allRulesCache = out;
        return out;
    }
    // Resolve a declared value's var(--token[, fallback]) chain to a literal,
    // using the token table already built for the panel.
    function resolveVar(val, map) {
        if (!val) return val;
        var m = val.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
        if (!m) return val;
        var tok = map.all[m[1]];
        if (tok != null && tok !== '') return resolveVar(String(tok).trim(), map);
        if (m[2]) return resolveVar(m[2].trim(), map);
        return val;
    }
    // Winning declaration matching el for one state, read straight from the
    // stylesheets. mode 'hover' → only selectors containing :hover (pseudo
    // stripped before matching); mode 'default' → only selectors WITHOUT :hover.
    // Reading the default from the SHEETS (not getComputedStyle) is the whole
    // point: while the Live Editor points at an element the mouse is physically
    // over it, so getComputedStyle already returns the :hover value — only the
    // sheets still carry the true resting (default) value.
    function winningRule(el, propNames, mode) {
        var best = null;
        var list = allRules();
        for (var ri = 0; ri < list.length; ri++) {
            var rule = list[ri].rule, ord = list[ri].order;
            var sel = rule.selectorText;
            var hasHover = sel.indexOf(':hover') !== -1;
            if (mode === 'hover' && !hasHover) continue;
            if (mode === 'default' && hasHover) continue;
            var val = '';
            for (var pi = 0; pi < propNames.length; pi++) {
                val = rule.style.getPropertyValue(propNames[pi]);
                if (val) break;
            }
            if (!val) continue;
            val = val.trim();
            var parts = sel.split(',');
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i].trim();
                if (mode === 'hover' && p.indexOf(':hover') === -1) continue;
                if (mode === 'default' && p.indexOf(':hover') !== -1) continue;
                var stripped = p.replace(/:hover/g, '').trim();
                if (!stripped) continue;
                var ok = false;
                try { ok = el.matches(stripped); } catch (e) { ok = false; }
                if (!ok) continue;
                var spec = specificity(p);
                if (!best || spec > best.spec || (spec === best.spec && ord >= best.order)) {
                    best = { val: val, spec: spec, order: ord };
                }
            }
        }
        return best ? best.val : null;
    }
    function winningHover(el, propNames) { return winningRule(el, propNames, 'hover'); }
    var BG_PROPS = ['background-color', 'background'];
    // Background for one state: the element's own value, else climb to the first
    // ancestor that paints a non-transparent bg in that state (covers td → tr).
    function resolveBg(el, mode) {
        var v = winningRule(el, BG_PROPS, mode);
        if (v && !isTransparent(v)) return { val: v, node: el };
        var node = el.parentElement;
        while (node && node.nodeType === 1 && !isOwn(node)) {
            var nv = winningRule(node, BG_PROPS, mode);
            if (nv && !isTransparent(nv)) return { val: nv, node: node };
            node = node.parentElement;
        }
        return null;
    }

    // ── geometry / box model ─────────────────────────────────
    function boxes(el) {
        var r = el.getBoundingClientRect();
        var cs = getComputedStyle(el);
        var m = [f(cs.marginTop), f(cs.marginRight), f(cs.marginBottom), f(cs.marginLeft)];
        var bw = [f(cs.borderTopWidth), f(cs.borderRightWidth), f(cs.borderBottomWidth), f(cs.borderLeftWidth)];
        var p = [f(cs.paddingTop), f(cs.paddingRight), f(cs.paddingBottom), f(cs.paddingLeft)];
        return {
            marginBox:  { top: r.top - m[0], left: r.left - m[3], width: r.width + m[1] + m[3], height: r.height + m[0] + m[2] },
            borderBox:  { top: r.top, left: r.left, width: r.width, height: r.height },
            paddingBox: { top: r.top + bw[0], left: r.left + bw[3], width: r.width - bw[1] - bw[3], height: r.height - bw[0] - bw[2] },
            contentBox: { top: r.top + bw[0] + p[0], left: r.left + bw[3] + p[3], width: r.width - bw[1] - bw[3] - p[1] - p[3], height: r.height - bw[0] - bw[2] - p[0] - p[2] },
            m: m, bw: bw, p: p
        };
    }
    function setRing(node, box, widths) {
        node.style.top = px(box.top); node.style.left = px(box.left);
        node.style.width = px(Math.max(0, box.width)); node.style.height = px(Math.max(0, box.height));
        node.style.borderTopWidth = px(widths[0]); node.style.borderRightWidth = px(widths[1]);
        node.style.borderBottomWidth = px(widths[2]); node.style.borderLeftWidth = px(widths[3]);
    }
    function setFill(node, box) {
        node.style.top = px(box.top); node.style.left = px(box.left);
        node.style.width = px(Math.max(0, box.width)); node.style.height = px(Math.max(0, box.height));
    }
    function positionOverlay(el) {
        if (!el) return;
        var b = boxes(el);
        // Column mode targets EVERY cell in the column, so the overlay should
        // highlight the whole column, not just the one representative cell
        // boxes(el) measured — that single cell is still what the panel's own
        // Size/Padding/Margin rows read (the value actually written to every
        // cell), so only this local override for drawing changes, not boxes()
        // itself. Reuses the cell's own margin/border/padding metrics (same
        // values mirrored to every cell) applied across the column's full span.
        if (colScope && el === colScope.cell) {
            var u = columnUnionRect();
            if (u) {
                b = {
                    marginBox: { top: u.top - b.m[0], left: u.left - b.m[3], width: u.width + b.m[1] + b.m[3], height: u.height + b.m[0] + b.m[2] },
                    borderBox: { top: u.top, left: u.left, width: u.width, height: u.height },
                    paddingBox: { top: u.top + b.bw[0], left: u.left + b.bw[3], width: u.width - b.bw[1] - b.bw[3], height: u.height - b.bw[0] - b.bw[2] },
                    contentBox: { top: u.top + b.bw[0] + b.p[0], left: u.left + b.bw[3] + b.p[3], width: u.width - b.bw[1] - b.bw[3] - b.p[1] - b.p[3], height: u.height - b.bw[0] - b.bw[2] - b.p[0] - b.p[2] },
                    m: b.m, bw: b.bw, p: b.p
                };
            }
        }
        setRing(ui.layers.margin, b.marginBox, b.m);
        setRing(ui.layers.border, b.borderBox, b.bw);
        // Padding is a RING (a band of its own thickness), not a bare outline at the
        // padding edge. The point of the bounding box is seeing where padding and
        // margin land, and an outline only says where padding STARTS — you had to infer
        // the band between it and the border. Margin already worked this way; padding
        // now matches it, in yellow against margin's orange.
        setRing(ui.layers.padding, b.paddingBox, b.p);
        setFill(ui.layers.content, b.contentBox);
        ui.size.textContent = Math.round(b.borderBox.width) + ' × ' + Math.round(b.borderBox.height);
        var top = b.marginBox.top - 18;
        if (top < 2) top = b.marginBox.top + b.marginBox.height + 4;
        ui.size.style.top = px(Math.max(2, top));
        ui.size.style.left = px(Math.max(2, b.marginBox.left));
    }

    // ── distance measurement (phase 2) ───────────────────────
    // The SELECTED element's own ring, independent of the hover overlay. Two
    // separate marks are needed because they are both on screen at once while the
    // pin is held: the box-model overlay follows the cursor, and the selection has
    // to stay visibly the selection rather than appear to jump to whatever is being
    // hovered. Blue for selected, the existing magenta/amber for hover.
    function drawSel(el) {
        if (!ui || !ui.sel || !el || !document.contains(el)) return;
        var r = el.getBoundingClientRect();
        ui.sel.style.display = 'block';
        ui.sel.style.top = px(r.top); ui.sel.style.left = px(r.left);
        ui.sel.style.width = px(r.width); ui.sel.style.height = px(r.height);
    }
    function hideSel() { if (ui && ui.sel) ui.sel.style.display = 'none'; }
    // The HOVERED element's own ring. Separate from the box-model layers because
    // those are now opt-in (the SIZE group's Bounding box switch): with the box off,
    // the only layer left was the orange MARGIN ring, which has zero width on any
    // element without a margin — so hovering showed nothing at all. Identifying what
    // is under the cursor is not a detail you opt into, so it gets its own mark that
    // no toggle can hide. Magenta, against the selection's blue.
    function drawHov(el) {
        if (!ui || !ui.hov || !el || !document.contains(el)) return;
        // The selected element already carries the blue ring; a second, offset ring
        // on the same box would just read as a doubled border.
        if (el === selected) { hideHov(); return; }
        var r = el.getBoundingClientRect();
        ui.hov.style.display = 'block';
        ui.hov.style.top = px(r.top); ui.hov.style.left = px(r.left);
        ui.hov.style.width = px(r.width); ui.hov.style.height = px(r.height);
    }
    function hideHov() { if (ui && ui.hov) ui.hov.style.display = 'none'; }
    function drawRef(el) {
        var a = el.getBoundingClientRect();
        ui.ref.style.display = 'block';
        ui.ref.style.top = px(a.top); ui.ref.style.left = px(a.left);
        ui.ref.style.width = px(a.width); ui.ref.style.height = px(a.height);
    }
    function hideDist() {
        ui.ref.style.display = 'none';
        ui.distH.style.display = 'none'; ui.distV.style.display = 'none';
        ui.distHLabel.style.display = 'none'; ui.distVLabel.style.display = 'none';
    }
    function positionDist(refEl, hovEl) {
        var a = refEl.getBoundingClientRect();
        var b = hovEl.getBoundingClientRect();
        drawRef(refEl);
        // Horizontal gap — only when the two boxes do NOT overlap on the X axis.
        var dx = null, hx1, hx2;
        if (b.left >= a.right) { dx = b.left - a.right; hx1 = a.right; hx2 = b.left; }
        else if (b.right <= a.left) { dx = a.left - b.right; hx1 = b.right; hx2 = a.left; }
        if (dx != null && dx > 0.5) {
            var oT = Math.max(a.top, b.top), oB = Math.min(a.bottom, b.bottom);
            var y = (oT < oB) ? (oT + oB) / 2 : (a.top + a.bottom) / 2;
            ui.distH.style.display = 'block';
            ui.distH.style.top = px(y); ui.distH.style.left = px(hx1); ui.distH.style.width = px(hx2 - hx1);
            ui.distHLabel.style.display = 'block';
            ui.distHLabel.textContent = Math.round(dx) + 'px';
            ui.distHLabel.style.top = px(y - 18); ui.distHLabel.style.left = px((hx1 + hx2) / 2 - 14);
        } else { ui.distH.style.display = 'none'; ui.distHLabel.style.display = 'none'; }
        // Vertical gap — only when the two boxes do NOT overlap on the Y axis.
        var dy = null, vy1, vy2;
        if (b.top >= a.bottom) { dy = b.top - a.bottom; vy1 = a.bottom; vy2 = b.top; }
        else if (b.bottom <= a.top) { dy = a.top - b.bottom; vy1 = b.bottom; vy2 = a.top; }
        if (dy != null && dy > 0.5) {
            var oL = Math.max(a.left, b.left), oR = Math.min(a.right, b.right);
            var x = (oL < oR) ? (oL + oR) / 2 : (a.left + a.right) / 2;
            ui.distV.style.display = 'block';
            ui.distV.style.left = px(x); ui.distV.style.top = px(vy1); ui.distV.style.height = px(vy2 - vy1);
            ui.distVLabel.style.display = 'block';
            ui.distVLabel.textContent = Math.round(dy) + 'px';
            ui.distVLabel.style.top = px((vy1 + vy2) / 2 - 8); ui.distVLabel.style.left = px(x + 6);
        } else { ui.distV.style.display = 'none'; ui.distVLabel.style.display = 'none'; }
    }

    // ── panel rendering ──────────────────────────────────────
    function section(title, rows, titleExtra) {
        if (!rows) return '';
        return '<div class="davinci-live-editor-sec"><div class="davinci-live-editor-sec__title">' +
            '<span class="davinci-live-editor-sec__title-text">' + esc(title) + '</span>' + (titleExtra || '') +
            '</div>' + rows + '</div>';
    }
    // Two switches, in two places. RULERS lives in the panel's VIEW BAR (a strip
    // directly under the header, see buildUi), not in the header actions and not
    // in the scrolling body, so it stays reachable and doesn't crowd the title;
    // it is built once at boot, so its state has to be pushed onto the checkbox
    // by hand (syncRulersSwitch) whenever ⌃R or the ruler right-click changes it
    // behind the switch's back. BOUNDING BOX is re-rendered with the SIZE group
    // on every renderPanel, so it just reads `showGuides` in its own markup.
    // One delegated 'change' on the panel routes both to setGuides / setRulers.
    // The bounding box: the whole box model — the orange margin ring, the yellow
    // border tint, the dashed content/padding outlines and the WxH badge. OFF by
    // default — drawn on every hover it was more visual noise than signal, and the Size
    // row below states the same dimensions in text. Hover and selection have rings of
    // their own, so nothing about identifying an element depends on this.
    // Lives in the SIZE group because that is what it annotates, rather than in the
    // global strip. Reuses the switch component, so it looks like its Rulers sibling.
    function boundingBoxRow() {
        return '<div class="davinci-live-editor-row">' +
            '<span class="davinci-live-editor-row__label">Bounding box</span>' +
            '<span class="davinci-live-editor-row__val">' +
                '<label class="davinci-live-editor-switch davinci-live-editor-panel__bbox-switch">' +
                    '<input type="checkbox" class="davinci-live-editor-switch__input davinci-live-editor-panel__outlines-toggle"' + (showGuides ? ' checked' : '') + '>' +
                    '<span class="davinci-live-editor-switch__slider"></span>' +
                    '<span class="davinci-live-editor-switch__label">Show</span>' +
                '</label>' +
            '</span></div>';
    }
    function rulersSwitchHtml() {
        return '<label class="davinci-live-editor-switch davinci-live-editor-panel__rulers-switch">' +
            '<input type="checkbox" class="davinci-live-editor-switch__input davinci-live-editor-panel__rulers-toggle"' + (rulersOn ? ' checked' : '') + '>' +
            '<span class="davinci-live-editor-switch__slider"></span>' +
            '<span class="davinci-live-editor-switch__label">Rulers</span>' +
            '<span class="davinci-live-editor-panel__sw-tip" role="tooltip">Top/left rulers you drag guides from (⌃R).</span>' +
        '</label>';
    }
    // `editAttrs` (raw data-* string) swaps the row from click-to-copy to
    // click-to-edit — used only while an element is selected (`selected` truthy).
    // `edited` flags a row whose live value now comes from an inline-style
    // override applied via an editor, not the stylesheet.
    function rowHtml(label, displayHtml, copyText, editAttrs, edited) {
        var valAttrs = editAttrs || ('data-copy="' + esc(copyText) + '"');
        var valClass = 'davinci-live-editor-row__val' + (editAttrs ? ' davinci-live-editor-row__val--editable' : '');
        var labelClass = 'davinci-live-editor-row__label' + (edited ? ' davinci-live-editor-row__label--edited' : '');
        return '<div class="davinci-live-editor-row"><span class="' + labelClass + '">' + esc(label) + '</span>' +
            '<span class="' + valClass + '" ' + valAttrs + '>' + displayHtml + '</span></div>';
    }
    // "Ancestors" row — the element's own line of ancestry, out to <html> (no
    // project-wide "canvas root" wrapper exists to stop at instead; matches
    // resolveBg's walk-to-body convention above). COLLAPSED by default: the row
    // shows only the current element as a button (+ how many levels the line
    // holds), since the panel is 348/388px wide and a horizontal breadcrumb of
    // 6+ chips truncated every label. Clicking the button expands the line as a
    // vertical tree — <html> at top, indented down to the origin, one dot per
    // level joined by an elbow connector — visually the same component as the
    // app's "View organization" popover (prototypes/es-individuals, .es-orgpop:
    // 9px #d2d2d7 dot, 1px #d2d2d7 line, 12px #0066cc name). It renders INLINE
    // (a disclosure, not a floating popover) because the panel body scrolls and
    // would clip an absolutely-positioned panel. The tree carries no scroll of
    // its own — it always opens whole and pushes the spec sections down, which
    // stay reachable through the panel body's single scroll.
    //
    // `ancestorsLine` is the fixed line. It's reused as-is whenever `el` (whatever
    // the panel is currently showing, i.e. the selected element) is
    // already somewhere on it, so the array never shrinks just because you
    // moved to one of its own entries. It's only rebuilt from scratch when `el`
    // is off the current line entirely — the first render of a session (no
    // active line yet) or a deliberate restart elsewhere (a fresh pick — see
    // onClick, which nulls the line out).
    // Every level except the current one is clickable; clicking one calls
    // select() on it via onCopyClick's data-ancestor-index branch, retargeting
    // the whole panel (display + live edit subject) to that element — see
    // select(). Copied into `lastAncestorChain` on every render so
    // data-ancestor-index always indexes the array the rendered rows came from.
    function ancestorChainHtml(el) {
        var chain;
        if (ancestorsLine && ancestorsLine.indexOf(el) !== -1) {
            chain = ancestorsLine;
        } else {
            chain = [el];
            var node = el.parentElement;
            while (node && !isOwn(node)) {
                chain.push(node);
                node = node.parentElement;
            }
            ancestorsLine = chain;
        }
        lastAncestorChain = chain;
        var currentIndex = chain.indexOf(el);
        var btn = '<button type="button" class="davinci-live-editor-ancestors__btn" data-ancestors-toggle' +
            ' aria-expanded="' + (ancestorsOpen ? 'true' : 'false') + '"' +
            ' title="' + (ancestorsOpen ? 'Hide' : 'Show') + ' the element tree — click any level to retarget the panel to it">' +
            '<span class="davinci-live-editor-ancestors__name">' + esc(nodeDesc(el)) + '</span>' +
            TREE_CHEV_ICON +
            '<span class="davinci-live-editor-ancestors__count" title="Levels on this line">' + chain.length + '</span>' +
            '</button>';
        return '<div class="davinci-live-editor-row"><span class="davinci-live-editor-row__label">Ancestors</span>' +
            '<span class="davinci-live-editor-row__val davinci-live-editor-ancestors">' + btn + '</span></div>' +
            (ancestorsOpen ? ancestorsTreeHtml(chain, currentIndex) : '');
    }
    // The expanded tree. Walks `chain` (deepest-first) BACKWARDS so <html> lands
    // on top and the origin at the bottom, indenting one step per level — a
    // single linear line of ancestry, so the indent is orientation, not
    // structure (there are no siblings to disambiguate). Indent is capped at 10
    // steps so a deeply-nested element can't push the names out of the panel.
    // The current level carries aria-current and no data-ancestor-index (a
    // click on it would be a no-op); the origin keeps the same indigo
    // "session-sticky" treatment the old breadcrumb used.
    function ancestorsTreeHtml(chain, currentIndex) {
        // Nodes are emitted top-down (html first). `data-ancestor-index` indexes
        // into `lastAncestorChain`, which is rebuilt here as the list of nodes
        // ACTUALLY rendered — the ancestry line plus the branches described below.
        var nodes = [], rows = [], branchBudget = TREE_CHILD_LIMIT;
        var top = chain.length - 1;
        function depthOf(i) { return Math.min(top - i, 10); }
        function emit(el, depth, opts) {
            nodes.push(el);
            var idx = nodes.length - 1;
            var cls = 'davinci-live-editor-tree__row' +
                (opts.current ? ' davinci-live-editor-tree__row--current' : '') +
                (opts.origin ? ' davinci-live-editor-tree__row--origin' : '') +
                (opts.branch ? ' davinci-live-editor-tree__row--branch' : '');
            rows.push('<button type="button" class="' + cls + '"' +
                ' style="--davinci-live-editor-depth:' + Math.min(depth, 10) + '"' +
                (opts.current ? ' aria-current="true"' : ' data-ancestor-index="' + idx + '"') + '>' +
                '<span class="davinci-live-editor-tree__dot" aria-hidden="true"></span>' +
                '<span class="davinci-live-editor-tree__name">' + esc(nodeDesc(el)) + '</span>' +
                '</button>');
        }
        function note(count, depth) {
            if (count <= 0) return;
            rows.push('<div class="davinci-live-editor-tree__more" style="--davinci-live-editor-depth:' +
                Math.min(depth, 10) + '">+' + count + ' more not listed</div>');
        }
        // Children of `parent`, in DOM order, at `depth`. `onLine` is the one child
        // that continues the ancestry line — it's emitted in place by `expand` so
        // the indentation still reads as real parentage; the others are branches.
        function children(parent, depth, onLine, expand) {
            var kids = [], shown = 0;
            var raw = parent.children || [];
            for (var k = 0; k < raw.length; k++) { if (!isOwn(raw[k])) kids.push(raw[k]); }
            for (var c = 0; c < kids.length; c++) {
                if (kids[c] === onLine) { expand(); continue; }
                if (shown >= branchBudget) continue;
                shown++;
                emit(kids[c], depth, { branch: true });
            }
            branchBudget -= shown;
            note(kids.length - (onLine ? 1 : 0) - shown, depth);
        }
        // The current element, then ITS children (downward reach).
        function emitCurrent() {
            emit(chain[currentIndex], depthOf(currentIndex), { current: true, origin: currentIndex === 0 });
            children(chain[currentIndex], depthOf(currentIndex) + 1,
                currentIndex > 0 ? chain[currentIndex - 1] : null,
                function () { // the line continues below the current element
                    for (var j = currentIndex - 1; j >= 0; j--) emit(chain[j], depthOf(j), { origin: j === 0 });
                });
        }
        // Line rows above the current element's parent — plain, no branches.
        for (var i = top; i >= currentIndex + 2; i--) emit(chain[i], depthOf(i), { origin: i === 0 });
        if (currentIndex + 1 <= top) {
            // The PARENT level expands too, so the current element's SIBLINGS show
            // up. Without this, selecting a leaf (an icon span, say) left the tree
            // with nothing to descend into — the neighbours you actually want from
            // there (the 8.5px active dot next to a glyph) are siblings, not
            // children.
            emit(chain[currentIndex + 1], depthOf(currentIndex + 1), {});
            children(chain[currentIndex + 1], depthOf(currentIndex + 1) + 1, chain[currentIndex], emitCurrent);
        } else {
            emitCurrent();
        }
        lastAncestorChain = nodes;
        return '<div class="davinci-live-editor-tree">' + rows.join('') + '</div>';
    }
    // The tree used to engage a hover "freeze" while open, because the panel tracked
    // the cursor and walking into it re-targeted the line out from under you. The
    // panel is anchored to the selection now, so there is nothing to hold still.
    function toggleAncestorsTree() {
        if (ancestorsOpen) { closeAncestorsTree(); return; }
        ancestorsOpen = true;
        if (selected) renderPanel(selected);
    }
    function closeAncestorsTree(skipRender) {
        if (!ancestorsOpen) return;
        ancestorsOpen = false;
        if (!skipRender && selected) renderPanel(selected);
    }

    // Row shell for values that carry TRAILING extras (a token tag, a "from
    // node"/rem note) which must stay OUTSIDE the click-to-copy/edit target —
    // only the core value itself (swatch+hex, or number+unit) is interactive.
    // Same "plain outer wrapper, one interactive inner span" shape as
    // spaceRowHtml's per-side chips, just with a single core chip instead of
    // four. onCopyClick resolves via closest('[data-edit],[data-copy]'), so
    // clicks landing on the trailing extras (or the token's own data-copy)
    // never trigger the core's action.
    function coreRowHtml(label, coreHtml, copyText, editAttrs, edited, extraHtml, tooltipText) {
        var coreAttrs = editAttrs || ('data-copy="' + esc(copyText) + '"');
        // "from <node>" provenance notes hover-reveal on the core (swatch+hex)
        // itself rather than printing inline — see bgRow/hoverColorRow. A native
        // `title` carries them: the panel is a dev tool, so a browser tooltip is
        // enough, and it needs no runtime to bind it after each re-render.
        if (tooltipText) coreAttrs += ' title="' + esc(tooltipText) + '"';
        var coreClass = 'davinci-live-editor-core' + (editAttrs ? ' davinci-live-editor-row__val--editable' : '');
        var labelClass = 'davinci-live-editor-row__label' + (edited ? ' davinci-live-editor-row__label--edited' : '');
        return '<div class="davinci-live-editor-row"><span class="' + labelClass + '">' + esc(label) + '</span>' +
            '<span class="davinci-live-editor-row__val"><span class="' + coreClass + '" ' + coreAttrs + '>' + coreHtml + '</span>' + (extraHtml || '') + '</span></div>';
    }
    // The token tag carries its OWN data-copy, so clicking the token copies the
    // token name while clicking the value (hex/px, on the row__val) copies the
    // literal (or opens its editor when pinned) — onCopyClick checks
    // closest('[data-edit]') then closest('[data-copy]'), so the nested token
    // always wins for clicks on it.
    function tokenTag(tok) { return tok ? ' <span class="davinci-live-editor-token" data-copy="' + esc(tok) + '">' + esc(tok) + '</span>' : ''; }
    // getComputedStyle always reports px, so a value the stylesheet declared in
    // rem (directly or via a var() token) shows up as a "broken" fractional px
    // (e.g. line-height:1.3rem → 20.8px). Read the winning default declaration
    // and, if it resolves to a rem literal, return it so we can show the rem
    // source next to the px. Returns null when the value wasn't authored in rem.
    function declaredRem(el, propNames, map) {
        var raw = winningRule(el, propNames, 'default');
        if (!raw) return null;
        var resolved = resolveVar(raw.trim(), map).trim();
        return /^-?\d*\.?\d+rem$/.test(resolved) ? resolved : null;
    }
    function remNote(rem) { return rem ? ' <span class="davinci-live-editor-note">' + esc(rem) + '</span>' : ''; }
    // Line-height is usually a unitless multiplier (e.g. 1.2) that computes to
    // font-size × multiplier — so a fractional px like 14.4px is NOT a rem, and
    // deriving one (14.4/root) invents a misleading fraction. Show the clean
    // source instead: an authored rem/unitless value, else the ratio to
    // font-size (14.4px ÷ 12px = 1.2×).
    function lineHeightNote(el, lhPx, fs, map) {
        var raw = winningRule(el, ['line-height'], 'default');
        if (raw) {
            var r = resolveVar(raw.trim(), map).trim();
            if (/^-?\d*\.?\d+rem$/.test(r)) return r;        // authored in rem
            if (/^-?\d*\.?\d+$/.test(r)) return r + '×';     // authored unitless
        }
        if (lhPx && fs && !isNaN(lhPx) && !isNaN(fs)) return round2(lhPx / fs) + '×';
        return null;
    }

    // `editable`+`prop` (an inline-style property name on the edit subject)
    // make the row click-to-edit instead of click-to-copy — only passed while
    // selected; see editSubject().
    function editAttrForColor(prop) { return 'data-edit="color" data-prop="' + prop + '"'; }
    function colorRow(label, cssColor, map, editable, prop) {
        var rgb = parseColorToRgb(cssColor);
        var subj = editSubject();
        var edited = editable && subj && subj.style[prop];
        if (!rgb) return rowHtml(label, esc(cssColor), cssColor, editable ? editAttrForColor(prop) : null, edited);
        var hex = rgbToHex(rgb);
        var tok = map.color[rgb];
        var core = '<span class="davinci-live-editor-swatch" style="background:' + hex + '"></span>' + hex;
        return coreRowHtml(label, core, hex, editable ? editAttrForColor(prop) : null, edited, tokenTag(tok));
    }
    function bgRow(el, map, editable) {
        var own = getComputedStyle(el).backgroundColor;
        if (!isTransparent(own)) return colorRow('Background', own, map, editable, 'backgroundColor');
        // Own background is transparent — climb ancestors to find the color that
        // actually shows through. Covers the common case where a row's :hover /
        // selected blue is painted on the <tr> while the clicked <td> is clear.
        var node = el.parentElement, eff = null;
        while (node && node.nodeType === 1) {
            var c = getComputedStyle(node).backgroundColor;
            if (!isTransparent(c)) { eff = { color: c, node: node }; break; }
            node = node.parentElement;
        }
        var subj = editSubject();
        var edited = editable && subj && subj.style.backgroundColor;
        var editAttrs = editable ? editAttrForColor('backgroundColor') : null;
        if (!eff) return rowHtml('Background', 'transparent', 'transparent', editAttrs, edited);
        var rgb = parseColorToRgb(eff.color);
        var hex = rgbToHex(rgb);
        var tok = map.color[rgb];
        var core = '<span class="davinci-live-editor-swatch" style="background:' + hex + '"></span>' + hex;
        return coreRowHtml('Background', core, hex, editAttrs, edited, tokenTag(tok), 'from ' + nodeDesc(eff.node));
    }
    function nodeDesc(el) {
        var s = el.tagName.toLowerCase();
        if (el.id) return s + '#' + el.id;
        // Skip Live Editor's own instrumentation classes (e.g. the docking class
        // toggled on document.body) — they're never meaningful prototype
        // identity, just internal bookkeeping.
        for (var i = 0; i < el.classList.length; i++) {
            if (el.classList[i].indexOf('davinci-live-editor-') !== 0) { s += '.' + el.classList[i]; break; }
        }
        return s;
    }
    function editAttrForHoverColor(prop, hex) { return 'data-edit="hovercolor" data-prop="' + prop + '" data-hex="' + esc(hex) + '"'; }
    // Render a color value (may be a var()/token or literal) as a swatch row,
    // resolving tokens and reverse-mapping the literal back to a token name.
    // `isHoverState` distinguishes a TRUE :hover value (Hover section — edited
    // by injecting a scoped :hover stylesheet rule, since inline styles can't
    // reach a pseudo-class) from a resolved DEFAULT value read off an ancestor
    // (Color section's Background fallback — edited as a normal inline style,
    // same as colorRow/bgRow).
    function hoverColorRow(label, declaredVal, map, fromNode, editable, prop, isHoverState) {
        var resolved = resolveVar(declaredVal, map);
        var rgb = parseColorToRgb(resolved);
        var subj = editSubject();
        var hex = rgb ? rgbToHex(rgb) : '';
        var edited = editable && subj && prop && (isHoverState
            ? (hoverOverrides && hoverOverrides.el === subj && hoverOverrides.props[prop] != null)
            : subj.style[prop]);
        var editAttrs = !editable ? null : (isHoverState ? editAttrForHoverColor(prop, hex) : editAttrForColor(prop));
        if (!rgb) return rowHtml(label, esc(resolved), resolved, editAttrs, edited);
        var tok = map.color[rgb];
        var core = '<span class="davinci-live-editor-swatch" style="background:' + hex + '"></span>' + hex;
        return coreRowHtml(label, core, hex, editAttrs, edited, tokenTag(tok), fromNode ? 'from ' + nodeDesc(fromNode) : null);
    }
    // Same row shell as rowHtml, but with no data-copy/data-edit of its own —
    // used when the interactive targets are INSIDE displayHtml instead (each
    // padding/margin side is its own click-to-edit chip; see spaceRow below).
    function spaceRowHtml(label, displayHtml, edited) {
        var labelClass = 'davinci-live-editor-row__label' + (edited ? ' davinci-live-editor-row__label--edited' : '');
        return '<div class="davinci-live-editor-row"><span class="' + labelClass + '">' + esc(label) + '</span>' +
            '<span class="davinci-live-editor-row__val">' + displayHtml + '</span></div>';
    }
    // Once selected, each side (T/R/B/L) is its own click-to-edit number —
    // the exact same inline mechanism as Font size/Radius below, just one prop
    // per side. No separate "spacing" editor/popup.
    function spaceRow(label, sides, map, editable, kind) {
        var propNames = [kind + 'Top', kind + 'Right', kind + 'Bottom', kind + 'Left'];
        var subj = editSubject();
        var edited = editable && subj && propNames.some(function (p) { return subj.style[p]; });
        if (!editable) {
            if (sides.every(function (x) { return x === 0; })) return rowHtml(label, '0', '0');
            var disp = sides.map(function (x) { return Math.round(x); }).join(' · ') + 'px';
            var seen = {}, toks = [];
            sides.forEach(function (x) {
                if (x > 0) { var t = map.space[Math.round(x)]; if (t && !seen[t]) { seen[t] = 1; toks.push(t); } }
            });
            disp += toks.map(tokenTag).join('');
            return rowHtml(label, disp, sides.map(function (x) { return Math.round(x) + 'px'; }).join(' '));
        }
        var sideLabels = ['T', 'R', 'B', 'L'];
        var inner = sides.map(function (x, i) {
            return '<span class="davinci-live-editor-side-label">' + sideLabels[i] + '</span>' +
                '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="' + propNames[i] + '">' +
                Math.round(x) + '</span>';
        }).join('<span class="davinci-live-editor-side-sep">·</span>') + ' <span class="davinci-live-editor-note">px</span>';
        return spaceRowHtml(label, inner, edited);
    }
    // Width/Height edit as an inline style on the subject — note this sets
    // whichever box `width`/`height` control under the element's box-sizing
    // (content-box vs border-box), same best-effort preview caveat as every
    // other live edit here.
    // Padlock for W/H: `lock.fill` when engaged, `lock.open` when not — the filled vs
    // outlined pair carries the on/off state in the glyph itself, on top of the accent
    // colour. Was two bordered CSS spans faking a padlock.
    function ratioLockHtml() {
        return '<button type="button" class="davinci-live-editor-lock' + (ratioLock ? ' davinci-live-editor-lock--on' : '') + '"' +
            ' data-ratio-lock aria-pressed="' + (ratioLock ? 'true' : 'false') + '"' +
            // The glyph is aria-hidden and there is no label text, so without this the
            // button had no accessible name at all — it announced as just "button,
            // pressed". (Pre-existing: the two CSS spans it replaced were hidden too.)
            ' aria-label="Lock proportions"' +
            ' title="' + (ratioLock
                ? 'Proportions locked — editing W or H moves the other, keeping the ratio. Click to unlock.'
                : 'Lock proportions — edit W or H and the other follows, keeping the ratio.') + '">' +
            (ratioLock ? LOCK_ON_ICON : LOCK_OFF_ICON) +
            '</button>';
    }
    // Drop the selection without closing the tool. Esc already does this, but only if
    // you know that — and Esc's first job is disarming the crosshair, so from a selected
    // state it can take two presses. This is the explicit way out, in the group that
    // describes the element it releases.
    //
    // It rides in that group's TITLE row (section()'s `titleExtra` slot), not as a row
    // of its own. As a row it needed a label to sit beside, and the only honest one was
    // "Selection" — which read as a PROPERTY of the element, a spec among Tag / ID /
    // Classes, when it is an action on the panel. Up in the title, next to the word it
    // acts on, it can't be misread, and the group is one row shorter.
    //
    // The glyph is CLOSE_ICON, the panel's own ✕, reused rather than redrawn so the two
    // can't drift apart; it's sized down by the button's CSS.
    function clearSelectionBtnHtml() {
        return '<button type="button" class="davinci-live-editor-clear-sel" data-clear-sel' +
            ' title="Deselect this element. The panel stays open, ready for the next pick.">' +
            CLOSE_ICON +
            '<span class="davinci-live-editor-clear-sel__txt">Clear selection</span></button>';
    }
    function dimsRow(b, editable) {
        var w = Math.round(b.borderBox.width), h = Math.round(b.borderBox.height);
        if (!editable) return rowHtml('Dimensions', w + ' × ' + h + ' px', w + 'x' + h);
        var subj = editSubject();
        var edited = subj && (subj.style.width || subj.style.height);
        var inner =
            '<span class="davinci-live-editor-side-label">W</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="width">' + w + '</span>' +
            '<span class="davinci-live-editor-side-sep">×</span>' +
            '<span class="davinci-live-editor-side-label">H</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="height">' + h + '</span>' +
            ' <span class="davinci-live-editor-note">px</span>' +
            ratioLockHtml();
        return spaceRowHtml('Dimensions', inner, edited);
    }
    // ── Offset (x/y nudge) ───────────────────────────────────
    // Moving an element by hand, without disturbing anything around it.
    // `transform: translate()` is the mechanism: it paints the element
    // somewhere else but takes its layout space where it was, so a nudged
    // button doesn't reflow its neighbours and nothing else on the row shifts.
    //
    // EXCEPT on a non-replaced INLINE box, where transform simply doesn't apply
    // (CSS Transforms spec). Those fall back to `position: relative` + left/top,
    // which is also offset-without-reflow for that case.
    //
    // The pre-existing transform is captured ONCE per element and re-emitted
    // after the translate, so nudging something the prototype already rotates or
    // scales doesn't wipe that out — and repeated edits recompose from the base
    // instead of stacking translate on translate.
    var offsets = [];   // [{ el, pseudo, x, y, base, mode }]
    function offsetRec(t, create) {
        for (var i = 0; i < offsets.length; i++) {
            if (offsets[i].el === t.el && offsets[i].pseudo === t.pseudo) return offsets[i];
        }
        if (!create) return null;
        var cs = getComputedStyle(t.el, t.pseudo || null);
        var inline = cs.display === 'inline';
        var base = (!inline && cs.transform && cs.transform !== 'none') ? cs.transform : '';
        var rec = { el: t.el, pseudo: t.pseudo, x: 0, y: 0, base: base, mode: inline ? 'relative' : 'transform' };
        offsets.push(rec);
        return rec;
    }
    function offsetOf(t, axis) {
        var rec = offsetRec(t, false);
        return rec ? (axis === 'x' ? rec.x : rec.y) : 0;
    }
    function setOffset(t, axis, n) {
        var rec = offsetRec(t, true);
        if (axis === 'x') rec.x = n; else rec.y = n;
        if (rec.mode === 'relative') {
            tgtWrite(t, 'position', 'relative');
            tgtWrite(t, 'left', rec.x + 'px');
            tgtWrite(t, 'top', rec.y + 'px');
            tgtLog(t, 'position', 'relative', false);
            tgtLog(t, 'left', rec.x + 'px', false);
            tgtLog(t, 'top', rec.y + 'px', false);
            return;
        }
        var v = (rec.x || rec.y)
            ? ('translate(' + rec.x + 'px, ' + rec.y + 'px)' + (rec.base ? ' ' + rec.base : ''))
            : rec.base;
        tgtWrite(t, 'transform', v);
        tgtLog(t, 'transform', v, false);
    }
    function clearOffset(t) {
        var rec = offsetRec(t, false);
        if (!rec) return;
        ['transform', 'position', 'left', 'top'].forEach(function (prop) {
            tgtWrite(t, prop, '');
            unlogEdit(t.el, prop, false, t.pseudo);
        });
        if (rec.base) { tgtWrite(t, 'transform', rec.base); tgtLog(t, 'transform', rec.base, false); }
        offsets.splice(offsets.indexOf(rec), 1);
    }
    function offsetRow(t) {
        var rec = offsetRec(t, false);
        // Read the mode off the element rather than off the record, so the row is
        // accurate on FIRST render too (no record exists until the first nudge).
        var mode = rec ? rec.mode
            : (getComputedStyle(t.el, t.pseudo || null).display === 'inline' ? 'relative' : 'transform');
        var note = mode === 'relative' ? 'px · relative, no reflow' : 'px · no reflow';
        return spaceRowHtml('Offset',
            '<span class="davinci-live-editor-side-label">X</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="__offsetX">' + offsetOf(t, 'x') + '</span>' +
            '<span class="davinci-live-editor-side-sep">·</span>' +
            '<span class="davinci-live-editor-side-label">Y</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="__offsetY">' + offsetOf(t, 'y') + '</span>' +
            ' <span class="davinci-live-editor-note">' + note + '</span>',
            !!(rec && (rec.x || rec.y)));
    }

    // ── Layout / alignment ───────────────────────────────────
    // Which alignment properties even apply depends on the box: a flex/grid
    // container aligns its CHILDREN (justify-content / align-items / gap, plus
    // the flow direction), while any box with text in it aligns its INLINE
    // content (text-align). Showing all of them everywhere would be four dead
    // rows on most elements — the button that holds an icon is a flex row, the
    // cell around a label is not — so each row is offered only where the CSS
    // actually does something.
    var FLEX_DIR_OPTIONS = 'row,row-reverse,column,column-reverse';
    var JUSTIFY_OPTIONS = 'flex-start,center,flex-end,space-between,space-around,space-evenly';
    var ALIGN_OPTIONS = 'stretch,flex-start,center,flex-end,baseline';
    var TEXT_ALIGN_OPTIONS = 'start,left,center,right,justify';
    function isFlexish(cs) {
        return cs.display === 'flex' || cs.display === 'inline-flex' ||
               cs.display === 'grid' || cs.display === 'inline-grid';
    }
    // Does this element lay out inline content of its own (text, an inline icon)?
    // Only then is text-align meaningful.
    function hasInlineContent(el) {
        if (!el.childNodes) return false;
        for (var i = 0; i < el.childNodes.length; i++) {
            var n = el.childNodes[i];
            if (n.nodeType === 3 && n.nodeValue.trim()) return true;
            if (n.nodeType === 1 && !isOwn(n)) {
                var d = getComputedStyle(n).display;
                if (d.indexOf('inline') === 0) return true;
            }
        }
        return false;
    }
    function selectRow(label, prop, options, value, edited, note) {
        return spaceRowHtml(label,
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="select" data-prop="' + prop + '" data-options="' + options + '">' + esc(value) + '</span>' +
            (note ? ' <span class="davinci-live-editor-note">' + esc(note) + '</span>' : ''),
            edited);
    }
    function layoutRows(el, cs, editable) {
        if (!editable) return '';
        var subj = editSubject();
        var rows = offsetRow({ el: subj, pseudo: null });
        var flexish = isFlexish(cs);
        if (flexish) {
            var grid = cs.display.indexOf('grid') !== -1;
            if (!grid) {
                rows += selectRow('Direction', 'flexDirection', FLEX_DIR_OPTIONS, cs.flexDirection, !!subj.style.flexDirection);
            }
            // Named after what the designer sees, not after the axis: on a row,
            // justify-content IS horizontal alignment; on a column it's vertical.
            // The note spells out which one is which for the current direction.
            var isCol = cs.flexDirection.indexOf('column') === 0;
            rows += selectRow(isCol ? 'Align ↕' : 'Align ↔', 'justifyContent', JUSTIFY_OPTIONS, cs.justifyContent, !!subj.style.justifyContent, 'main axis');
            rows += selectRow(isCol ? 'Align ↔' : 'Align ↕', 'alignItems', ALIGN_OPTIONS, cs.alignItems, !!subj.style.alignItems, 'cross axis');
            rows += rowHtml('Gap', esc(cs.gap || '0px'), cs.gap || '0px',
                'data-edit="number" data-prop="gap"', !!subj.style.gap);
        }
        if (hasInlineContent(el)) {
            rows += selectRow('Text align', 'textAlign', TEXT_ALIGN_OPTIONS, cs.textAlign, !!subj.style.textAlign);
        }
        // A non-flex box holding a lone icon/label can still be centred the old
        // way; offering `display` here is what makes the flex rows above reachable
        // at all on an element that isn't a flex container yet.
        if (!flexish) {
            rows += selectRow('Display', 'display', 'block,inline-block,inline,flex,inline-flex,grid', cs.display, !!subj.style.display,
                'set flex to align children');
        }
        return rows;
    }
    function iconOf(el) {
        var tag = el.tagName.toLowerCase();
        if (tag === 'sf-symbol') return 'SF Symbol: ' + (el.getAttribute('name') || '?');
        if (tag === 'img' && el.getAttribute('src')) return el.getAttribute('src').split('/').pop();
        var child = el.querySelector ? el.querySelector('sf-symbol') : null;
        if (child) return 'SF Symbol: ' + (child.getAttribute('name') || '?');
        return null;
    }
    // ── Icons section ────────────────────────────────────────
    // An icon button in this project is a wrapper with the glyph as a CHILD:
    // `<button class="es-icon-btn"><span class="es-icon-btn__glyph es-icon--filter">`
    // plus, on filter buttons, a small "active" dot span. The tint lives on
    // the glyph (`background-color` behind a mask-image), never on the button —
    // so selecting the button gave you no way to change the icon's colour or
    // size, and selecting the glyph by pointer is a coin flip (the dot is 8.5px
    // and the glyph sits over it). This section surfaces every icon INSIDE the
    // subject as its own editable group, so one selection covers the button and
    // its icons.
    // How many of the current element's non-line children the tree lists. A
    // <tbody> has 25+; listing all of them would bury the ancestry line the
    // tree exists for. What's dropped is stated in the tree, never silent.
    var TREE_CHILD_LIMIT = 12;
    var ICON_SCAN_LIMIT = 6;   // a wrapper with more "icons" than this isn't an icon button
    var ICON_PSEUDOS = ['::before', '::after'];
    function maskUrlOf(el, pseudo) {
        var cs = getComputedStyle(el, pseudo || null);
        var mask = (cs.maskImage && cs.maskImage !== 'none') ? cs.maskImage : (cs.webkitMaskImage || '');
        if (!mask || mask === 'none') return null;
        var m = /url\(["']?([^"')]+)/.exec(mask);
        return m ? m[1] : null;
    }
    // What KIND of icon this is decides which property carries its colour:
    // a masked span is tinted by `background-color` (the mask only cuts the
    // shape out of it), an inline <svg> or <sf-symbol> by `color`
    // (currentColor), and a plain <img> can't be tinted at all — size only.
    // `pseudo` is null for a real element, '::before'/'::after' for a pseudo
    // glyph. Both are legitimate icons in this project: es-individuals draws
    // them as child <span>s, users-and-roles as `.ua-filter-btn::before`.
    function iconKind(el, pseudo) {
        if (!pseudo) {
            var tag = el.tagName.toLowerCase();
            // `sfGlyph` marks the one icon kind whose glyph is swappable by NAME:
            // an <sf-symbol> renders whatever its `name` attribute asks for. An
            // inline <svg> tints the same way but has its paths baked in, so it
            // gets no glyph row.
            if (tag === 'sf-symbol') return { name: el.getAttribute('name') || 'sf-symbol', tint: 'color', sfGlyph: true };
            if (tag === 'svg') return { name: 'svg', tint: 'color' };
            // An <img> pointing at an .svg is a swappable ICON (same glyph-file
            // convention as a masked span, just via `src` instead of `mask-image`);
            // any other extension is a photo/raster asset — size/offset/opacity
            // only, no glyph swap (there's no sibling file to pick from). See
            // imgSrcOf/iconGlyphRow/openGlyphPicker for the `src`-writing path.
            if (tag === 'img') {
                var src = el.getAttribute('src') || '';
                return { name: src.split('/').pop() || 'img', tint: null, imgGlyph: /\.svg(\?|#|$)/i.test(src) };
            }
        }
        var url = maskUrlOf(el, pseudo);
        if (url) return { name: url.split('/').pop(), tint: 'backgroundColor', mask: url };
        var cs = getComputedStyle(el, pseudo || null);
        // A pseudo with no mask is only an icon if it actually paints something;
        // every element has a ::before in the computed model, most render nothing.
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return null;
        // A dot/pill with no glyph at all (e.g. an "active" dot: a coloured,
        // fully-rounded box) is still an icon as far as the designer is
        // concerned — it's a mark drawn inside the button — so include it.
        var w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
        var round = parseFloat(cs.borderRadius) > 0 && !isTransparent(cs.backgroundColor);
        var empty = pseudo ? true : (!el.firstElementChild && !(el.textContent || '').trim());
        if (round && empty && w > 0 && w <= 24) {
            var circle = Math.abs(w - h) < 1 && parseFloat(cs.borderRadius) >= w / 2;
            // `generic: true` marks this as the geometry-only fallback (matched by
            // SHAPE, not by an actual glyph/mask/src) — see its use in
            // iconSectionRows: a "self" group is worth showing only for a REAL
            // icon, not for every small rounded box that happens to qualify.
            return { name: circle ? 'dot' : 'shape', tint: 'backgroundColor', generic: true };
        }
        return null;
    }
    // Every icon that is PART of `el`: its own ::before/::after, then each
    // descendant and that descendant's pseudos. The subject's own pseudos come
    // first because that's the common icon-button shape here (the glyph IS the
    // button's ::before).
    // An <sf-symbol> builds its own internals (an <svg> plus a spacing <span>), and
    // that <svg> otherwise reads as a second, glyph-less icon sitting inside the
    // first — so every icon in the prototype would be listed twice, once
    // swappable and once not. The symbol element IS the icon; everything under it
    // is implementation detail.
    function insideSfSymbol(node) {
        return !!(node && node.parentElement && node.parentElement.closest &&
                  node.parentElement.closest('sf-symbol'));
    }
    function iconTargets(el) {
        var out = [];
        function push(node, pseudo, self) {
            if (out.length >= ICON_SCAN_LIMIT) return;
            if (insideSfSymbol(node)) return;
            var kind = iconKind(node, pseudo);
            if (kind) out.push({ el: node, pseudo: pseudo || null, kind: kind, self: !!self });
        }
        // The SUBJECT may itself be the icon — selecting a masked <span> directly
        // (by pointer or through the Ancestors tree) is the common case for a
        // standalone icon (a column-visibility toggle, say). It gets a group so
        // the glyph can be swapped, but only the Glyph row: its tint/size/opacity
        // ARE the panel's own Color/Size/Box sections, and printing them twice
        // would give two rows editing the same property.
        push(el, null, true);
        ICON_PSEUDOS.forEach(function (p) { push(el, p); });
        // When the SUBJECT is the icon, its siblings are the other icons of the
        // same control (a glyph and its active dot). Pointer-picking a button
        // lands on whichever child is topmost, so "I selected the button" often
        // means the glyph got pinned — listing the siblings makes the section
        // show the whole control either way, instead of one lonely icon.
        if (out.length && out[0].self && el.parentElement && !isOwn(el.parentElement)) {
            var sibs = el.parentElement.children;
            for (var sx = 0; sx < sibs.length; sx++) {
                if (sibs[sx] !== el && !isOwn(sibs[sx])) push(sibs[sx], null);
            }
        }
        if (el.querySelectorAll) {
            var all = el.querySelectorAll('*');
            for (var i = 0; i < all.length && out.length < ICON_SCAN_LIMIT; i++) {
                if (isOwn(all[i])) continue;
                push(all[i], null);
                ICON_PSEUDOS.forEach(function (p) { push(all[i], p); });
            }
        }
        return out;
    }
    // Rows below deliberately don't reuse colorRow/dimsRow: those read value and
    // `edited` off editSubject(), which here is the WRAPPER — and can't read a
    // pseudo-element at all. Same markup, both read through the target helpers.
    function iconTintRow(t, prop, map) {
        var val = tgtComputed(t, prop);
        var edited = !!tgtOverride(t, prop);
        var rgb = parseColorToRgb(val);
        if (!rgb) return rowHtml('Tint', esc(val), val, editAttrForColor(prop), edited);
        var hex = rgbToHex(rgb);
        return coreRowHtml('Tint', '<span class="davinci-live-editor-swatch" style="background:' + hex + '"></span>' + hex,
            hex, editAttrForColor(prop), edited, tokenTag(map.color[rgb]));
    }
    function iconSizeRow(t) {
        // An <sf-symbol> is sized by FONT-SIZE, not width/height: the component
        // sets its own `width: <n>em` per symbol so each glyph keeps its real
        // aspect ratio, and its inner <svg> is em-sized too. Writing width/height
        // therefore resizes the box and leaves the drawing exactly as it was — so
        // this offers the one control that actually scales it. One value, no
        // padlock: the ratio is the symbol's own and can't be broken.
        if (t.kind.sfGlyph) {
            var fs = Math.round(parseFloat(tgtComputed(t, 'fontSize')) || 0);
            return spaceRowHtml('Size',
                '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="fontSize" data-min="1">' + fs + '</span>' +
                ' <span class="davinci-live-editor-note">px (SF Symbols scale by font-size)</span>',
                !!tgtOverride(t, 'fontSize'));
        }
        var edited = !!(tgtOverride(t, 'width') || tgtOverride(t, 'height'));
        var inner =
            '<span class="davinci-live-editor-side-label">W</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="width">' + Math.round(parseFloat(tgtComputed(t, 'width')) || 0) + '</span>' +
            '<span class="davinci-live-editor-side-sep">×</span>' +
            '<span class="davinci-live-editor-side-label">H</span>' +
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="number" data-prop="height">' + Math.round(parseFloat(tgtComputed(t, 'height')) || 0) + '</span>' +
            ' <span class="davinci-live-editor-note">px</span>' +
            ratioLockHtml();
        return spaceRowHtml('Size', inner, edited);
    }
    // Resizing a MASKED icon means resizing the element AND its mask together.
    // The element box is just a painted rectangle (background-color) that the
    // mask cuts the glyph out of, so growing the box alone grows the transparent
    // area around the drawing — the glyph stays exactly the same size and only
    // the gap to its neighbours (e.g. the active dot) opens up. That is the bug
    // this scales away from: this project's icons carry a per-icon literal
    // `mask-size` in px (see .es-icon--filter in es-individuals/css/layout.css,
    // deliberately LARGER than the element so the SVG's internal padding is
    // cropped), which does not follow the element. `contain`/`cover`/percentage
    // mask-sizes do follow it and are left untouched.
    function maskSizePx(t) {
        var v = tgtComputed(t, 'maskSize') || tgtComputed(t, 'webkitMaskSize') || '';
        // Only a single-layer, two-value px size is scalable. A dilation stack is
        // a comma list ("contain, contain, …") and is handled by Weight instead.
        if (v.indexOf(',') !== -1) return null;
        var m = /^\s*([\d.]+)px\s+([\d.]+)px\s*$/.exec(v);
        return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : null;
    }
    // Scales the mask by the same factor the element box changed by, so the
    // drawing grows with its box and keeps the crop the literal mask-size
    // encodes. Always computed from the size sampled when the edit OPENED
    // (base*), never from the current value — chaining per-keystroke rescales
    // would compound rounding and make "50" typed digit-by-digit land somewhere
    // else than "50" pasted at once.
    function scaleMaskFromBase(t, base, baseW, baseH, newW, newH) {
        if (!base || !baseW || !baseH) return;
        // Per-axis: these icons have independent crops (23.4 × 23.8 for a square
        // glyph), so driving both axes off one factor would distort them.
        var next = round2(base.w * (newW / baseW)) + 'px ' + round2(base.h * (newH / baseH)) + 'px';
        tgtWrite(t, 'maskSize', next);
        tgtWrite(t, 'webkitMaskSize', next);
        tgtLog(t, 'maskSize', next, false);
        tgtLog(t, 'webkitMaskSize', next, false);
    }
    // WEIGHT — BOLDER ONLY, and that limit is real, not laziness.
    //
    // A masked glyph's stroke is baked into the SVG path and only the `regular`
    // weight ships in assets/icons/regular/, so there is no lighter file to swap
    // to. Thickening works by UNIONING nine offset copies of the mask
    // (`mask-composite: add`) — a dilation.
    //
    // ⛔ Thinning by the dual operation (INTERSECTION of the copies, an erosion)
    // was tried and REVERTED. Mask compositing multiplies layer alpha, and an
    // icon at its real size is mostly anti-aliased edge: at 22px the strokes of
    // a typical UI glyph are ~1.5px, so intersecting even two layers drives that
    // partial alpha to zero and the icon disappears outright. It only survived
    // on a 44px chevron whose stroke has a thick opaque core — i.e. exactly the
    // case real UI icons aren't. feMorphology erode (true morphology, no alpha
    // multiplication) was tried next and doesn't survive being referenced as a
    // CSS mask here either. Both were verified visually at 22px before removal:
    // the icon vanished. If a thinner icon is needed, pick a lighter glyph.
    //
    // ⛔ Do NOT "simplify" this into `filter: drop-shadow(...)` copies. That was
    // the first implementation and it is a no-op on a masked element: filter runs
    // BEFORE the mask in the rendering pipeline, so the very spill that would
    // thicken the glyph is then clipped away by the mask itself. Verified side by
    // side — the filtered glyph was pixel-identical to the untouched one.
    var ICON_WEIGHT_OPTIONS = '0,0.25,0.5,0.75,1,1.5,2';
    var ICON_MASK_PROPS = ['maskImage', 'webkitMaskImage', 'maskPosition', 'webkitMaskPosition',
                           'maskSize', 'webkitMaskSize', 'maskRepeat', 'webkitMaskRepeat',
                           'maskComposite', 'webkitMaskComposite'];
    // Weight per icon target. Kept in JS rather than read back from the computed
    // mask: a pseudo-element has no inline style to store it on, and re-deriving
    // it from a resolved multi-layer `mask-position` is guesswork.
    var iconWeights = [];
    function iconWeightRec(t, create) {
        for (var i = 0; i < iconWeights.length; i++) {
            if (iconWeights[i].el === t.el && iconWeights[i].pseudo === t.pseudo) return iconWeights[i];
        }
        if (!create) return null;
        var rec = { el: t.el, pseudo: t.pseudo, n: 0 };
        iconWeights.push(rec);
        return rec;
    }
    function iconWeightOf(t) {
        var rec = iconWeightRec(t, false);
        return rec ? String(rec.n) : '0';
    }
    // ── attribute glyph swap (<sf-symbol name>, <img src>) ─────
    // Two icon kinds pick their glyph with an ATTRIBUTE rather than a style: an
    // `<sf-symbol>` names the symbol it renders, and an `<img>` points at a file
    // (it has no mask — the file IS what paints it). Same "remember the original
    // so Reset/undo/export can restore or report it" shape as offsetRec/
    // iconWeightRec above, just keyed on the attribute instead of a computed
    // style. One store serves both kinds; `attr` says which one this entry owns,
    // so an element could in principle carry both without them colliding.
    var attrOverrides = [];   // [{ el, attr, original }]
    // The two attribute names the store owns. Consulted wherever the edit log is
    // walked, so an entry whose `prop` is an ATTRIBUTE is never mistaken for a
    // CSS property and written to `el.style` or printed as a declaration.
    var ATTR_PROPS = { name: 1, src: 1 };
    function attrOverride(el, attr) {
        for (var i = 0; i < attrOverrides.length; i++) {
            if (attrOverrides[i].el === el && attrOverrides[i].attr === attr) return attrOverrides[i];
        }
        return null;
    }
    function applyAttr(t, attr, value) {
        var rec = attrOverride(t.el, attr);
        if (!rec) { attrOverrides.push({ el: t.el, attr: attr, original: t.el.getAttribute(attr) }); }
        t.el.setAttribute(attr, value);
        logEdit(t.el, attr, value, false, t.pseudo);
    }
    function clearAttr(t, attr) {
        var rec = attrOverride(t.el, attr);
        if (rec) {
            // A null original means the attribute wasn't there to begin with —
            // restoring it as the string "null" would paint a broken glyph.
            if (rec.original === null) t.el.removeAttribute(attr);
            else t.el.setAttribute(attr, rec.original);
            attrOverrides.splice(attrOverrides.indexOf(rec), 1);
        }
        unlogEdit(t.el, attr, false, t.pseudo);
    }
    // Nine copies at weight > 0: the glyph itself plus eight around it (axes +
    // diagonals), unioned by the default `add`/`source-over` mask compositing.
    var ICON_DILATE_DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
    function applyIconMask(t, url, n) {
        if (!url) return;
        var dirs = n > 0 ? ICON_DILATE_DIRS : [[0, 0]];
        var spread = n > 0 ? n : 0;
        var image = dirs.map(function () { return 'url("' + url + '")'; }).join(', ');
        var position = dirs.map(function (v) {
            return 'calc(50% + ' + round2(v[0] * spread) + 'px) calc(50% + ' + round2(v[1] * spread) + 'px)';
        }).join(', ');
        var size = dirs.map(function () { return 'contain'; }).join(', ');
        var repeat = dirs.map(function () { return 'no-repeat'; }).join(', ');
        // Union the copies. The -webkit- twin takes the old Blink/WebKit keyword
        // set (source-over), not the modern one (add).
        var comp = dirs.map(function () { return 'add'; }).join(', ');
        var wComp = dirs.map(function () { return 'source-over'; }).join(', ');
        // -webkit- twins throughout: Safari still needs them, and a half-written
        // pair leaves the old single-layer mask painting underneath.
        var vals = { maskImage: image, webkitMaskImage: image, maskPosition: position, webkitMaskPosition: position,
                     maskSize: size, webkitMaskSize: size, maskRepeat: repeat, webkitMaskRepeat: repeat,
                     maskComposite: comp, webkitMaskComposite: wComp };
        ICON_MASK_PROPS.forEach(function (prop) {
            tgtWrite(t, prop, vals[prop]);
            tgtLog(t, prop, vals[prop], false);
        });
        iconWeightRec(t, true).n = n;
    }
    function clearIconMask(t) {
        ICON_MASK_PROPS.forEach(function (prop) {
            tgtWrite(t, prop, '');
            unlogEdit(t.el, prop, false, t.pseudo);
        });
        var rec = iconWeightRec(t, false);
        if (rec) iconWeights.splice(iconWeights.indexOf(rec), 1);
    }
    function iconWeightRow(t) {
        if (t.kind.tint !== 'backgroundColor' || !maskUrlOf(t.el, t.pseudo)) return '';
        var cur = iconWeightOf(t);
        return spaceRowHtml('Weight',
            '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="select" data-prop="__iconWeight" data-options="' + ICON_WEIGHT_OPTIONS + '">' + esc(cur) + '</span>' +
            ' <span class="davinci-live-editor-note">px bolder (thinner isn\'t possible — see Glyph)</span>',
            cur !== '0');
    }
    function iconOpacityRow(t) {
        return rowHtml('Opacity', esc(tgtComputed(t, 'opacity')), tgtComputed(t, 'opacity'),
            'data-edit="number" data-prop="opacity" data-unit="" data-step="0.05" data-min="0" data-max="1"', !!tgtOverride(t, 'opacity'));
    }
    // Swap WHICH glyph is drawn. Three independent write paths share this one row,
    // because the three icon kinds name their glyph in three different places:
    // an <sf-symbol> (t.kind.sfGlyph) writes its `name` attribute, an
    // `<img src=".svg">` (t.kind.imgGlyph) writes its `src`, and a masked element
    // writes `mask-image` — see openGlyphPicker, which branches the same three
    // ways. For the two file-based kinds the value edited is just the file name;
    // the directory is carried over from the URL already in place, so there's no
    // path to guess and no project layout assumed (see swapMaskFile, which also
    // tolerates a name typed without ".svg"). A non-SVG `<img>` (a photo/raster
    // asset) gets no row: there's no sibling file to swap it for.
    function iconGlyphRow(t) {
        if (t.kind.sfGlyph) {
            // No data-mask-dir: an SF Symbol is named, not a path, so there is no
            // directory to carry over. The picker reads that absence as "this is
            // the sf-symbol path".
            var sfName = t.el.getAttribute('name') || '';
            return rowHtml('Glyph', esc(sfName), sfName,
                'data-edit="glyph" data-prop="name"', !!attrOverride(t.el, 'name'));
        }
        if (t.kind.imgGlyph) {
            var isrc = t.el.getAttribute('src') || '';
            var edited2 = !!attrOverride(t.el, 'src');
            return rowHtml('Glyph', esc(isrc.split('/').pop()), isrc.split('/').pop(),
                'data-edit="glyph" data-prop="src" data-mask-dir="' + esc(isrc.replace(/[^/]*$/, '')) + '"', edited2);
        }
        var url = maskUrlOf(t.el, t.pseudo);
        if (!url) return '';
        var edited = !!tgtOverride(t, 'maskImage') || !!tgtOverride(t, 'webkitMaskImage');
        return rowHtml('Glyph', esc(url.split('/').pop()), url.split('/').pop(),
            'data-edit="glyph" data-prop="maskImage" data-mask-dir="' + esc(url.replace(/[^/]*$/, '')) + '"', edited);
    }
    // Editable-only: on live hover the panel is read-only, and the Element
    // section's own "Icon" row already names the glyph.
    function iconSectionRows(el, map, editable) {
        lastIconTargets = [];
        if (!editable) return '';
        // A "self" group (the subject IS the icon) is worth its own group only
        // for a REAL, named icon (mask/svg/sf-symbol/img) — the generic dot/shape
        // fallback in iconKind() would otherwise turn any small rounded box the
        // hover happens to land on into a noisy, glyph-less Icons section.
        var icons = iconTargets(el).filter(function (t) {
            return !t.self || !t.kind.generic;
        });
        if (!icons.length) return '';
        return icons.map(function (t, i) {
            lastIconTargets.push({ el: t.el, pseudo: t.pseudo });
            var where = t.pseudo ? nodeDesc(t.el) + t.pseudo : (t.self ? nodeDesc(t.el) + ' — this element' : nodeDesc(t.el));
            return '<div class="davinci-live-editor-icon" data-icon-target="' + i + '">' +
                '<div class="davinci-live-editor-icon__head">' +
                    '<span class="davinci-live-editor-icon__name">' + esc(t.kind.name) + '</span>' +
                    '<span class="davinci-live-editor-icon__node" data-copy="' + esc(where) + '">' + esc(where) + '</span>' +
                '</div>' +
                iconGlyphRow(t) +
                (t.kind.tint ? iconTintRow(t, t.kind.tint, map) : '') +
                iconWeightRow(t) +
                iconSizeRow(t) +
                offsetRow(t) +
                iconOpacityRow(t) +
                '</div>';
        }).join('');
    }
    function renderPanel(el) {
        if (!el) {
            // Also the state the panel opens in (see startPicking), so this says what
            // to do next rather than just reporting emptiness. Hover alone does
            // nothing now — the crosshair has to be armed first — so this names that.
            ui.body.innerHTML = '<div class="davinci-live-editor-empty">' +
                'Click the crosshair above, then click an element to inspect it.' +
                '<br><span class="davinci-live-editor-empty__alt">Or hold ⌥ and click any element.</span></div>';
            pendingFocus = null;   // nothing to land on — the body holds no fields now
            syncPickHint();   // the click-gesture hint belongs on screen from the start
            return;
        }
        var map = buildTokenMaps();
        var cs = getComputedStyle(el);
        var b = boxes(el);
        var tag = el.tagName.toLowerCase();
        var idRows = rowHtml('Tag', esc(tag), tag);
        if (el.id) idRows += rowHtml('ID', esc(el.id), el.id);
        if (el.classList.length) {
            var cl = Array.prototype.slice.call(el.classList).join(' ');
            idRows += rowHtml('Classes', esc(cl), cl);
        }
        var icon = iconOf(el);
        if (icon) idRows += rowHtml('Icon', esc(icon), icon);
        idRows += ancestorChainHtml(el);
        idRows += columnRowHtml(el);

        // Editing (color picker, inline number/text fields) is available once
        // an element is selected — either way
        // the element being shown is stable, not still tracking the live hover.
        var subj = editSubject();
        var editable = el === subj;

        // The bounding-box switch rides in SIZE, under the dimensions it annotates.
        var sizeRow = dimsRow(b, editable) + boundingBoxRow();
        var spacing = spaceRow('Padding', b.p, map, editable, 'padding') + spaceRow('Margin', b.m, map, editable, 'margin');

        // COLOR block = the DEFAULT (resting) state. While inspecting, the mouse
        // is over the element, so getComputedStyle reports :hover values for any
        // property with a hover variant. Prefer the default value read straight
        // from the stylesheets; fall back to computed when no plain rule sets it.
        // EXCEPTION: winningRule() only reads stylesheet rules, never inline
        // style — so once this prop has a live inline override (an edit made
        // right here in the panel), it must win over the stale declared value,
        // else the swatch/hex freezes on the pre-edit color forever.
        var dText = winningRule(el, ['color'], 'default');
        var textOverride = editable && subj.style.color;
        var colorRows = colorRow('Text', textOverride ? cs.color : (dText ? resolveVar(dText, map) : cs.color), map, editable, 'color');
        var bgOverride = editable && subj.style.backgroundColor;
        var bgDefault = bgOverride ? null : resolveBg(el, 'default');
        colorRows += bgOverride
            ? colorRow('Background', cs.backgroundColor, map, editable, 'backgroundColor')
            : (bgDefault
                ? hoverColorRow('Background', bgDefault.val, map, bgDefault.node === el ? null : bgDefault.node, editable, 'backgroundColor')
                : bgRow(el, map, editable));
        // Border's default (resting) color is NOT repeated here — it lives in
        // Box → Border alongside width/style, the complete picture in one
        // place. The Hover section below keeps its own Border row: that one
        // shows the :hover-state color, which has no Box equivalent.

        var fs = parseFloat(cs.fontSize);
        var ff = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
        var lhPx = parseFloat(cs.lineHeight);
        var fsEditAttrs = editable ? 'data-edit="number" data-prop="fontSize"' : null;
        var fwEditAttrs = editable ? 'data-edit="number" data-prop="fontWeight" data-unit=""' : null;
        var lhEditAttrs = editable ? 'data-edit="number" data-prop="lineHeight"' : null;
        var ffEditAttrs = editable ? 'data-edit="text" data-prop="fontFamily"' : null;
        var typo = rowHtml('Base', round2(map.rootFont) + 'px = 1rem', round2(map.rootFont) + 'px') +
            coreRowHtml('Font size', round2(fs) + 'px', cs.fontSize, fsEditAttrs, editable && subj.style.fontSize, tokenTag(map.font[Math.round(fs)]) + remNote(declaredRem(el, ['font-size'], map))) +
            rowHtml('Weight', esc(cs.fontWeight), cs.fontWeight, fwEditAttrs, editable && subj.style.fontWeight) +
            rowHtml('Line height', esc(cs.lineHeight) + remNote(lineHeightNote(el, lhPx, fs, map)), cs.lineHeight, lhEditAttrs, editable && subj.style.lineHeight) +
            rowHtml('Family', esc(ff), ff, ffEditAttrs, editable && subj.style.fontFamily);

        // BOX block. Read-only (live hover), each row appears only when the
        // element actually HAS that property — a panel that just tracks the
        // cursor shouldn't list "Shadow: none / Opacity: 1" on everything.
        // EDITABLE (something is selected), every row always renders, even at its
        // default: this is where you ADD a border/radius/shadow/opacity, and a
        // row that's hidden precisely because the value is still default is a
        // row you can never use. That gap showed up when retargeting from a
        // bordered <td> up to its <tr> via the Ancestors tree — the whole Box
        // section vanished, so the row couldn't be given a border at all.
        var boxRows = '';
        if (editable || /[1-9]/.test(cs.borderRadius)) {
            var brEditAttrs = editable ? 'data-edit="number" data-prop="borderRadius"' : null;
            boxRows += rowHtml('Radius', esc(cs.borderRadius) + tokenTag(map.len[Math.round(parseFloat(cs.borderRadius))]) + remNote(declaredRem(el, ['border-radius'], map)), cs.borderRadius, brEditAttrs, editable && subj.style.borderRadius);
        }
        if (editable || b.bw.some(function (x) { return x > 0; })) {
            // STROKE POSITION. CSS has no "border position": a border always
            // occupies the border box, so inside/center/outside can't be
            // expressed with border-* at all. `outline` can — it paints outside
            // the border box, takes no layout space, and `outline-offset` slides
            // it inward, so offset 0 / -w/2 / -w gives outside / center / inside
            // off one mechanism. `layout` keeps the plain CSS border (the only
            // one of the four that actually occupies space).
            var strokePos = strokePositionOf(cs);
            var useOutline = strokePos !== 'layout';
            var wProp = useOutline ? 'outlineWidth' : 'borderWidth';
            var sProp = useOutline ? 'outlineStyle' : 'borderStyle';
            var cProp = useOutline ? 'outlineColor' : 'borderColor';
            var sw = useOutline ? (parseFloat(cs.outlineWidth) || 0) : b.bw[0];
            var sst = useOutline ? cs.outlineStyle : cs.borderTopStyle;
            var bc = parseColorToRgb(useOutline ? cs.outlineColor : cs.borderTopColor);
            var bcHex = bc ? rgbToHex(bc) : (useOutline ? cs.outlineColor : cs.borderTopColor);
            var bv = round2(sw) + 'px ' + sst + ' ' + bcHex;
            if (!editable) {
                boxRows += rowHtml('Border', esc(bv) + remNote(declaredRem(el, ['border-width', 'border-top-width', 'border'], map)), bv);
            } else {
                // Width 0 + style 'none' is a perfectly valid starting point here:
                // typing a width auto-promotes the style to 'solid' (see the
                // borderWidth branch in openInlineEdit's input handler), so a
                // border-less element gets a visible border from this row alone.
                var innerBorder =
                    '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side davinci-live-editor-border-part" data-edit="number" data-prop="' + wProp + '"' + (useOutline ? ' data-stroke-pos="' + strokePos + '"' : '') + '>' + round2(sw) + 'px</span>' +
                    ' <span class="davinci-live-editor-row__val--editable davinci-live-editor-side davinci-live-editor-border-part" data-edit="select" data-prop="' + sProp + '" data-options="' + BORDER_STYLE_OPTIONS + '">' + esc(sst) + '</span>' +
                    ' <span class="davinci-live-editor-row__val--editable davinci-live-editor-side davinci-live-editor-core" ' + editAttrForColor(cProp) + '><span class="davinci-live-editor-swatch" style="background:' + bcHex + '"></span>' + bcHex + '</span>';
                boxRows += spaceRowHtml('Border', innerBorder,
                    subj.style.borderWidth || subj.style.borderStyle || subj.style.borderColor || subj.style.outlineWidth);
                boxRows += spaceRowHtml('Position',
                    '<span class="davinci-live-editor-row__val--editable davinci-live-editor-side" data-edit="select" data-prop="__strokePos" data-options="' + STROKE_POS_OPTIONS + '">' + esc(strokePos) + '</span>' +
                    ' <span class="davinci-live-editor-note">' + (useOutline ? 'no layout shift' : 'occupies space') + '</span>',
                    !!subj.style.outlineWidth);
            }
        }
        var shadowEditAttrs = editable ? 'data-edit="text" data-prop="boxShadow"' : null;
        if (editable || (cs.boxShadow && cs.boxShadow !== 'none')) boxRows += rowHtml('Shadow', esc(cs.boxShadow), cs.boxShadow, shadowEditAttrs, editable && subj.style.boxShadow);
        // Opacity is a 0–1 ratio, so it steps in hundredths and is clamped to the
        // spec's range — a whole-number step made the field jump straight from
        // 1 to 0 (or to values the browser silently clamps anyway).
        var opEditAttrs = editable ? 'data-edit="number" data-prop="opacity" data-unit="" data-step="0.05" data-min="0" data-max="1"' : null;
        if (editable || (cs.opacity && cs.opacity !== '1')) boxRows += rowHtml('Opacity', esc(cs.opacity), cs.opacity, opEditAttrs, editable && subj.style.opacity);

        // HOVER block = only the properties that CHANGE on :hover, showing the
        // hover value alone (the default lives in the COLOR block above). Both
        // states are read from the stylesheets, not getComputedStyle (the mouse
        // is over the element while inspecting, so computed == hover). Editable
        // via a scoped :hover stylesheet override (setHoverStyleProp) — inline
        // styles can't target a pseudo-class.
        // Live override exception: once the designer sets a hover override via
        // the picker, hoverOverrides (not any stylesheet rule) is the source of
        // truth for that prop — show it, and always show the row (skip the
        // hide-if-equals-default check below), since it's the value they just
        // set and may still want to tweak.
        var hoverRows = '';
        var liveHoverOv = (editable && hoverOverrides && hoverOverrides.el === subj) ? hoverOverrides.props : null;

        var hTextOv = liveHoverOv && liveHoverOv.color != null ? liveHoverOv.color : null;
        var hTextRaw = hTextOv || winningHover(el, ['color']);
        if (hTextOv) {
            hoverRows += hoverColorRow('Text', hTextOv, map, null, editable, 'color', true);
        } else if (hTextRaw) {
            var hTextRgb = parseColorToRgb(resolveVar(hTextRaw, map));
            var dTextRaw = winningRule(el, ['color'], 'default');
            var dTextRgb = parseColorToRgb(resolveVar(dTextRaw || cs.color, map));
            if (!hTextRgb || hTextRgb !== dTextRgb) hoverRows += hoverColorRow('Text', hTextRaw, map, null, editable, 'color', true);
        }

        var hBgOv = liveHoverOv && liveHoverOv.backgroundColor != null ? liveHoverOv.backgroundColor : null;
        if (hBgOv) {
            hoverRows += hoverColorRow('Background', hBgOv, map, null, editable, 'backgroundColor', true);
        } else {
            var hBg = resolveBg(el, 'hover');
            if (hBg) {
                var hBgRgb = parseColorToRgb(resolveVar(hBg.val, map));
                var dBg = resolveBg(el, 'default');
                var dBgRgb = dBg ? parseColorToRgb(resolveVar(dBg.val, map)) : null;
                if (!hBgRgb || hBgRgb !== dBgRgb) {
                    hoverRows += hoverColorRow('Background', hBg.val, map, hBg.node === el ? null : hBg.node, editable, 'backgroundColor', true);
                }
            }
        }

        var hBorderOv = liveHoverOv && liveHoverOv.borderColor != null ? liveHoverOv.borderColor : null;
        var hBorderRaw = hBorderOv || winningHover(el, ['border-color', 'border-top-color', 'border']);
        if (hBorderOv) {
            hoverRows += hoverColorRow('Border', hBorderOv, map, null, editable, 'borderColor', true);
        } else if (hBorderRaw) {
            var hBorderRgb = parseColorToRgb(resolveVar(hBorderRaw, map));
            var dBorderRaw = winningRule(el, ['border-color', 'border-top-color', 'border'], 'default');
            var dBorderRgb = parseColorToRgb(resolveVar(dBorderRaw || cs.borderTopColor, map));
            if (!hBorderRgb || hBorderRgb !== dBorderRgb) hoverRows += hoverColorRow('Border', hBorderRaw, map, null, editable, 'borderColor', true);
        }

        // Every section always renders, including while the Ancestors tree is open:
        // the tree has no scroll area of its own (it always opens WHOLE — see
        // .davinci-live-editor-tree) and simply pushes the spec sections down, which
        // stay reachable through the panel body's own single scroll. Deliberately
        // NOT hiding them while the tree is open: a panel that empties out reads
        // as broken, and one scrollbar for the whole panel is calmer than a
        // nested one inside the tree.
        ui.body.innerHTML =
            section('Element', idRows, clearSelectionBtnHtml()) +
            section('Size', sizeRow) +
            section('Spacing', spacing) +
            section('Color', colorRows) +
            section('Box', boxRows) +
            section('Layout', layoutRows(el, cs, editable)) +
            section('Icons', iconSectionRows(el, map, editable)) +
            section('Hover', hoverRows) +
            section('Typography', typo);
        markTabStops();
        restorePendingFocus();
        syncPickHint();
    }

    // ── keyboard: one tab ring through the panel's fields ────
    // Every editable value renders as a plain <span> that only swaps for a real
    // <input> once activated (see openInlineEdit) — so without this the whole
    // panel held no tab stops at all and a keyboard user could not reach a
    // single field. The spans stay spans (the compact "label until you edit it"
    // look is deliberate); they just become focusable, activate on Enter/Space
    // like the button they behave as, and step to the next field on Tab.
    function markTabStops() {
        var chips = ui.body.querySelectorAll('[data-edit]');
        for (var i = 0; i < chips.length; i++) {
            var chip = chips[i];
            chip.setAttribute('tabindex', '0');
            chip.setAttribute('role', 'button');
            // Announce the row it belongs to, not just its bare number: four
            // sibling chips reading "12 · 8 · 12 · 8" are indistinguishable
            // otherwise. The T/R/B/L (or W/H) marker sits in a preceding sibling
            // span, outside the chip, so it has to be picked up separately.
            var row = chip.closest('.davinci-live-editor-row');
            var rowLabel = row ? row.querySelector('.davinci-live-editor-row__label') : null;
            var sidePrev = chip.previousElementSibling;
            var side = sidePrev && sidePrev.classList.contains('davinci-live-editor-side-label') ? sidePrev.textContent : '';
            var name = ((rowLabel ? rowLabel.textContent : '') + ' ' + side).trim();
            chip.setAttribute('aria-label', (name ? name + ': ' : '') + chip.textContent.trim() + ' — edit');
        }
    }
    // The ring is every focusable thing in the panel BODY, in DOM order — the
    // value chips plus the real controls between them (the ratio padlock, the
    // Bounding box switch, Clear selection, the Ancestors button). Tab out of a
    // field therefore lands exactly where a native Tab would, instead of
    // skipping over controls that are only reachable by mouse.
    var TAB_STOP_SEL = '[data-edit],button,select,input,textarea,[tabindex="0"]';
    function tabStops(exclude) {
        // No visibility filter: renderPanel never emits a hidden row — a row that
        // doesn't apply simply isn't in the HTML — so everything matched here is
        // on screen. (The switches' real <input> is 0×0 and transparent by
        // design; it is a genuine tab stop, and any size-based test would drop it.)
        var all = ui.body.querySelectorAll(TAB_STOP_SEL), out = [];
        for (var i = 0; i < all.length; i++) {
            var n = all[i];
            if (n.disabled || n.getAttribute('tabindex') === '-1') continue;
            // The open editor's own <input> and its ↺ Reset live INSIDE the chip
            // being edited; the ring is the chips themselves, so skip anything
            // nested in the excluded node.
            if (exclude && exclude !== n && exclude.contains(n)) continue;
            out.push(n);
        }
        return out;
    }
    // A chip's identity across a re-render: kind + property is unique within one
    // panel (each CSS property gets at most one row). Non-chip stops have no such
    // key and fall back to their index, which is stable because a commit re-renders
    // the SAME element with the same sections.
    function tabStopKey(node) {
        var kind = node.getAttribute && node.getAttribute('data-edit');
        return kind ? kind + '|' + (node.getAttribute('data-prop') || '') : null;
    }
    function queueFocus(node, index, open) {
        pendingFocus = { key: tabStopKey(node), index: index, open: !!open };
    }
    // Consumed by the render that follows a keyboard commit — see pendingFocus.
    function restorePendingFocus() {
        if (!pendingFocus) return;
        var want = pendingFocus;
        pendingFocus = null;
        var node = null;
        if (want.key) {
            var chips = ui.body.querySelectorAll('[data-edit]');
            for (var i = 0; i < chips.length && !node; i++) {
                if (tabStopKey(chips[i]) === want.key) node = chips[i];
            }
        }
        if (!node && want.index != null) {
            var ring = tabStops(null);
            node = ring[want.index] || null;
        }
        if (!node) return;
        // Tabbing is the one path that MAY need to scroll: the next field can be below
        // the fold. `block: 'nearest'` scrolls the minimum amount and does nothing at all
        // when the chip is already fully visible, so walking a group that fits on screen
        // never moves the panel. Done here, before focusing, because the focus calls
        // themselves are all preventScroll now.
        if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        // Focus the chip FIRST, then open it: openInlineEdit bails out if the
        // selection went away underneath us, and this way the keyboard still
        // lands on the panel instead of falling back to <body>.
        node.focus({ preventScroll: true });
        // Tabbing INTO a field opens it, so the value is typeable straight away —
        // the same thing clicking it does. Color/glyph chips are left focused but
        // closed: their editor is a popover over the canvas, too heavy to throw up
        // on every Tab. Enter opens those.
        var kind = node.getAttribute && node.getAttribute('data-edit');
        if (want.open && (kind === 'number' || kind === 'text' || kind === 'select')) openInlineEdit(node, kind);
    }
    // Tab/⇧Tab from inside an open field: commit what was typed, then open the
    // next/previous field. Without this the input's blur tore the panel down and
    // re-rendered it, dropping focus back to <body> — one Tab and the keyboard
    // was out of the panel entirely. Field-to-field is deliberately ONE press:
    // walking Padding T→R→B→L is the case this exists for, so the open field's
    // own ↺ Reset is stepped over rather than made a stop of its own (it stays a
    // mouse target; Escape is the keyboard's way to back out of an edit).
    function stepFromInlineEdit(back) {
        if (!activeInlineEdit) return;
        var chip = activeInlineEdit.target;
        var ring = tabStops(chip);
        var i = ring.indexOf(chip);
        var at = i + (back ? -1 : 1);
        var next = i === -1 ? null : ring[at];
        // At either end of the body there is nothing left to step to. Commit and
        // leave the keyboard on the chip rather than wrapping around: one more
        // (native, un-intercepted) Tab then walks out of the panel normally, so
        // this never becomes a focus trap.
        if (next) queueFocus(next, at, true);
        else queueFocus(chip, null, false);
        commitActiveInlineEditNow();
        // commitActiveInlineEditNow renders synchronously, which consumes
        // pendingFocus. Nothing to do here but let it.
    }
    // Shared by the click handler and the Enter/Space keyboard path, so a chip
    // opens the same way however it was reached.
    function activateChip(chip) {
        if (!editSubject()) return;
        var kind = chip.getAttribute('data-edit');
        if (kind === 'glyph') openGlyphPicker(chip);
        else if (kind === 'color') openColorEditor(chip, false);
        else if (kind === 'hovercolor') openColorEditor(chip, true);
        // Already mid-edit: let the input/reset button inside handle their own
        // click instead of tearing the edit down and rebuilding it.
        else if ((kind === 'number' || kind === 'text' || kind === 'select') && !chip.classList.contains('davinci-live-editor-inline-editing')) openInlineEdit(chip, kind);
    }
    // Enter/Space on a focused chip = clicking it. Space is swallowed so it can't
    // also scroll the panel body underneath.
    function onPanelBodyKey(e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        var chip = e.target.closest ? e.target.closest('[data-edit]') : null;
        if (!chip || chip.classList.contains('davinci-live-editor-inline-editing')) return;
        e.preventDefault();
        e.stopPropagation();
        activateChip(chip);
    }

    // ── copy ─────────────────────────────────────────────────
    function fallbackCopy(text) {
        var t = document.createElement('textarea');
        t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t);
    }
    function copy(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
        } else { fallbackCopy(text); }
    }
    // A token tag (data-copy) can be nested INSIDE an editable color row
    // (data-edit) — e.g. clicking the hex/swatch opens the editor, but the
    // token badge next to it should only ever copy the token name. A single
    // combined closest() finds whichever attribute is NEAREST to the actual
    // click: the token (if the click landed on/inside it) wins over the
    // ancestor row's data-edit; otherwise the row's own data-edit applies.
    function onCopyClick(e) {
        // Ancestors row's own button — expands/collapses the element tree. Checked
        // first: it carries no data-edit/data-copy, so it must not fall through
        // to the copy path.
        if (e.target.closest && e.target.closest('[data-ratio-lock]')) { setRatioLock(!ratioLock); return; }
        if (e.target.closest && e.target.closest('[data-ancestors-toggle]')) { toggleAncestorsTree(); return; }
        if (e.target.closest && e.target.closest('[data-clear-sel]')) { clearSelectedElement(); return; }
        // A level in the expanded Ancestors tree — retargets the whole panel
        // (display + live edit subject) to that element, whether it's an
        // ancestor of the current one or a point further down the same fixed
        // line (see ancestorsLine/ancestorChainHtml). Collapses the tree on the way
        // out: you picked your subject, so the specs below it are what you now
        // want to read, and reopening is one click. Checked ahead of
        // data-edit/data-copy, a distinct interactive kind.
        var colBtn = e.target.closest ? e.target.closest('[data-col-select]') : null;
        if (colBtn) {
            var colSubj = editSubject();     // the selected cell
            if (colScope && colSubj === colScope.cell) {
                var backTo = colScope.cell;  // toggle OFF: drop the column mirror, keep the cell selected
                clearColMirror();
                positionOverlay(backTo);     // shrink the overlay back to the cell — it was spanning the column
                renderPanel(backTo);
            } else if (colSubj) {
                enterColumnMode(colSubj);    // level 0 = the level the clicked cell itself sits at
            }
            return;
        }
        var ancestorChip = e.target.closest ? e.target.closest('[data-ancestor-index]') : null;
        if (ancestorChip) {
            var ancestorEl = lastAncestorChain[parseInt(ancestorChip.getAttribute('data-ancestor-index'), 10)];
            closeAncestorsTree(true); // skip its render — select() renders the new subject right after
            if (ancestorEl) select(ancestorEl);
            return;
        }
        var target = e.target.closest ? e.target.closest('[data-edit],[data-copy]') : null;
        if (!target) return;
        if (target.hasAttribute('data-copy')) {
            copy(target.getAttribute('data-copy'));
            target.classList.add('is-copied');
            setTimeout(function () { target.classList.remove('is-copied'); }, 900);
            return;
        }
        if (!editSubject()) return;
        activateChip(target);   // shared with the Enter/Space path — see onPanelBodyKey
    }

    // ── live value editors (color / hover-color / number / text) ────
    // Only reachable while an element is selected (a click with the crosshair
    // armed, ⌥+click being the one-off form) — see the `editable` gate in
    // renderPanel and editSubject().
    // Every edit is an inline style (or, for :hover properties, a scoped
    // stylesheet rule) on the picked element: a live preview, never written
    // back to any file. Each editor's Reset (↺) removes the override,
    // restoring the real CSS value.
    function closeEditor() {
        if (!activeEditor) return;
        activeEditor.remove();
        activeEditor = null;
        activeEditorTarget = null;
        colorSwatchJustBlurred = false;
    }
    // Called at every point `selected` changes or picking stops — drops the
    // color popover AND abandons any open inline edit. Safe to skip the
    // deferred renderPanel dance here: the caller renders fresh state for the
    // new/absent element right after anyway.
    function closeAllEditors() {
        closeEditor();
        if (activeInlineEdit) {
            activeInlineEdit = null;
        }
    }
    // Outside-click-to-close for the color popover. "Outside" means outside the
    // popover itself (`activeEditor`) — that includes the rest of the Live Editor
    // panel, not just the prototype: clicking elsewhere in the panel (or on the
    // prototype) closes the popover without needing the Close button.
    // - Click lands on real prototype/page content (not part of the Live Editor UI
    //   at all, per `isOwn`): swallow it (capture-phase + stopImmediatePropagation)
    //   so it never also reaches the prototype's own click handlers — its only
    //   job here was dismissing our popover.
    // - Click lands elsewhere in the Live Editor UI (e.g. a different editable row
    //   in the panel): don't swallow — let it bubble so that row's own click
    //   handler can open its own editor right after this one closes.
    // - Exception: clicking the swatch input opens the browser's native
    //   <input type="color"> picker, which lives outside our DOM; dismissing
    //   THAT (a click elsewhere right after the swatch blurs) must only close
    //   the native picker, not this whole popover. `colorSwatchJustBlurred` is
    //   set on the swatch's blur (fires on mousedown, before this click), so
    //   it's readable here — consumed once, for the very next click only.
    // - Exception: clicking the SAME chip that opened this popover (tracked in
    //   `activeEditorTarget`) must toggle-close it instead of closing and
    //   letting the click bubble on to reopen a fresh popover for it — swallow
    //   it here even though it's "part of the Live Editor UI".
    function onDocClickCapture(e) {
        if (!activeEditor) return;
        if (activeEditor.contains(e.target)) return;
        var clickedOwnTrigger = activeEditorTarget && activeEditorTarget.contains(e.target);
        if (!isOwn(e.target) || clickedOwnTrigger) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
        var dismissingSwatchOnly = colorSwatchJustBlurred;
        colorSwatchJustBlurred = false;
        if (dismissingSwatchOnly) return;
        closeEditor();
    }
    // ── edit log / "Copy prompt for Claude" ──────────────────
    // Every live edit (any element, any property) upserts here by identity
    // (el, prop, isHover); logging an empty/'' value removes the entry
    // instead — that's how a Reset click un-logs a property. Feeds the
    // footer export button so the designer can hand a plain-English summary
    // of the whole session's edits to Claude Code for it to locate the real
    // elements in the prototype's source and apply the same changes there.
    // `pseudo` ('::before'/'::after', or null/undefined for the element itself)
    // is part of the identity: a glyph drawn as ::before and its host button are
    // two independent edit targets that happen to share one node.
    function findEditLogEntry(el, prop, isHover, pseudo) {
        for (var i = 0; i < editLog.length; i++) {
            var e = editLog[i];
            if (e.el === el && e.prop === prop && !!e.isHover === !!isHover &&
                (e.pseudo || null) === (pseudo || null)) return e;
        }
        return null;
    }
    function logEdit(el, prop, value, isHover, pseudo) {
        if (value == null || value === '') { unlogEdit(el, prop, isHover, pseudo); return; }
        var entry = findEditLogEntry(el, prop, isHover, pseudo);
        if (entry) entry.value = value;
        else editLog.push({ el: el, prop: prop, value: value, isHover: !!isHover, pseudo: pseudo || null });
        updateExportFooter();
    }
    function unlogEdit(el, prop, isHover, pseudo) {
        var entry = findEditLogEntry(el, prop, isHover, pseudo);
        if (!entry) return;
        editLog.splice(editLog.indexOf(entry), 1);
        updateExportFooter();
    }
    function updateExportFooter() {
        if (!ui.footer) return;
        var n = editLog.length;
        ui.footer.style.display = n ? '' : 'none';
        if (ui.exportCount) ui.exportCount.textContent = n ? String(n) : '';
        updateDirtyFlag();
        scheduleSaveDraft();
    }
    function camelToKebab(prop) { return prop.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
    // Deliberately class-based, NOT id-based: an id (or a fully unique class
    // combo) describes only the one instance the designer happened to edit,
    // but a padding/color/etc. tweak on a table cell, card, list item, etc.
    // almost always belongs on the shared class — not scoped to that single
    // element. `shared` counts how many elements in the CURRENT DOM match
    // the same tag+class selector — shown as one of the scope choices the
    // designer picks from (see openExportPrompt), never assumed silently.
    function describeElementForPrompt(el) {
        var tag = el.tagName.toLowerCase();
        var classSel = el.classList.length ? '.' + Array.prototype.join.call(el.classList, '.') : '';
        var selector = tag + classSel;
        var shared = 1;
        if (classSel) {
            try { shared = document.querySelectorAll(selector).length; } catch (e) { shared = 1; }
        }
        var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (text.length > 40) text = text.slice(0, 40) + '…';
        return { selector: selector, text: text, shared: shared, id: el.id || '' };
    }
    // Table cells get 2 extra scope choices (row/column) beyond the generic
    // element/shared-style pair, since a row or a column is a meaningful,
    // easy-to-describe scope Claude can act on precisely. The row/column offer
    // is gated on a real <td>/<th> tag, so a table built out of divs simply
    // doesn't get it rather than getting it wrong. Column identity prefers
    // data-col-key/data-column (design-system tables that carry it mirror the
    // attribute on header AND body cells) over a raw index, since the key
    // survives column reordering and reads naturally in the prompt.
    function tableCellContext(el) {
        if (el.tagName !== 'TD' && el.tagName !== 'TH') return null;
        var tr = el.parentElement;
        if (!tr || tr.tagName !== 'TR') return null;
        var table = el.closest('table');
        if (!table) return null;
        var section = tr.parentElement;
        var colKey = el.getAttribute('data-col-key') || el.getAttribute('data-column') || null;
        // Grid position, not child index — a grouped header shifts the two apart
        // (see tableGridMap). `levels` is the group chain above this cell, so the
        // prompt can name "group X → column Y" instead of a bare number. opts[0] is
        // the cell's own level, which carries its grid start/span (one map build).
        var opts = columnScopeOptions(el);
        var own = opts[0];
        return {
            isHeaderRow: !!section && section.tagName === 'THEAD',
            colKey: colKey,
            colIndex: own ? own.start : -1,
            colSpan: own ? own.span : 1,
            levels: opts.filter(function (o) { return !o.headerOnly; }).map(function (o) { return o.label; })
        };
    }
    // Grouped by (element, pseudo): a `::before` glyph and its host button are two
    // different CSS rules to write, even though they share one node. Keying on the
    // element alone merged them into one block, which told Claude to apply the
    // pseudo-element's properties to the element itself.
    function groupEditLog() {
        var groups = [];
        editLog.forEach(function (entry) {
            var pseudo = entry.pseudo || null;
            var g = null;
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].el === entry.el && groups[i].pseudo === pseudo) { g = groups[i]; break; }
            }
            if (!g) { g = { el: entry.el, pseudo: pseudo, entries: [] }; groups.push(g); }
            g.entries.push(entry);
        });
        return groups;
    }
    function scopeNoteFor(scope, desc, tableCtx) {
        if (scope === 'shared') {
            return desc.shared > 1
                ? ' — apply to every element matching this same selector (' + desc.shared + ' found in this view), not just this one'
                : ' — scope narrowly to just this one element (no other exact match found in this view)';
        }
        if (scope === 'row') return ' — apply to every cell in this same table row' + (tableCtx && tableCtx.isHeaderRow ? ' (a header row)' : '') + ', not just this one';
        if (scope === 'column') {
            // Name the level chain (e.g. group "Financials" → column "Actual Spend")
            // rather than a bare index: with a grouped header an index alone doesn't
            // identify a column, and the chain is what makes the rule writable.
            if (tableCtx && tableCtx.levels && tableCtx.levels.length) {
                var chain = tableCtx.levels.slice().reverse().join(' → ');
                var span = tableCtx.colSpan > 1 ? ' — ' + tableCtx.colSpan + ' grid columns wide' : '';
                return ' — apply to every cell in this table under ' + chain + span +
                       ' (across all rows), not just this one';
            }
            var col = tableCtx && tableCtx.colKey ? 'column "' + tableCtx.colKey + '"' : 'column index ' + (tableCtx ? tableCtx.colIndex : '?');
            return ' — apply to every cell in this table\'s ' + col + ' (across all rows), not just this one';
        }
        if (scope === 'table') return ' — apply to every cell in this entire table, not just this one';
        return ' — scope narrowly to just this one element' + (desc.id ? ' (id="' + desc.id + '")' : '');
    }
    // `scopes` is an array parallel to `groups`, one of
    // 'element' | 'shared' | 'row' | 'column' | 'table' per group — chosen
    // by the designer in the export popover (see openExportPrompt). Nothing
    // here guesses scope on its own; it only renders whatever was picked.
    // An icon-weight edit is TEN mask declarations that only make sense together
    // (nine repeated url()s, nine positions, a composite op). Dumped raw they're
    // unreadable and nobody would retype them correctly. Collapse them into the
    // INTENT plus one reusable utility class carrying the real CSS, so the change
    // lands in the stylesheet as something maintainable instead of a wall of
    // generated values.
    var MASK_STACK_PROPS = { maskImage: 1, webkitMaskImage: 1, maskPosition: 1, webkitMaskPosition: 1,
                             maskSize: 1, webkitMaskSize: 1, maskRepeat: 1, webkitMaskRepeat: 1,
                             maskComposite: 1, webkitMaskComposite: 1 };
    function maskLayerCount(v) { return (v || '').split('url(').length - 1; }
    function glyphNameFrom(url) { return url.split('/').pop().replace(/\.svg$/, ''); }
    function maskUrlFrom(v) {
        var m = /url\((?:"|')?([^"')]+)/.exec(v || '');
        return m ? m[1] : '';
    }
    // A GLYPH SWAP (openGlyphPicker at weight 0) logs exactly one thing: a
    // single-layer mask-image plus its -webkit- twin. It is NOT a dilation stack,
    // and it used to be routed into maskStackBlock anyway — which found no
    // mask-position to read an offset from, computed +0px, and printed the swap as
    // "icon stroke weight: +0px (bolder)" with an `.icon-weight-bold-0` utility
    // class. The real instruction ("use this other SVG") was buried inside that
    // class's mask-image line, so a glyph swap read as a no-op weight change and
    // was effectively invisible in the prompt. It gets its own plain block now.
    function glyphSwapBlock(byProp) {
        var url = maskUrlFrom(byProp.maskImage);
        var lines = [];
        if (url) {
            lines = lines.concat([
                '   - icon glyph: swapped to "' + glyphNameFrom(url) + '"',
                '     The icon is drawn as a masked SVG, so changing which icon shows means pointing',
                '     the mask at a different file (the tint/size/weight all stay as they are):',
                '',
                '       mask-image: url("' + url + '");',
                '       -webkit-mask-image: url("' + url + '");',
                ''
            ]);
        }
        // A resize of a masked icon writes mask-size alongside width/height (see
        // scaleMaskFromBase). Emitted on its own so the reason is explicit —
        // pasted as a bare declaration it looks like a stray value, and dropping
        // it would reproduce the very bug this rescale fixes.
        if (byProp.maskSize) {
            lines = lines.concat([
                '   - icon mask-size: ' + byProp.maskSize,
                '     Scaled together with this icon\'s width/height. The element box is only a',
                '     painted rectangle that the mask cuts the glyph out of, so resizing the box',
                '     WITHOUT this just enlarges the transparent padding around the drawing (the',
                '     glyph stays put and the gap to its neighbours grows). Keep both together:',
                '',
                '       mask-size: ' + byProp.maskSize + ';',
                '       -webkit-mask-size: ' + (byProp.webkitMaskSize || byProp.maskSize) + ';',
                ''
            ]);
        }
        return lines;
    }
    // Routes the mask entries of one group to the right renderer: >1 url() layer
    // is the nine-copy dilation stack (a weight change); anything else is a plain
    // glyph swap and/or a mask-size rescale.
    function maskBlock(entries, idx) {
        var byProp = {};
        entries.forEach(function (e) { byProp[e.prop] = e.value; });
        return maskLayerCount(byProp.maskImage) > 1 ? maskStackBlock(byProp, idx) : glyphSwapBlock(byProp);
    }
    function maskStackBlock(byProp, idx) {
        var pos = (byProp.maskPosition || '').split(', ')[1] || '';
        var m = /([-\d.]+)px/.exec(pos);
        var amount = m ? Math.abs(parseFloat(m[1])) : 0;
        var cls = 'icon-weight-bold-' + String(amount).replace('.', '_');
        var lines = [];
        // A weight change can ride along with a glyph swap (both write mask-image).
        // Name the file up front — inside the stack it's only visible as the
        // --glyph custom property, which reads as plumbing, not as an instruction.
        var stackUrl = maskUrlFrom(byProp.maskImage);
        if (stackUrl) lines.push('   - icon glyph: "' + glyphNameFrom(stackUrl) + '" (url below)');
        lines = lines.concat([
            '   - icon stroke weight: +' + amount + 'px (bolder)',
            '     The glyph is a masked SVG, so its stroke weight is baked into the file and no CSS',
            '     property changes it. The preview UNIONS nine offset copies of the mask, which',
            '     dilates the silhouette.',
            '     Do NOT reproduce this as ten generated declarations. Add ONE utility class to the',
            '     prototype stylesheet and put it on the icon (it composes with whatever mask-image',
            '     the icon already has — only the layer count/offsets/composite are set here):',
            '',
            '       .' + cls + ' {'
        ]);
        // The nine layers are the SAME url repeated. Emitting it nine times makes
        // a class nobody would paste into a stylesheet; hoist it into a custom
        // property so the rule reads as "this glyph, nine times, offset".
        var varName = '--glyph';
        var layerCount = maskLayerCount(byProp.maskImage);
        if (stackUrl && layerCount > 1) {
            lines.push('         ' + varName + ': url("' + stackUrl + '");');
            byProp.maskImage = new Array(layerCount + 1).join('var(' + varName + '), ').replace(/, $/, '');
        }
        ['maskImage', 'maskPosition', 'maskSize', 'maskRepeat', 'maskComposite'].forEach(function (prop) {
            if (!byProp[prop]) return;
            var webkit = byProp['webkit' + prop.charAt(0).toUpperCase() + prop.slice(1)];
            lines.push('         ' + camelToKebab(prop) + ': ' + byProp[prop] + ';');
            if (webkit && webkit !== byProp[prop] && prop !== 'maskImage') {
                lines.push('         -webkit-' + camelToKebab(prop) + ': ' + webkit + ';');
            } else if (prop === 'maskImage') {
                lines.push('         -webkit-mask-image: ' + byProp[prop] + ';');
            }
        });
        lines.push('       }');
        lines.push('');
        return lines;
    }
    // WHICH prototype the prompt is about. The generated text gets pasted into a
    // fresh chat that has no idea what was on screen, so "the currently open
    // prototype" named nothing — the reader had to guess the folder or ask. Derived
    // from location.pathname with the same `prototypes/<name>` match the canvas
    // itself uses to resolve the nav entry (davinci-canvas.js findCurrentPageData).
    // Falls back to the containing directory so it always names *something* real.
    function promptTargetInfo() {
        var path = (location.pathname || '').replace(/\/+$/, '');
        var file = /\/([^\/]+\.html?)$/i.exec(path);
        var m = /prototypes\/([^\/]+)/.exec(path);
        var folder = m ? 'prototypes/' + m[1] : null;
        if (!folder) {
            var dir = /([^\/]+)\/[^\/]*$/.exec(path);
            folder = dir ? dir[1] : null;
        }
        return {
            folder: folder,
            file: file ? file[1] : 'index.html',
            title: (document.title || '').trim()
        };
    }
    function buildEditsPrompt(groups, scopes) {
        var target = promptTargetInfo();
        var lines = [
            'I used a dev-tool inspector to live-preview some CSS changes on a DaVinci prototype ' +
            '(inline styles only — nothing was saved to any file).',
            '',
            'Prototype: ' + (target.folder || '(unknown — path not recognised)') + '/',
            'Page: ' + target.file + (target.title ? '   ("' + target.title + '")' : ''),
        ];
        lines.push(
            '',
            'Please find each element below in THAT prototype\'s HTML/CSS and apply the listed ' +
            'property/value pairs to the real stylesheet (not as inline style attributes), ' +
            'following the scope note for each one.',
            ''
        );
        groups.forEach(function (group, i) {
            var desc = describeElementForPrompt(group.el);
            var tableCtx = tableCellContext(group.el);
            var target = desc.selector + (group.pseudo || '');
            lines.push((i + 1) + '. ' + target + (desc.text ? ' ("' + desc.text + '")' : '') +
                (group.pseudo ? ' — a PSEUDO-ELEMENT: write these on the ' + group.pseudo + ' rule, not on the element' : '') +
                scopeNoteFor(scopes[i], desc, tableCtx));
            var stack = [], plain = [];
            group.entries.forEach(function (e) { (MASK_STACK_PROPS[e.prop] ? stack : plain).push(e); });
            plain.forEach(function (entry) {
                if (ATTR_PROPS[entry.prop]) {
                    // Not a CSS property — these icon kinds pick their glyph with
                    // an HTML attribute, so they can't ride the "apply to the
                    // stylesheet" instruction above like every other entry does.
                    lines.push(entry.prop === 'name'
                        ? '   - icon glyph: set this <sf-symbol>\'s name attribute to "' + entry.value + '" (an HTML attribute change, not a CSS property)'
                        : '   - icon glyph: swap this <img>\'s src attribute to "' + entry.value + '" (an HTML attribute change, not a CSS property)');
                    return;
                }
                lines.push('   - ' + camelToKebab(entry.prop) + ': ' + entry.value + (entry.isHover ? '  (only on :hover)' : ''));
            });
            if (stack.length) lines = lines.concat(maskBlock(stack, i));
            lines.push('');
        });
        return lines.join('\n').trim();
    }
    // Reverts every logged edit the same way its own per-property Reset
    // button would (inline style → '', hover override → cleared), across
    // ALL elements touched this session — then empties the log itself, same
    // end state as "Clear log". closeAllEditors() first in case an inline
    // edit or color popover is still open when this is clicked.
    function undoAllEdits() {
        if (!editLog.length) return;
        closeAllEditors();
        editLog.slice().forEach(function (entry) {
            if (ATTR_PROPS[entry.prop]) {
                var rec = attrOverride(entry.el, entry.prop);
                if (rec) {
                    if (rec.original === null) entry.el.removeAttribute(entry.prop);
                    else entry.el.setAttribute(entry.prop, rec.original);
                }
            }
            else if (entry.pseudo) setPseudoStyleProp(entry.el, entry.pseudo, entry.prop, '');
            else if (entry.isHover) setHoverStyleProp(entry.el, entry.prop, '');
            else entry.el.style[entry.prop] = '';
        });
        editLog.length = 0;
        updateExportFooter();
        clearRowBorderMirror(); // every inline border is gone — drop all mirrors, not just the subject's
        if (colScope) rewriteColStyle(); // the cell's inline style is now empty → the column rule empties too, column stays selected
        clearPseudoOverrides();
        // Registries that track state the edit log alone can't reconstruct (an
        // icon's dilation level, an element's pre-nudge base transform, an icon's
        // original `name`/`src` attribute). Undoing every edit must reset them too,
        // or the next edit would recompose from a base that no longer exists on
        // the element.
        iconWeights.length = 0;
        offsets.length = 0;
        attrOverrides.length = 0;
        // Table columns are the one edit that lives OUTSIDE the element's style —
        // on a <col>, plus a table-layout switch and possibly a <colgroup> we
        // created. This puts all of that back and empties the registry.
        revertAllColumnWidths();
        var subj = editSubject();
        if (subj) applyLiveEdit(subj);
        // The whole session is gone: drop the saved browser draft too. If this
        // session was RESTORED from a draft, the exotic mechanisms' registries
        // (columns, pseudo, icons) were not rebuilt, so an in-place revert cannot
        // be trusted to be complete — reload to the pristine source instead, which
        // is guaranteed clean now that the draft is cleared.
        clearDraftStorage();
        draftFlagState = 'editing';
        if (draftRestoredThisSession) { location.reload(); return; }
    }
    // Always asks the scope before copying — for ANY edited element, not
    // just table cells (form fields, divs, random text, whatever). Default
    // pre-selection is a best guess (shared style if this exact selector
    // matches other elements, otherwise just this element) but nothing is
    // copied until the designer explicitly hits Copy, so the guess is only
    // ever a starting point, never a silent assumption.
    function openExportPrompt() {
        if (!editLog.length) return;
        var groups = groupEditLog();
        var scopes = groups.map(function (group) {
            return describeElementForPrompt(group.el).shared > 1 ? 'shared' : 'element';
        });
        var rect = ui.footer.getBoundingClientRect();
        openEditor('davinci-live-editor-editor--prompt', rect, function (pop) {
            var groupsHtml = groups.map(function (group, i) {
                var desc = describeElementForPrompt(group.el);
                var tableCtx = tableCellContext(group.el);
                var options =
                    '<option value="element"' + (scopes[i] === 'element' ? ' selected' : '') + '>Only this element</option>' +
                    '<option value="shared"' + (scopes[i] === 'shared' ? ' selected' : '') + '>All matching elements' + (desc.shared > 1 ? ' (' + desc.shared + ' found)' : '') + '</option>' +
                    (tableCtx ? '<option value="row">Entire row</option><option value="column">Entire column</option><option value="table">Entire table</option>' : '');
                return '<div class="davinci-live-editor-editor__prompt-group">' +
                    '<div class="davinci-live-editor-editor__prompt-group-desc">' + esc(desc.selector) + (desc.text ? ' <span class="davinci-live-editor-note">("' + esc(desc.text) + '")</span>' : '') + '</div>' +
                    '<select class="davinci-live-editor-editor__scope-select" data-i="' + i + '">' + options + '</select>' +
                '</div>';
            }).join('');
            pop.innerHTML =
                '<div class="davinci-live-editor-editor__head">Copy prompt for Claude</div>' +
                '<div class="davinci-live-editor-editor__prompt-groups">' + groupsHtml + '</div>' +
                '<textarea class="davinci-live-editor-editor__prompt-text" readonly spellcheck="false"></textarea>' +
                '<div class="davinci-live-editor-editor__actions">' +
                    '<button type="button" class="davinci-live-editor-editor__btn davinci-live-editor-editor__btn--clear-log">Clear log</button>' +
                    '<button type="button" class="davinci-live-editor-editor__btn davinci-live-editor-editor__btn--copy">Copy</button>' +
                    closeBtnHtml() +
                '</div>';
            var textarea = pop.querySelector('.davinci-live-editor-editor__prompt-text');
            function refreshText() { textarea.value = buildEditsPrompt(groups, scopes); }
            refreshText();
            pop.querySelectorAll('.davinci-live-editor-editor__scope-select').forEach(function (sel) {
                sel.addEventListener('change', function () {
                    scopes[parseInt(sel.getAttribute('data-i'), 10)] = sel.value;
                    refreshText();
                });
            });
            wireCloseBtn(pop);
            var copyBtn = pop.querySelector('.davinci-live-editor-editor__btn--copy');
            copyBtn.addEventListener('click', function () {
                copy(textarea.value);
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('is-copied');
                setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-copied'); }, 1200);
                // The edits are now on their way to DaVinci. Flip the flag so the
                // designer knows the draft is a handoff waiting to be applied, and
                // persist that state so it survives a reload.
                draftFlagState = 'handed-off';
                updateDirtyFlag();
                saveDraftNow();
            });
            pop.querySelector('.davinci-live-editor-editor__btn--clear-log').addEventListener('click', function () {
                editLog.length = 0;
                clearDraftStorage();
                draftFlagState = 'editing';
                updateExportFooter();
                closeEditor();
            });
        });
    }
    // Every mark that frames an element, moved together. Editing padding, margin,
    // width or a border changes the element's box, so a ring left at the old
    // coordinates is worse than no ring — it points at where the element USED to be.
    // positionOverlay alone covered the box-model layers and the size badge but not the
    // selection/hover rings, which are separate nodes.
    function repositionMarks(el) {
        positionOverlay(el);
        if (el === selected) drawSel(el);
        if (el === hovered) drawHov(el);
    }
    function applyLiveEdit(el) {
        el = el || editSubject();
        if (!el) return;
        syncRowBorderMirror(el);
        syncColumnMirror(el);
        repositionMarks(el);
        renderPanel(el);
        if (distAnchor) positionDist(distAnchor, el);
    }
    function positionEditorNear(pop, rect) {
        document.body.appendChild(pop);
        var panelRect = ui.panel.getBoundingClientRect();
        var w = pop.offsetWidth, h = pop.offsetHeight;
        var left = panelRect.left - w - 10;
        if (left < 8) left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
        var top = Math.min(Math.max(8, rect.top - 8), window.innerHeight - h - 8);
        pop.style.left = px(left);
        pop.style.top = px(Math.max(8, top));
    }
    // Builds a popover and parks it next to the row that opened it. Nothing is
    // frozen while it is open: the panel is anchored to the SELECTION, so the
    // box-model overlay has nothing to jitter against in the first place.
    function openEditor(cls, rect, buildFn) {
        closeAllEditors();
        var pop = document.createElement('div');
        pop.className = 'davinci-live-editor-ui davinci-live-editor-editor ' + cls;
        buildFn(pop);
        positionEditorNear(pop, rect);
        activeEditor = pop;
        return pop;
    }
    // `accent` = blue border/text (matches Undo/Create Prompt) — only the Edit
    // Color popover's Reset/Close opt in; the log/prompt popover's Close stays
    // neutral gray since it wasn't asked to change.
    function closeBtnHtml(accent) { return '<button type="button" class="davinci-live-editor-editor__btn davinci-live-editor-editor__btn--close' + (accent ? ' davinci-live-editor-editor__btn--accent' : '') + '">Close</button>'; }
    function resetBtnHtml() { return '<button type="button" class="davinci-live-editor-editor__btn davinci-live-editor-editor__btn--reset davinci-live-editor-editor__btn--accent" title="Remove this override">' + RESET_ICON + '<span>Reset</span></button>'; }
    function wireCloseBtn(pop) {
        pop.querySelector('.davinci-live-editor-editor__btn--close').addEventListener('click', closeEditor);
    }
    // ── :hover live-preview override ─────────────────────────
    // Inline styles can't target a pseudo-class, so a hover-color edit works by
    // injecting a single scoped <style> rule instead: the subject element gets
    // a unique `data-live-editor-hover-id`, and the rule reads
    // `[data-live-editor-hover-id="…"]:hover { prop: value !important; }`.
    // !important is required to reliably win over the prototype's own :hover
    // rule — same "tool affordance bypasses normal CSS rules" exception as the
    // box-model overlay's literal colors (see file header). Scoped to ONE
    // element at a time (the current subject); switching to a new element
    // replaces the rule, so only the most-recently-edited element keeps a live
    // hover preview.
    function ensureHoverStyleEl() {
        if (hoverStyleEl) return hoverStyleEl;
        hoverStyleEl = document.createElement('style');
        hoverStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(hoverStyleEl);
        return hoverStyleEl;
    }
    function rewriteHoverStyle() {
        var styleEl = ensureHoverStyleEl();
        if (!hoverOverrides || !Object.keys(hoverOverrides.props).length) { styleEl.textContent = ''; return; }
        var decls = Object.keys(hoverOverrides.props).map(function (p) {
            var kebab = p.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
            return kebab + ': ' + hoverOverrides.props[p] + ' !important;';
        }).join(' ');
        styleEl.textContent = '[data-live-editor-hover-id="' + hoverOverrides.id + '"]:hover { ' + decls + ' }';
    }
    function setHoverStyleProp(el, prop, value) {
        if (!hoverOverrides || hoverOverrides.el !== el) {
            if (!el.hasAttribute('data-live-editor-hover-id')) el.setAttribute('data-live-editor-hover-id', 'm' + (++hoverIdSeq));
            hoverOverrides = { el: el, id: el.getAttribute('data-live-editor-hover-id'), props: {} };
        }
        if (value) hoverOverrides.props[prop] = value;
        else delete hoverOverrides.props[prop];
        rewriteHoverStyle();
    }
    function ensureCascadeStyleEl() {
        if (cascadeStyleEl) return cascadeStyleEl;
        cascadeStyleEl = document.createElement('style');
        cascadeStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(cascadeStyleEl);
        return cascadeStyleEl;
    }
    function rewriteCascadeStyle() {
        var styleEl = ensureCascadeStyleEl();
        if (!cascadeOverrides || !Object.keys(cascadeOverrides.props).length) { styleEl.textContent = ''; return; }
        var decls = Object.keys(cascadeOverrides.props).map(function (p) {
            return kebab(p) + ': ' + cascadeOverrides.props[p] + ' !important;';
        }).join(' ');
        styleEl.textContent = '[data-live-editor-cascade-id="' + cascadeOverrides.id + '"] * { ' + decls + ' }';
    }
    // Forces an inherited-property edit to reach every descendant, overriding
    // any explicit rule they declare — otherwise editing a retargeted
    // ancestor's Text color/Typography would silently do nothing when its
    // children already set that property themselves. No-op for non-inherited
    // properties.
    function setCascadeProp(el, prop, value) {
        if (!INHERITED_PROPS[prop]) return;
        if (!cascadeOverrides || cascadeOverrides.el !== el) {
            if (!el.hasAttribute('data-live-editor-cascade-id')) el.setAttribute('data-live-editor-cascade-id', 'c' + (++cascadeIdSeq));
            cascadeOverrides = { el: el, id: el.getAttribute('data-live-editor-cascade-id'), props: {} };
        }
        if (value) cascadeOverrides.props[prop] = value;
        else delete cascadeOverrides.props[prop];
        rewriteCascadeStyle();
    }
    // ── row-border mirror (separated-borders tables) ─────────
    // See rowBorderTargets above for WHY. Only kicks in for the element types
    // whose borders the spec drops, and only inside a `border-collapse:
    // separate` table — a collapsed table paints row borders natively, so
    // mirroring there would double them up.
    var ROW_BORDER_TAGS = { TR: 1, THEAD: 1, TBODY: 1, TFOOT: 1, COL: 1, COLGROUP: 1 };
    function isRowBorderIgnored(el) {
        if (!el || !ROW_BORDER_TAGS[el.tagName]) return false;
        var table = el.closest ? el.closest('table') : null;
        if (!table) return false;
        return getComputedStyle(table).borderCollapse === 'separate';
    }
    // The row's OWN inline border, as a `Wpx style color` shorthand — or null
    // when it carries no border edit (nothing to mirror / mirror to drop).
    function rowBorderShorthand(el) {
        var s = el.style;
        var w = s.borderWidth || s.borderTopWidth;
        if (!w || parseFloat(w) === 0) return null;
        var cs = getComputedStyle(el);
        var style = s.borderStyle || s.borderTopStyle || cs.borderTopStyle;
        if (!style || style === 'none') style = 'solid';
        return w + ' ' + style + ' ' + (s.borderColor || s.borderTopColor || cs.borderTopColor);
    }
    // A row border reads as: horizontal lines across the row's full width, plus
    // caps on its outer ends. Mirroring the SAME border onto all four sides of
    // every cell would draw a grid instead, so top/bottom go on every cell while
    // left/right land only on the row's first/last cell. For a row GROUP
    // (thead/tbody/tfoot) the horizontal lines belong to its first/last row.
    function rowBorderRules(id, el, border) {
        var at = '[data-live-editor-rowborder-id="' + id + '"]';
        var cells = el.tagName === 'TR' ? [at + ' > td', at + ' > th'] : [at + ' > tr > td', at + ' > tr > th'];
        var topScope = el.tagName === 'TR' ? cells : [at + ' > tr:first-child > td', at + ' > tr:first-child > th'];
        var botScope = el.tagName === 'TR' ? cells : [at + ' > tr:last-child > td', at + ' > tr:last-child > th'];
        var firstCol = cells.map(function (s) { return s + ':first-child'; });
        var lastCol = cells.map(function (s) { return s + ':last-child'; });
        return topScope.join(',') + ' { border-top: ' + border + ' !important; }' +
            botScope.join(',') + ' { border-bottom: ' + border + ' !important; }' +
            firstCol.join(',') + ' { border-left: ' + border + ' !important; }' +
            lastCol.join(',') + ' { border-right: ' + border + ' !important; }';
    }
    function ensureRowBorderStyleEl() {
        if (rowBorderStyleEl) return rowBorderStyleEl;
        rowBorderStyleEl = document.createElement('style');
        rowBorderStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(rowBorderStyleEl);
        return rowBorderStyleEl;
    }
    // Re-derives the whole mirror stylesheet from the tracked rows, dropping any
    // that went away (detached from the DOM, or whose border edit was reset).
    // Multi-row by design — unlike the hover/cascade single-slot overrides, a
    // mirrored border is a plain visual copy of an inline style that's still
    // there, so there's no reason for a second row's edit to cancel the first's.
    function rewriteRowBorderStyle() {
        rowBorderTargets = rowBorderTargets.filter(function (t) {
            return document.contains(t.el) && rowBorderShorthand(t.el);
        });
        var css = rowBorderTargets.map(function (t) {
            return rowBorderRules(t.id, t.el, rowBorderShorthand(t.el));
        }).join('\n');
        ensureRowBorderStyleEl().textContent = css;
    }
    // Called from applyLiveEdit/applyLiveEditLite — i.e. after EVERY edit,
    // commit, cancel and reset — so the mirror can't drift from the inline
    // style it copies. Cheap and idempotent for the (overwhelmingly common)
    // case of a subject that isn't a row.
    function syncRowBorderMirror(el) {
        if (el && isRowBorderIgnored(el) && rowBorderShorthand(el)) {
            var known = rowBorderTargets.some(function (t) { return t.el === el; });
            if (!known) {
                if (!el.hasAttribute('data-live-editor-rowborder-id')) {
                    el.setAttribute('data-live-editor-rowborder-id', 'r' + (++rowBorderIdSeq));
                }
                rowBorderTargets.push({ el: el, id: el.getAttribute('data-live-editor-rowborder-id') });
            }
        }
        if (rowBorderTargets.length) rewriteRowBorderStyle();
    }
    function clearRowBorderMirror() {
        rowBorderTargets.length = 0;
        if (rowBorderStyleEl) rowBorderStyleEl.textContent = '';
    }
    // ── column mirror ────────────────────────────────────────
    // See colScope above for WHY. Broadcasts the representative cell's inline
    // style across every cell sharing its column position.
    function ensureColStyleEl() {
        if (colStyleEl) return colStyleEl;
        colStyleEl = document.createElement('style');
        colStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(colStyleEl);
        return colStyleEl;
    }
    // ── Table grid geometry ──────────────────────────────────
    // Resolves a table to its RENDERED grid the way the HTML table algorithm does:
    // every cell gets the grid column it starts at plus how many it spans, with
    // colspan AND rowspan accounted for (a rowspan'd cell keeps occupying its
    // column in the rows below, pushing their cells right). The old code used the
    // cell's index among its row's children, which silently mismapped any table
    // with a grouped header: in the Onboarding Portal's 9-group / 38-column table,
    // styling the 5th group header ("Financials") also painted the unrelated 5th
    // leaf column, because both were :nth-child(5).
    // `table.rows` is in tree order (thead → tbodies → tfoot) and excludes nested
    // tables' rows, so it's the right row list. rowSpan=0 ("to end of section") is
    // treated as 1 — a shape none of these prototypes use.
    function tableGridMap(table) {
        var occupied = [];   // occupied[row][col] — covered by an earlier cell's span
        var entries = [];    // { cell, tr, start, span, row, rowSpan, header }
        var cols = 0;
        var rows = Array.prototype.slice.call(table.rows);
        rows.forEach(function (tr, r) {
            if (!occupied[r]) occupied[r] = [];
            var section = tr.parentElement;
            var isHead = !!section && section.tagName === 'THEAD';
            var c = 0;
            Array.prototype.forEach.call(tr.cells, function (cell) {
                while (occupied[r][c]) c++;                 // skip columns a rowspan already claimed
                var cs = Math.max(1, cell.colSpan || 1);
                var rs = Math.max(1, cell.rowSpan || 1);
                entries.push({ cell: cell, tr: tr, start: c, span: cs, row: r, rowSpan: rs, header: isHead });
                for (var dr = 0; dr < rs; dr++) {
                    if (!occupied[r + dr]) occupied[r + dr] = [];
                    for (var dc = 0; dc < cs; dc++) occupied[r + dr][c + dc] = true;
                }
                c += cs;
                if (c > cols) cols = c;
            });
        });
        return { entries: entries, rows: rows, cols: cols };
    }
    function gridEntryFor(map, cell) {
        for (var i = 0; i < map.entries.length; i++) if (map.entries[i].cell === cell) return map.entries[i];
        return null;
    }
    // ── table column width ───────────────────────────────────
    // A <td>/<th>'s own `width` is IGNORED by the table layout algorithm (auto
    // reads every row in the column and takes the widest; fixed reads only the
    // first row), so Dimensions→W on a table cell used to look completely dead.
    // A column's real width lives on its <col>, so the edit is routed there.
    //
    // A <col> width is only authoritative under `table-layout: fixed`, and
    // switching a table to fixed on its own REFLOWS every other column (columns
    // without a width split the remaining space evenly). So the first resize
    // measures every column as it currently renders and pins all of them, plus
    // the table's own width: the table looks identical the instant it becomes
    // fixed, and only the edited column moves. Everything needed to put the table
    // back — including whether we were the ones who created the <colgroup> — is
    // recorded per table in colStates.
    //
    // Widths come from getBoundingClientRect, so under `border-collapse: collapse`
    // the pinned columns can total a fraction more than the table (adjacent cells
    // share a border and each rect counts it). Sub-pixel, and invisible against
    // the table width we pin alongside them.
    var colStates = [];   // [{ table, colgroup, createdColgroup, prevColgroupInner,
                          //    prevLayout, prevWidth, cols: [{ col, pinned }] }]
    function colStateFor(table) {
        for (var i = 0; i < colStates.length; i++) if (colStates[i].table === table) return colStates[i];
        return null;
    }
    // The one column a cell owns, or null when it doesn't own exactly one (a
    // colspan'd group header covers several, so "this column's width" is
    // ambiguous and the cell falls back to plain width behaviour).
    function singleColumnOf(cell) {
        var table = cell.closest ? cell.closest('table') : null;
        if (!table) return null;
        var map = tableGridMap(table);
        var e = gridEntryFor(map, cell);
        if (!e || e.span !== 1) return null;
        return { table: table, map: map, index: e.start };
    }
    function directColgroup(table) {
        // Direct child only — a nested table's colgroup must not be picked up.
        for (var i = 0; i < table.children.length; i++) {
            if (table.children[i].tagName === 'COLGROUP') return table.children[i];
        }
        return null;
    }
    function measureColumns(table, map) {
        var w = new Array(map.cols), unknown = [], total = 0;
        map.entries.forEach(function (e) {
            if (e.span !== 1 || w[e.start] != null) return;
            var r = e.cell.getBoundingClientRect();
            if (r.width > 0) w[e.start] = r.width;
        });
        for (var c = 0; c < map.cols; c++) {
            if (w[c] == null) unknown.push(c); else total += w[c];
        }
        // A column only ever covered by spanning cells has no rect to read; give it
        // an even share of whatever the table has left rather than 0 (which would
        // collapse it the moment the table goes fixed).
        if (unknown.length) {
            var left = Math.max(0, table.getBoundingClientRect().width - total);
            var each = left / unknown.length;
            unknown.forEach(function (c) { w[c] = each; });
        }
        return w;
    }
    function pinColumns(table, map) {
        var st = colStateFor(table);
        if (st) return st;
        var widths = measureColumns(table, map);
        var cg = directColgroup(table);
        var created = false;
        // Snapshot BEFORE any mutation: expanding spans below rewrites the
        // colgroup's children, so restoring it verbatim is the only way back to the
        // markup we found. (Unused when we create the colgroup — that reverts by
        // being removed.)
        var prevInner = cg ? cg.innerHTML : null;
        if (!cg) {
            cg = document.createElement('colgroup');
            for (var i = 0; i < map.cols; i++) cg.appendChild(document.createElement('col'));
            // A <colgroup> must be the table's FIRST child to be valid.
            table.insertBefore(cg, table.firstChild);
            created = true;
        } else {
            // An existing colgroup may not be one <col> per column: `<col span="3">`
            // is a single element covering three. Expand every span so grid column
            // index c addresses cg.children[c], carrying each original's width onto
            // the copies (they described those columns too).
            Array.prototype.slice.call(cg.children).forEach(function (col) {
                var span = parseInt(col.getAttribute('span') || '1', 10);
                if (!(span > 1)) return;
                col.removeAttribute('span');
                for (var s = 1; s < span; s++) {
                    var clone = col.cloneNode(false);
                    if (col.nextSibling) cg.insertBefore(clone, col.nextSibling);
                    else cg.appendChild(clone);
                }
            });
            while (cg.children.length < map.cols) cg.appendChild(document.createElement('col'));
        }
        var cols = [];
        for (var c = 0; c < map.cols; c++) {
            var col = cg.children[c];
            cols.push({ col: col, pinned: Math.round(widths[c]) + 'px' });
            col.style.width = Math.round(widths[c]) + 'px';
        }
        st = {
            table: table,
            colgroup: cg,
            createdColgroup: created,
            prevColgroupInner: prevInner,
            prevLayout: table.style.tableLayout,
            prevWidth: table.style.width,
            cols: cols
        };
        table.style.width = Math.round(table.getBoundingClientRect().width) + 'px';
        table.style.tableLayout = 'fixed';
        colStates.push(st);
        return st;
    }
    // px === null restores this column to the width it had when the table was
    // pinned. There is no clean way back to `auto` for one column of a fixed
    // table, so its pinned measurement IS the "no override" state.
    function setColumnWidth(cell, px) {
        var loc = singleColumnOf(cell);
        if (!loc) return false;
        var st = pinColumns(loc.table, loc.map);
        var rec = st.cols[loc.index];
        if (!rec) return false;
        rec.col.style.width = (px === null ? rec.pinned : Math.round(px) + 'px');
        return true;
    }
    // Is this cell's width the kind that has to go through a <col>?
    function isColumnWidthTarget(tgt, prop) {
        return prop === 'width' && !tgt.pseudo && tgt.el &&
               (tgt.el.tagName === 'TD' || tgt.el.tagName === 'TH');
    }
    // Escape and the row's Reset both land here: put the column back to the width
    // it had before this edit. That IS its pinned measurement, because pinning
    // happens on the first keystroke of the edit and measures the pre-edit layout.
    // A table that was never pinned has nothing to undo — and must not be pinned
    // now, which is why this checks for an existing state rather than creating one.
    function resetColumnWidth(cell) {
        var loc = singleColumnOf(cell);
        if (!loc || !colStateFor(loc.table)) return false;
        return setColumnWidth(cell, null);
    }
    // Full revert, for "Undo all": every column back to its pre-tool inline width,
    // the table's layout/width restored, and a colgroup we invented removed
    // outright so the markup is exactly as we found it.
    // Full revert of ONE table: columns back to their pre-tool widths, the
    // layout/width switch undone, and a colgroup we invented removed outright.
    function revertColumnWidths(table) {
        var st = colStateFor(table);
        if (!st) return;
        if (st.createdColgroup) {
            if (st.colgroup.parentNode === st.table) st.table.removeChild(st.colgroup);
        } else {
            // Restores the original children verbatim, including any `span` we
            // expanded — so a pre-existing colgroup comes back byte-for-byte
            // rather than as an equivalent-but-different set of <col>s.
            st.colgroup.innerHTML = st.prevColgroupInner;
        }
        if (st.prevLayout) st.table.style.tableLayout = st.prevLayout;
        else st.table.style.removeProperty('table-layout');
        if (st.prevWidth) st.table.style.width = st.prevWidth;
        else st.table.style.removeProperty('width');
        colStates.splice(colStates.indexOf(st), 1);
    }
    // Same, for every table touched this session — used by "Undo all".
    function revertAllColumnWidths() {
        colStates.slice().forEach(function (st) { revertColumnWidths(st.table); });
        colStates.length = 0;
    }
    // A cell's own name, for labelling a scope: its column key if it carries one,
    // else its text, else the 1-based grid position.
    function cellName(cell, start) {
        var k = cell && (cell.getAttribute('data-col-key') || cell.getAttribute('data-column'));
        if (k) return k;
        var txt = cell ? (cell.textContent || '').replace(/\s+/g, ' ').trim() : '';
        if (txt) return txt.length > 22 ? txt.slice(0, 22) + '…' : txt;
        return 'col ' + (start + 1);
    }
    // A name for a whole GRID COLUMN, which is not the same as the clicked cell's
    // name: clicking a body cell must still yield "Bill Rate", not the cell's own
    // content ("r0c24"). Resolves to the narrowest HEADER cell covering exactly
    // this range — the leaf <th> — and only falls back to the clicked cell (whose
    // data-col-key a table may mirror onto its body cells) when the table has no
    // header at all.
    function columnNameAt(map, start, span, cell) {
        var best = null;
        map.entries.forEach(function (e) {
            if (!e.header || e.start !== start || e.span !== span) return;
            if (!best || e.row > best.row) best = e;    // deepest header row wins
        });
        if (best) return cellName(best.cell, start);
        return cellName(cell, start);
    }
    // The LEVELS the clicked cell can be scoped to, narrowest first. The chain is
    // built from the header cells that COVER the clicked cell's grid range, so the
    // representative cell is always inside whatever scope gets picked (the mirror
    // copies that one cell's inline style outward — a scope not containing it would
    // broadcast a style read from somewhere else).
    //   • cell spanning 1 column → its own leaf column, then each wider group above it
    //   • a group header (span > 1) → itself, then wider groups; NOT the leaves under
    //     it, since "which leaf" is ambiguous from a group cell (click the leaf header
    //     directly for that — it's one row below)
    // "Header only" is offered on a group when the subject is a header cell: styling
    // a group's header band (group th + its column headers) without the data cells
    // is a real case, and distinct from any single-cell scope.
    // Single-level headers yield exactly one option → the Column row stays the plain
    // button it is today, no level list.
    function columnScopeOptions(cell) {
        if (!cell || (cell.tagName !== 'TD' && cell.tagName !== 'TH')) return [];
        var table = cell.closest && cell.closest('table');
        if (!table) return [];
        var map = tableGridMap(table);
        var self = gridEntryFor(map, cell);
        if (!self) return [];
        var end = self.start + self.span - 1;
        var opts = [{
            kind: self.span > 1 ? 'group' : 'col',
            start: self.start, span: self.span, headerOnly: false,
            label: (self.span > 1 ? 'Group "' : 'Column "') +
                   columnNameAt(map, self.start, self.span, cell) + '"'
        }];
        // Wider header cells covering this range = the outer levels, narrow → wide.
        var wider = map.entries.filter(function (e) {
            return e.header && e.cell !== cell && e.span > self.span &&
                   e.start <= self.start && (e.start + e.span - 1) >= end;
        }).sort(function (a, b) { return a.span - b.span; });
        wider.forEach(function (e) {
            opts.push({ kind: 'group', start: e.start, span: e.span, headerOnly: false,
                        label: 'Group "' + cellName(e.cell, e.start) + '"' });
        });
        if (self.header) {
            opts.filter(function (o) { return o.span > 1; }).forEach(function (o) {
                opts.push({ kind: 'group-head', start: o.start, span: o.span, headerOnly: true,
                            label: o.label + ' header band' });
            });
        }
        return opts;
    }
    var COL_TAG = 'data-live-editor-col';
    // Every cell whose grid range sits INSIDE the active scope, stamped with the
    // scope token so one attribute selector can address them. Cells spanning wider
    // than the scope are excluded on purpose: a group header covering 4 leaf columns
    // is not part of one leaf column's set, and styling it would bleed onto the
    // three siblings. Recomputed (and re-stamped) on every call rather than cached —
    // a prototype that re-renders only its <tbody> would otherwise drop the stamps
    // while the representative <th> stayed alive, silently emptying the column rule.
    // Writes only where the attribute actually CHANGES: this also runs from
    // columnUnionRect on every scroll/hover frame, and blindly re-setting ~800
    // attributes per frame would flood the canvas's own MutationObserver (which
    // re-applies impersonation permissions on DOM changes) with no-op records.
    function columnCells() {
        if (!colScope) return [];
        var map = tableGridMap(colScope.table);
        var end = colScope.start + colScope.span - 1;
        var out = [];
        map.entries.forEach(function (e) {
            var inside = e.start >= colScope.start && (e.start + e.span - 1) <= end;
            if (!inside || (colScope.headerOnly && !e.header)) {
                if (e.cell.hasAttribute(COL_TAG)) e.cell.removeAttribute(COL_TAG);
                return;
            }
            if (e.cell.getAttribute(COL_TAG) !== colScope.id) e.cell.setAttribute(COL_TAG, colScope.id);
            out.push(e.cell);
        });
        return out;
    }
    function colCellSelector(id) { return '[' + COL_TAG + '="' + id + '"]'; }
    function clearColTags(table) {
        if (!table) return;
        var tagged = table.querySelectorAll('[' + COL_TAG + ']');
        for (var i = 0; i < tagged.length; i++) tagged[i].removeAttribute(COL_TAG);
    }
    // Bounding box of every cell in the active column (all row sections) — for
    // the SELECTION OVERLAY only (see positionOverlay). Never used for the
    // panel's own Size/Padding/Margin rows, which must keep reading the single
    // representative cell: that's the value actually written to every cell,
    // not a sum across the column.
    function columnUnionRect() {
        if (!colScope) return null;
        var cells = columnCells();
        var top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
        for (var i = 0; i < cells.length; i++) {
            var r = cells[i].getBoundingClientRect();
            if (!r.width && !r.height) continue; // detached or hidden (e.g. a column-visibility'd cell)
            if (r.top < top) top = r.top;
            if (r.left < left) left = r.left;
            if (r.right > right) right = r.right;
            if (r.bottom > bottom) bottom = r.bottom;
        }
        if (top === Infinity) return null;
        return { top: top, left: left, width: right - left, height: bottom - top };
    }
    // Re-derives the column rule from the representative cell's OWN inline style:
    // every declaration it carries is re-emitted for the whole column with
    // !important (to beat the table's own cell rules), the same plain-copy mirror
    // the row-border code does for a single shorthand. Drops the mirror if the
    // cell or table left the DOM.
    function rewriteColStyle() {
        if (!colScope) return;
        if (!document.contains(colScope.cell) || !document.contains(colScope.table)) { clearColMirror(); return; }
        var s = colScope.cell.style, decls = '';
        for (var i = 0; i < s.length; i++) {
            var prop = s[i];
            var val = s.getPropertyValue(prop);
            if (!val) continue;
            decls += prop + ':' + val + ' !important;';
        }
        columnCells();   // (re)stamp the scope token — this is what the rule below selects
        ensureColStyleEl().textContent = decls
            ? colCellSelector(colScope.id) + '{' + decls + '}'
            : '';
    }
    // Called from applyLiveEdit/applyLiveEditLite (next to syncRowBorderMirror)
    // so the column can't drift from the cell's inline style it copies. No-op
    // unless a column is selected and the edited element IS its cell.
    function syncColumnMirror(el) {
        if (colScope && el === colScope.cell) rewriteColStyle();
    }
    function clearColMirror() {
        if (colScope) clearColTags(colScope.table);
        colScope = null;
        if (colStyleEl) colStyleEl.textContent = '';
    }
    // Enters column mode on a pinned cell at one of its available LEVELS (see
    // columnScopeOptions — index 0 is the level the cell itself sits at, which is
    // what a plain click selects: click a group header and you get the group, click
    // a leaf header or a body cell and you get that one column).
    function enterColumnMode(cell, optIndex) {
        var table = cell.closest && cell.closest('table');
        var opts = columnScopeOptions(cell);
        var opt = opts[optIndex || 0];
        if (!table || !opt) return;
        if (colScope) clearColTags(colScope.table);
        if (!table.hasAttribute('data-live-editor-col-id')) {
            table.setAttribute('data-live-editor-col-id', 'c' + (++colIdSeq));
        }
        colScope = { table: table, id: table.getAttribute('data-live-editor-col-id'), cell: cell,
                     start: opt.start, span: opt.span, headerOnly: opt.headerOnly,
                     kind: opt.kind, label: opt.label };
        // Mirror FIRST: the column overlay's union rect (drawn inside select()
        // below) must measure post-mirror geometry, or a cell whose padding/etc.
        // only just got broadcast onto it (e.g. a <th> that had no matching
        // inline style before) reports its OLD, pre-mirror size — undersizing
        // the overlay until the next unrelated re-render happens to fix it.
        rewriteColStyle();
        select(cell);       // re-render the panel in column mode (subject unchanged)
    }
    // The panel's Column row. Only offered when the subject IS a table cell and
    // an element is selected (editable) — a bare hover has no stable
    // subject to promote to a column. The button enters column mode, or (when
    // already in it) drops back to just this cell. This is how a column gets
    // selected at all: the element tree can't list a column, since it isn't a
    // DOM node.
    // A human name for the active scope, for the panel title and the Column row.
    function colScopeLabel(scope) { return scope ? scope.label : ''; }
    // How many grid columns × which band a level covers — the tail of each option
    // label, so "Group" vs "Column" isn't the only cue. The header-only case says so
    // in its own label already (see columnScopeOptions), so it isn't repeated here.
    function colScopeDetail(opt) {
        return opt.span > 1
            ? 'cols ' + (opt.start + 1) + '–' + (opt.start + opt.span) + ' (' + opt.span + ' columns)'
            : 'col ' + (opt.start + 1);
    }
    function columnRowHtml(el) {
        if (el !== editSubject()) return '';   // editing a column needs a selected subject
        var active = !!(colScope && el === colScope.cell);
        var opts = columnScopeOptions(el);     // [] for anything that isn't a table cell
        if (!active && !opts.length) return '';
        // ONE level (no grouped header) → the one-line toggle button, unchanged.
        if (opts.length < 2) {
            var label = active
                ? 'Editing ' + colScopeLabel(colScope) + ' — click to stop'
                : 'Style entire ' + (opts[0] ? opts[0].label.replace(/^Column "/, 'column "').replace(/^Group "/, 'group "') : 'column');
            var title = active
                ? 'Stop editing the column — edits go back to this cell only'
                : 'Retarget edits to every cell in this column (across all rows)';
            return '<div class="davinci-live-editor-row"><span class="davinci-live-editor-row__label">Column</span>' +
                '<span class="davinci-live-editor-row__val davinci-live-editor-colsel-wrap">' +
                '<button type="button" class="davinci-live-editor-colsel' + (active ? ' davinci-live-editor-colsel--on' : '') +
                '" data-col-select title="' + esc(title) + '">' +
                COLUMN_ICON +
                '<span class="davinci-live-editor-colsel__txt">' + esc(label) + '</span></button>' +
                '</span></div>';
        }
        // MORE THAN ONE level (grouped header) → a real <select>. This went through
        // two worse shapes first: a chevron beside the label (read as one link, so
        // the chevron went unnoticed), then the full level list rendered inline
        // (discoverable, but ~116px of always-open panel for a choice you make once).
        // A native select fixes both AND the constraint that forced the inline list:
        // its popup is drawn by the OS, so it escapes the panel's `overflow: hidden`
        // instead of being clipped by it — which also means an option label can be
        // wider than the 308px panel and still readable.
        var sel = '<select class="davinci-live-editor-collevel-select" data-col-level-select' +
            ' title="Pick what the edits apply to">' +
            // "Just this cell" — NOT "Not targeting a column" (describes an absence,
            // so the real default read as a missing step) and NOT "Select a column…"
            // (reads as required). It's a legitimate choice stated the same way as
            // every other option: each one answers "what do my edits apply to?".
            '<option value=""' + (active ? '' : ' selected') + '>Just this cell</option>';
        opts.forEach(function (opt, i) {
            var on = !!(colScope && colScope.start === opt.start && colScope.span === opt.span &&
                        !!colScope.headerOnly === !!opt.headerOnly);
            sel += '<option value="' + i + '"' + (on ? ' selected' : '') + '>' +
                esc(opt.label + ' — ' + colScopeDetail(opt)) + '</option>';
        });
        sel += '</select>';
        return '<div class="davinci-live-editor-row"><span class="davinci-live-editor-row__label">Column</span>' +
            '<span class="davinci-live-editor-row__val davinci-live-editor-collevel-wrap">' + sel + '</span></div>';
    }
    // Single commit wrapper used at every direct-style-write site. For
    // CSS-inherited props, writes with !important (so it can win a
    // specificity tie-break against an ancestor's forced cascade rule if
    // this exact element is later edited directly) and also updates the
    // scoped cascade rule so DESCENDANTS pick it up too. Non-inherited
    // props are unaffected — plain assignment, unchanged behavior.
    function commitStyleProp(el, prop, value) {
        if (INHERITED_PROPS[prop]) {
            if (value) el.style.setProperty(kebab(prop), value, 'important');
            else el.style.removeProperty(kebab(prop));
            setCascadeProp(el, prop, value);
        } else {
            el.style[prop] = value;
        }
    }
    // ── Glyph picker ─────────────────────────────────────────
    // Browse/search every SF Symbol by name instead of typing one blind. The name
    // list lives in live-editor-icons.js (4414 entries, ~96KB) and is fetched ONLY
    // when this popover first opens — as a <script> tag, not fetch(), so it also
    // works from file:// where a cross-origin fetch of a local file is blocked.
    // Resolved relative to THIS script, so it follows the canvas assets wherever
    // they were materialized (.davinci/assets/canvas/) regardless of page depth.
    var iconIndex = null, iconIndexPending = null;
    function loadIconIndex(cb) {
        if (iconIndex) { cb(iconIndex); return; }
        if (window.DaVinciLiveEditorIcons) { iconIndex = window.DaVinciLiveEditorIcons; cb(iconIndex); return; }
        if (iconIndexPending) { iconIndexPending.push(cb); return; }
        iconIndexPending = [cb];
        var sc = document.createElement('script');
        sc.src = (SCRIPT_SRC ? SCRIPT_SRC.replace(/[^/]*$/, '') : '') + 'live-editor-icons.js';
        sc.onload = function () {
            iconIndex = window.DaVinciLiveEditorIcons || [];
            var waiting = iconIndexPending; iconIndexPending = null;
            waiting.forEach(function (f) { f(iconIndex); });
        };
        sc.onerror = function () {
            iconIndex = [];
            var waiting = iconIndexPending; iconIndexPending = null;
            waiting.forEach(function (f) { f(iconIndex); });
        };
        document.head.appendChild(sc);
    }
    // Rendered at once; the rest waits behind the search. Each tile is a real
    // <sf-symbol>, and a first paint costs one endpoint fetch per glyph (they're
    // cached globally afterwards by sf-symbol.js, so re-renders while typing are
    // free) — hence a modest page size rather than the whole 4414.
    var GLYPH_PICKER_MAX = 60;
    function openGlyphPicker(rowVal) {
        var tgt = editTargetFrom(rowVal);
        var panelEl = editSubject();
        if (!tgt || !panelEl) return;
        // Three independent write paths share this one popover, matching the three
        // branches of iconGlyphRow: an <sf-symbol> swaps its `name` attribute, an
        // `<img src=".svg">` swaps its own `src`, and a masked element points
        // `mask-image` somewhere new. Resolved fresh here (not carried on `tgt`)
        // since editTargetFrom only returns {el, pseudo}.
        var kind = iconKind(tgt.el, tgt.pseudo);
        var isSf = !!kind.sfGlyph;
        var isImg = !!kind.imgGlyph;
        var dir = rowVal.getAttribute('data-mask-dir') || '';
        var currentName;
        if (isSf) {
            currentName = tgt.el.getAttribute('name') || '';
        } else {
            var currentUrl = isImg ? (tgt.el.getAttribute('src') || '') : (maskUrlOf(tgt.el, tgt.pseudo) || '');
            currentName = currentUrl.split('/').pop().replace(/\.svg$/, '');
        }
        var rect = rowVal.getBoundingClientRect();
        var pop = openEditor('davinci-live-editor-editor--glyph', rect, function (pop) {
            pop.innerHTML =
                '<div class="davinci-live-editor-editor__head">Pick a glyph</div>' +
                '<input type="text" class="davinci-live-editor-glyphs__search" placeholder="Search SF Symbols…" spellcheck="false">' +
                '<div class="davinci-live-editor-glyphs" role="listbox"><div class="davinci-live-editor-glyphs__empty">Loading…</div></div>' +
                '<div class="davinci-live-editor-editor__actions">' + resetBtnHtml() + closeBtnHtml(true) + '</div>';
        });
        var search = pop.querySelector('.davinci-live-editor-glyphs__search');
        var grid = pop.querySelector('.davinci-live-editor-glyphs');
        function markPicked(name) {
            currentName = name;
            grid.querySelectorAll('.davinci-live-editor-glyphs__item--on').forEach(function (b) {
                b.classList.remove('davinci-live-editor-glyphs__item--on');
            });
            var picked = grid.querySelector('[data-glyph="' + name + '"]');
            if (picked) picked.classList.add('davinci-live-editor-glyphs__item--on');
            // Lite render: a full renderPanel would rebuild the row this popover
            // is anchored to and tear the popover down mid-browse.
            applyLiveEditLite(panelEl);
        }
        function apply(name) {
            if (isSf) {
                // An SF Symbol is named, not drawn from a file: the component
                // re-fetches and repaints itself when `name` changes. None of the
                // mask machinery applies — no -webkit- twin, no dilation stack, no
                // mask-size to rescale.
                applyAttr(tgt, 'name', name);
                markPicked(name);
                return;
            }
            var url = dir + name + '.svg';
            if (isImg) {
                // A plain <img> has no weight/dilation concept (that's a masked-icon
                // stroke trick) — just point it at the new file.
                applyAttr(tgt, 'src', url);
                markPicked(name);
                return;
            }
            var full = 'url("' + url + '")';
            var weight = parseFloat(iconWeightOf(tgt)) || 0;
            if (weight > 0) {
                // A thickened glyph is a STACK of mask layers; swapping the glyph
                // has to rebuild that stack, or the single-layer write below would
                // silently drop the extra copies and un-bolden the icon.
                applyIconMask(tgt, url, weight);
            } else {
                // Both properties: Safari still needs the -webkit- one, and writing
                // only the standard property leaves the old glyph painted there.
                tgtWrite(tgt, 'maskImage', full);
                tgtWrite(tgt, 'webkitMaskImage', full);
                tgtLog(tgt, 'maskImage', full, false);
                tgtLog(tgt, 'webkitMaskImage', full, false);
            }
            markPicked(name);
        }
        // A tile previews the glyph the same way the prototype paints it: as an
        // <sf-symbol> for the named path, as a mask for the file-based ones (where
        // `dir` supplies the directory the current glyph already lives in).
        function tileHtml(n) {
            return '<button type="button" class="davinci-live-editor-glyphs__item' +
                (n === currentName ? ' davinci-live-editor-glyphs__item--on' : '') +
                '" data-glyph="' + esc(n) + '" title="' + esc(n) + '">' +
                (isSf
                    ? '<sf-symbol class="davinci-live-editor-glyphs__glyph" name="' + esc(n) + '"></sf-symbol>'
                    : '<span class="davinci-live-editor-glyphs__glyph" style="-webkit-mask-image:url(' + dir + n + '.svg);mask-image:url(' + dir + n + '.svg)"></span>') +
                '</button>';
        }
        function render(list) {
            var q = search.value.trim().toLowerCase();
            // The index is dot-separated; a designer typing "arrow up" or
            // "arrow-up" means the same glyph as "arrow.up", so normalise both
            // sides rather than making them learn the separator.
            var nq = q.replace(/[\s.-]+/g, '.');
            var hits = nq ? list.filter(function (n) { return n.indexOf(nq) !== -1; }) : list;
            if (!hits.length) {
                grid.innerHTML = '<div class="davinci-live-editor-glyphs__empty">No glyph matches “' + esc(q) + '”.</div>';
                return;
            }
            var shown = hits.slice(0, GLYPH_PICKER_MAX);
            grid.innerHTML = shown.map(tileHtml).join('') +
            (hits.length > shown.length
                ? '<div class="davinci-live-editor-glyphs__more">' + (hits.length - shown.length) +
                  ' more match — keep typing to narrow it down</div>'
                : '');
        }
        loadIconIndex(function (list) {
            if (activeEditor !== pop) return;      // popover closed while loading
            if (!list.length) {
                grid.innerHTML = '<div class="davinci-live-editor-glyphs__empty">Glyph index not found ' +
                    '(assets/canvas/live-editor-icons.js).</div>';
                return;
            }
            search.placeholder = 'Search ' + list.length + ' SF Symbols…';
            render(list);
            search.addEventListener('input', function () { render(list); });
            search.focus();
        });
        grid.addEventListener('click', function (e) {
            var item = e.target.closest ? e.target.closest('[data-glyph]') : null;
            if (item) apply(item.getAttribute('data-glyph'));
        });
        wireCloseBtn(pop);
        pop.querySelector('.davinci-live-editor-editor__btn--reset').addEventListener('click', function () {
            if (isSf) { clearAttr(tgt, 'name'); }
            else if (isImg) { clearAttr(tgt, 'src'); }
            else {
                tgtWrite(tgt, 'maskImage', '');
                tgtWrite(tgt, 'webkitMaskImage', '');
                unlogEdit(tgt.el, 'maskImage', false, tgt.pseudo);
                unlogEdit(tgt.el, 'webkitMaskImage', false, tgt.pseudo);
            }
            applyLiveEdit(panelEl);
            closeEditor();
        });
    }
    // `isHover` picks the write target: false → normal inline style on the
    // subject; true → the scoped :hover stylesheet rule (setHoverStyleProp).
    function openColorEditor(rowVal, isHover) {
        // `subj` = what gets the style (the subject, or an icon inside it when the
        // click came from an Icons group); `panelEl` = what the panel keeps
        // showing and re-renders. They differ only for icon edits.
        var tgt = editTargetFrom(rowVal);
        var panelEl = editSubject();
        if (!tgt || !panelEl) return;
        var subj = tgt.el;
        var prop = rowVal.getAttribute('data-prop');
        var rect = rowVal.getBoundingClientRect();
        var hex;
        if (isHover) {
            var stored = (hoverOverrides && hoverOverrides.el === subj) ? hoverOverrides.props[prop] : null;
            var storedRgb = stored ? parseColorToRgb(stored) : null;
            hex = storedRgb ? rgbToHex(storedRgb) : (rowVal.getAttribute('data-hex') || '#ffffff');
        } else {
            var own = tgtComputed(tgt, prop);
            var rgb = isTransparent(own) ? null : parseColorToRgb(own);
            hex = rgb ? rgbToHex(rgb) : '#ffffff';
        }
        var pop = openEditor('davinci-live-editor-editor--color', rect, function (pop) {
            pop.innerHTML =
                '<div class="davinci-live-editor-editor__head">Edit ' + (isHover ? 'hover ' : '') + 'color</div>' +
                '<div class="davinci-live-editor-editor__row">' +
                    '<input type="color" class="davinci-live-editor-editor__swatch-input" value="' + hex + '">' +
                    '<input type="text" class="davinci-live-editor-editor__hex-input" value="' + hex + '" maxlength="7" spellcheck="false">' +
                '</div>' +
                '<div class="davinci-live-editor-editor__actions">' + resetBtnHtml() + closeBtnHtml(true) + '</div>';
            var swatchInput = pop.querySelector('.davinci-live-editor-editor__swatch-input');
            var hexInput = pop.querySelector('.davinci-live-editor-editor__hex-input');
            function apply(v) {
                if (isHover) setHoverStyleProp(subj, prop, v);
                else tgtWrite(tgt, prop, v);
                logEdit(subj, prop, v, isHover, tgt.pseudo);
                applyLiveEdit(panelEl);
            }
            swatchInput.addEventListener('input', function () {
                hexInput.value = swatchInput.value;
                apply(swatchInput.value);
            });
            // The native picker opened by this input closes on blur; flag it so
            // the very next document click (the one dismissing that picker)
            // doesn't also close this whole popover — see onDocClickCapture.
            swatchInput.addEventListener('blur', function () { colorSwatchJustBlurred = true; });
            hexInput.addEventListener('input', function () {
                var v = hexInput.value.trim();
                if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
                if (/^#[0-9a-f]{6}$/i.test(v)) { swatchInput.value = v; apply(v); }
            });
            wireCloseBtn(pop);
            pop.querySelector('.davinci-live-editor-editor__btn--reset').addEventListener('click', function () {
                if (isHover) setHoverStyleProp(subj, prop, '');
                else tgtWrite(tgt, prop, '');
                unlogEdit(subj, prop, isHover, tgt.pseudo);
                applyLiveEdit(panelEl);
                closeEditor();
            });
        });
        activeEditorTarget = rowVal;
    }
    // border-width, width/height, opacity) AND free-text (font-family,
    // box-shadow) properties edit IN PLACE inside the panel — the
    // row/side's own text swaps for a tiny <input>, devtools-style — instead of
    // a floating popup. Color (default or :hover) still uses the popover above
    // since a swatch needs its own picker UI. Only one inline edit is open at a
    // time; opening a new one commits/replaces whichever was open.
    // `applyLiveEditLite()` (overlay + distance lines only, no full renderPanel)
    // runs on every keystroke so typing never fights the browser for focus; the
    // full panel refresh happens once editing ends.
    function applyLiveEditLite(el) {
        el = el || editSubject();
        if (!el) return;
        syncRowBorderMirror(el);
        syncColumnMirror(el);
        repositionMarks(el);
        if (distAnchor) positionDist(distAnchor, el);
    }
    // Deferred + generation-guarded: a plain click on a DIFFERENT editable
    // target blurs this input (scheduling this commit) before that target's
    // own click handler runs. If that click opens a newer edit first, `gen`
    // will already be stale by the time this fires — skip so we don't
    // renderPanel() out from under the edit that just opened.
    //
    // Also detaches THIS input's own blur listener before returning. The chips
    // are focusable now (tabindex 0 — see markTabStops), so mousedown on another
    // one usually does blur this input first; but the ones that AREN'T chips
    // (a click on the row's plain label, on the panel background) still don't,
    // leaving the old input as the real document.activeElement when
    // openInlineEdit's "close the old edit first" call reaches here. The NEW
    // input's later `input.focus()` then forces a genuine, delayed blur on this
    // now-orphaned old input; if its listener were still attached, that stale
    // blur would re-run this function with `activeInlineEdit` already pointing
    // at the NEW edit, wiping it out right after it opened (its gen matches, so
    // the deferred render isn't skipped). Removing the listener here makes that
    // stale event a no-op.
    function finishInlineEdit() {
        if (!activeInlineEdit) return;
        var gen = activeInlineEdit.gen, el = activeInlineEdit.el, inputEl = activeInlineEdit.inputEl;
        var panelEl = activeInlineEdit.panelEl || el; // icon edits render the wrapper, not the icon
        activeInlineEdit = null;
        if (inputEl) inputEl.removeEventListener('blur', finishInlineEdit);
        // The render is deferred one tick and gen-guarded: this runs from the old
        // input's blur, which fires on mousedown BEFORE the click on a different
        // editable target is handled. Re-rendering synchronously here would
        // replace the row that click is about to land on, so the click would find
        // a detached node — turning a click-to-switch into "closes this edit,
        // click again to open the next one". Skip it entirely once a newer edit
        // has already opened (that edit does its own rendering).
        setTimeout(function () {
            if (gen !== inlineEditGen) return;
            applyLiveEdit(panelEl);
        }, 0);
    }
    // Enter is a deliberate, standalone commit — not a mousedown racing a click
    // on a DIFFERENT editable target — so there's no newer edit that could get
    // clobbered. Skip finishInlineEdit's deferral/gen-guard entirely and
    // apply+render synchronously, so the panel/UI reflect the typed value
    // immediately instead of relying on a same-tick setTimeout(0) callback.
    function commitActiveInlineEditNow() {
        if (!activeInlineEdit) return;
        var el = activeInlineEdit.el, inputEl = activeInlineEdit.inputEl;
        var panelEl = activeInlineEdit.panelEl || el;
        activeInlineEdit = null;
        if (inputEl) inputEl.removeEventListener('blur', finishInlineEdit);
        applyLiveEdit(panelEl);
    }
    // Enter closes the field but must NOT drop the keyboard back to <body> — the
    // re-render destroys the input, so the chip it came from is queued for focus
    // and re-found after the render (closed, not reopened: Enter means "done with
    // this one", and Tab/Enter from there still moves on or reopens it).
    function commitAndKeepFocus() {
        if (!activeInlineEdit) return;
        queueFocus(activeInlineEdit.target, null, false);
        commitActiveInlineEditNow();
    }
    // Escape is a deliberate, standalone action (not racing a follow-up click),
    // so reverting + re-rendering synchronously is safe here. `keepFocus` is set
    // when the key came from the field itself, so the chip stays focused rather
    // than the panel silently losing the keyboard.
    function cancelActiveInlineEdit(keepFocus) {
        if (!activeInlineEdit) return;
        if (keepFocus) queueFocus(activeInlineEdit.target, null, false);
        var prop = activeInlineEdit.prop, startVal = activeInlineEdit.startVal, el = activeInlineEdit.el;
        var startMask = activeInlineEdit.startMask;
        var colWasPinned = activeInlineEdit.colWasPinned;
        var panelEl = activeInlineEdit.panelEl || el;
        var tgt = activeInlineEdit.tgt || { el: el, pseudo: null };
        activeInlineEdit = null;
        tgtWrite(tgt, prop, startVal);
        tgtLog(tgt, prop, startVal, false);
        // Restore the mask-size this edit rescaled (see scaleMaskFromBase).
        // startMask is the pre-edit INLINE override — '' when the size came from
        // the stylesheet, which is exactly what clears it back to the rule.
        if (startMask) {
            tgtWrite(tgt, 'maskSize', startMask.size);
            tgtWrite(tgt, 'webkitMaskSize', startMask.webkit);
            tgtLog(tgt, 'maskSize', startMask.size, false);
            tgtLog(tgt, 'webkitMaskSize', startMask.webkit, false);
        }
        // Put back a table column this edit was resizing (see resetColumnWidth):
        // the cell's own inline width restored above never controlled it. If this
        // edit is what pinned the table in the first place, undo that as well so
        // cancelling leaves the markup untouched.
        if (isColumnWidthTarget(tgt, prop)) {
            if (colWasPinned) resetColumnWidth(tgt.el);
            else if (tgt.el.closest('table')) revertColumnWidths(tgt.el.closest('table'));
        }
        applyLiveEdit(panelEl);
    }
    // `kind` is 'number' (unit from data-unit, default 'px'), 'text' (raw
    // string, no unit), or 'select' (a closed set of keywords, e.g.
    // border-style) — the inline-editable value shapes.
    function openInlineEdit(target, kind) {
        if (activeInlineEdit) finishInlineEdit();
        // See openColorEditor: `subj` takes the style (an icon inside the subject
        // for Icons-section rows), `panelEl` is what stays on screen.
        var tgt = editTargetFrom(target);
        var panelEl = editSubject();
        if (!tgt || !panelEl) return;
        var subj = tgt.el;                       // the node the write lands on (or hosts the pseudo)
        var prop = target.getAttribute('data-prop');
        var unit = kind === 'number' ? (target.hasAttribute('data-unit') ? target.getAttribute('data-unit') : 'px') : '';
        // Per-row numeric step/range (see the Opacity rows). Default step 1: px
        // lengths and font-weight are whole numbers.
        var step = target.getAttribute('data-step') || '1';
        var minVal = target.hasAttribute('data-min') ? parseFloat(target.getAttribute('data-min')) : null;
        var maxVal = target.hasAttribute('data-max') ? parseFloat(target.getAttribute('data-max')) : null;
        var startVal = tgtOverride(tgt, prop);
        // px-based values (width, height, border-width/radius, font-size,
        // padding/margin sides) start the input on a whole pixel — sub-pixel
        // layout precision isn't useful to type against. Unitless props
        // (opacity, font-weight — data-unit="") keep their real decimals.
        var current = kind === 'number'
            ? (unit === 'px' ? Math.round(parseFloat(tgtComputed(tgt, prop)) || 0) : round2(parseFloat(tgtComputed(tgt, prop)) || 0))
            : (tgtComputed(tgt, prop) || '');
        // Shadow is free text because a box-shadow is a multi-part value, but
        // starting the field on the literal "none" made it a dead end: anything
        // you type over it that isn't a full, valid box-shadow is silently
        // dropped by the CSSOM (el.style.boxShadow = '9' is a no-op), so the row
        // just snapped back to "none". Seed a real, valid shadow instead so
        // there's something to tweak — the numbers are then editable in place,
        // and SHADOW_FROM_NUMBER below still accepts a bare number.
        // Glyph row shows/edits the bare file name, not the whole url("…") —
        // so the field opens on the name too (the directory rides along in
        // data-mask-dir, see the maskImage branch in the input handler).
        if (prop === 'maskImage' && target.hasAttribute('data-mask-dir')) {
            var curMask = /url\(["']?([^"')]+)/.exec(String(current));
            current = curMask ? curMask[1].split('/').pop() : '';
        }
        // `__strokePos` is not a CSS property — it's the Position row's synthetic
        // value, derived from whether an outline is drawn and where it sits.
        if (prop === '__strokePos') current = strokePositionOf(getComputedStyle(tgt.el, tgt.pseudo || null));
        if (prop === '__iconWeight') current = iconWeightOf(tgt);
        if (prop === '__offsetX') current = offsetOf(tgt, 'x');
        if (prop === '__offsetY') current = offsetOf(tgt, 'y');
        var seededShadow = false;
        if (prop === 'boxShadow' && (!current || current === 'none')) { current = SHADOW_TEMPLATE; seededShadow = true; }
        // Ratio for the padlock, sampled ONCE here rather than per keystroke: a
        // per-keystroke ratio would be recomputed from the already-rounded
        // partner value and drift the shape a little on every character typed.
        var lockRatio = null;
        if (ratioLock && kind === 'number' && (prop === 'width' || prop === 'height')) {
            var lw = parseFloat(tgtComputed(tgt, 'width')) || 0;
            var lh = parseFloat(tgtComputed(tgt, 'height')) || 0;
            if (lw > 0 && lh > 0) lockRatio = (prop === 'width') ? (lh / lw) : (lw / lh);
        }
        // Base size for the mask rescale (see scaleMaskWith). Sampled ONCE on
        // open, for the same reason lockRatio is: rescaling against the previous
        // KEYSTROKE's already-rounded size compounds the rounding, so typing "50"
        // one digit at a time (5 → 50) would land somewhere other than typing it
        // at once. Every keystroke scales from this original instead.
        var maskBaseW = null, maskBaseH = null, maskBaseSize = null, startMask = null;
        if (kind === 'number' && (prop === 'width' || prop === 'height') && maskSizePx(tgt)) {
            maskBaseW = parseFloat(tgtComputed(tgt, 'width')) || 0;
            maskBaseH = parseFloat(tgtComputed(tgt, 'height')) || 0;
            maskBaseSize = maskSizePx(tgt);
            // Pre-edit INLINE override only ('' when the size comes from the
            // stylesheet) — that's what Escape must put back, see
            // cancelActiveInlineEdit.
            startMask = { size: tgtOverride(tgt, 'maskSize'), webkit: tgtOverride(tgt, 'webkitMaskSize') };
        }
        var gen = ++inlineEditGen;
        target.classList.add('davinci-live-editor-inline-editing');
        if (kind === 'select') {
            var options = (target.getAttribute('data-options') || '').split(',');
            target.innerHTML =
                '<select class="davinci-live-editor-inline-select">' +
                options.map(function (o) { return '<option value="' + esc(o) + '"' + (o === current ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
                '</select>' +
                '<button type="button" class="davinci-live-editor-inline-reset" aria-label="Remove this override" title="Remove this override">' + RESET_ICON + '</button>';
            var select = target.querySelector('.davinci-live-editor-inline-select');
            var selectResetBtn = target.querySelector('.davinci-live-editor-inline-reset');
            activeInlineEdit = { target: target, prop: prop, startVal: startVal, gen: gen, el: subj, tgt: tgt, panelEl: panelEl, inputEl: select };
            select.addEventListener('change', function () {
                if (prop === '__iconWeight') {
                    applyIconMask(tgt, maskUrlOf(tgt.el, tgt.pseudo), parseFloat(select.value) || 0);
                    applyLiveEditLite(panelEl);
                    return;
                }
                if (prop === '__strokePos') {
                    setStrokePosition(tgt, select.value);
                    activeInlineEdit = null;
                    // This is the one select that re-renders on change, so it's
                    // also the one that would drop focus mid-interaction —
                    // hand it back to the chip the select came from.
                    queueFocus(target, null, false);
                    applyLiveEdit(panelEl);   // full render: the Border row now edits outline-* (or border-* again)
                    return;
                }
                tgtWrite(tgt, prop, select.value);
                tgtLog(tgt, prop, tgtOverride(tgt, prop), false);
                applyLiveEditLite(panelEl);
            });
            select.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelActiveInlineEdit(true); }
                else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commitAndKeepFocus(); }
                else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); stepFromInlineEdit(e.shiftKey); }
            });
            select.addEventListener('blur', finishInlineEdit);
            selectResetBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
            selectResetBtn.addEventListener('click', function () {
                if (prop === '__strokePos') setStrokePosition(tgt, 'layout');
                else if (prop === '__iconWeight') clearIconMask(tgt);
                else tgtWrite(tgt, prop, '');
                unlogEdit(subj, prop, false, tgt.pseudo);
                activeInlineEdit = null;
                applyLiveEdit(panelEl);
            });
            // preventScroll: the panel body scrolls, and a plain focus() drags the
            // focused field towards the middle of it — so opening a field nudged the
            // WHOLE group (its title included) up or down by a few pixels, which reads
            // as the panel jumping even though the row itself held still. The field is
            // already on screen: either the pointer just clicked it, or the Tab handler
            // scrolled it into view deliberately (see restorePendingFocus).
            select.focus({ preventScroll: true });
            return;
        }
        var inputCls = 'davinci-live-editor-inline-input' + (kind === 'text' ? ' davinci-live-editor-inline-input--text' : '');
        target.innerHTML =
            '<input type="' + (kind === 'number' ? 'number' : 'text') + '" class="' + inputCls + '" value="' + esc(String(current)) + '"' +
                (kind === 'number'
                    ? ' step="' + esc(step) + '"' +
                      (minVal !== null ? ' min="' + esc(String(minVal)) + '"' : '') +
                      (maxVal !== null ? ' max="' + esc(String(maxVal)) + '"' : '')
                    : ' spellcheck="false"') + '>' +
            '<button type="button" class="davinci-live-editor-inline-reset" aria-label="Remove this override" title="Remove this override">' + RESET_ICON + '</button>';
        var input = target.querySelector('.davinci-live-editor-inline-input');
        var resetBtn = target.querySelector('.davinci-live-editor-inline-reset');
        // Whether this table was ALREADY pinned to a fixed layout before this edit.
        // If not, Escape has to undo the pinning too, not just the column's width —
        // otherwise cancelling the very first column resize would still leave the
        // table converted to `table-layout: fixed`.
        var colWasPinned = isColumnWidthTarget(tgt, prop) && subj.closest('table')
            ? !!colStateFor(subj.closest('table')) : false;
        activeInlineEdit = { target: target, prop: prop, startVal: startVal, gen: gen, el: subj, tgt: tgt, panelEl: panelEl, inputEl: input, startMask: startMask, colWasPinned: colWasPinned };
        // Seeded shadow applies on OPEN, not just on keystroke: the input handler
        // below is the only thing that writes a text value, so opening the field
        // and pressing Enter on the untouched template would have committed
        // nothing and snapped the row back to "none" — the very dead end the
        // seed exists to fix. Applying here makes the starter shadow visible
        // immediately, tunable in place; Escape restores `startVal` (empty), and
        // Reset (↺) / "Undo all" drop it like any other edit.
        if (seededShadow) {
            tgtWrite(tgt, prop, current);
            tgtLog(tgt, prop, tgtOverride(tgt, prop), false);
            applyLiveEditLite(panelEl);
        }
        input.addEventListener('input', function () {
            if (kind === 'number') {
                var n = parseFloat(input.value);
                if (isNaN(n)) return;
                if (prop === '__offsetX' || prop === '__offsetY') {
                    setOffset(tgt, prop === '__offsetX' ? 'x' : 'y', n);
                    applyLiveEditLite(panelEl);
                    return;
                }
                // Clamp to the row's range, and correct the field itself — letting
                // it read 5 while the element renders 1 (the browser's own clamp)
                // would just look broken.
                if (minVal !== null && n < minVal) n = minVal;
                if (maxVal !== null && n > maxVal) n = maxVal;
                if (n !== parseFloat(input.value)) input.value = String(n);
                tgtWrite(tgt, prop, n + unit);
                // CSS spec: border-*-width computes to 0 whenever border-*-style
                // is 'none', regardless of the declared width — so typing a
                // border width has no visible/measurable effect until the style
                // is also non-none. Default it to 'solid' so the typed value
                // actually shows up (matches how devtools/design tools behave).
                // Check borderTopStyle specifically, not the borderStyle
                // shorthand — the panel's Border row always reads the TOP side
                // (b.bw[0]/cs.borderTopStyle). When only some sides have a
                // declared border (e.g. a table cell with border-right +
                // border-bottom but no border-top), getComputedStyle().borderStyle
                // serializes as a 4-value string like "none solid solid none",
                // which never equals 'none' — so this guard used to never fire
                // and border-top stayed 0 even though the shorthand width was
                // set and the other (already-solid) sides visibly changed.
                // inside/center are expressed as a NEGATIVE offset of the width,
                // so the offset has to move with it or the stroke drifts off the
                // edge as you type.
                if (prop === 'outlineWidth' && target.hasAttribute('data-stroke-pos')) {
                    var offVal = outlineOffsetFor(target.getAttribute('data-stroke-pos'), n);
                    tgtWrite(tgt, 'outlineOffset', offVal);
                    tgtLog(tgt, 'outlineOffset', offVal, false);
                    if (tgtComputed(tgt, 'outlineStyle') === 'none') {
                        tgtWrite(tgt, 'outlineStyle', 'solid');
                        tgtLog(tgt, 'outlineStyle', 'solid', false);
                    }
                }
                if (prop === 'borderWidth' && n > 0 && tgtComputed(tgt, 'borderTopStyle') === 'none') {
                    tgtWrite(tgt, 'borderStyle', 'solid');
                    tgtLog(tgt, 'borderStyle', 'solid', false);
                }
                // Padlock: move the OTHER dimension by the sampled ratio. Written
                // through the same tgtWrite/log path, so Reset and "Undo all"
                // drop it exactly like a hand-typed value.
                if (lockRatio) {
                    var partner = prop === 'width' ? 'height' : 'width';
                    var pv = Math.round(n * lockRatio);
                    tgtWrite(tgt, partner, pv + unit);
                    tgtLog(tgt, partner, tgtOverride(tgt, partner), false);
                    // Repaint the partner's chip in place, on every keystroke and
                    // every spinner step. A full renderPanel would rebuild the row
                    // and destroy the input being typed into, so the number is
                    // written straight into the sibling chip — otherwise the
                    // element resizes live while the panel still shows the old
                    // partner value until the edit is committed.
                    var lockRow = target.closest ? target.closest('.davinci-live-editor-row') : null;
                    var partnerChip = lockRow ? lockRow.querySelector('[data-prop="' + partner + '"]') : null;
                    if (partnerChip && !partnerChip.classList.contains('davinci-live-editor-inline-editing')) {
                        partnerChip.textContent = pv;
                    }
                    if (!tgt.pseudo) {
                        // Same flex-clamp reasoning as below, for the partner side.
                        var pMin = partner === 'width' ? 'minWidth' : 'minHeight';
                        var pMax = partner === 'width' ? 'maxWidth' : 'maxHeight';
                        subj.style[pMin] = pv + unit;
                        subj.style[pMax] = pv + unit;
                        logEdit(subj, pMin, subj.style[pMin], false);
                        logEdit(subj, pMax, subj.style[pMax], false);
                    }
                }
                // A table cell's width only takes effect through its <col> (see
                // setColumnWidth). The flex min/max clamp below is meaningless for a
                // table cell, so these are alternatives rather than both — same
                // either/or the pre-DaVinci version had, just without needing a
                // table component to do the work.
                var wroteCol = isColumnWidthTarget(tgt, prop) && setColumnWidth(subj, n);
                if (!wroteCol && !tgt.pseudo && (prop === 'width' || prop === 'height')) {
                    // Flex items default to `min-width/min-height: auto`, which
                    // floors their real size at their content's intrinsic size —
                    // typing a smaller Dimensions value sets `width`/`height` but
                    // the flex layout algorithm silently ignores it. Pin an
                    // explicit min AND max to the typed value so it's a hard
                    // clamp regardless of the parent's flex/grid sizing behavior.
                    var minProp = prop === 'width' ? 'minWidth' : 'minHeight';
                    var maxProp = prop === 'width' ? 'maxWidth' : 'maxHeight';
                    subj.style[minProp] = n + unit;
                    subj.style[maxProp] = n + unit;
                    logEdit(subj, minProp, subj.style[minProp], false);
                    logEdit(subj, maxProp, subj.style[maxProp], false);
                }
                // Masked icon: grow the DRAWING with the box, not just the box.
                // Runs after the padlock block so a locked partner edit is already
                // written and both axes scale together in one pass.
                if (maskBaseSize) {
                    var mw = parseFloat(tgtComputed(tgt, 'width')) || maskBaseW;
                    var mh = parseFloat(tgtComputed(tgt, 'height')) || maskBaseH;
                    scaleMaskFromBase(tgt, maskBaseSize, maskBaseW, maskBaseH, mw, mh);
                }
            } else {
                // Bare number in the Shadow row → a real shadow (see
                // shadowFromNumber); every other free-text value goes in as typed.
                var typed = (prop === 'boxShadow' && shadowFromNumber(input.value)) || input.value;
                // Glyph row: the field holds a bare file NAME, so rebuild a full
                // mask URL from the directory the current mask already points at
                // (data-mask-dir, captured at render). Both the standard and the
                // -webkit- property are written — Safari still needs the prefixed
                // one, and the unprefixed alone would leave the old glyph showing.
                if (prop === 'maskImage' && target.hasAttribute('data-mask-dir')) {
                    var file = typed.trim().replace(/^url\(["']?|["']?\)$/g, '');
                    if (file && !/\.[a-z0-9]+$/i.test(file)) file += '.svg';
                    var full = file ? 'url("' + target.getAttribute('data-mask-dir') + file + '")' : '';
                    tgtWrite(tgt, 'maskImage', full);
                    tgtWrite(tgt, 'webkitMaskImage', full);
                    tgtLog(tgt, 'maskImage', full, false);
                    tgtLog(tgt, 'webkitMaskImage', full, false);
                    applyLiveEditLite(panelEl);
                    return;
                }
                tgtWrite(tgt, prop, typed);
            }
            tgtLog(tgt, prop, tgtOverride(tgt, prop), false);
            applyLiveEditLite(panelEl);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commitAndKeepFocus(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelActiveInlineEdit(true); }
            else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); stepFromInlineEdit(e.shiftKey); }
        });
        input.addEventListener('blur', finishInlineEdit);
        // Prevent the input from blurring on the reset click itself (mousedown is
        // what shifts focus) so this stays a single, simple, synchronous action.
        resetBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
        resetBtn.addEventListener('click', function () {
            if (prop === '__offsetX' || prop === '__offsetY') { clearOffset(tgt); }
            else tgtWrite(tgt, prop, '');
            unlogEdit(subj, prop, false, tgt.pseudo);
            if (prop === 'maskImage') { // written as a pair — drop the prefixed one too
                tgtWrite(tgt, 'webkitMaskImage', '');
                unlogEdit(subj, 'webkitMaskImage', false, tgt.pseudo);
            }
            if (prop === 'width' || prop === 'height') {
                // Undo the min/max clamp forced alongside width/height (see the
                // 'input' listener above) — otherwise Reset clears the visible
                // value but the stale forced min/max keeps clamping the element.
                var minProp = prop === 'width' ? 'minWidth' : 'minHeight';
                var maxProp = prop === 'width' ? 'maxWidth' : 'maxHeight';
                subj.style[minProp] = '';
                subj.style[maxProp] = '';
                unlogEdit(subj, minProp, false);
                unlogEdit(subj, maxProp, false);
            }
            // A table column's width lives on its <col>, so clearing the cell's
            // inline width above leaves the column exactly as wide as it was.
            if (isColumnWidthTarget(tgt, prop)) resetColumnWidth(subj);
            // Drop the mask rescale written alongside width/height, or the glyph
            // would keep the size the (now-reverted) box had.
            if (maskBaseSize) {
                tgtWrite(tgt, 'maskSize', '');
                tgtWrite(tgt, 'webkitMaskSize', '');
                unlogEdit(subj, 'maskSize', false, tgt.pseudo);
                unlogEdit(subj, 'webkitMaskSize', false, tgt.pseudo);
            }
            activeInlineEdit = null;
            applyLiveEdit(panelEl);
        });
        input.focus({ preventScroll: true });   // see the note on select.focus() above
        input.select();
    }

    // ── show/hide ────────────────────────────────────────────
    function showOverlay() { ui.overlay.classList.add('is-on'); }
    function hideOverlay() { ui.overlay.classList.remove('is-on'); }
    function showPanel() { ui.panel.classList.add('is-on'); syncDockReserve(); }
    function hidePanel() { ui.panel.classList.remove('is-on'); syncDockReserve(); }

    // ── dock / float (persisted per user across all prototypes) ──
    // Docked = the panel becomes a fixed right-hand sidebar; the canvas content is
    // pushed left by reserving margin on <body> (the whole canvas — navbar, ribbon,
    // content, footer — lives in the body's flex column and is NOT viewport-fixed,
    // so a body margin shrinks all of it cleanly with no overlap). Floating = the
    // default draggable top-right panel. The choice is saved in localStorage, which
    // is per-origin, so it carries across every prototype. See applyDock/setDocked
    // below; the two buttons' glyphs are in the icon table that follows.

    // ── icons: SF Symbols, all of them ───────────────────────
    // Every glyph in this panel is an <sf-symbol>, the same component the canvas and
    // the prototypes themselves use. The crosshair and pin were the only two for a
    // while; the rest were hand-drawn inline SVGs, some of them (Undo, Create Prompt)
    // hand-traced FROM the very symbol they now just name. Two reasons that was wrong:
    // a traced copy drifts in weight and optical size from the real symbol beside it,
    // and it silently forks Apple's icon language inside a tool whose whole job is
    // reporting a design system faithfully.
    //
    // The old note on the footer pair claimed sf-symbol's "CDN is unreachable from
    // this workspace" and refused it on those grounds. That was carried over from the
    // VMT original and is not true here: davinci-canvas.js probes the CDN at load and
    // falls back to the corp endpoint (resolveSfSymbolsEndpoint), passing the winner to
    // sf-symbol.js as data-endpoint — which is how the glyph picker previews 4414
    // symbols and how the ribbon's own button draws.
    //
    // TRADE-OFF, accepted: `name` costs one fetch per distinct glyph (cached globally
    // per name+weight+scale for the page), and if the endpoint is unreachable
    // sf-symbol renders a warning span instead of the icon. We take that because the
    // crosshair/pin already did, and because on an endpoint failure every icon in the
    // prototype under review fails the same way — a panel that alone kept working
    // would be the misleading outcome, not the useful one. Nothing here is load-bearing
    // for the tool's operation: every button also carries a title and an aria-label.
    //
    // SIZING IS FONT-SIZE, not width/height. sf-symbol writes `width: <n>em` as an
    // INLINE style on both the host and its generated <svg>, so a stylesheet
    // `svg { width: … }` rule loses to it. See the size knobs in
    // live-editor-system.css, which set font-size on the sf-symbol host instead.
    function sfIcon(name, cls) {
        return '<sf-symbol name="' + name + '"' + (cls ? ' class="' + cls + '"' : '') +
            ' weight="regular" aria-hidden="true"></sf-symbol>';
    }
    // Dock = "make this a right sidebar", which is literally `sidebar.right`; Float =
    // `macwindow`, a window standing free. Both replace hand-drawn rect diagrams that
    // were trying to say exactly this.
    var DOCK_ICON = sfIcon('sidebar.right');
    var FLOAT_ICON = sfIcon('macwindow');
    var CLOSE_ICON = sfIcon('xmark');
    // Collapse / expand is a disclosure — the panel folds into its own header rather
    // than going anywhere — so the chevron points the way it will MOVE. These were the
    // "-" and "▢" TEXT glyphs before, and U+25A2 has no glyph in the macOS system UI
    // font: the expand state rendered as tofu, so the button looked broken in exactly
    // the state you have to click to get the panel back.
    var COLLAPSE_ICON = sfIcon('chevron.up');
    var EXPAND_ICON = sfIcon('chevron.down');
    // Footer buttons. Both were hand-traced from these same two symbols (the old
    // comment named them), so naming them is strictly closer to the intent.
    var UNDO_ICON = sfIcon('arrow.uturn.backward');
    var PROMPT_ICON = sfIcon('terminal');
    // Header: the keyboard-shortcuts tip trigger.
    var KEYBOARD_ICON = sfIcon('keyboard');
    // Reset one live override, in the inline field and in the popovers. Was the "↺"
    // text glyph (U+21BA), drawn from the text font and so matching nothing else here.
    var RESET_ICON = sfIcon('arrow.counterclockwise');
    // Checked item in the ruler right-click menu — was a "✓" text glyph.
    var CHECK_ICON = sfIcon('checkmark');
    // W/H proportion padlock, both states. Replaces a padlock DRAWN IN CSS out of two
    // bordered spans, whose comment justified itself with "so this dev tool keeps
    // shipping without an icon dependency" — a constraint that stopped applying the
    // moment the crosshair became a symbol.
    var LOCK_ON_ICON = sfIcon('lock.fill');
    var LOCK_OFF_ICON = sfIcon('lock.open');
    // Ancestors disclosure. Was a CSS border-triangle, which is a triangle, not the
    // chevron every other disclosure in this panel now uses.
    var TREE_CHEV_ICON = sfIcon('chevron.down', 'davinci-live-editor-ancestors__chev');
    // The Column row's glyph: one column standing out of a table, which is what
    // `rectangle.split.3x1` draws. Was a CSS box with a gradient stripe for a fill.
    var COLUMN_ICON = sfIcon('rectangle.split.3x1', 'davinci-live-editor-colsel__ico');
    // The compound control's two glyphs, as SF Symbols rather than hand-drawn SVGs:
    // `scope` is the crosshair, `pin` its modifier. Both come from the same source as
    // the ribbon's own button, so the pair can't drift in weight or size the way an
    // inline SVG next to a symbol would. sf-symbol is a CANVAS component, not a
    // design-system one, so this doesn't reintroduce a pack dependency — and because
    // custom elements upgrade whenever their definition lands, it doesn't matter that
    // the canvas may still be loading sf-symbol.js when the panel is built.
    var CROSSHAIR_ICON = sfIcon('scope');
    var PIN_ICON = sfIcon('pin');
    function loadDockPref() {
        // Default to docked for first-time users (no saved choice yet); once they
        // pick a mode it's remembered. Only an explicit 'floating' opts out.
        try { return localStorage.getItem(DOCK_KEY) !== 'floating'; } catch (e) { return true; }
    }
    function saveDockPref() {
        try { localStorage.setItem(DOCK_KEY, docked ? 'docked' : 'floating'); } catch (e) {}
    }
    // ── floating position + minimized state — persisted per user ──
    function savePanelPos() {
        if (!ui || !ui.panel || docked) return;   // docked has no position of its own
        var r = ui.panel.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) })); } catch (e) {}
    }
    // Clamped to the CURRENT window, and deliberately not to the panel's full size:
    // a tall panel on a short window would otherwise refuse to restore at all. What
    // has to stay reachable is the header (the drag handle and the close button), so
    // that is what the clamp guarantees.
    function applyPanelPos() {
        if (!ui || !ui.panel || docked) return;
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (e) {}
        if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number') return;
        var x = Math.max(0, Math.min(window.innerWidth - 40, saved.x));
        var y = Math.max(0, Math.min(window.innerHeight - 20, saved.y));
        ui.panel.style.left = x + 'px';
        ui.panel.style.top = y + 'px';
        ui.panel.style.right = 'auto';
    }
    function saveMinPref() {
        if (!ui || !ui.panel) return;
        var min = ui.panel.classList.contains('davinci-live-editor-panel--min');
        try { localStorage.setItem(MIN_KEY, min ? 'on' : 'off'); } catch (e) {}
    }
    function isMinimized() {
        return !!(ui && ui.panel && ui.panel.classList.contains('davinci-live-editor-panel--min'));
    }
    // The ONE place the collapsed state flips: the class, the button's icon, its
    // title, its aria-label AND its aria-expanded, and — unless we're applying a
    // stored or forced value — the saved preference. Three callers used to toggle the
    // class by hand and each rewrote a different subset; the aria-label was in none of
    // them, so a collapsed panel still announced itself as "Minimize".
    function setMinimized(min, save) {
        if (!ui || !ui.panel) return;
        ui.panel.classList.toggle('davinci-live-editor-panel--min', min);
        var btn = ui.panel.querySelector('.davinci-live-editor-panel__min');
        if (btn) {
            btn.innerHTML = min ? EXPAND_ICON : COLLAPSE_ICON;
            btn.title = min ? 'Expand' : 'Collapse';
            btn.setAttribute('aria-label', min ? 'Expand panel' : 'Collapse panel');
            // It's a chevron disclosure now, so it carries the state the way one does.
            btn.setAttribute('aria-expanded', min ? 'false' : 'true');
        }
        if (save) saveMinPref();
    }
    // Picking an element while collapsed opens the panel back up. Minimized is a
    // "stay out of my way" state, and a pick is the explicit end of it: the only
    // reason to select something is to read or edit its specs, which a collapsed
    // panel swallows silently — it would look as though the click did nothing. The
    // preference is written too, so the panel doesn't fight you by re-collapsing on
    // the next prototype.
    function expandForSelection() {
        if (isMinimized()) setMinimized(false, true);
    }
    function applyMinPref() {
        // Minimize is N/A while docked (applyDock strips the class), so a saved
        // "minimized" only applies to the floating panel.
        if (!ui || !ui.panel || docked) return;
        var min = false;
        try { min = localStorage.getItem(MIN_KEY) === 'on'; } catch (e) {}
        setMinimized(min, false);
    }
    function updateDockBtn() {
        if (!ui || !ui.dockBtn) return;
        ui.dockBtn.innerHTML = docked ? FLOAT_ICON : DOCK_ICON;
        ui.dockBtn.title = docked ? 'Float' : 'Dock to side';
        ui.dockBtn.setAttribute('aria-label', docked ? 'Float panel' : 'Dock to side');
    }
    // Reserve body space only while the panel is actually on screen.
    function syncDockReserve() {
        if (!ui) return;
        document.body.classList.toggle('davinci-live-editor-body-docked', docked && ui.panel.classList.contains('is-on'));
    }
    function applyDock() {
        if (!ui) return;
        ui.panel.classList.toggle('davinci-live-editor-panel--docked', docked);
        if (docked) {
            // Drop any inline coords left by a previous drag so the sidebar CSS wins.
            ui.panel.style.left = ui.panel.style.top = ui.panel.style.right = ui.panel.style.bottom = '';
            setMinimized(false, false);   // minimize is N/A when docked; don't overwrite the floating pref
        } else {
            // Floating: put the panel back where it was last left, minimized or not.
            // This runs at boot AND whenever the panel is un-docked, so switching out
            // of the sidebar returns it to its own remembered spot rather than
            // snapping to the default top-right corner.
            applyPanelPos();
            applyMinPref();
        }
        syncDockReserve();
        updateDockBtn();
    }
    function setDocked(on) {
        docked = on;
        saveDockPref();
        applyDock();
    }

    // ── Dimensions ratio lock — persisted per user ──────────
    function loadRatioPref() {
        try { return localStorage.getItem(RATIO_KEY) === 'on'; } catch (e) { return false; }
    }
    function setRatioLock(on) {
        ratioLock = on;
        try { localStorage.setItem(RATIO_KEY, on ? 'on' : 'off'); } catch (e) {}
        var subj = editSubject();
        if (subj) renderPanel(subj);   // repaint the padlock + its title
    }

    // ── box-model outlines — per SESSION, never persisted (see showGuides) ──
    // Internally still "guides" (var showGuides / applyGuidesPref / the --no-guides
    // class); the UI label is "Bounding box" and it lives in the SIZE group. Wholly
    // independent of the RULER guides, which are a different feature.
    function applyGuidesPref() {
        if (!ui) return;
        if (ui.overlay) ui.overlay.classList.toggle('davinci-live-editor-overlay--no-guides', !showGuides);
    }
    // Ruler guides are hidden ONLY by an explicit action — the ruler right-click
    // "Hide guides" (hiddenGuides) or turning the rulers off entirely. They are no
    // longer coupled to the bounding-box switch or to the panel being open: the two
    // guide systems (dashed box-model outlines vs. ruler guides) are separate
    // controls now. Nothing is deleted here — visibility only.
    function applyRulerGuidesVisibility() {
        if (!ui || !ui.rulers) return;
        ui.rulers.classList.toggle('davinci-live-editor-rulers--no-guides', hiddenGuides);
    }
    function setGuides(on) {
        showGuides = on;
        applyGuidesPref();   // session-only; nothing to save
    }
    // The Rulers switch lives in the view bar, built once at boot rather than
    // re-rendered — so its state has to be pushed onto the live checkbox by hand
    // whenever ⌃R or the right-click menu changes it behind the switch's back.
    function syncRulersSwitch() {
        if (!ui || !ui.panel) return;
        var input = ui.panel.querySelector('.davinci-live-editor-panel__rulers-toggle');
        if (input) input.checked = rulersOn;
    }
    // ── inspect mode (the crosshair) ──
    // Pinned by the button OR by Option/Alt being held right now.
    function pinActive() { return inspectPinned || altHeldPin; }
    // The page-wide crosshair cursor is the honest tell that a click will pick
    // instead of activate, so it tracks the ARMED state exactly.
    function applyInspectCursor() {
        document.documentElement.classList.toggle('davinci-live-editor-pick-mode', inspecting && picking);
    }
    // The crosshair and the pin are one COMPOUND control: the pin is a modifier on
    // the crosshair, so it can't be on by itself. Disarming therefore releases it —
    // clicking the crosshair while pinned turns both off, which is the only reading
    // that keeps the pair's two lit states meaningful.
    function setInspecting(on) {
        inspecting = on;
        if (!on) inspectPinned = false;
        applyInspectCursor();
        if (!on) {
            // Disarming drops the hover outline, but never the selection — the panel
            // keeps showing (and editing) whatever was picked.
            //
            // A measurement in progress (Control held) survives: it tracks hover on its
            // own and is anchored to the selection, so clearing it here would cut the
            // gap lines short on every unpinned pick.
            if (!measuring) {
                hovered = null;
                distAnchor = null;
                hideDist();
                hideHov();
            }
            if (selected) { showOverlay(); positionOverlay(selected); drawSel(selected); }
            else if (!measuring) hideOverlay();
        }
        syncPickerButtons();
        syncPickHint();
    }
    function setInspectPinned(on) {
        inspectPinned = on;
        // Pinning ARMS as well — the other half of the compound control. Turning the
        // pin off leaves the crosshair armed, since you're still picking, just not
        // staying.
        if (on && !inspecting) { setInspecting(true); return; }   // syncs on the way out
        syncPickerButtons();
        syncPickHint();
    }
    function syncPickerButtons() {
        if (!ui || !ui.panel) return;
        if (ui.crosshairBtn) {
            ui.crosshairBtn.classList.toggle('davinci-live-editor-panel__crosshair--on', inspecting);
            ui.crosshairBtn.setAttribute('aria-pressed', inspecting ? 'true' : 'false');
            ui.crosshairBtn.title = inspecting
                ? 'Selecting — click an element to inspect it, or press Esc to stop'
                : 'Select an element: click here, then click anything on the page (or just hold ⌥ and click it)';
        }
        if (ui.pinBtn) {
            var on = pinActive();
            ui.pinBtn.classList.toggle('davinci-live-editor-panel__pin--on', on);
            ui.pinBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
            ui.pinBtn.title = on
                ? 'Keeping select mode on after each pick — click to turn off (also on while ⌥ is held)'
                : 'Keep select mode on after each pick, so you can walk several elements. Holding ⌥ does the same for as long as you hold it — and arms the crosshair if it is off.';
        }
    }
    // The panel's own statement of what the pointer will do right now. Three states,
    // because "why is nothing happening?" and "why did my click not open the drawer?"
    // are both answered here rather than in a tooltip you have to go find.
    function syncPickHint() {
        if (!ui || !ui.panel) return;
        var hint = ui.panel.querySelector('.davinci-live-editor-panel__pick-hint');
        if (!hint) return;
        hint.style.display = '';
        if (inspecting) {
            hint.innerHTML = pinActive()
                ? 'Click to select · staying on'
                : 'Click to select';
            hint.title = pinActive()
                ? 'Click any element to select it. Select mode stays on afterwards, so you can pick another straight away.'
                : 'Click any element to select it. Select mode then turns itself off and clicks go back to the prototype — pin it (or hold ⌥) to keep picking.';
        } else {
            hint.innerHTML = '<kbd>⌥</kbd>+click to select element';
            hint.title = 'The crosshair is off, so the prototype behaves normally — open a drawer, submit a form. Click the crosshair to start selecting, or hold ⌥ and click an element to pick just that one.';
        }
    }

    // ── RULERS (⌃R) ──────────────────────────────────────────
    // Sketch-style rulers on the top/left edges; drag off a ruler to create a
    // guide, drag a guide to move it, drop it back on its ruler to delete it.
    //
    // COORDINATE SYSTEM — the one thing to get right here. Guides are stored in
    // DOCUMENT coordinates (page origin), while the layer that draws them is
    // `position: fixed` (viewport). A fixed guide left alone would sit still on
    // screen and slide across the content as you scroll, which defeats the point
    // of a guide. So every guide is drawn at `docPos - scroll`, refreshed from the
    // same onScrollResize the box-model overlay already uses.
    //
    // The rulers are per-PROTOTYPE (keyed by pathname): a guide marking a table
    // column on one page is meaningless on another. The on/off state is global,
    // like the dock/guides prefs.
    function rulerGuidesKey() {
        try { return RULER_GUIDES_KEY + ':' + location.pathname; } catch (e) { return RULER_GUIDES_KEY; }
    }
    function loadRulersPref() {
        try { return localStorage.getItem(RULERS_KEY) === 'on'; } catch (e) { return false; }
    }
    function saveRulersPref() {
        try { localStorage.setItem(RULERS_KEY, rulersOn ? 'on' : 'off'); } catch (e) {}
    }
    function loadRulerGuides() {
        try {
            var raw = localStorage.getItem(rulerGuidesKey());
            var arr = raw ? JSON.parse(raw) : [];
            // Defensive: hand-edited/older payloads shouldn't be able to inject a
            // NaN position, which would render a guide at "NaNpx" (invisible and
            // undeletable — it never lands under the cursor).
            return Array.isArray(arr) ? arr.filter(function (g) {
                return g && (g.axis === 'x' || g.axis === 'y') && isFinite(g.pos);
            }) : [];
        } catch (e) { return []; }
    }
    function saveRulerGuides() {
        try { localStorage.setItem(rulerGuidesKey(), JSON.stringify(rulerGuides)); } catch (e) {}
    }
    function scrollX() { return window.pageXOffset || document.documentElement.scrollLeft || 0; }
    function scrollY() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
    // Tick spacing adapts to nothing (no zoom here) — 10px minor, 50px mid, 100px
    // labelled. Ticks are drawn as repeating-linear-gradients rather than DOM
    // nodes: a 4000px ruler at 10px steps would be 400 elements per axis, rebuilt
    // on every scroll. Labels ARE nodes, but only ~1 per 100px.
    // ORIGIN NOTE: the guides layer spans the whole viewport, so a guide at
    // document `pos` draws at `pos - scroll`. The ruler STRIPS don't — the
    // horizontal one starts at x=RULER_SIZE (the corner square occupies 0..20),
    // so offsets inside a strip are shifted by another RULER_SIZE. Getting this
    // wrong puts every tick and number 20px out of step with the guides they're
    // supposed to measure.
    function renderRulerTicks() {
        if (!ui || !ui.rulers) return;
        var sx = scrollX(), sy = scrollY();
        var w = window.innerWidth, h = window.innerHeight;
        // Phase-shift the gradients so ticks land on DOCUMENT multiples. All THREE
        // layers must be listed: assigning a single value collapses the
        // multi-layer declaration from the stylesheet, which is what anchors the
        // minor/mid ticks to the strip's inner edge (0 0, 0 100%, 0 100%).
        var ox = -(sx + RULER_SIZE), oy = -(sy + RULER_SIZE);
        ui.rulerH.style.backgroundPosition =
            (ox % 100) + 'px 0, ' + (ox % 50) + 'px 100%, ' + (ox % 10) + 'px 100%';
        ui.rulerV.style.backgroundPosition =
            '0 ' + (oy % 100) + 'px, 100% ' + (oy % 50) + 'px, 100% ' + (oy % 10) + 'px';
        var hLabels = '', vLabels = '';
        // Only label what's actually on screen: the strip is the viewport's width,
        // so the visible document range is [scroll + RULER_SIZE, scroll + extent].
        var startX = Math.floor((sx + RULER_SIZE) / 100) * 100;
        for (var x = startX; x < sx + w; x += 100) {
            if (x < 0) continue;
            hLabels += '<span class="davinci-live-editor-ruler__label" style="left:' + (x - sx - RULER_SIZE) + 'px">' + x + '</span>';
        }
        var startY = Math.floor((sy + RULER_SIZE) / 100) * 100;
        for (var y = startY; y < sy + h; y += 100) {
            if (y < 0) continue;
            vLabels += '<span class="davinci-live-editor-ruler__label" style="top:' + (y - sy - RULER_SIZE) + 'px">' + y + '</span>';
        }
        ui.rulerH.innerHTML = hLabels;
        ui.rulerV.innerHTML = vLabels;
    }
    // One node per guide, reused across scrolls — only the offset is rewritten in
    // positionRulerGuides, so scrolling never touches the DOM structure. Each
    // guide carries its own position label plus two neighbour-distance labels
    // (previous/next on the same axis), all hidden until hover or drag.
    function renderRulerGuides() {
        if (!ui || !ui.rulerGuides) return;
        ui.rulerGuides.innerHTML = rulerGuides.map(function (g, i) {
            return '<div class="davinci-live-editor-ruler-guide davinci-live-editor-ruler-guide--' + g.axis + '" data-guide="' + i + '">' +
                '<span class="davinci-live-editor-ruler-guide__label"></span>' +
                '<span class="davinci-live-editor-ruler-guide__gap" data-side="prev"></span>' +
                '<span class="davinci-live-editor-ruler-guide__gap" data-side="next"></span>' +
            '</div>';
        }).join('');
        positionRulerGuides();
    }
    // Nearest guide on the same axis in one direction, or null at the ends.
    // Computed from the live array rather than a cached sort: guides are few
    // (single digits in practice) and a drag reorders them continuously, so a
    // cached order would be stale exactly when it's being read.
    function neighbourGuide(index, dir) {
        var g = rulerGuides[index];
        if (!g) return null;
        var best = null;
        rulerGuides.forEach(function (o, i) {
            if (i === index || o.axis !== g.axis) return;
            var d = o.pos - g.pos;
            if (dir < 0 ? d >= 0 : d <= 0) return;              // wrong side
            if (!best || Math.abs(d) < Math.abs(best.pos - g.pos)) best = o;
        });
        return best;
    }
    // Distance readouts for ONE guide: the gap to the neighbour on each side,
    // each label centred in the gap it measures so the number sits where the
    // span it describes actually is.
    function renderGuideGaps(index) {
        var node = ui.rulerGuides.children[index];
        var g = rulerGuides[index];
        if (!node || !g) return;
        var sx = scrollX(), sy = scrollY();
        var self = g.pos - (g.axis === 'x' ? sx : sy);
        [-1, 1].forEach(function (dir) {
            var label = node.querySelector('[data-side="' + (dir < 0 ? 'prev' : 'next') + '"]');
            if (!label) return;
            var n = neighbourGuide(index, dir);
            if (!n) { label.style.display = 'none'; return; }
            var gap = Math.abs(n.pos - g.pos);
            label.textContent = Math.round(gap);
            label.style.display = '';
            // Offset relative to the guide's own 9px box (the line sits at 4px).
            var mid = 4 + dir * (gap / 2);
            if (g.axis === 'x') label.style.left = px(mid);
            else label.style.top = px(mid);
            // Keep the number on screen when the neighbour is far off-view: the
            // midpoint of a 3000px gap is nowhere near the viewport, and a label
            // parked outside it reads as "no measurement" rather than a long one.
            var vis = g.axis === 'x' ? window.innerWidth : window.innerHeight;
            var abs = self + mid;
            if (abs < RULER_SIZE + 8 || abs > vis - 8) label.style.display = 'none';
        });
    }
    function updateGuideGaps() {
        if (!ui || !ui.rulerGuides) return;
        var active = rulerDrag ? rulerDrag.index : rulerHoverIndex;
        for (var i = 0; i < ui.rulerGuides.children.length; i++) {
            ui.rulerGuides.children[i].classList.toggle('davinci-live-editor-ruler-guide--measuring', i === active);
        }
        if (active !== null && active !== undefined) renderGuideGaps(active);
    }
    function positionRulerGuides() {
        if (!ui || !ui.rulerGuides) return;
        var sx = scrollX(), sy = scrollY();
        var nodes = ui.rulerGuides.children;
        for (var i = 0; i < nodes.length; i++) {
            var g = rulerGuides[i];
            if (!g) continue;
            var node = nodes[i];
            if (g.axis === 'x') node.style.left = px(g.pos - sx);
            else node.style.top = px(g.pos - sy);
            var label = node.querySelector('.davinci-live-editor-ruler-guide__label');
            if (label) label.textContent = Math.round(g.pos);
        }
        updateGuideGaps();
    }
    function positionRulers() {
        if (!rulersOn) return;
        renderRulerTicks();
        positionRulerGuides();
    }
    // Snap the guide to element edges — its whole point is lining up with the UI.
    // The naive version looked at ONE element (topElementAt under the cursor),
    // which in a table is the big <td>/container the cursor happens to be on, so
    // it snapped to almost nothing and missed column dividers, button/label/icon
    // edges. Instead SWEEP the guide's line: sample elementsFromPoint at points
    // ALONG it (down it for a vertical guide, across for a horizontal one) and
    // collect every element the line crosses. Each contributes its near edge, far
    // edge, and centre on the dragged axis; nearest within RULER_SNAP wins.
    //
    // Sampling is a fixed 10px STEP, not a fixed count: an element is only found
    // if a sample point lands inside it, so the step must be ≤ the smallest thing
    // worth catching. At 10px a 16px icon or a 28px button is always crossed; a
    // fixed count (e.g. 24 samples ≈ 39px apart on a tall viewport) skipped them.
    // Measured ~0.15ms per snap even on a 40-row table, so per-drag cost is nil.
    var SNAP_STEP = 10;
    function snapGuide(axis, docPos) {
        var sx = scrollX(), sy = scrollY();
        var vw = window.innerWidth, vh = window.innerHeight;
        // Where the guide sits on screen, on its own axis.
        var lineClient = axis === 'x' ? (docPos - sx) : (docPos - sy);
        if (lineClient < 0 || lineClient > (axis === 'x' ? vw : vh)) return Math.round(docPos);
        var span = axis === 'x' ? vh : vw;   // sweep the PERPENDICULAR axis
        var seen = (typeof Set !== 'undefined') ? new Set() : null;
        var seenArr = seen ? null : [];
        var best = docPos, bestD = RULER_SNAP + 1;
        function consider(el) {
            if (isIgnoredForPicking(el)) return;                 // never snap to the tool's own chrome, or the canvas ribbon/notes
            var tag = el.tagName;
            if (tag === 'HTML' || tag === 'BODY') return;       // their edges are the page, not a target
            if (seen) { if (seen.has(el)) return; seen.add(el); }
            else { if (seenArr.indexOf(el) !== -1) return; seenArr.push(el); }
            var r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            var cands = axis === 'x'
                ? [r.left + sx, r.right + sx, r.left + sx + r.width / 2]
                : [r.top + sy, r.bottom + sy, r.top + sy + r.height / 2];
            for (var c = 0; c < cands.length; c++) {
                var d = Math.abs(cands[c] - docPos);
                if (d < bestD) { bestD = d; best = cands[c]; }
            }
        }
        for (var along = 0; along <= span; along += SNAP_STEP) {
            var stack = document.elementsFromPoint(
                axis === 'x' ? lineClient : along,
                axis === 'x' ? along : lineClient
            );
            for (var j = 0; j < stack.length; j++) consider(stack[j]);
        }
        return bestD <= RULER_SNAP ? Math.round(best) : Math.round(docPos);
    }
    // `index` = null when dragging a NEW guide off a ruler, or the guide's index
    // when moving an existing one. Both paths share the move/drop handlers so the
    // snap and the delete-by-dropping-on-the-ruler behave identically.
    function startGuideDrag(axis, index, e) {
        // LEFT button only. Without this, right-clicking a ruler to open the
        // context menu ALSO fires this mousedown and drops a stray guide at the
        // click point — and the same for a middle-click. `button` is 0 for left.
        if (e.button !== 0) return;
        e.preventDefault();
        closeRulerMenu();   // a menu left open would float over the drag
        if (index === null) {
            var pos0 = axis === 'x' ? e.clientX + scrollX() : e.clientY + scrollY();
            rulerGuides.push({ axis: axis, pos: Math.round(pos0) });
            index = rulerGuides.length - 1;
            renderRulerGuides();
        }
        rulerDrag = { axis: axis, index: index };
        ui.rulers.classList.add('davinci-live-editor-rulers--dragging');
        document.addEventListener('mousemove', onGuideDragMove, true);
        document.addEventListener('mouseup', onGuideDragEnd, true);
        onGuideDragMove(e);
    }
    function onGuideDragMove(e) {
        if (!rulerDrag) return;
        e.preventDefault();
        var axis = rulerDrag.axis;
        var raw = axis === 'x' ? e.clientX + scrollX() : e.clientY + scrollY();
        var g = rulerGuides[rulerDrag.index];
        if (!g) return;
        // Snap to the element edges/centre under the cursor — persistent (toggled
        // from the ruler menu), with ⌘ INVERTING it for this drag: bypass when it's
        // on, engage when it's off. ⌘ is read live off the event rather than latched
        // at mousedown, so the key can be grabbed or released mid-drag once you see
        // where the guide is landing.
        var elSnap = e.metaKey ? !elementSnap : elementSnap;
        var pos = elSnap ? snapGuide(axis, raw) : Math.round(raw);
        g.pos = pos;
        // Green = "the snap actually MOVED the guide" (pos differs from the raw
        // pointer position), not merely "snapping is enabled" — an enabled-but-idle
        // snap sitting there green would claim to have done something it didn't.
        ui.rulers.classList.toggle('davinci-live-editor-rulers--snapping', elSnap && pos !== Math.round(raw));
        // Dropping a guide back onto its own ruler deletes it (Sketch's gesture).
        // Flag it while dragging so the guide can show it's about to go.
        var overRuler = axis === 'x' ? e.clientX < RULER_SIZE : e.clientY < RULER_SIZE;
        rulerDrag.willDelete = overRuler;
        var node = ui.rulerGuides.children[rulerDrag.index];
        if (node) node.classList.toggle('davinci-live-editor-ruler-guide--deleting', overRuler);
        positionRulerGuides();
    }
    // `bare` = just tear down the drag machinery, skipping the drop outcome and
    // the re-render/save. Used by deleteGuideAt, which is about to mutate the
    // array and do its own render — and must not let the drop-on-ruler delete
    // fire against an index it's already removing.
    function endGuideDrag(bare) {
        if (!rulerDrag) return;
        var willDelete = rulerDrag.willDelete;
        var index = rulerDrag.index;
        rulerDrag = null;
        ui.rulers.classList.remove('davinci-live-editor-rulers--dragging');
        ui.rulers.classList.remove('davinci-live-editor-rulers--snapping');
        document.removeEventListener('mousemove', onGuideDragMove, true);
        document.removeEventListener('mouseup', onGuideDragEnd, true);
        if (bare) return;
        if (willDelete) rulerGuides.splice(index, 1);
        renderRulerGuides();
        saveRulerGuides();
        updateRulerClearBtn();
    }
    function onGuideDragEnd() { endGuideDrag(false); }
    function clearRulerGuides() {
        rulerGuides.length = 0;
        renderRulerGuides();
        saveRulerGuides();
        updateRulerClearBtn();
    }
    function setHiddenGuides(on) {
        hiddenGuides = on;
        applyRulerGuidesVisibility();
    }
    function loadElementSnapPref() {
        try { return localStorage.getItem(RULER_ESNAP_KEY) !== 'off'; } catch (e) { return true; }
    }
    function setElementSnap(on) {
        elementSnap = on;
        try { localStorage.setItem(RULER_ESNAP_KEY, on ? 'on' : 'off'); } catch (e) {}
    }
    // Delete/Backspace removes the guide the pointer is on — while dragging it
    // (grab it, hit Delete, it's gone) or just hovering it, which is the same
    // target the distance readout already highlights, so what will be deleted is
    // never ambiguous. Complements the drag-back-to-the-ruler gesture: that one
    // needs a trip across the screen for a guide parked far from its ruler.
    function deleteGuideAt(index) {
        if (index === null || index === undefined || !rulerGuides[index]) return;
        // Mid-drag: tear the drag down FIRST. Leaving it live would let the next
        // mousemove write a position into an index that has shifted (or no longer
        // exists), moving an unrelated guide or throwing.
        if (rulerDrag) endGuideDrag(true);
        rulerGuides.splice(index, 1);
        // The hovered index is a position in the array, so everything after the
        // removed guide shifts down — keeping the old value would highlight (and
        // measure) the wrong guide. The pointer will re-fire mouseover if it's
        // still over one.
        rulerHoverIndex = null;
        renderRulerGuides();
        saveRulerGuides();
        updateRulerClearBtn();
    }

    // ── ruler context menu (right-click a ruler) ──────────────
    // Photoshop-style: the ruler is the natural place to right-click for
    // guide-wide actions, and it's reachable whether or not the Live Editor panel
    // is open. Kept to the two actions that have no other home plus the axis-scoped
    // delete — the per-guide gestures (move, delete-by-dropping) already live on
    // the guides themselves.
    function closeRulerMenu() {
        if (!rulerMenu) return;
        rulerMenu.remove();
        rulerMenu = null;
        docOff('mousedown', onRulerMenuOutside, true);
        document.removeEventListener('keydown', onRulerMenuKey, true);
    }
    function onRulerMenuOutside(e) {
        if (rulerMenu && !rulerMenu.contains(e.target)) closeRulerMenu();
    }
    function onRulerMenuKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRulerMenu(); }
    }
    function countGuides(axis) {
        return rulerGuides.filter(function (g) { return g.axis === axis; }).length;
    }
    function clearGuidesOnAxis(axis) {
        rulerGuides = rulerGuides.filter(function (g) { return g.axis !== axis; });
        renderRulerGuides();
        saveRulerGuides();
        updateRulerClearBtn();
    }
    function openRulerMenu(e) {
        e.preventDefault();
        closeRulerMenu();
        var n = rulerGuides.length;
        // Axis of the ruler that was right-clicked — the horizontal ruler pulls out
        // horizontal ('y') guides, so "clear this ruler's guides" is axis-scoped
        // and names the axis it will actually affect.
        var axis = e.currentTarget.classList.contains('davinci-live-editor-ruler--h') ? 'y' : 'x';
        var axisN = countGuides(axis);
        var axisLabel = axis === 'y' ? 'horizontal' : 'vertical';
        var items = [
            // Checkable item — a leading ✓ column rather than a checkbox, so the
            // row still reads as an action. The tick is a span (not a glyph in the
            // label) so every label starts at the same x whether or not it's
            // checked, including the plain items below.
            { act: 'element-snap', label: 'Snap to elements', check: elementSnap },
            { sep: true },
            { act: 'toggle', label: hiddenGuides ? 'Show guides' : 'Hide guides', off: !n },
            { act: 'clear-axis', label: 'Delete ' + axisLabel + ' guides' + (axisN ? ' (' + axisN + ')' : ''), off: !axisN },
            { act: 'clear', label: 'Delete all guides' + (n ? ' (' + n + ')' : ''), off: !n },
            { sep: true },
            { act: 'rulers-off', label: 'Hide rulers  ⌃R' }
        ];
        var menu = document.createElement('div');
        menu.className = 'davinci-live-editor-ui davinci-live-editor-ruler-menu';
        menu.innerHTML = items.map(function (it) {
            if (it.sep) return '<div class="davinci-live-editor-ruler-menu__sep"></div>';
            return '<button type="button" class="davinci-live-editor-ruler-menu__item" data-act="' + it.act + '"' +
                (it.off ? ' disabled' : '') + (it.check ? ' aria-checked="true" role="menuitemcheckbox"' : '') + '>' +
                '<span class="davinci-live-editor-ruler-menu__check">' + (it.check ? CHECK_ICON : '') + '</span>' +
                esc(it.label) + '</button>';
        }).join('');
        document.body.appendChild(menu);
        // Clamp into the viewport: a right-click near the right/bottom edge would
        // otherwise open the menu partly off screen.
        var w = menu.offsetWidth, h = menu.offsetHeight;
        menu.style.left = px(Math.max(2, Math.min(e.clientX, window.innerWidth - w - 4)));
        menu.style.top = px(Math.max(2, Math.min(e.clientY, window.innerHeight - h - 4)));
        menu.addEventListener('click', function (ev) {
            var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
            if (!btn || btn.disabled) return;
            var act = btn.getAttribute('data-act');
            if (act === 'element-snap') setElementSnap(!elementSnap);
            else if (act === 'toggle') setHiddenGuides(!hiddenGuides);
            else if (act === 'clear-axis') clearGuidesOnAxis(axis);
            else if (act === 'clear') clearRulerGuides();
            else if (act === 'rulers-off') setRulers(false);
            closeRulerMenu();
        });
        rulerMenu = menu;
        // mousedown, not click: closes before the next gesture starts, so a
        // right-click straight onto a ruler reopens the menu cleanly.
        docOn('mousedown', onRulerMenuOutside, true);
        document.addEventListener('keydown', onRulerMenuKey, true);
    }
    // The "clear all" affordance lives in the corner square where the two rulers
    // meet — dead space otherwise, and the one spot that's always on screen.
    function updateRulerClearBtn() {
        if (!ui || !ui.rulerCorner) return;
        var n = rulerGuides.length;
        ui.rulerCorner.disabled = !n;
        ui.rulerCorner.title = n ? 'Clear ' + n + ' guide' + (n > 1 ? 's' : '') : 'No guides to clear';
    }
    function applyRulers() {
        if (!ui || !ui.rulers) return;
        ui.rulers.classList.toggle('is-on', rulersOn);
        document.body.classList.toggle('davinci-live-editor-body-rulers', rulersOn);
        if (rulersOn) { renderRulerGuides(); positionRulers(); updateRulerClearBtn(); }
        else closeRulerMenu();  // the menu is anchored to a ruler that's now gone
        syncRulersSwitch();     // keep the view-bar switch in step with ⌃R / right-click
        // The body margin above just shifted every element on the page (rulers
        // reserve 20px top/left) — the box-model overlay was drawn against the
        // OLD coordinates and is now stale, most visibly on a selected
        // target (a hover self-heals on the next mousemove; a selected one
        // never gets that chance). Same fix onScrollResize already applies for
        // window resize/scroll — reuse it rather than duplicate the branching.
        onScrollResize();
    }
    function setRulers(on) {
        rulersOn = on;
        saveRulersPref();
        applyRulers();
    }
    function toggleRulers() { setRulers(!rulersOn); }

    // ── inspect logic ────────────────────────────────────────
    // .davinci-live-editor-ribbon-btn is included here (inspect/hover exclusion)
    // but deliberately NOT in the outside-click shield below — the ribbon
    // toggle button must stay visible to other ribbon buttons' own
    // outside-click-to-close listeners (Docs, Related), unlike the actual
    // panel/overlay content, which must stay hidden from them.
    function isOwn(node) { return !!(node && node.closest && node.closest('.davinci-live-editor-ui, .davinci-live-editor-ribbon-btn')); }
    // Canvas chrome that is TOOLING rather than the prototype's design: the preview
    // ribbon, annotation notes, the change-history drawer and the "About These
    // Prototypes" modal. Inspecting these tells a designer nothing about the thing
    // being designed, and the ribbon in particular sits under the cursor on the way
    // to everything else.
    //
    // The navbar, subheader and footer are deliberately NOT in here even though the
    // canvas renders them too: those are the design system's own components and are
    // part of the prototype's look, so restyling them is legitimate work.
    var CANVAS_CHROME_SEL = '.prototype-ribbon, .annotation-note, #changeHistoryDrawer, #prototypeInfoModal';
    function isCanvasChrome(node) {
        return !!(node && node.closest && node.closest(CANVAS_CHROME_SEL));
    }
    // Anything the inspector must not target: its own UI, or canvas tooling.
    function isIgnoredForPicking(node) { return isOwn(node) || isCanvasChrome(node); }
    // Topmost element at a point, or null when that point isn't on something worth
    // inspecting.
    //
    // The Live Editor's own UI is OPAQUE here. This used to walk the
    // elementsFromPoint stack and return the first non-own element, so the panel
    // "saw through" itself and kept a drawer beneath it inspectable — but the cost
    // was that moving the pointer across the panel highlighted whatever happened to
    // sit under it, which reads as the overlay tracking the wrong element. Hovering
    // the tool now hovers nothing. (Docked is the default anyway, and a docked panel
    // reserves its own space, so almost nothing is ever underneath it.)
    function topElementAt(x, y) {
        var list = document.elementsFromPoint(x, y);
        var top = list.length ? list[0] : null;
        if (!top || isIgnoredForPicking(top)) return null;
        return top;
    }

    function scheduleRender(el) {
        rafEl = el;
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
            rafPending = false;
            var h = rafEl;
            if (!h) return;
            showOverlay();
            drawHov(h);                                 // the always-on hover ring
            positionOverlay(h);                         // box-model follows the cursor
            if (distAnchor && distAnchor !== h) positionDist(distAnchor, h);
            else hideDist();
            // NO renderPanel here: the panel belongs to the SELECTED element. Hover
            // only moves the outline, which is what makes a sweep readable.
            showPanel();
        });
    }
    function onMove(e) {
        // The pointer is tracked when the crosshair is ARMED (to pick) or while
        // Control is held (to measure against the selection). Otherwise the tool is a
        // read-only panel showing whatever is selected.
        if (!picking || (!inspecting && !measuring) || dragging || rulerDrag) return;
        var el = topElementAt(e.clientX, e.clientY);
        if (!el) return;
        hovered = el;
        scheduleRender(el);
    }
    function onClick(e) {
        if (!picking) return;
        if (isOwn(e.target)) return; // let our own UI handle its clicks
        // Canvas tooling (ribbon buttons, a note's textarea, the drawer's close)
        // keeps working normally and is never pinned. Without this the click would
        // fall through to `hovered` and pin whatever was last inspected.
        if (isCanvasChrome(e.target)) return;
        var el = topElementAt(e.clientX, e.clientY) || hovered;
        if (!el) return;
        // A click SELECTS only while the crosshair is ARMED. Any other click is none
        // of our business and reaches the prototype untouched.
        //
        // There is no second gesture for this. ⇧+click used to be one — a way to pick
        // without going to the button first — but holding ⌥ already arms the crosshair
        // (see onKey), so ⌥+click does the same job and does it better: the crosshair
        // is genuinely on for as long as the key is down, so the element under the
        // pointer is outlined BEFORE you commit to it. ⇧+click had no such preview,
        // and two gestures for one action is one to explain in every hint.
        if (inspecting) {
            // SELECT this element (the panel then shows and edits it) WITHOUT
            // firing the prototype's own click. Nothing here un-selects: the
            // selection ends only by picking something else, Clear selection, or
            // Esc. Esc while picking leaves pick mode and KEEPS the selection on
            // screen (see onKey).
            e.preventDefault();
            e.stopPropagation();
            closeAllEditors(); // re-picking drops any editor open on the previous element
            closeAncestorsTree(true); // and collapses the tree (its render is redundant here)
            selected = el;
            hideHov();            // it becomes the blue selection ring; don't stack both
            ancestorsLine = null; // a fresh pick discards any earlier Ancestors line, anchors a new one at el
            renderPanel(selected);
            showOverlay(); positionOverlay(selected); drawSel(selected); showPanel();
            expandForSelection();   // a pick made while collapsed opens the panel back up
            // One-shot by default: having picked, the pointer goes back to the
            // prototype. Pinned (button, or ⌥ held) it stays armed for the next pick.
            if (!pinActive()) setInspecting(false);
            else syncPickHint();
            return;
        }
        // Any other click is the prototype's own business: it passes straight through
        // and the selection is left ALONE.
        //
        // This used to null `selected` here — a leftover from when the panel tracked
        // hover and a plain click meant "unpin and resume following the cursor". With
        // the panel anchored to the selection, that made every row inert the moment
        // you clicked anywhere else: the panel still displayed the element, but
        // editSubject() was null, so nothing was editable and it read as though the
        // whole panel had pointer-events: none. The selection now ends only by picking
        // something else or by Esc.
    }
    // The programmatic selection path — the Ancestors tree's retargeting and the
    // public API's DvLiveEditor.select(). Expands for the same reason onClick does:
    // an API caller handing us an element wants it shown, not filed away behind a
    // collapsed title bar.
    function select(el) {
        if (!el) return;
        closeAllEditors();
        if (colScope && el !== colScope.cell) clearColMirror(); // picking a different element leaves column mode
        selected = el;
        showOverlay(); positionOverlay(el); drawSel(el); renderPanel(el); showPanel();
        expandForSelection();
    }
    // Release the selected element but KEEP the panel open, back at its prompt. Not
    // clearSelection(), which also hides the panel — fine for Esc-to-close, jarring for
    // a button inside the panel you just clicked.
    function clearSelectedElement() {
        closeAllEditors();
        closeAncestorsTree(true);
        clearColMirror();
        selected = null;
        ancestorsLine = null;
        hideSel();
        hideDist();
        distAnchor = null;
        measuring = false;
        // With the crosshair armed the next mousemove repaints the hover ring, so the
        // overlay can stay; otherwise there is nothing left for it to show.
        if (!inspecting) { hovered = null; hideHov(); hideOverlay(); }
        renderPanel(null);
    }
    function clearSelection() {
        closeAllEditors();
        closeAncestorsTree(true);
        clearColMirror();
        selected = null; hovered = null; distAnchor = null; ancestorsLine = null;
        hideOverlay(); hidePanel(); hideDist(); hideSel(); hideHov();
    }
    function closeLiveEditor() {
        // The panel's ✕ fully turns the Live Editor OFF: leave pick mode AND drop the
        // pinned selection / overlay (same end state as toggling the ribbon button off).
        stopPicking();
        clearSelection();
        editLog.length = 0;
        updateExportFooter();
    }
    function setBtnActive(on) {
        if (!ui || !ui.btn) return;
        ui.btn.classList.toggle('btn--primary', on);
        ui.btn.classList.toggle('btn--secondary', !on);
        ui.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function ensurePickPointerStyleEl() {
        if (pickPointerStyleEl) return pickPointerStyleEl;
        pickPointerStyleEl = document.createElement('style');
        pickPointerStyleEl.className = 'davinci-live-editor-ui';
        document.head.appendChild(pickPointerStyleEl);
        return pickPointerStyleEl;
    }
    function startPicking() {
        if (picking) return;
        picking = true;
        setBtnActive(true);
        // See pickPointerStyleEl declaration — re-enable hit-testing on anything
        // the page itself disabled via pointer-events:none.
        ensurePickPointerStyleEl().textContent =
            '*:not(.davinci-live-editor-ui):not(.davinci-live-editor-ui *) { pointer-events: auto !important; }';
        document.addEventListener('mousemove', onMove, true);
        docOn('click', onClick, true);
        applyInspectCursor();   // the crosshair cursor is only right while armed
        // Opening is always INERT: whatever was armed last time doesn't carry over,
        // so the prototype is usable the moment the panel appears.
        inspecting = false;
        inspectPinned = false;
        altHeldPin = false;
        altArmedByHold = false;
        measuring = false;
        syncPickerButtons();
        syncPickHint();
        // Show the panel IMMEDIATELY, before anything has been hovered. The first
        // render used to wait for onMove to find an element — and since the click
        // that turns the tool on happens with the cursor ON the ribbon button,
        // which is deliberately not inspectable (isCanvasChrome), onMove returned
        // nothing and the panel stayed invisible until the pointer left the ribbon
        // entirely. Turning the tool on now always visibly does something; the
        // empty state names what to do next.
        if (!selected) { renderPanel(null); showPanel(); }
    }
    function stopPicking() {
        if (!picking) return;
        closeAllEditors();
        ancestorsOpen = false; // leaving pick mode collapses the tree
        picking = false;
        setBtnActive(false);
        if (pickPointerStyleEl) pickPointerStyleEl.textContent = '';
        inspecting = false;     // closing disarms, so the next open starts inert
        inspectPinned = false;
        altHeldPin = false;
        altArmedByHold = false;
        measuring = false;
        applyInspectCursor();   // drops the crosshair cursor — see startPicking
        document.removeEventListener('mousemove', onMove, true);
        docOff('click', onClick, true);
        hovered = null;
        distAnchor = null;
        hideDist();
        if (selected) { showOverlay(); positionOverlay(selected); renderPanel(selected); showPanel(); }
        else { hideOverlay(); hidePanel(); }
    }
    function togglePicking() { if (picking) stopPicking(); else startPicking(); }

    // True when the key event belongs to a text-entry target, so a plain-key
    // shortcut must keep its hands off it. Covers the prototype's own fields too,
    // not just the Live Editor's — a Delete pressed while filling a drawer form
    // has nothing to do with guides.
    function isTypingTarget(t) {
        if (!t || !t.tagName) return false;
        var tag = t.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t.isContentEditable;
    }

    function onKey(e) {
        // Option/Alt is the momentary form of the compound control, and what it does
        // depends on what is already on:
        //   crosshair off        → ARM it for as long as the key is held
        //   crosshair on         → hold it, so a pick doesn't disarm it
        //   crosshair + pin on   → nothing; it is already sticky
        // MUST run before every branch below, unconditionally — several of them
        // `return` early (⌘I, ⌃R rulers, Escape, Delete/Backspace-as-guide-delete),
        // and a held Option that never registered here would leave the crosshair
        // disarming on the next pick even though the key was down.
        if (picking && e.key === 'Alt' && !altHeldPin && !inspectPinned) {
            altHeldPin = true;
            if (!inspecting) {
                altArmedByHold = true;
                setInspecting(true);   // syncs the buttons and the hint itself
            } else {
                syncPickerButtons();
                syncPickHint();
            }
        }
        // ⌘I toggles the inspector — EXCEPT while the caret sits in an annotation
        // note, so it never fires mid-sentence while someone is writing one. This
        // handler is CAPTURE-phase, so a note's own bubble-phase listener can't
        // shield it.
        //
        // Upstream (VMT) guards its rich-text notes here because ⌘I is italic in a
        // contenteditable. DaVinci's notes are a plain <textarea> (see
        // initializeAnnotationSystem in davinci-canvas.js), so there is no italic
        // command to collide with — the guard is kept for the typing case, matched
        // against the canvas's own note class rather than VMT's.
        if (e.metaKey && (e.key === 'i' || e.key === 'I')) {
            if (e.target && e.target.closest && e.target.closest('.annotation-note')) return;
            e.preventDefault(); togglePicking(); return;
        }

        // ⌃R toggles the rulers, matching Sketch. Deliberately Control and not
        // Command: ⌘R is Reload. Ctrl+R isn't bound in Chrome/Safari on macOS, but
        // preventDefault covers Firefox (where it IS a reload) and any Windows use.
        if (e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            // The Control that started this chord may already have dropped a
            // measurement anchor (Control is the measure key now); ⌃R is not a
            // measurement, so drop it rather than leave a stray magenta box.
            if (distAnchor) { distAnchor = null; hideDist(); ui.ref.style.display = 'none'; }
            toggleRulers();
            return;
        }
        // Delete/Backspace removes the guide being dragged or hovered. Guarded on
        // three things: an inline edit or a focused field owns the key (Backspace
        // there means "erase a character", and stealing it would eat the value
        // being typed), and there must actually be a guide under the pointer.
        if ((e.key === 'Delete' || e.key === 'Backspace') && rulersOn && !activeInlineEdit && !isTypingTarget(e.target)) {
            var delIdx = rulerDrag ? rulerDrag.index : rulerHoverIndex;
            if (delIdx !== null && delIdx !== undefined) {
                e.preventDefault();   // Backspace still means "go back" in some browsers
                deleteGuideAt(delIdx);
                return;
            }
        }
        if (e.key === 'Escape') {
            // Inline number edits handle their own Escape (with stopPropagation) while
            // focused, so this only ever fires for the color popover.
            if (activeEditor) { closeEditor(); return; }
            if (ancestorsOpen) { closeAncestorsTree(); return; }
            // Then disarms the crosshair — the common "stop picking, keep what I
            // selected" case, and why this sits ahead of closing the tool.
            if (inspecting) { setInspecting(false); return; }
            if (picking) stopPicking();
            else if (selected || distAnchor) clearSelection();
            return;
        }
        // Hold Control to measure FROM THE SELECTED ELEMENT to whatever the pointer is
        // over. The anchor used to be whatever happened to be hovered when the key went
        // down, which was both hard to aim and useless here: you have already told the
        // tool which element you care about by selecting it, so that is the anchor.
        //
        // It also turns hover tracking on by itself (`measuring`), because otherwise
        // this only worked with the crosshair armed — and with the crosshair armed the
        // pointer is busy picking. Measuring against your selection is a separate job
        // from choosing a new selection.
        //
        // No drawRef on the anchor: it is the selection, which already carries the blue
        // ring, and a second magenta box on the same element just reads as noise.
        if (picking && e.key === 'Control' && !distAnchor && selected) {
            distAnchor = selected;
            measuring = true;
        }
    }
    function onKeyUp(e) {
        // Releasing Option drops the momentary pin — and disarms the crosshair too if
        // holding the key is what armed it (see the keydown).
        if (e.key === 'Alt' && altHeldPin) {
            altHeldPin = false;
            if (altArmedByHold) {
                altArmedByHold = false;
                setInspecting(false);
            } else {
                syncPickerButtons();
                syncPickHint();
            }
        }
        // Releasing Control ends the measurement. With the crosshair off, hover was
        // only being tracked FOR the measurement, so the hover outline goes back to
        // the selection rather than lingering wherever the pointer stopped.
        if (e.key === 'Control' && measuring) {
            measuring = false;
            distAnchor = null;
            hideDist();
            if (inspecting && hovered) scheduleRender(hovered);
            else {
                hovered = null;
                hideHov();
                if (selected) { positionOverlay(selected); drawSel(selected); }
                else hideOverlay();
            }
        }
    }
    function onScrollResize() {
        // Rulers are independent of pick mode — they track the scroll whether or
        // not anything is being inspected.
        positionRulers();
        // The selection ring tracks the scroll whatever else is going on — it is
        // pinned to an element, not to the pointer.
        if (selected && document.contains(selected)) drawSel(selected);
        if (picking && hovered && document.contains(hovered)) {
            drawHov(hovered);
            positionOverlay(hovered);
            if (distAnchor && distAnchor !== hovered && document.contains(distAnchor)) positionDist(distAnchor, hovered);
        } else if (selected && document.contains(selected)) {
            positionOverlay(selected);
        }
    }

    // ── DOM build ────────────────────────────────────────────
    // Drag the panel by its header; minimize/close buttons are excluded so they
    // keep working. Switches the panel from its default top-right anchor to
    // explicit left/top coords on first drag.
    function makeDraggable(panel, handle) {
        var offX = 0, offY = 0;
        function onDrag(e) {
            if (!dragging) return;
            var x = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - offX));
            var y = Math.max(0, Math.min(window.innerHeight - 20, e.clientY - offY));
            panel.style.left = x + 'px'; panel.style.top = y + 'px';
        }
        function onUp() {
            dragging = false;
            savePanelPos();   // remember where it was left
            document.removeEventListener('mousemove', onDrag, true);
            document.removeEventListener('mouseup', onUp, true);
        }
        handle.addEventListener('mousedown', function (e) {
            if (docked) return; // docked = fixed sidebar, not draggable
            if (e.target.closest('button')) return; // don't drag from the action buttons
            var r = panel.getBoundingClientRect();
            dragging = true;
            offX = e.clientX - r.left; offY = e.clientY - r.top;
            panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px'; panel.style.right = 'auto';
            e.preventDefault();
            document.addEventListener('mousemove', onDrag, true);
            document.addEventListener('mouseup', onUp, true);
        });
    }

    function buildUi() {
        var overlay = document.createElement('div');
        overlay.className = 'davinci-live-editor-ui davinci-live-editor-overlay';
        overlay.innerHTML =
            '<div class="davinci-live-editor-layer davinci-live-editor-layer--margin"></div>' +
            '<div class="davinci-live-editor-layer davinci-live-editor-layer--border"></div>' +
            '<div class="davinci-live-editor-layer davinci-live-editor-layer--padding"></div>' +
            '<div class="davinci-live-editor-layer davinci-live-editor-layer--content"></div>' +
            '<div class="davinci-live-editor-size"></div>' +
            '<div class="davinci-live-editor-ref"></div>' +
            '<div class="davinci-live-editor-sel"></div>' +
            '<div class="davinci-live-editor-hov"></div>' +
            '<div class="davinci-live-editor-dist davinci-live-editor-dist--h"></div>' +
            '<div class="davinci-live-editor-dist davinci-live-editor-dist--v"></div>' +
            '<div class="davinci-live-editor-dist-label" data-axis="h"></div>' +
            '<div class="davinci-live-editor-dist-label" data-axis="v"></div>';

        // Rulers live in their OWN fixed layer, not inside the overlay: the overlay
        // is toggled with pick mode (`is-on`) and is fully pointer-events:none,
        // while the rulers persist independently and must be draggable.
        var rulers = document.createElement('div');
        rulers.className = 'davinci-live-editor-ui davinci-live-editor-rulers';
        rulers.innerHTML =
            '<div class="davinci-live-editor-ruler davinci-live-editor-ruler--h"></div>' +
            '<div class="davinci-live-editor-ruler davinci-live-editor-ruler--v"></div>' +
            '<button type="button" class="davinci-live-editor-ruler__corner" aria-label="Clear all guides"></button>' +
            '<div class="davinci-live-editor-ruler-guides"></div>';

        var panel = document.createElement('div');
        panel.className = 'davinci-live-editor-ui davinci-live-editor-panel';
        panel.innerHTML =
            '<div class="davinci-live-editor-panel__head">' +
                // Crosshair FIRST, like a browser inspector's own toolbar: it is the
                // primary action, and the panel is inert until it is armed. The pin
                // sits immediately after it because it modifies it.
                '<div class="davinci-live-editor-panel__pickers">' +
                    '<button type="button" class="davinci-live-editor-panel__crosshair" aria-pressed="false" aria-label="Select an element">' + CROSSHAIR_ICON + '</button>' +
                    '<button type="button" class="davinci-live-editor-panel__pin" aria-pressed="false" aria-label="Keep selecting">' + PIN_ICON + '</button>' +
                '</div>' +
                // A fixed label, not the element's name. The header used to restate
                // the subject ("p#some-id") plus the column scope, but the ELEMENT
                // group immediately below already carries Tag / ID / Classes and its
                // Column row carries the scope — so it was duplicating both a few
                // pixels away. Static, therefore markup rather than a per-render write.
                '<h3 class="davinci-live-editor-panel__title">Live Editor</h3>' +
                '<div class="davinci-live-editor-panel__actions">' +
                    '<span class="davinci-live-editor-panel__help">' +
                        '<button type="button" class="davinci-live-editor-panel__help-btn" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">' +
                            // A keyboard, not a "?": it says "shortcuts" at a glance where the
                            // old question mark read as generic help. Was a hand-drawn rect +
                            // key dots; `keyboard` is the same picture, drawn by Apple.
                            KEYBOARD_ICON +
                        '</button>' +
                        '<div class="davinci-live-editor-panel__help-tip" role="tooltip">' +
                            '<div class="davinci-live-editor-panel__help-title">Keyboard shortcuts</div>' +
                            // Two columns, ONE LINE per shortcut. The previous version was
                            // 307 words of prose (the Rulers entry alone 104) — a reference
                            // list nobody reads gets scanned, so anything past one line is
                            // skipped and only pushes the next key out of view. Rules that
                            // apply to everything (hover-to-inspect, click-passes-through)
                            // are stated ONCE up here instead of per entry, where "don't
                            // click" was repeated three times.
                            '<p class="davinci-live-editor-panel__help-intro">Arm the crosshair in the header, then click an element to inspect it. Until you do, the prototype behaves normally.</p>' +
                            // ACTION FIRST, then the key, then how — the order macOS
                            // Keyboard Shortcuts uses. You consult this list knowing what
                            // you WANT ("measure this"), not which key it is, so the
                            // action name has to be the scannable column. Three columns
                            // come from one <dt> + TWO <dd>s per row (valid: a term may
                            // carry several descriptions) filling a 3-column grid — no
                            // row wrappers, so no dependency on `subgrid`.
                            '<dl class="davinci-live-editor-panel__help-list davinci-live-editor-panel__help-list--keys">' +
                                '<dt>Open / close</dt><dd><kbd>⌘I</kbd></dd><dd>From anywhere.</dd>' +
                                // ⌥, deliberately not ⌃+click: on macOS that IS a
                                // right-click, so the wrong gesture opens a browser
                                // context menu with no clue why nothing was selected.
                                '<dt>Select an element</dt><dd>crosshair</dd><dd>Click the crosshair in the header, then click the element.</dd>' +
                                // ONE row for ⌥, not two: "pick just this one" and "pick
                                // several in a row" are the same gesture held for a
                                // different length of time, and splitting them read as two
                                // competing shortcuts on the same key.
                                '<dt>Select without it</dt><dd><kbd>⌥</kbd>+click</dd><dd>Holding ⌥ arms the crosshair, so the element outlines under the pointer before you commit; keep holding to pick several in a row. Releasing disarms it again. The pin button beside the crosshair does the same, permanently.</dd>' +
                                '<dt>Stop selecting</dt><dd><kbd>Esc</kbd></dd><dd>Disarms the crosshair and keeps what you selected.</dd>' +
                                '<dt>Measure gaps</dt><dd><kbd>⌃</kbd> hold</dd><dd>Select an element first, then hold and move the mouse: the gap lines run from your selection to whatever you point at.</dd>' +
                                '<dt>Rulers on / off</dt><dd><kbd>⌃R</kbd></dd><dd></dd>' +
                            '</dl>' +
                            // The panel's fields are spans until you open one, so their
                            // keys are not guessable from looking at them — they belong
                            // in this list more than the mouse gestures do.
                            '<div class="davinci-live-editor-panel__help-sub">Editing values <span>— once an element is selected</span></div>' +
                            '<dl class="davinci-live-editor-panel__help-list">' +
                                '<dt>Next / previous field</dt>' +
                                '<dd><kbd>Tab</kbd> / <kbd>⇧Tab</kbd> — opens it ready to type</dd>' +
                                '<dt>Open a field</dt>' +
                                '<dd><kbd>Enter</kbd> or <kbd>Space</kbd></dd>' +
                                '<dt>Keep the value</dt>' +
                                '<dd><kbd>Enter</kbd></dd>' +
                                '<dt>Undo the edit</dt>' +
                                '<dd><kbd>Esc</kbd> — puts the value back</dd>' +
                            '</dl>' +
                            '<div class="davinci-live-editor-panel__help-sub">Rulers <span>— work without opening the Live Editor</span></div>' +
                            '<dl class="davinci-live-editor-panel__help-list">' +
                                '<dt>New guide</dt>' +
                                '<dd>Drag off a ruler</dd>' +
                                '<dt>Move a guide</dt>' +
                                '<dd>Drag it</dd>' +
                                '<dt>Remove a guide</dt>' +
                                '<dd>Drop it back on the ruler, or press <kbd>Delete</kbd></dd>' +
                                '<dt>See distances</dt>' +
                                '<dd>Hover a guide</dd>' +
                                '<dt>Invert snapping</dt>' +
                                '<dd><kbd>⌘</kbd> while dragging</dd>' +
                                '<dt>Guide options</dt>' +
                                '<dd>Right-click a ruler</dd>' +
                                '<dt>Clear all guides</dt>' +
                                '<dd>Click the corner square</dd>' +
                            '</dl>' +
                        '</div>' +
                    '</span>' +
                    '<button type="button" class="davinci-live-editor-panel__min" aria-label="Collapse panel" aria-expanded="true" title="Collapse">' + COLLAPSE_ICON + '</button>' +
                    '<button type="button" class="davinci-live-editor-panel__dock" aria-label="Dock to side"></button>' +
                    '<button type="button" class="davinci-live-editor-panel__close" aria-label="Close" title="Close">' + CLOSE_ICON + '</button>' +
                '</div>' +
            '</div>' +
            // View bar — the Rulers switch plus a
            // right-aligned statement of what the pointer will do right now
            // (see syncPickHint), so the crosshair's state is never something you
            // have to infer from the button alone.
            '<div class="davinci-live-editor-panel__viewbar">' +
                rulersSwitchHtml() +
                '<span class="davinci-live-editor-panel__pick-hint"></span>' +
            '</div>' +
            '<div class="davinci-live-editor-panel__body"></div>' +
            // Unsaved-preview flag: live edits exist only in this browser until the
            // designer hands the prompt to DaVinci. Shown whenever the edit log is
            // non-empty; its text/state is driven by updateDirtyFlag().
            '<div class="davinci-live-editor-panel__flag" style="display:none;">' +
                '<span class="davinci-live-editor-panel__flag-text"></span>' +
                '<button type="button" class="davinci-live-editor-panel__flag-clear" style="display:none;" title="Remove the saved browser draft (keeps what is on screen)">Clear draft</button>' +
            '</div>' +
            '<div class="davinci-live-editor-panel__footer" style="display:none;">' +
                '<button type="button" class="davinci-live-editor-panel__undo-btn" title="Revert every live edit made this session">' + UNDO_ICON + 'Undo all</button>' +
                '<button type="button" class="davinci-live-editor-panel__export-btn">' +
                    PROMPT_ICON + 'Create Prompt<span class="davinci-live-editor-panel__export-count"></span>' +
                '</button>' +
            '</div>';
        var head = panel.querySelector('.davinci-live-editor-panel__head');
        // The shortcuts tip is positioned in JS, not by CSS offsets, because the
        // panel has `overflow: hidden` and would CLIP it: anchored inside the header
        // it was losing 68px off its left edge (measured — elementFromPoint at the
        // tip's left edge hit <body>, not the tip), which is why it read as cramped
        // and couldn't simply be widened. `position: fixed` + coordinates from the
        // button's own rect takes it out of the panel's clipping box, so its width
        // is free. Same approach openEditor() uses for the value popovers.
        var helpWrap = panel.querySelector('.davinci-live-editor-panel__help');
        var helpTip = panel.querySelector('.davinci-live-editor-panel__help-tip');
        function placeHelpTip() {
            var b = helpWrap.getBoundingClientRect();
            var w = helpTip.offsetWidth;
            // Right-aligned to the trigger, then clamped into the viewport — the panel
            // can be dragged anywhere, including near the left edge.
            var left = Math.min(Math.max(8, b.right - w), window.innerWidth - w - 8);
            helpTip.style.left = left + 'px';
            helpTip.style.top = (b.bottom + 8) + 'px';
        }
        helpWrap.addEventListener('mouseenter', placeHelpTip);
        helpWrap.addEventListener('focusin', placeHelpTip);
        panel.querySelector('.davinci-live-editor-panel__close').addEventListener('click', closeLiveEditor);
        panel.querySelector('.davinci-live-editor-panel__min').addEventListener('click', function () {
            setMinimized(!isMinimized(), true);
        });
        panel.querySelector('.davinci-live-editor-panel__body').addEventListener('click', onCopyClick);
        // Keyboard twin of the click handler above — the value chips are spans, so
        // they need Enter/Space wired by hand to behave like the buttons they are.
        panel.querySelector('.davinci-live-editor-panel__body').addEventListener('keydown', onPanelBodyKey);
        // Hovering a level in the Ancestors tree previews it on the canvas: the
        // box-model overlay jumps to that element without selecting it, so a
        // line of anonymous `div`s is actually tellable apart. Safe to move the
        // overlay freely here — the tree is only ever open with a selection, so
        // onMove isn't fighting for it — and leaving a row snaps it back to the
        // element the panel is really showing.
        panel.querySelector('.davinci-live-editor-panel__body').addEventListener('mouseover', function (e) {
            var row = e.target.closest ? e.target.closest('.davinci-live-editor-tree__row[data-ancestor-index]') : null;
            if (!row) return;
            var el = lastAncestorChain[parseInt(row.getAttribute('data-ancestor-index'), 10)];
            if (el && document.contains(el)) { showOverlay(); positionOverlay(el); }
        });
        panel.querySelector('.davinci-live-editor-panel__body').addEventListener('mouseout', function (e) {
            var row = e.target.closest ? e.target.closest('.davinci-live-editor-tree__row[data-ancestor-index]') : null;
            if (!row) return;
            var subj = selected || hovered;
            if (subj && document.contains(subj)) positionOverlay(subj);
        });
        // Bound on the panel (not its body): the view-bar switches sit above the
        // body, which is re-rendered constantly — a listener there would stop
        // seeing them. One handler routes all three toggles.
        panel.addEventListener('change', function (e) {
            var t = e.target;
            if (!t) return;
            if (t.classList.contains('davinci-live-editor-panel__outlines-toggle')) setGuides(t.checked);
            else if (t.classList.contains('davinci-live-editor-panel__rulers-toggle')) setRulers(t.checked);
            // Column level picker (grouped headers only — see columnRowHtml). The
            // select's value IS the state: "" leaves column mode, an index enters it
            // at that level.
            else if (t.hasAttribute('data-col-level-select')) {
                var subj = editSubject();
                if (!subj) return;
                if (t.value === '') {
                    clearColMirror();
                    positionOverlay(subj);   // shrink the overlay back to the cell
                    renderPanel(subj);
                } else {
                    enterColumnMode(subj, parseInt(t.value, 10));
                }
            }
        });
        panel.querySelector('.davinci-live-editor-panel__export-btn').addEventListener('click', openExportPrompt);
        panel.querySelector('.davinci-live-editor-panel__undo-btn').addEventListener('click', undoAllEdits);
        panel.querySelector('.davinci-live-editor-panel__flag-clear').addEventListener('click', clearDraftKeepScreen);
        panel.querySelector('.davinci-live-editor-panel__crosshair').addEventListener('click', function (e) {
            e.preventDefault();
            setInspecting(!inspecting);
        });
        panel.querySelector('.davinci-live-editor-panel__pin').addEventListener('click', function (e) {
            e.preventDefault();
            setInspectPinned(!inspectPinned);
        });
        panel.querySelector('.davinci-live-editor-panel__dock').addEventListener('click', function (e) {
            e.stopPropagation();
            setDocked(!docked);
        });
        makeDraggable(panel, head);

        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        document.body.appendChild(rulers);

        ui = {
            btn: null, overlay: overlay, panel: panel,
            layers: {
                margin: overlay.querySelector('.davinci-live-editor-layer--margin'),
                border: overlay.querySelector('.davinci-live-editor-layer--border'),
                padding: overlay.querySelector('.davinci-live-editor-layer--padding'),
                content: overlay.querySelector('.davinci-live-editor-layer--content')
            },
            size: overlay.querySelector('.davinci-live-editor-size'),
            ref: overlay.querySelector('.davinci-live-editor-ref'),
            sel: overlay.querySelector('.davinci-live-editor-sel'),
            hov: overlay.querySelector('.davinci-live-editor-hov'),
            distH: overlay.querySelector('.davinci-live-editor-dist--h'),
            distV: overlay.querySelector('.davinci-live-editor-dist--v'),
            distHLabel: overlay.querySelector('.davinci-live-editor-dist-label[data-axis="h"]'),
            distVLabel: overlay.querySelector('.davinci-live-editor-dist-label[data-axis="v"]'),
            crosshairBtn: panel.querySelector('.davinci-live-editor-panel__crosshair'),
            pinBtn: panel.querySelector('.davinci-live-editor-panel__pin'),
            dockBtn: panel.querySelector('.davinci-live-editor-panel__dock'),
            body: panel.querySelector('.davinci-live-editor-panel__body'),
            footer: panel.querySelector('.davinci-live-editor-panel__footer'),
            flag: panel.querySelector('.davinci-live-editor-panel__flag'),
            flagText: panel.querySelector('.davinci-live-editor-panel__flag-text'),
            flagClear: panel.querySelector('.davinci-live-editor-panel__flag-clear'),
            exportBtn: panel.querySelector('.davinci-live-editor-panel__export-btn'),
            exportCount: panel.querySelector('.davinci-live-editor-panel__export-count'),
            undoBtn: panel.querySelector('.davinci-live-editor-panel__undo-btn'),
            rulers: rulers,
            rulerH: rulers.querySelector('.davinci-live-editor-ruler--h'),
            rulerV: rulers.querySelector('.davinci-live-editor-ruler--v'),
            rulerCorner: rulers.querySelector('.davinci-live-editor-ruler__corner'),
            rulerGuides: rulers.querySelector('.davinci-live-editor-ruler-guides')
        };
        // Drag off a ruler → new guide. Drag an existing guide → move it (drop it
        // back on its ruler to delete). Bound here, once, rather than per guide:
        // the guide nodes are rebuilt on every change, so per-node listeners would
        // have to be rewired each time.
        ui.rulerH.addEventListener('mousedown', function (e) { startGuideDrag('y', null, e); });
        ui.rulerV.addEventListener('mousedown', function (e) { startGuideDrag('x', null, e); });
        ui.rulerH.addEventListener('contextmenu', openRulerMenu);
        ui.rulerV.addEventListener('contextmenu', openRulerMenu);
        ui.rulerCorner.addEventListener('contextmenu', openRulerMenu);
        ui.rulerGuides.addEventListener('mousedown', function (e) {
            var node = e.target.closest ? e.target.closest('[data-guide]') : null;
            if (!node) return;
            var i = parseInt(node.getAttribute('data-guide'), 10);
            var g = rulerGuides[i];
            if (g) startGuideDrag(g.axis, i, e);
        });
        // Hovering a guide measures it against its neighbours. No modifier: the
        // pointer is already on the guide, which is intent enough — and Option is
        // taken by the element-distance measurement in pick mode.
        ui.rulerGuides.addEventListener('mouseover', function (e) {
            var node = e.target.closest ? e.target.closest('[data-guide]') : null;
            if (!node || rulerDrag) return;
            rulerHoverIndex = parseInt(node.getAttribute('data-guide'), 10);
            updateGuideGaps();
        });
        ui.rulerGuides.addEventListener('mouseout', function (e) {
            var node = e.target.closest ? e.target.closest('[data-guide]') : null;
            if (!node || rulerDrag) return;
            // Ignore moves BETWEEN a guide and its own labels — those are children,
            // so the pointer never actually left the guide.
            if (e.relatedTarget && node.contains(e.relatedTarget)) return;
            rulerHoverIndex = null;
            updateGuideGaps();
        });
        ui.rulerCorner.addEventListener('click', clearRulerGuides);
        docked = loadDockPref();
        applyDock();
        showGuides = false;   // never carried over from a previous session
        applyGuidesPref();
        applyInspectCursor();
        syncPickerButtons();
        syncPickHint();
        ratioLock = loadRatioPref();
        rulersOn = loadRulersPref();
        rulerGuides = loadRulerGuides();
        elementSnap = loadElementSnapPref();
        applyRulers();
    }

    // Bind the ribbon's Live Editor toggle. The button itself is rendered by the
    // canvas from parts/header.html (gated on ribbon.showLiveEditor), NOT injected
    // here — it used to be inserted next to #changeHistoryBtn at runtime, which
    // silently produced no button at all on the many prototypes that have no
    // changelog.json and therefore no Change History button to anchor to. Being
    // in the template also means it carries the same classes as its neighbours, so
    // its look follows whichever design system is active.
    //
    // Called by davinci-canvas.js once the chrome is in the DOM. Idempotent, and a
    // no-op when the feature is switched off (no button to find).
    function bindRibbonButton() {
        // The canvas could in principle reach this before the module's own boot()
        // has built the panel (`ui` is still null then, and every accessor below
        // would throw), so make sure boot has run. boot() is flag-guarded and
        // calls straight back here, which is harmless: by then `ui` exists and the
        // `btn === ui.btn` check below turns the second pass into a no-op.
        if (!ui) boot();
        if (!ui) return;   // no <body> yet — boot() re-runs on DOMContentLoaded
        var btn = document.getElementById('liveEditorBtn');
        if (!btn || btn === ui.btn) return;
        btn.classList.add('davinci-live-editor-ribbon-btn');
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', function (e) { e.preventDefault(); togglePicking(); });
        ui.btn = btn;
        // Reflect state onto a button that appeared after the editor was already
        // toggled on (⌘I works before the chrome renders).
        setBtnActive(picking);
    }

    // ── outside-click shield ─────────────────────────────────
    // Prototype popovers/menus dismiss themselves on any pointer event whose
    // target isn't inside them (ok2invoice's closeOnOutside, the MDS popover,
    // drawers, kebab menus…). The specs panel is a SIBLING in <body>, not a
    // descendant of the popover, so clicking a value in the panel to EDIT it
    // read as an outside click and closed the very popover being inspected —
    // making a popover's inner state impossible to style at all. Fixing that in
    // each prototype's ignore list doesn't scale (every prototype, every
    // component with a dismiss-on-outside rule), so it's fixed once here:
    // pointer events whose target is inside the Live Editor's own UI are hidden
    // from document/window-level listeners registered by ANYTHING ELSE.
    //
    // Only dismissal-shaped event types are shielded — `mousemove`/`mouseup`/key
    // events pass through untouched, so drags and shortcuts are unaffected. The
    // plugin's OWN document listeners bypass the shield via docOn/docOff (they
    // must still see clicks on the panel), and the patch is instance-level on
    // document/window/html/body — EventTarget.prototype is never touched.
    var SHIELD_TYPES = { mousedown: 1, pointerdown: 1, touchstart: 1, click: 1, focusin: 1 };
    var nativeAdd = EventTarget.prototype.addEventListener;
    var nativeRemove = EventTarget.prototype.removeEventListener;
    // The plugin's own document-level listeners, registered straight on the
    // native method so the shield can never filter them.
    function docOn(type, fn, cap) { nativeAdd.call(document, type, fn, cap); }
    function docOff(type, fn, cap) { nativeRemove.call(document, type, fn, cap); }
    function installShield(target) {
        if (!target || target.__davinciLeShielded) return;
        target.__davinciLeShielded = true;
        var add = target.addEventListener, rem = target.removeEventListener;
        // original fn → wrapped fn, so a later removeEventListener with the
        // ORIGINAL reference still finds and detaches the wrapper.
        var wrappers = new WeakMap();
        target.addEventListener = function (type, fn, opts) {
            if (typeof fn === 'function' && SHIELD_TYPES[type]) {
                var wrapped = wrappers.get(fn);
                if (!wrapped) {
                    wrapped = function (e) {
                        var t = e && e.target;
                        if (t && t.closest && t.closest('.davinci-live-editor-ui')) return;
                        return fn.apply(this, arguments);
                    };
                    wrappers.set(fn, wrapped);
                }
                return add.call(this, type, wrapped, opts);
            }
            return add.call(this, type, fn, opts);
        };
        target.removeEventListener = function (type, fn, opts) {
            var wrapped = typeof fn === 'function' ? wrappers.get(fn) : null;
            return rem.call(this, type, wrapped || fn, opts);
        };
    }
    // Installed IMMEDIATELY, not just from boot(): the shield only ever filters
    // events aimed at `.davinci-live-editor-ui` (which doesn't exist yet), so it's
    // inert until the panel is built — but installing it this early means it also
    // covers any component that registers a document-level dismiss handler at
    // load time, before the Live Editor's own boot() gets a chance to run.
    installShield(document);
    installShield(window);
    installShield(document.documentElement);
    installShield(document.body);   // no-op when body isn't parsed yet — boot() retries

    // ── draft persistence (localStorage) + unsaved-preview flag ──────────────
    // Live edits normally live only in memory (editLog) and the DOM, so closing
    // the tab loses them. This layer snapshots the editor's OUTPUT — inline styles,
    // the scoped <style> blocks, the scoping attributes and the edit log — into
    // localStorage per prototype, and replays it on the next load. It restores the
    // rendered result rather than re-running the scattered apply logic, which is why
    // it can be mechanical and complete for the common edits. A source fingerprint
    // rides with the draft: if the prototype's content changed since (which is what
    // happens once DaVinci applies the prompt), the draft is dropped instead of being
    // re-applied on top. The flag tells the designer these edits are a browser-only
    // preview until DaVinci writes them into the real files; the browser cannot detect
    // that write, so the flag only clears on an explicit action.
    var DRAFT_VER = 1;
    var draftFlagState = 'editing';        // 'editing' | 'handed-off'
    var draftRestoredThisSession = false;  // true once a saved draft was replayed
    var draftRestoring = false;            // guards saves while we replay
    var draftSaveTimer = null;
    var draftRestoreDone = false;
    var SCOPE_ATTRS = [
        'data-live-editor-pseudo-id', 'data-live-editor-hover-id', 'data-live-editor-cascade-id',
        'data-live-editor-rowborder-id', 'data-live-editor-col-id'
    ];
    function draftKey() { return 'davinci:live-editor-draft:' + location.pathname; }
    function scopeAttrSelector() { return SCOPE_ATTRS.map(function (a) { return '[' + a + ']'; }).join(','); }
    function hashStr(s) { var h = 5381, i = s.length; while (i) { h = (h * 33) ^ s.charCodeAt(--i); } return (h >>> 0).toString(36); }
    function sourceFingerprint() {
        var pc = document.getElementById('page-content');
        return hashStr(pc ? pc.innerHTML : '');
    }
    function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }
    // Absolute-ish structural selector, walking up to the nearest id (or <body>).
    // #app carries an id, so most paths stop there: short and stable across a reload
    // of the same build, which is exactly the window we need it to survive.
    function cssPathOf(node) {
        var el = node;
        if (!el || el.nodeType !== 1) return null;
        var parts = [];
        while (el && el.nodeType === 1) {
            if (el.id) { parts.unshift('#' + cssEsc(el.id)); return parts.join(' > '); }
            if (el === document.body) { parts.unshift('body'); return parts.join(' > '); }
            var p = el.parentElement;
            if (!p) { parts.unshift(el.tagName.toLowerCase()); return parts.join(' > '); }
            var idx = 1, s = el;
            while ((s = s.previousElementSibling)) { if (s.tagName === el.tagName) idx++; }
            parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + idx + ')');
            el = p;
        }
        return parts.join(' > ');
    }
    function elByPath(path) { if (!path) return null; try { return document.querySelector(path); } catch (e) { return null; } }
    function collectDraft() {
        var elSet = [];
        function add(el) { if (el && el.nodeType === 1 && elSet.indexOf(el) < 0) elSet.push(el); }
        editLog.forEach(function (e) { add(e.el); });
        document.querySelectorAll(scopeAttrSelector()).forEach(add);
        document.querySelectorAll('col[style]').forEach(add);   // column widths sit on <col> inline styles
        var inline = [], attrs = [];
        elSet.forEach(function (el) {
            var path = cssPathOf(el); if (!path) return;
            var st = el.getAttribute('style'); if (st) inline.push({ path: path, style: st });
            var a = {}, has = false;
            SCOPE_ATTRS.forEach(function (name) { if (el.hasAttribute(name)) { a[name] = el.getAttribute(name); has = true; } });
            if (has) attrs.push({ path: path, attrs: a });
        });
        var styleEls = {};
        if (pseudoStyleEl && pseudoStyleEl.textContent) styleEls.pseudo = pseudoStyleEl.textContent;
        if (hoverStyleEl && hoverStyleEl.textContent) styleEls.hover = hoverStyleEl.textContent;
        if (cascadeStyleEl && cascadeStyleEl.textContent) styleEls.cascade = cascadeStyleEl.textContent;
        if (rowBorderStyleEl && rowBorderStyleEl.textContent) styleEls.rowborder = rowBorderStyleEl.textContent;
        if (colStyleEl && colStyleEl.textContent) styleEls.col = colStyleEl.textContent;
        var log = editLog.map(function (e) {
            return { path: cssPathOf(e.el), prop: e.prop, value: e.value, isHover: !!e.isHover, pseudo: e.pseudo || null };
        }).filter(function (e) { return e.path; });
        return { v: DRAFT_VER, fp: sourceFingerprint(), flag: draftFlagState, inline: inline, attrs: attrs, styleEls: styleEls, log: log };
    }
    function saveDraftNow() {
        if (draftRestoring) return;
        try {
            if (!editLog.length) { clearDraftStorage(); return; }   // no logged edits ⇒ nothing pending to keep
            localStorage.setItem(draftKey(), JSON.stringify(collectDraft()));
        } catch (e) { /* storage full or unavailable: fail quietly */ }
    }
    function scheduleSaveDraft() {
        if (draftRestoring) return;
        if (draftSaveTimer) clearTimeout(draftSaveTimer);
        draftSaveTimer = setTimeout(saveDraftNow, 400);
    }
    function clearDraftStorage() { try { localStorage.removeItem(draftKey()); } catch (e) {} }
    // "Clear draft": the designer says DaVinci has applied the edits, so forget the
    // browser copy. Empties the log (which hides the flag and stops re-saving) but
    // leaves what is on screen alone — the real source now carries it, and the next
    // reload will show that source with no draft to replay.
    function clearDraftKeepScreen() {
        clearDraftStorage();
        editLog.length = 0;
        draftFlagState = 'editing';
        closeAllEditors();
        updateExportFooter();
    }
    function updateDirtyFlag() {
        if (!ui || !ui.flag) return;
        var n = editLog.length;
        if (!n) { ui.flag.style.display = 'none'; return; }
        ui.flag.style.display = '';
        if (draftFlagState === 'handed-off') {
            ui.flag.setAttribute('data-state', 'handed-off');
            ui.flagText.textContent = 'Handed to DaVinci. Clear this draft once the changes are applied.';
            ui.flagClear.style.display = '';
        } else {
            ui.flag.setAttribute('data-state', 'editing');
            ui.flagText.textContent = 'Preview edits (' + n + ') live only in your browser, not in the prototype yet. Use Create Prompt to apply them with DaVinci.';
            ui.flagClear.style.display = 'none';
        }
    }
    function bumpIdSeqs(recs) {
        function tail(v) { var m = /(\d+)$/.exec(v || ''); return m ? parseInt(m[1], 10) : 0; }
        recs.forEach(function (rec) {
            var a = rec.attrs || {};
            if (a['data-live-editor-pseudo-id']) pseudoIdSeq = Math.max(pseudoIdSeq, tail(a['data-live-editor-pseudo-id']));
            if (a['data-live-editor-hover-id']) hoverIdSeq = Math.max(hoverIdSeq, tail(a['data-live-editor-hover-id']));
            if (a['data-live-editor-cascade-id']) cascadeIdSeq = Math.max(cascadeIdSeq, tail(a['data-live-editor-cascade-id']));
            if (a['data-live-editor-rowborder-id']) rowBorderIdSeq = Math.max(rowBorderIdSeq, tail(a['data-live-editor-rowborder-id']));
            if (a['data-live-editor-col-id']) colIdSeq = Math.max(colIdSeq, tail(a['data-live-editor-col-id']));
        });
    }
    function restoreDraft() {
        var raw; try { raw = localStorage.getItem(draftKey()); } catch (e) { return; }
        if (!raw) return;
        var d; try { d = JSON.parse(raw); } catch (e) { clearDraftStorage(); return; }
        if (!d || d.v !== DRAFT_VER || !d.log || !d.log.length) { clearDraftStorage(); return; }
        if (d.fp !== sourceFingerprint()) { clearDraftStorage(); return; }   // stale: prototype changed since
        draftRestoring = true;
        try {
            (d.attrs || []).forEach(function (rec) {
                var el = elByPath(rec.path); if (!el) return;
                Object.keys(rec.attrs).forEach(function (name) { el.setAttribute(name, rec.attrs[name]); });
            });
            if (d.styleEls) {
                if (d.styleEls.pseudo) ensurePseudoStyleEl().textContent = d.styleEls.pseudo;
                if (d.styleEls.hover) ensureHoverStyleEl().textContent = d.styleEls.hover;
                if (d.styleEls.cascade) ensureCascadeStyleEl().textContent = d.styleEls.cascade;
                if (d.styleEls.rowborder) ensureRowBorderStyleEl().textContent = d.styleEls.rowborder;
                if (d.styleEls.col) ensureColStyleEl().textContent = d.styleEls.col;
            }
            (d.inline || []).forEach(function (rec) { var el = elByPath(rec.path); if (el) el.setAttribute('style', rec.style); });
            editLog.length = 0;
            d.log.forEach(function (rec) {
                var el = elByPath(rec.path);
                if (el) editLog.push({ el: el, prop: rec.prop, value: rec.value, isHover: !!rec.isHover, pseudo: rec.pseudo || null });
            });
            bumpIdSeqs(d.attrs || []);
            draftFlagState = d.flag === 'handed-off' ? 'handed-off' : 'editing';
            draftRestoredThisSession = true;
        } finally { draftRestoring = false; }
        updateExportFooter();
    }
    function tryRestore() {
        if (draftRestoreDone) return;
        var app = document.getElementById('app');
        if (!app || !app.children.length) return;   // content not rendered yet; canvas:ready will call again
        draftRestoreDone = true;
        restoreDraft();
    }

    // ── bootstrap ────────────────────────────────────────────
    function boot() {
        if (window.__davinciLiveEditorBooted) return;
        window.__davinciLiveEditorBooted = true;
        // Shield FIRST: prototypes register their dismiss handlers on
        // canvas:ready (or lazily when a popover opens), i.e. always after this.
        installShield(document);
        installShield(window);
        installShield(document.documentElement);
        installShield(document.body);
        buildUi();
        // The ribbon may or may not be in the DOM yet depending on whether the
        // canvas has rendered it: try now, and davinci-canvas.js calls
        // bindRibbonButton() again once it definitely is. Both paths are safe.
        bindRibbonButton();
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('keyup', onKeyUp, true);
        docOn('click', onDocClickCapture, true);
        window.addEventListener('scroll', onScrollResize, true);
        window.addEventListener('resize', onScrollResize);
        // Replay any saved draft once the prototype content is in the DOM. The canvas
        // fires davinci:canvas:ready after it renders; if content is already present
        // (this module loaded late), tryRestore runs now instead. Guarded to run once.
        document.addEventListener('davinci:canvas:ready', tryRestore);
        tryRestore();
    }
    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);

    // Public API. `DaVinciLiveEditor` matches the DaVinciChangeHistory naming the
    // canvas uses for its other feature modules and is what davinci-canvas.js
    // calls into; `DvLiveEditor` is the shorter alias kept for typing it by hand
    // in the console.
    window.DaVinciLiveEditor = {
        bindRibbonButton: bindRibbonButton,
        toggle: togglePicking,
        start: startPicking,
        stop: stopPicking,
        select: select,
        close: closeLiveEditor,
        rulers: toggleRulers,
        clearGuides: clearRulerGuides
    };
    window.DvLiveEditor = window.DaVinciLiveEditor;
})();
