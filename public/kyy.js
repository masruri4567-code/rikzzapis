(function() {
  'use strict';

  const yrEl = document.getElementById('yr');
  if (yrEl) yrEl.textContent = new Date().getFullYear();

  const THEME_KEY = 'kayzz_theme';
  const curtain = document.getElementById('curtain');
  let busy = false;

  function openCurtain(cb) {
    curtain.classList.add('ci');
    setTimeout(cb, 350);
  }

  function closeCurtain() {
    curtain.classList.remove('ci');
  }

  window.addEventListener('load', function() {
    closeCurtain();
    busy = false;
  });

  window.addEventListener('pageshow', function(e) {
    closeCurtain();
    busy = false;
  });

  function navigateWithTransition(href) {
    if (busy) return;
    busy = true;
    openCurtain(function() { window.location.href = href; });
  }

  document.querySelectorAll('a[href]').forEach(function(link) {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.charAt(0) === '#') return;
    const ext = link.target === '_blank' || href.indexOf('http') === 0 || href.indexOf('//') === 0 || href.indexOf('mailto:') === 0;
    link.addEventListener('click', function(e) {
      if (busy) { e.preventDefault(); return; }
      if (ext) {
        e.preventDefault();
        busy = true;
        openCurtain(function() { window.open(href, '_blank'); busy = false; closeCurtain(); });
      } else if (href !== window.location.pathname) {
        e.preventDefault();
        navigateWithTransition(href);
      }
    });
  });

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); document.body.style.overflow = 'hidden'; }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); document.body.style.overflow = ''; }

  document.getElementById('sidebarToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeSidebar(); });

  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      themeIcon.textContent = 'light_mode';
    } else {
      document.body.classList.remove('dark-mode');
      themeIcon.textContent = 'dark_mode';
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  setTheme(localStorage.getItem(THEME_KEY) || 'light');
  themeToggle.addEventListener('click', function() {
    setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
  });

  const limitBadge = document.getElementById('limit-badge');
  if (limitBadge) {
    const usage = parseInt(localStorage.getItem('kayzz_api_key_usage') || '0');
    const limit = parseInt(localStorage.getItem('kayzz_api_key_limit') || '300');
    limitBadge.textContent = 'Free: ' + usage + '/' + limit;
  }

  function messeg(msg, type) {
    type = type || 'success';
    const toast = document.getElementById('custom-toast');
    const msgBox = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    if (!toast || !msgBox || !toastIcon) return;
    const types = {
      success: { icon: 'fa-check', color: '#10b981' },
      error: { icon: 'fa-xmark', color: '#dc2626' },
      warning: { icon: 'fa-exclamation', color: '#d97706' },
      info: { icon: 'fa-info', color: '#8b5cf6' }
    };
    const style = types[type] || types.success;
    toastIcon.className = 'fa-solid ' + style.icon;
    toastIcon.style.color = style.color;
    msgBox.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(function() { toast.classList.add('hidden'); }, 2000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const friendCard = document.getElementById('friend-card');
  const friendSection = document.getElementById('friend-section');
  const friendContainer = document.getElementById('friend-container');

  if (friendCard && friendSection) {
    friendCard.addEventListener('click', function(e) {
      e.preventDefault();
      if (friendSection.style.display === 'none') {
        friendSection.style.display = 'block';
        loadFriends();
        setTimeout(function() { friendSection.scrollIntoView({ behavior: 'smooth' }); }, 100);
      } else {
        friendSection.style.display = 'none';
      }
    });
  }

  async function loadFriends() {
    try {
      const response = await fetch('friend.json');
      if (!response.ok) throw new Error('Failed to load friend.json');
      const data = await response.json();
      const friends = data.friends || data.entries || data;
      if (!friends || friends.length === 0) {
        friendContainer.innerHTML = '<div class="error">No friends data found.</div>';
        return;
      }
      const friendsArray = Array.isArray(friends) ? friends : [friends];
      let html = '';
      friendsArray.forEach(function(friend) {
        html += '<div class="friend-item">' +
          '<img src="' + (friend.photo || friend.image || 'https://c.termai.cc/i133/E4w5s.jpeg') + '" alt="' + friend.name + '" class="friend-avatar" onerror="this.src=\'https://c.termai.cc/i133/E4w5s.jpeg\'">' +
          '<div class="friend-info">' +
          '<div class="friend-name">' + escapeHtml(friend.name) + '</div>' +
          '<div class="friend-desc">' + escapeHtml(friend.description || friend.bio || '') + '</div>' +
          '</div></div>';
      });
      friendContainer.innerHTML = html;
      messeg('Friends loaded', 'success');
    } catch (error) {
      friendContainer.innerHTML = '<div class="error">Error loading friends: ' + error.message + '</div>';
      messeg('Failed to load friends', 'error');
    }
  }
})();
