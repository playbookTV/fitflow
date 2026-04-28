// Mobile nav toggle
(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }
})();
