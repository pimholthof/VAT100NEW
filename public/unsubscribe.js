document.getElementById("prefs").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await fetch(e.target.action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      marketing_emails: fd.has("marketing_emails"),
      reminder_emails: fd.has("reminder_emails"),
    }),
  });
  document.getElementById("msg").style.display = "block";
});
