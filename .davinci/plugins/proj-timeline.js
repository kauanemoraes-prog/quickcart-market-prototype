/**
 * ProjTimeline — Horizontal read-only milestone timeline plugin component
 *
 * Factory: ProjTimeline.create(config)
 *
 * Config:
 *   containerId   {string}  ID of the container element to render into
 *   templateId    {string}  (optional) Handlebars template ID — if omitted, uses built-in template
 *   iconsPath     {string}  (optional) Path to icons folder — default: '../../.davinci/assets/icons/regular/'
 *   onSelect      {function} (optional) Callback fired after a milestone is clicked.
 *                            Signature: (milestone, index) — receives the original milestone
 *                            object from the `milestones` array plus its zero-based index.
 *   milestones    {array}   Array of milestone objects:
 *     label       {string}  Top label (e.g., "P1", "P2")
 *     value       {string}  Bottom value (e.g., "04/01/2026")
 *     current     {boolean} Whether this is the current milestone
 *     selected    {boolean} Whether this milestone is selected (outer ring)
 *     draft       {boolean} Whether the current milestone is in draft state
 *     tooltip     {string}  (optional) Short explanation shown in a tooltip on hover / focus
 *     progress    {number}  (optional) 0-100, shown as a ring around the current milestone
 *
 * Base states (derived):
 *   past    — before current index (solid dark circle with a check)
 *   current — the current milestone (large circle with a glow, a progress ring and a pulsing clock)
 *   draft   — current + draft flag (white dot, gray border + gray checkmark)
 *   future  — after current index (white dot, gray border)
 *
 * Modifier:
 *   selected — blue outer ring, can overlay any base state
 */
(function() {
    'use strict';

    var DEFAULT_ICONS_PATH = '../../.davinci/assets/icons/regular/';

    window.ProjTimeline = {
        create: function(config) {
            var instance = {
                config: config,
                _tpl: null,

                init: function() {
                    this.render();
                    this._bindEvents();
                },

                /** Build HTML directly from computed state (no Handlebars template needed) */
                _buildHTML: function(ctx) {
                    var icons = this.config.iconsPath || DEFAULT_ICONS_PATH;
                    var html = '<div class="proj-timeline"><div class="proj-timeline__track"><div class="proj-timeline__milestones">';
                    html += '<div class="proj-timeline__line"></div><div class="proj-timeline__progress"></div>';

                    for (var i = 0; i < ctx.milestones.length; i++) {
                        var m = ctx.milestones[i];
                        var cls = 'proj-timeline__milestone proj-timeline__milestone--' + m.base;
                        if (m.isSelected) cls += ' proj-timeline__milestone--selected';

                        var aria = m.label + ', ' + m.value + (m.base === 'current' ? ', in progress' + (m.progress != null ? ', ' + m.progress + '% complete' : '') : (m.base === 'past' ? ', done' : ''));
                        html += '<div class="' + cls + '" tabindex="0" aria-label="' + aria + '">';
                        html += '<span class="proj-timeline__label">' + m.label + '</span>';
                        html += '<div class="proj-timeline__circle">';
                        if (m.base === 'current') {
                            var pct = m.progress != null ? Math.max(0, Math.min(100, m.progress)) : 0;
                            html += '<svg class="proj-timeline__ring" viewBox="0 0 36 36" aria-hidden="true">' +
                                '<circle class="proj-timeline__ring-track" cx="18" cy="18" r="16" pathLength="100"></circle>' +
                                '<circle class="proj-timeline__ring-value" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="' + pct + ' 100" transform="rotate(-90 18 18)"></circle>' +
                                '</svg>';
                            html += '<lucide-icon name="clock" class="proj-timeline__clock" style="font-size:14px"></lucide-icon>';
                        } else if (m.base === 'past' || m.hasCheck) {
                            html += '<lucide-icon name="check" class="proj-timeline__checkmark" style="font-size:11px"></lucide-icon>';
                        }
                        html += '</div>';
                        html += '<span class="proj-timeline__value">' + m.value + '</span>';
                        if (m.tooltip) html += '<span class="proj-timeline__tip" role="tooltip">' + m.tooltip + '</span>';
                        html += '</div>';
                    }

                    html += '</div></div></div>';
                    return html;
                },

                render: function() {
                    var container = document.getElementById(this.config.containerId);
                    if (!container) return;

                    var ctx = this._computeState();

                    // Use custom Handlebars template if provided, otherwise built-in HTML builder
                    if (this.config.templateId) {
                        var tplEl = document.getElementById(this.config.templateId);
                        if (!tplEl) return;
                        if (!this._tpl) {
                            this._tpl = Handlebars.compile(tplEl.innerHTML);
                        }
                        container.innerHTML = this._tpl(ctx);
                    } else {
                        container.innerHTML = this._buildHTML(ctx);
                    }

                    // Position lines when container is visible (handles hidden tabs)
                    var self = this;
                    var observer = new IntersectionObserver(function(entries) {
                        if (entries[0].isIntersecting) {
                            self._positionLines(container);
                            observer.disconnect();
                        }
                    });
                    observer.observe(container);
                },

                _bindEvents: function() {
                    var container = document.getElementById(this.config.containerId);
                    if (!container) return;
                    var self = this;

                    container.addEventListener('click', function(e) {
                        var milestone = e.target.closest('.proj-timeline__milestone');
                        if (!milestone) return;

                        var all = container.querySelectorAll('.proj-timeline__milestone');
                        var clickedIdx = -1;
                        for (var i = 0; i < all.length; i++) {
                            all[i].classList.remove('proj-timeline__milestone--selected');
                            if (all[i] === milestone) clickedIdx = i;
                        }
                        milestone.classList.add('proj-timeline__milestone--selected');
                        self._positionLines(container);

                        if (typeof self.config.onSelect === 'function' && clickedIdx >= 0) {
                            self.config.onSelect(self.config.milestones[clickedIdx], clickedIdx);
                        }
                    });
                },

                _positionLines: function(container) {
                    var ms = container.querySelectorAll('.proj-timeline__milestone');
                    var line = container.querySelector('.proj-timeline__line');
                    var progress = container.querySelector('.proj-timeline__progress');

                    if (ms.length < 2 || !line) return;

                    var parent = ms[0].parentElement;
                    var parentLeft = parent.getBoundingClientRect().left;
                    var firstCircle = ms[0].querySelector('.proj-timeline__circle');
                    var lastCircle = ms[ms.length - 1].querySelector('.proj-timeline__circle');
                    var firstCenter = firstCircle.getBoundingClientRect().left + firstCircle.offsetWidth / 2 - parentLeft;
                    var lastCenter = lastCircle.getBoundingClientRect().left + lastCircle.offsetWidth / 2 - parentLeft;

                    line.style.left = firstCenter + 'px';
                    line.style.width = (lastCenter - firstCenter) + 'px';

                    if (progress) {
                        var selectedMs = container.querySelector('.proj-timeline__milestone--selected');
                        if (selectedMs) {
                            var selCircle = selectedMs.querySelector('.proj-timeline__circle');
                            var selCenter = selCircle.getBoundingClientRect().left + selCircle.offsetWidth / 2 - parentLeft;
                            progress.style.left = firstCenter + 'px';
                            var target = (selCenter - firstCenter) + 'px';
                            if (!progress._filled) {
                                // First paint: let the line grow from the first circle to the current one
                                progress._filled = true;
                                progress.style.width = '0';
                                requestAnimationFrame(function() { requestAnimationFrame(function() { progress.style.width = target; }); });
                            } else {
                                progress.style.width = target;
                            }
                        } else {
                            progress.style.width = '0';
                        }
                    }
                },

                _computeState: function() {
                    var ms = this.config.milestones;
                    var currentIdx = -1, i;

                    for (i = 0; i < ms.length; i++) {
                        if (ms[i].current) currentIdx = i;
                    }

                    var processed = [];
                    for (i = 0; i < ms.length; i++) {
                        var base;
                        if (ms[i].current && ms[i].draft) {
                            base = 'draft';
                        } else if (ms[i].current) {
                            base = 'current';
                        } else if (i < currentIdx) {
                            base = 'past';
                        } else {
                            base = 'future';
                        }
                        processed.push({
                            label: ms[i].label,
                            value: ms[i].value,
                            base: base,
                            hasCheck: base === 'draft',
                            isSelected: !!ms[i].selected,
                            tooltip: ms[i].tooltip || '',
                            progress: ms[i].progress != null ? ms[i].progress : null
                        });
                    }

                    return {
                        milestones: processed
                    };
                }
            };

            return instance;
        }
    };
})();
