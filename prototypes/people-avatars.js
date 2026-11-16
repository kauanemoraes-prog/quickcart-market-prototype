/**
 * People avatars
 * Photos of people, taken from the sample photos of the workspace (davinci/assets/avatars): women get a photo of a woman and men a
 * photo of a man (the first name decides). There are only 12 photos and a photo is never shown twice in the same list: assign()
 * gives each photo to one person of a team (the first ones of the list) and the others have no photo, so the initials are shown.
 *
 *   PeopleAvatars.assign(names)            // for a team: who gets which photo (call it when the list is drawn)
 *   PeopleAvatars.url('Beatriz Moreira')   // the photo, or null when the person has none
 *   PeopleAvatars.img('Beatriz Moreira', 'emp-avatar')   // an <img>, or the initials when there is no photo
 */

(function() {
  'use strict';

  var BASE = '../../davinci/assets/avatars/';
  var FILES = { 1: 'avatar-1.png', 2: 'avatar-2.jpg', 3: 'avatar-3.jpg', 4: 'avatar-4.jpg', 5: 'avatar-5.jpg', 6: 'avatar-6.jpg', 7: 'avatar-7.jpg', 8: 'avatar-8.png', 9: 'avatar-9.png', 10: 'avatar-10.png', 11: 'avatar-11.png', 12: 'avatar-12.png' };
  var WOMEN = [1, 2, 3, 8, 10];
  var MEN = [4, 5, 6, 7, 9, 11, 12];
  // First names that are female. Any other name that ends in "a" is read as female too; the rest as male.
  var FEMALE = ['ana', 'beatriz', 'camila', 'carla', 'eduarda', 'gabriela', 'helena', 'isabela', 'isadora', 'juliana', 'karina', 'larissa', 'maria', 'mariana', 'marina', 'olivia', 'patricia', 'renata', 'tatiana', 'fernanda', 'amanda', 'bruna', 'leticia', 'natalia', 'luiza', 'sofia', 'carolina', 'aline', 'raquel', 'luciana', 'vanessa', 'priscila', 'simone', 'denise', 'adriana', 'debora', 'monica', 'viviane', 'cristina', 'elaine'];

  function plain(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function isWoman(name) {
    var first = plain(name).split(/\s+/)[0];
    return FEMALE.indexOf(first) !== -1 || (/a$/.test(first) && ['luca', 'joshua', 'nicola'].indexOf(first) === -1);
  }

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    return ((parts[0] || '')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  var team = null;   // plain name -> photo number, or 0 when the person has no photo (set by assign)

  /** The photo that goes with a name when nobody else of the team is taken into account. */
  function preferred(name) {
    var pool = isWoman(name) ? WOMEN : MEN;
    return pool[hash(plain(name)) % pool.length];
  }

  /** Give every photo to at most one person of the team; the people who are left without one get 0 (initials). */
  function assign(names) {
    var used = {};
    team = {};
    names.forEach(function(name) {
      var key = plain(name);
      if (key in team) return;
      var pool = isWoman(name) ? WOMEN : MEN, start = pool.indexOf(preferred(name)), pick = 0;
      for (var k = 0; k < pool.length; k++) {
        var cand = pool[(start + k) % pool.length];
        if (!used[cand]) { pick = cand; used[cand] = true; break; }
      }
      team[key] = pick;
    });
  }

  function url(name) {
    var n = team && (plain(name) in team) ? team[plain(name)] : preferred(name);
    return n ? BASE + FILES[n] : null;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  window.PeopleAvatars = {
    url: url,
    assign: assign,
    isWoman: isWoman,
    initials: initials,
    /** The photo as an <img>; if the file cannot be loaded, the initials take its place. */
    img: function(name, cls) {
      var initialsClass = cls + ' ' + cls.split(' ')[0] + '--initials';
      if (!url(name)) return '<span class="' + initialsClass + '">' + esc(initials(name)) + '</span>';
      return '<img class="' + cls + '" src="' + url(name) + '" alt="" loading="lazy" data-initials="' + esc(initials(name)) + '" onerror="this.outerHTML=\'<span class=&quot;' + initialsClass + '&quot;>\' + this.getAttribute(\'data-initials\') + \'</span>\'">';
    }
  };
})();
