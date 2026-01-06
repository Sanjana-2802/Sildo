(function() {
    let sidebar, listContainer, toggleBtn;

    function initUI() {
        // Create Toggle Button with Arrow SVG
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'gpt-nav-toggle';
        toggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>`;
        document.body.appendChild(toggleBtn);

        // Create Sidebar
        sidebar = document.createElement('div');
        sidebar.id = 'gpt-nav-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <span class="sidebar-title">Prompt History</span>
                 <button class="clear-btn" id="gpt-nav-clear">Clear</button>
            </div>
            <div id="gpt-nav-list"></div>
        `;
        document.body.appendChild(sidebar);

        listContainer = sidebar.querySelector('#gpt-nav-list');

        // Toggle Logic
        toggleBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            toggleBtn.style.right = isOpen ? '310px' : '10px';
            toggleBtn.style.transform = isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)';
        });

        // Clear button (clears the sidebar completely)
        sidebar.querySelector('#gpt-nav-clear').addEventListener('click', () => {
            listContainer.innerHTML = '';
        });

        refreshPrompts();
    }

    function refreshPrompts() {
        const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
        listContainer.innerHTML = '';

        userMessages.forEach((msg, index) => {
            const text = msg.innerText.trim();
            const item = document.createElement('div');
            item.className = 'gpt-nav-item';
            item.innerHTML = `
                <div class="gpt-nav-index">${index + 1}</div>
                <div class="gpt-nav-text">${text}</div>
            `;
            
            item.addEventListener('click', () => {
                msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                msg.classList.add('gpt-highlight-pulse');
                setTimeout(() => msg.classList.remove('gpt-highlight-pulse'), 2000);
            });

            listContainer.appendChild(item);
        });
    }

    // Observer to detect new messages
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) {
            clearTimeout(window.navRefreshTimeout);
            window.navRefreshTimeout = setTimeout(refreshPrompts, 1000);
        }
    });

    function startObserver() {
        const main = document.querySelector('main');
        if (main) {
            observer.observe(main, { childList: true, subtree: true });
        } else {
            setTimeout(startObserver, 2000);
        }
    }

    initUI();
    startObserver();
})();