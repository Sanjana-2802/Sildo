(function () {
  let sidebar, listContainer, toggleBtn, datePicker, clearBtn;
  let currentMode = "PROMPTS";

  const ICON_ARROW = `<svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>`;

  function init() {
    if (document.getElementById("gpt-nav-sidebar")) return;
    createUI();
    scanPrompts();
    startObserver();
  }

  function createUI() {
    toggleBtn = document.createElement("button");
    toggleBtn.id = "gpt-nav-toggle";
    toggleBtn.innerHTML = ICON_ARROW;
    toggleBtn.onclick = toggleSidebar;
    document.body.appendChild(toggleBtn);

    sidebar = document.createElement("div");
    sidebar.id = "gpt-nav-sidebar";
    sidebar.innerHTML = `
      <div class="gpt-nav-header">
        <span class="gpt-title">Slido</span>
        <div class="gpt-controls">
          <input type="date" id="gpt-date-picker">
          <button id="gpt-clear-btn">Reset</button>
        </div>
      </div>
      <div id="gpt-nav-list"></div>
    `;
    document.body.appendChild(sidebar);

    listContainer = sidebar.querySelector("#gpt-nav-list");
    datePicker = sidebar.querySelector("#gpt-date-picker");
    clearBtn = sidebar.querySelector("#gpt-clear-btn");

    datePicker.addEventListener("change", handleDateSelect);
    clearBtn.onclick = resetUI;
  }

  function toggleSidebar() {
    const isOpen = sidebar.classList.toggle('open');
    toggleBtn.style.right = isOpen ? '310px' : '15px';
    toggleBtn.style.transform = isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)';
  }

  async function getAccessToken() {
    try {
      const resp = await fetch("https://chatgpt.com/api/auth/session");
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.accessToken;
    } catch (e) { return null; }
  }

  async function handleDateSelect(e) {
    const selectedDate = e.target.value;
    if (!selectedDate) return;

    currentMode = "HISTORY";
    listContainer.innerHTML = `<div style="text-align:center; padding-top:20px; font-size:12px; color:#10a37f;">Searching History...</div>`;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No Token");

      // We fetch more items (100) to increase the chance of finding the date
      const resp = await fetch("https://chatgpt.com/backend-api/conversations?offset=0&limit=100&order=updated", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!resp.ok) throw new Error("API_REJECTED");
      
      const data = await resp.json();
      const chats = data.items || [];

      const filtered = chats.filter(chat => {
        // Handle different time formats from OpenAI
        const ts = typeof chat.create_time === 'number' ? chat.create_time * 1000 : chat.create_time;
        const d = new Date(ts);
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return iso === selectedDate;
      });

      renderHistory(filtered, selectedDate);
    } catch (err) {
      console.error(err);
      listContainer.innerHTML = `
        <div style="color:#ef4444; font-size:11px; text-align:center; padding:10px; border:1px dashed #ef4444; border-radius:8px;">
            <b>Access Error</b><br>
            Please refresh ChatGPT and ensure you are logged in.
        </div>`;
    }
  }

  function renderHistory(chats, dateStr) {
    listContainer.innerHTML = "";
    if (chats.length === 0) {
      listContainer.innerHTML = `<div style="text-align:center; font-size:12px; color:#666;">No chats found for ${dateStr}</div>`;
      return;
    }

    chats.forEach(chat => {
      const item = document.createElement("div");
      item.className = "gpt-nav-item";
      item.innerHTML = `
        <div style="font-size:10px; color:#10a37f; margin-bottom:4px;">HISTORY CHAT</div>
        <div class="gpt-nav-text" style="font-weight:600; color:#fff;">${chat.title || "Untitled Chat"}</div>
      `;
      item.onclick = () => window.location.href = `https://chatgpt.com/c/${chat.id}`;
      listContainer.appendChild(item);
    });
  }

  function resetUI() {
    currentMode = "PROMPTS";
    datePicker.value = "";
    listContainer.innerHTML = "";
    scanPrompts();
  }

  function scanPrompts() {
    if (currentMode === "HISTORY") return;
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    
    if (userMessages.length < listContainer.children.length) listContainer.innerHTML = "";

    for (let i = listContainer.children.length; i < userMessages.length; i++) {
      const msg = userMessages[i];
      const text = (msg.innerText || "").split('\n')[0].substring(0, 60);

      const item = document.createElement("div");
      item.className = "gpt-nav-item";
      item.innerHTML = `
        <div style="color:#10a37f; font-size:10px; font-weight:bold; margin-bottom:5px;">Q${i+1}</div>
        <div class="gpt-nav-text">${text || "Media Content..."}</div>
      `;
      item.onclick = () => {
        msg.scrollIntoView({ behavior: "smooth", block: "center" });
        msg.classList.add("gpt-nav-highlighted");
        setTimeout(() => msg.classList.remove("gpt-nav-highlighted"), 2000);
      };
      listContainer.appendChild(item);
    }
  }

  function startObserver() {
    const observer = new MutationObserver(() => {
        if(currentMode === "PROMPTS") {
            // Debounce scanning
            clearTimeout(window.gptScanTimer);
            window.gptScanTimer = setTimeout(scanPrompts, 1000);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Handle URL changes
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      resetUI();
    }
  }, 1500);

  setTimeout(init, 2500);
})();