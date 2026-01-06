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
    // 1. Create Arrow Toggle
    toggleBtn = document.createElement("button");
    toggleBtn.id = "gpt-nav-toggle";
    toggleBtn.innerHTML = ICON_ARROW; 
    toggleBtn.onclick = toggleSidebar;
    document.body.appendChild(toggleBtn);

    // 2. Create Sidebar
    sidebar = document.createElement("div");
    sidebar.id = "gpt-nav-sidebar";
    
    sidebar.innerHTML = `
      <div class="gpt-nav-header">
        <span class="gpt-title">Slido</span>
        <div class="gpt-date-wrapper">
          <input type="date" id="gpt-date-picker">
          <button id="gpt-clear-search">Reset</button>
        </div>
      </div>
      <div id="gpt-nav-list"></div>
    `;
    
    document.body.appendChild(sidebar);

    listContainer = sidebar.querySelector("#gpt-nav-list");
    datePicker = sidebar.querySelector("#gpt-date-picker");
    clearBtn = sidebar.querySelector("#gpt-clear-search");

    datePicker.addEventListener("change", handleDateSelect);
    clearBtn.onclick = clearSearch;
  }

  function toggleSidebar() {
    const isOpen = sidebar.classList.toggle('open');
    toggleBtn.style.right = isOpen ? '310px' : '10px';
    toggleBtn.style.transform = isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)';
  }

  // --- API AUTH & FETCH ---
  async function getAccessToken() {
    try {
      const resp = await fetch("https://chatgpt.com/api/auth/session");
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.accessToken;
    } catch (e) { return null; }
  }

  function getChatDate(chat) {
    if (!chat.create_time) return null;
    return typeof chat.create_time === 'number' ? new Date(chat.create_time * 1000) : new Date(chat.create_time);
  }

  async function handleDateSelect(e) {
    const dateValue = e.target.value; 
    if (!dateValue) return;

    currentMode = "HISTORY"; 
    clearBtn.style.display = "block";
    listContainer.innerHTML = `<div style="padding:10px; color:#888; font-size:12px;">Fetching from history...</div>`;

    try {
      const token = await getAccessToken();
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};
      const response = await fetch("https://chatgpt.com/backend-api/conversations?offset=0&limit=100&order=updated", { headers });
      
      const data = await response.json();
      const chats = data.items || [];

      const matches = chats.filter(chat => {
        const d = getChatDate(chat);
        if (!d) return false;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateValue;
      });

      renderHistoryList(matches, dateValue);
    } catch (err) {
      listContainer.innerHTML = `<div style="padding:10px; color:#ff6b6b;">Error fetching history</div>`;
    }
  }

  function renderHistoryList(matches, dateStr) {
    listContainer.innerHTML = "";
    if (matches.length === 0) {
      listContainer.innerHTML = `<div style="padding:10px; color:#888; font-size:12px;">No chats found on ${dateStr}</div>`;
      return;
    }

    matches.forEach(chat => {
      const item = document.createElement("div");
      item.className = "gpt-nav-item";
      
      const d = getChatDate(chat);
      const timeStr = d ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";

      item.innerHTML = `
        <span class="gpt-history-date">${d.toLocaleDateString()} • ${timeStr}</span>
        <span class="gpt-nav-text" style="font-weight:bold;">${chat.title || "Untitled Chat"}</span>
      `;

      item.onclick = () => window.location.href = `https://chatgpt.com/c/${chat.id}`;
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

  // --- LOCAL PROMPT SCANNING ---
  function scanPrompts() {
    if (currentMode === "HISTORY") return;
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    
    // Clear list if user switched chats
    if (userMessages.length < listContainer.children.length) listContainer.innerHTML = "";

    for (let i = listContainer.children.length; i < userMessages.length; i++) {
      const msg = userMessages[i];
      const cleanText = (msg.innerText || msg.textContent).split('\n')[0]; 

      const item = document.createElement("div");
      item.className = "gpt-nav-item";
      item.innerHTML = `
        <span class="gpt-nav-index">PROMPT ${i + 1}</span>
        <span class="gpt-nav-text">${cleanText || "View Prompt"}</span>
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
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(scanPrompts, 1000); 
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Detect URL changes (Switching chats)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      listContainer.innerHTML = "";
      setTimeout(scanPrompts, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(init, 2000);
})();