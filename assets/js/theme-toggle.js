(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  var icon = document.getElementById("themeIcon");
  if (!toggle || !icon) return;

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
      toggle.setAttribute("aria-label", "Cambiar a tema claro");
      toggle.title = "Tema claro";
    } else {
      root.removeAttribute("data-theme");
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
      toggle.setAttribute("aria-label", "Cambiar a tema oscuro");
      toggle.title = "Tema oscuro";
    }
  }

  var saved = localStorage.getItem("cv-theme");
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "light") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "dark");
    }
    localStorage.setItem("cv-theme", next);
    applyTheme(next);
  });
})();
