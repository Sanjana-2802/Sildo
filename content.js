(function () {
  let sidebar, listContainer, toggleBtn, datePicker, clearBtn;
  let isSidebarVisible = true;
  let observer;
  let currentMode = "PROMPTS"; 

  const ICON_MENU = `<svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  function init() {
    if (document.getElementById("gpt-nav-sidebar")) return;
    createUI();
    scanPrompts(); 
    startObserver();
  }

  function createUI() {
    toggleBtn = document.createElement("button");
    toggleBtn.id = "gpt-nav-toggle";
    toggleBtn.innerHTML = ICON_CLOSE; 
    toggleBtn.classList.add("sidebar-open");
    toggleBtn.onclick = toggleSidebar;
    document.body.appendChild(toggleBtn);

    sidebar = document.createElement("div");
    sidebar.id = "gpt-nav-sidebar";
    
    const header = document.createElement("div");
    header.className = "gpt-nav-header";
    
    const title = document.createElement("span");
    title.className = "gpt-title";
    title.innerText = "Qrompt";
    header.appendChild(title);

    const dateWrapper = document.createElement("div");
    dateWrapper.className = "gpt-date-wrapper";

    datePicker = document.createElement("input");
    datePicker.type = "date";
    datePicker.id = "gpt-date-picker";
    datePicker.addEventListener("change", handleDateSelect);

    clearBtn = document.createElement("button");
    clearBtn.id = "gpt-clear-search";
    clearBtn.innerText = "✕";
    clearBtn.title = "Clear Search";
    clearBtn.onclick = clearSearch;

    dateWrapper.appendChild(datePicker);
    dateWrapper.appendChild(clearBtn);
    header.appendChild(dateWrapper);
    sidebar.appendChild(header);

    listContainer = document.createElement("div");
    listContainer.id = "gpt-nav-list";
    sidebar.appendChild(listContainer);
    document.body.appendChild(sidebar);
  }

  function toggleSidebar() {
    isSidebarVisible = !isSidebarVisible;
    if (isSidebarVisible) {
      sidebar.classList.remove("hidden");
      toggleBtn.classList.add("sidebar-open");
      toggleBtn.innerHTML = ICON_CLOSE;
    } else {
      sidebar.classList.add("hidden");
      toggleBtn.classList.remove("sidebar-open");
      toggleBtn.innerHTML = ICON_MENU;
    }
  }

  // --- 🔐 AUTH ---
  async function getAccessToken() {
    try {
      const resp = await fetch("https://chatgpt.com/api/auth/session");
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.accessToken;
    } catch (e) { return null; }
  }

  // --- 📅 DATE PARSING (FIXED) ---
  function getChatDate(chat) {
    if (!chat.create_time) return null;
    
    // FIX: Check if it's a number (Unix timestamp) or String (ISO)
    if (typeof chat.create_time === 'number') {
        return new Date(chat.create_time * 1000);
    } else {
        // It is an ISO string "2026-01-05T..."
        return new Date(chat.create_time);
    }
  }

  async function handleDateSelect(e) {
    const dateValue = e.target.value; 
    if (!dateValue) return;

    currentMode = "HISTORY"; 
    clearBtn.style.display = "block";
    listContainer.innerHTML = `<div style="padding:10px; color:#888;">Searching chats...</div>`;

    try {
      const token = await getAccessToken();
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};

      const response = await fetch("https://chatgpt.com/backend-api/conversations?offset=0&limit=100&order=updated", { headers });
      
      if (!response.ok) throw new Error("API Error");
      
      const data = await response.json();
      const chats = data.items || [];

      // Filter Logic
      const matches = chats.filter(chat => {
        const chatDate = getChatDate(chat);
        if (!chatDate) return false;

        // Compare using local time components
        const year = chatDate.getFullYear();
        const month = String(chatDate.getMonth() + 1).padStart(2, '0');
        const day = String(chatDate.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;

        return localDateString === dateValue;
      });

      renderHistoryList(matches, dateValue);

    } catch (err) {
      listContainer.innerHTML = `<div style="padding:10px; color:#ff6b6b;">Error: ${err.message}</div>`;
      console.error(err);
    }
  }

  function renderHistoryList(matches, dateStr) {
    listContainer.innerHTML = "";
    
    if (matches.length === 0) {
      listContainer.innerHTML = `<div style="padding:10px; color:#ccc;">No chats found on <br><b>${dateStr}</b></div>`;
      return;
    }

    matches.forEach(chat => {
      const item = document.createElement("div");
      item.className = "gpt-nav-item gpt-history-item";
      
      const titleSpan = document.createElement("span");
      titleSpan.className = "gpt-nav-text";
      titleSpan.style.fontWeight = "bold";
      titleSpan.innerText = chat.title || "Untitled Chat";

      const timeSpan = document.createElement("span");
      timeSpan.className = "gpt-history-date";
      
      const d = getChatDate(chat);
      const timeStr = d ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
      timeSpan.innerText = timeStr;

      item.appendChild(timeSpan);
      item.appendChild(titleSpan);

      item.addEventListener("click", () => {
        window.location.href = `https://chatgpt.com/c/${chat.id}`;
      });

      listContainer.appendChild(item);
    });
  }

  function clearSearch() {
    currentMode = "PROMPTS";
    datePicker.value = ""; 
    clearBtn.style.display = "none";
    listContainer.innerHTML = ""; 
    scanPrompts(); 
  }

  // --- PROMPTS LOGIC ---
  function scanPrompts() {
    if (currentMode === "HISTORY") return;
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    const existingNavItems = listContainer.children;
    
    if (userMessages.length < existingNavItems.length) listContainer.innerHTML = "";

    for (let i = existingNavItems.length; i < userMessages.length; i++) {
      const msg = userMessages[i];
      const textDiv = msg.innerText || msg.textContent;
      const cleanText = textDiv.split('\n')[0]; 

      const item = document.createElement("div");
      item.className = "gpt-nav-item";
      item.innerHTML = `<span class="gpt-nav-index">Q${i + 1}</span><span class="gpt-nav-text">${cleanText || "(Image)"}</span>`;
      
      item.addEventListener("click", () => {
        msg.scrollIntoView({ behavior: "smooth", block: "center" });
        msg.classList.add("gpt-nav-highlighted");
        setTimeout(() => msg.classList.remove("gpt-nav-highlighted"), 2000);
      });

      listContainer.appendChild(item);
    }
  }

  function startObserver() {
    let timeout;
    observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(scanPrompts, 1000); 
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (currentMode === "PROMPTS") {
        setTimeout(() => {
            listContainer.innerHTML = ""; 
            scanPrompts();
        }, 1500); 
      }
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(init, 2000);
})();