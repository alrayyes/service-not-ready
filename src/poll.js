  // Seconds between checks. The server's Retry-After header replaces it after the first poll.
  let wait = 30;
  let left = wait;
  let busy = false;
  const msg = document.getElementById("msg");
  const announce = document.getElementById("announce");
  const btn = document.getElementById("retry");
  const say = (visible, spoken) => {
    msg.textContent = visible;
    announce.textContent = spoken;
  };
  const done = () => {
    busy = false;
    btn.disabled = false;
    left = wait;
    say(`still {{state}}. checking again in ${wait}s`, `Still {{state}}. Checking again in ${wait} seconds.`);
  };
  const check = () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    say("checking now...", "Checking now.");
    fetch(location.href, { cache: "no-store", credentials: "same-origin" })
      .then((r) => {
        if (r.status !== {{code}}) return location.reload();
        wait = Number(r.headers.get("Retry-After")) || wait;
        done();
      })
      .catch(done);
  };
  btn.addEventListener("click", check);
  setInterval(() => {
    if (busy) return;
    left -= 1;
    if (left <= 0) check();
    else msg.textContent = `checking again in ${left}s`;
  }, 1000);
