document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const nav = document.getElementById("main-nav");
  const menuToggle = document.getElementById("menu-toggle");
  const themeToggle = document.getElementById("theme-toggle");
  const langButtons = document.querySelectorAll(".lang-btn");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => nav.classList.toggle("open"));
  }

  function setTheme(theme) {
    body.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    if (themeToggle) themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
  }
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      setTheme(body.classList.contains("dark") ? "light" : "dark");
    });
  }

  const cookieBanner = document.getElementById("cookie-banner");
  const acceptCookies = document.getElementById("accept-cookies");
  const rejectCookies = document.getElementById("reject-cookies");
  if (cookieBanner && !localStorage.getItem("cookieConsent")) cookieBanner.style.display = "flex";
  [acceptCookies, rejectCookies].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", btn.id === "accept-cookies" ? "accepted" : "rejected");
      cookieBanner.style.display = "none";
    });
  });

  async function loadTranslations(lang) {
    const fallback = lang.startsWith("fr") ? "fr" : "en";
    const selected = localStorage.getItem("lang") || fallback;
    const res = await fetch(`/lang/${selected}.json`);
    const dict = await res.json();
    document.documentElement.lang = selected;
    localStorage.setItem("lang", selected);
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (!dict[key]) return;
      node.textContent = dict[key];
    });
  }
  loadTranslations(navigator.language || "fr");
  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("lang", btn.dataset.lang);
      loadTranslations(btn.dataset.lang);
    });
  });

  const chatToggle = document.getElementById("chat-toggle");
  const chat = document.getElementById("chatbot");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if (chatToggle && chat) chatToggle.addEventListener("click", () => chat.style.display = "block");
  if (chatClose && chat) chatClose.addEventListener("click", () => chat.style.display = "none");

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;
      addMessage(message, "user");
      chatInput.value = "";
      addMessage("...", "assistant");
      try {
        const response = await fetch("/api/deepseek-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });
        if (!response.ok) {
          // GitHub Pages doesn't support Netlify functions; show a clear UX message.
          if (response.status === 404) throw new Error("CHATBOT_UNAVAILABLE");
          throw new Error(`HTTP_${response.status}`);
        }
        const data = await response.json();
        chatMessages.lastChild.remove();
        addMessage(data.reply || "Aucune reponse.", "assistant");
      } catch (error) {
        chatMessages.lastChild.remove();
        if (String(error && error.message) === "CHATBOT_UNAVAILABLE") {
          addMessage("Chatbot indisponible sur GitHub Pages. Utilisez Netlify pour activer Deepseek.", "assistant");
        } else {
          addMessage("Erreur de connexion au chatbot.", "assistant");
        }
      }
    });
  }
});
