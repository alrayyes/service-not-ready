  document.getElementById("retry").addEventListener("click", () => location.reload());
  // The origin's Retry-After says how long to wait. Asked once; a page opened directly has no
  // header, so it only shows the plain message.
  const msg = document.getElementById("msg");
  const announce = document.getElementById("announce");
  fetch(location.href, { cache: "no-store", credentials: "same-origin" })
    .then((r) => {
      let left = r.status === 429 ? Number(r.headers.get("Retry-After")) : 0;
      if (!(left > 0)) return;
      announce.textContent = `Try again in ${left} seconds.`;
      msg.textContent = `try again in ${left}s`;
      setInterval(() => {
        left -= 1;
        if (left <= 0) location.reload();
        else msg.textContent = `try again in ${left}s`;
      }, 1000);
    })
    .catch(() => {});
