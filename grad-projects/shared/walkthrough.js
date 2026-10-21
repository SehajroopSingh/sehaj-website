/* ============================================================
   Shared behavior for the walkthrough pages:
   highlight the table-of-contents entry for the section in view.
   ============================================================ */
(function () {
  const links = [...document.querySelectorAll(".toc a")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (!("IntersectionObserver" in window) || !secs.length) return;
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }
  }, { rootMargin: "-10% 0px -75% 0px" });
  secs.forEach((s) => obs.observe(s));
})();
