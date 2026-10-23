/*
 * Image slot. Plain JavaScript, no libraries.
 * An element with data-image-slot shows a finished placeholder panel. If one of the files listed in data-src (separated by |)
 * exists on the site, the first one that loads replaces the panel. To add the picture, save it under that name in assets/images/
 * and publish: no code change is needed. data-alt is the picture's description for screen readers and search engines.
 */
(function () {
  'use strict';
  var slots = document.querySelectorAll('[data-image-slot]');
  Array.prototype.forEach.call(slots, function (slot) {
    var list = (slot.getAttribute('data-src') || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var alt = slot.getAttribute('data-alt') || '';
    var i = 0;
    function next() {
      if (i >= list.length) return;                      // nothing uploaded yet: the placeholder panel stays
      var probe = new Image();
      probe.onload = function () {
        var img = document.createElement('img');
        img.src = probe.src;
        img.alt = alt;
        img.width = probe.naturalWidth;
        img.height = probe.naturalHeight;
        img.decoding = 'async';
        slot.innerHTML = '';
        slot.appendChild(img);
        slot.classList.add('has-image');
      };
      probe.onerror = function () { i++; next(); };
      probe.src = list[i];
    }
    next();
  });
})();
