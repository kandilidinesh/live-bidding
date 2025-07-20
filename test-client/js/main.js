const chat = document.getElementById('chat');
const userSelect = document.getElementById('userSelect');

const auctionList = document.getElementById('auctionList');
let socket = null,
  auctionId = null,
  userId = null,
  auctions = [];

if (localStorage.getItem('auctionAuctionId')) {
  auctionId = localStorage.getItem('auctionAuctionId');
}
if (localStorage.getItem('auctionUserId')) {
  userId = localStorage.getItem('auctionUserId');
}
let users = [];
let timerInterval = null;
let bidHistory = [];

function renderBidHistory() {
  chat.innerHTML = '';
  lastDateCapsule = null;
  addMessage({ message: 'Connected', system: true, sticky: true });

  const selectedAuction = (auctions || []).find((a) => a.id == auctionId);
  if (selectedAuction && typeof selectedAuction.startingBid === 'number') {
    const sb = document.createElement('div');
    sb.className = 'starting-bid-capsule';
    sb.textContent = `Starting Bid: $${selectedAuction.startingBid}`;
    sb.style.display = 'inline-block';
    sb.style.background = 'rgba(60,68,90,0.92)';
    sb.style.color = '#f8fafc';
    sb.style.fontWeight = '600';
    sb.style.fontSize = '0.98em';
    sb.style.borderRadius = '999px';
    sb.style.padding = '0.18em 1.1em 0.18em 1.1em';
    sb.style.margin = '0.5em auto 0.7em auto';
    sb.style.textAlign = 'center';
    sb.style.width = 'fit-content';
    sb.style.boxShadow = '0 1px 6px 0 rgba(0,0,0,0.07)';
    chat.appendChild(sb);
  }
  updateAdminButton();
  let validBids = 0;
  lastMessageDate = null;
  bidHistory.forEach((bid) => {
    if (
      bid &&
      typeof bid.amount === 'number' &&
      !isNaN(bid.amount) &&
      (bid.userId !== undefined ||
        bid.username ||
        (bid.user && bid.user.username))
    ) {
      let resolvedUserId = bid.userId;
      let resolvedUsername = bid.username;
      if (!resolvedUserId && bid.user && bid.user.id) {
        resolvedUserId = bid.user.id;
      }
      if (!resolvedUsername && bid.user && bid.user.username) {
        resolvedUsername = bid.user.username;
      }
      let showName = '';
      if (resolvedUserId == userId) {
        let fn = bid.user?.firstName || bid.firstName;
        let ln = bid.user?.lastName || bid.lastName;
        if ((!fn || !ln) && users && Array.isArray(users)) {
          const u = users.find((u) => u.id == resolvedUserId);
          if (u) {
            fn = u.firstName;
            ln = u.lastName;
          }
        }
        let namePart = ((fn || '') + ' ' + (ln || '')).trim();
        if (!namePart) {
          namePart = resolvedUsername || 'You';
        }
        showName = namePart + ' (You)';
      } else {
        showName = resolvedUsername || 'User ' + (resolvedUserId || '');
      }
      addMessage({
        message: '',
        me: resolvedUserId == userId,
        username: showName,
        firstName: bid.user?.firstName,
        lastName: bid.user?.lastName,
        amount: bid.amount,
        timestamp: bid.timestamp,
        userId: resolvedUserId,
      });
      validBids++;
    }
  });
  if (validBids === 0) {
    const oldNoBids = chat.querySelector('.no-bids-message');
    if (oldNoBids) oldNoBids.remove();
    const noBidsMsg = document.createElement('div');
    noBidsMsg.className = 'no-bids-message';
    let selectedAuction = (auctions || []).find((a) => a.id == auctionId);
    let ended = selectedAuction && selectedAuction.status === 'ENDED';
    noBidsMsg.textContent = ended ? 'No bids were made.' : 'No bids made yet.';
    noBidsMsg.style.display = 'block';
    noBidsMsg.style.background = 'none';
    noBidsMsg.style.color = '#bfc9d1';
    noBidsMsg.style.fontWeight = '600';
    noBidsMsg.style.fontSize = '1.04em';
    noBidsMsg.style.margin = '1.1em 0 0.5em 0';
    noBidsMsg.style.textAlign = 'center';
    noBidsMsg.style.position = 'relative';
    noBidsMsg.style.zIndex = '2';
    let insertAfter = null;
    for (let i = 0; i < chat.childNodes.length; i++) {
      const node = chat.childNodes[i];
      if (node && node.id === 'connectionCapsule') {
        insertAfter = node;
        break;
      }
    }
    if (insertAfter && insertAfter.nextSibling) {
      chat.insertBefore(noBidsMsg, insertAfter.nextSibling);
    } else if (insertAfter) {
      chat.appendChild(noBidsMsg);
    } else {
      chat.insertBefore(noBidsMsg, chat.firstChild);
    }
  }
}

let lastMessageDate = null;
let lastDateCapsule = null;
function formatDateCapsule(dateObj) {
  const msgDate = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
  );
  return msgDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function addDateCapsuleIfNeeded(dateObj) {
  const dateStr = dateObj.toISOString().slice(0, 10);
  const thisCapsule = formatDateCapsule(dateObj);
  if (lastDateCapsule !== thisCapsule) {
    lastDateCapsule = thisCapsule;
    const capsule = document.createElement('div');
    capsule.className = 'date-capsule';
    capsule.textContent = thisCapsule;
    chat.appendChild(capsule);
  }
}

function format12HourTime(dateObj) {
  return dateObj.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const USER_COLORS = [
  '#b9bbbe',
  '#7289da',
  '#43b581',
  '#faa61a',
  '#f47fff',
  '#70a1ff',
  '#a3a3ff',
  '#f7b267',
  '#6e7b8b',
  '#e3e5e8',
  '#ffb6b9',
  '#ffe066',
  '#7ed6df',
  '#b8e994',
  '#d3a4ff',
  '#c7ecee',
];
function getUserColor(userId) {
  if (!userId) return '#bfc9d1';

  let idNum = Number(userId);
  if (!isNaN(idNum)) {
    return USER_COLORS[idNum % USER_COLORS.length];
  } else {
    let hash = 0;
    for (let i = 0; i < String(userId).length; i++) {
      hash = (hash << 5) - hash + String(userId).charCodeAt(i);
      hash |= 0;
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }
}

function addMessage({
  message,
  system = false,
  me = false,
  meta,
  username,
  amount,
  firstName,
  lastName,
  sticky = false,
  timestamp,
  userId,
}) {
  if (system) {
    return;
  }

  if (!userId) {
    if (typeof username === 'string' && users && Array.isArray(users)) {
      let u = users.find(
        (u) =>
          u.username && u.username.toLowerCase() === username.toLowerCase(),
      );
      if (!u && (firstName || lastName)) {
        u = users.find((u) => {
          const full = `${u.firstName || ''} ${u.lastName || ''}`
            .trim()
            .toLowerCase();
          return full && full === username.toLowerCase();
        });
      }
      if (u && u.id) userId = u.id;
    }
  }

  let dateObj = null;
  if (timestamp) {
    dateObj = new Date(timestamp);
  } else if (meta) {
    dateObj = new Date();
  } else {
    dateObj = new Date();
  }
  addDateCapsuleIfNeeded(dateObj);

  const msg = document.createElement('div');
  msg.className = 'message' + (me ? ' me' : '');

  const card = document.createElement('div');
  card.className = 'msg-card';

  const header = document.createElement('div');
  header.className = 'msg-header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'msg-username';
  if (me) {
    let fn = firstName;
    let ln = lastName;
    if ((!fn || !ln) && users && Array.isArray(users)) {
      const u = users.find((u) => u.id == userId);
      if (u) {
        fn = u.firstName;
        ln = u.lastName;
      }
    }
    let namePart = ((fn || '') + ' ' + (ln || '')).trim();
    if (!namePart) {
      namePart = username || 'You';
    }
    nameSpan.textContent = namePart + ' (You)';
  } else if (firstName || lastName) {
    nameSpan.textContent = `${firstName || ''} ${lastName || ''}`.trim();
  } else if (username) {
    nameSpan.textContent = username;
  } else {
    nameSpan.textContent = 'User';
  }

  let colorId = userId;
  if (!colorId && typeof username === 'string') colorId = username;
  nameSpan.style.color = getUserColor(colorId);
  nameSpan.style.fontWeight = me ? '600' : '500';

  const bidSpan = document.createElement('span');
  bidSpan.className = 'msg-bid';
  bidSpan.textContent = amount !== undefined ? `$ ${amount}` : '';

  header.appendChild(nameSpan);
  header.appendChild(bidSpan);
  card.appendChild(header);

  if (message) {
    const body = document.createElement('div');
    body.className = 'msg-body';
    body.innerHTML = message;
    card.appendChild(body);
  }

  if (dateObj) {
    const metaSpan = document.createElement('span');
    metaSpan.className = 'msg-meta';
    metaSpan.textContent = format12HourTime(dateObj);
    card.appendChild(metaSpan);
  }
  msg.appendChild(card);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function updateAuctionTimer() {
  const timerEl = document.getElementById('auctionTimer');
  const selectedAuction = (auctions || []).find((a) => a.id == auctionId);
  if (!selectedAuction || !selectedAuction.startTime) {
    timerEl.textContent = '';
    return;
  }
  function formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h > 0 ? h + ':' : ''}${h > 0 ? String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
  }
  if (timerInterval) clearInterval(timerInterval);
  const started = new Date(selectedAuction.startTime).getTime();

  if (selectedAuction.status === 'ENDED' && selectedAuction.endTime) {
    const ended = new Date(selectedAuction.endTime).getTime();
    const elapsed = Math.max(0, ended - started);
    timerEl.innerHTML = `
  <div class="timer-capsule">
    <span class="timer-label">⏱ Auction duration:</span>
    <span class="timer-value">${formatElapsed(elapsed)}</span>
  </div>
`;
  } else {
    function render() {
      const now = Date.now();
      const elapsed = Math.max(0, now - started);
      timerEl.innerHTML = `
  <div class="timer-capsule">
    <span class="timer-label">⏱ Auction duration:</span>
    <span class="timer-value">${formatElapsed(elapsed)}</span>
  </div>
`;
    }
    render();
    timerInterval = setInterval(render, 1000);
  }
}

function renderAuctionList() {
  auctionList.innerHTML = '';
  (auctions || [])
    .slice()
    .sort((a, b) => a.id - b.id)
    .forEach((a) => {
      const item = document.createElement('div');

      // Add 'upcoming' class for upcoming auctions
      let isUpcoming = a.status === 'UPCOMING';
      item.className = 'auction-item' + (a.id == auctionId ? ' selected' : '') + (isUpcoming ? ' upcoming' : '');

      let carLabel =
        typeof a.carId === 'string' && a.carId.trim() ? a.carId : 'Car';


      let statusColor =
        a.status === 'LIVE'
          ? '#4caf50'
          : a.status === 'ENDED'
            ? '#bfc9d1'
            : a.status === 'UPCOMING'
              ? '#ff9800'
              : '#7a869a';

      // Add 'upcoming' or 'ended' class to status dot if needed
      let statusDotClass = 'auction-status-dot';
      if (isUpcoming) {
        statusDotClass += ' upcoming';
      } else if (a.status === 'ENDED') {
        statusDotClass += ' ended';
      }
      let statusDot = `<span class="${statusDotClass}"></span>`;
      item.innerHTML = `${statusDot}<span class="id">#${a.id}</span> <span class="car">${carLabel}</span>`;

      item.style.boxShadow = 'none';
      item.style.opacity = '1';
      item.onclick = () => {
        if (auctionId != a.id) {
          auctionId = a.id;
          localStorage.setItem('auctionAuctionId', auctionId);
          renderAuctionList();
          initSocket();
          updateFooterContent();
          updateAuctionTimer();
          updateAdminButton();
        }
      };
      auctionList.appendChild(item);
    });
}

function initSocket() {
  updateAuctionTimer();
  if (socket) socket.disconnect();
  chat.innerHTML = '';
  window.__isConnected = false;
  updateFooterContent();

  bidHistory = [];
  socket = io('http://localhost:3000/auctions', {
    transports: ['websocket'],
  });
  socket.on('connect', () => {
    window.__isConnected = true;
    updateFooterContent();
  });
  socket.on('disconnect', () => {
    window.__isConnected = false;
    updateFooterContent();
  });
  socket.on('bidUpdate', (data) => {
    let isDuplicate = false;
    if (data.id !== undefined) {
      isDuplicate = bidHistory.some((b) => b.id === data.id);
    } else {
      isDuplicate = bidHistory.some(
        (b) =>
          b.timestamp === data.timestamp &&
          b.userId === data.userId &&
          b.amount === data.amount,
      );
    }

    const isValid =
      data &&
      typeof data.amount === 'number' &&
      !isNaN(data.amount) &&
      (data.userId !== undefined || data.username);
    if (!isDuplicate && isValid) {
      let firstName = data.firstName,
        lastName = data.lastName,
        username = data.username;
      if (users && Array.isArray(users)) {
        const u = users.find((u) => u.id == data.userId);
        if (u) {
          if (!firstName) firstName = u.firstName;
          if (!lastName) lastName = u.lastName;
          if (!username) username = u.username;
        }
      }
      // Compose display name: prefer firstName + lastName, else username, else fallback
      let displayName = '';
      if (firstName || lastName) {
        displayName = ((firstName || '') + ' ' + (lastName || '')).trim();
      }
      if (!displayName && username) {
        displayName = username;
      }
      if (!displayName) {
        displayName = 'User ' + (data.userId || '');
      }
      bidHistory.push({
        id: data.id,
        amount: data.amount,
        userId: data.userId,
        username: displayName,
        firstName,
        lastName,
        timestamp: data.timestamp || new Date().toISOString(),
      });
      renderBidHistory();
    }
  });
  socket.on('auctionEnded', (data) => {
    addMessage({ message: `Auction Ended.`, system: true });

    const idx = (auctions || []).findIndex((a) => a.id == auctionId);
    if (idx !== -1) {
      auctions[idx].status = 'ENDED';
      if (data && data.winnerId !== undefined) {
        auctions[idx].winnerId = data.winnerId;
      }
      renderAuctionList();
      updateFooterContent();
      updateAdminButton();
    }
  });
  socket.on('auctionStarted', (data) => {
    addMessage({ message: `Auction Started.`, system: true });
  });
  socket.on('bidError', (msg) => {
    addMessage({
      message: `<span style='color:#ff6f3c'>Bid Error: ${msg}</span>`,
      system: true,
    });
  });
  socket.emit('joinAuction', { auctionId });

  fetch(`http://localhost:3000/auctions/${auctionId}/bids`, {
    headers: { 'x-api-key': 'my-secret-api-key' },
  })
    .then((res) => res.json())
    .then((bids) => {
      bidHistory = (bids || [])
        .slice()
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      renderBidHistory();
    });
  updateFooterContent();
}

function submitBid() {
  const amount = parseFloat(bidAmount.value);

  if (
    !amount ||
    !auctionId ||
    !userId ||
    userId === 'admin' ||
    isNaN(Number(userId))
  )
    return;
  if (amount > 2147483647) {
    alert('Bid amount too large. Maximum allowed is 2,147,483,647.');
    return;
  }
  socket.emit('placeBid', {
    auctionId: Number(auctionId),
    userId: Number(userId),
    amount,
  });
  bidAmount.value = '';
}

function updateFooterContent() {
  const footerContent = document.getElementById('footerContent');
  const selectedAuction = (auctions || []).find((a) => a.id == auctionId);
  let connectionStatus = window.__isConnected ? 'online' : 'offline';
  let capsule = `<div id="connectionCapsule" class="connection-capsule${connectionStatus === 'online' ? '' : ' offline'}">
          <span class="connection-dot"></span>${connectionStatus === 'online' ? 'Connected' : 'Offline'}
        </div>`;

  if (selectedAuction && selectedAuction.status === 'ENDED') {
    let winner = null;
    if (selectedAuction.winnerId && users && Array.isArray(users)) {
      winner = users.find((u) => u.id == selectedAuction.winnerId);
    }
    let winnerName = winner
      ? ((winner.firstName || '') + ' ' + (winner.lastName || '')).trim()
      : null;
    if (!winnerName && winner && winner.username) winnerName = winner.username;
    if (!winnerName && selectedAuction.winnerId)
      winnerName = 'User #' + selectedAuction.winnerId;

    footerContent.innerHTML = `
            <div style="position:relative;z-index:2;display:flex;align-items:center;width:100%;">
              ${capsule}
              <div class="connection-capsule offline" style="color:#bfc9d1;border-color:#bfc9d1;margin-left:0.7em;">
                <span class="connection-dot" style="background:#bfc9d1;"></span>Auction has ended
              </div>
              <div class="connection-capsule winner-capsule neon" style="color:#bfc9d1;background:linear-gradient(90deg,#232b39,#232b39);margin-left:auto;font-weight:500;font-family:'Montserrat', 'Segoe UI', Arial, sans-serif;">
        Winner: <span style="margin-left:0.5em;color:#39ff14;font-weight:500;font-family:'Montserrat', 'Segoe UI', Arial, sans-serif;">${winnerName ? winnerName : 'No winner'}</span>
              </div>
            </div>
          `;
  } else if (selectedAuction && selectedAuction.status === 'UPCOMING') {
    // Show Upcoming Auction capsule, no bid field
    footerContent.innerHTML = `
      ${capsule}
      <div class="connection-capsule offline" style="color:#ff9800;border-color:#ff9800;margin-left:0.7em;">
        <span class="connection-dot" style="background:#ff9800;"></span>Upcoming Auction
      </div>
    `;
  } else if (users.find((u) => String(u.id) === String(userId) && u.role === 'ADMIN')) {
    footerContent.innerHTML = `
            ${capsule}
            <div class="connection-capsule offline" style="color:#bfc9d1;border-color:#bfc9d1;margin-left:0.7em;">
              <span class="connection-dot" style="background:#bfc9d1;"></span>Admin cannot place bids
            </div>
          `;
  } else {
    footerContent.innerHTML =
      capsule +
      `
            <div class="connection-capsule bid-capsule" style="background:#232b39;color:#f8fafc;border-color:#4caf50;box-shadow:none;gap:0.7em;width:100%;max-width:100%;flex:1 1 0;align-items:center;min-width:0;padding:0.22em 0.7em 0.22em 0.7em;min-height:unset;height:2.1em;">
              <input type="number" id="bidAmount" placeholder="Type your bid..." min="1" max="2147483647" required class="chat-input" style="background:transparent;border:none;color:#f8fafc;font-size:0.93em;outline:none;width:100%;max-width:100%;padding:0.08em 0.1em;box-shadow:none;flex:1 1 0;min-width:0;height:1.6em;line-height:1.6em;border-radius:999px;" />
              <button id="bidBtn" class="send-btn" title="Send Bid" style="margin-left:0;width:32px;height:32px;font-size:1em;min-width:32px;min-height:32px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 20L21 12L3 4V10L17 12L3 14V20Z" fill="currentColor"/></svg>
              </button>
            </div>
          `;

    const bidBtn = document.getElementById('bidBtn');
    const bidAmount = document.getElementById('bidAmount');
    if (bidBtn && bidAmount) {
      bidBtn.onclick = submitBid;
      bidAmount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitBid();
        }
      });
    }
  }
}


document.body.classList.add('dark');
document.body.style.background =
  'linear-gradient(135deg, #181c23 0%, #232b39 100%)';

// Prompt for admin 2FA modal on reload if admin user is selected
window.addEventListener('DOMContentLoaded', function () {
  const userSelect = document.getElementById('userSelect');
  // Wait for userSelect to be populated
  setTimeout(() => {
    if (userSelect && users.length > 0) {
      const selectedUser = users.find((u) => String(u.id) === String(userSelect.value));
      if (selectedUser && selectedUser.role === 'ADMIN') {
        showAdmin2FAModal(() => {
          userId = selectedUser.id;
          localStorage.setItem('auctionUserId', userId);
          updateAdminButton();
          updateFooterContent();
          renderBidHistory();
        }, () => {
          // If cancelled or failed, revert selection
          const prev = localStorage.getItem('auctionUserId');
          if (prev && String(prev) !== String(selectedUser.id)) {
            userSelect.value = prev;
            userId = prev;
          } else {
            userSelect.selectedIndex = 0;
            userId = userSelect.value;
          }
          localStorage.setItem('auctionUserId', userId);
          updateAdminButton();
          updateFooterContent();
          renderBidHistory();
        });
      }
    }
  }, 200);
});

fetch('http://localhost:3000/auctions', {
  headers: { 'x-api-key': 'my-secret-api-key' },
})
  .then((res) => res.json())
  .then((data) => {
    if (!Array.isArray(data) || data.length === 0)
      throw new Error('No auctions found');
    auctions = data;

    if (!auctionId || !auctions.some((a) => a.id == auctionId)) {
      auctionId = auctions[0]?.id;
    }

    auctionId = String(auctionId);
    localStorage.setItem('auctionAuctionId', auctionId);
    renderAuctionList();
    initSocket();
    updateAuctionTimer();
    updateAdminButton();
  })
  .catch((err) => {
    console.error('Error loading auctions:', err);
    addMessage({ message: 'Error loading auctions', system: true });
  });

fetch('http://localhost:3000/users', {
  headers: { 'x-api-key': 'my-secret-api-key' },
})
  .then((res) => res.json())
  .then((data) => {
    if (!Array.isArray(data)) throw new Error('Users response is not an array');
    users = data;
    userSelect.innerHTML = '';

    (data || []).forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id;
      let name = '';
      if (u.role === 'ADMIN') {
        name = (u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Admin';
      } else if (u.firstName || u.lastName) {
        name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      } else {
        name = u.username || u.email || 'User';
      }
      opt.textContent = name;
      userSelect.appendChild(opt);
    });

    if (
      userId &&
      Array.from(userSelect.options).some((opt) => opt.value == userId)
    ) {
      userSelect.value = userId;
    } else {
      userId = userSelect.value;
    }
    localStorage.setItem('auctionUserId', userId);
    updateAdminButton();
  })
  .catch((err) => {
    console.error('Error loading users:', err);
    addMessage({ message: 'Error loading users', system: true });
  });

userSelect.onchange = (e) => {
  const selected = e.target.value;
  userId = selected;
  // Check if selected user is admin
  const selectedUser = users.find((u) => String(u.id) === String(userId));
  if (selectedUser && selectedUser.role === 'ADMIN') {
    showAdmin2FAModal(() => {
      userId = selectedUser.id;
      localStorage.setItem('auctionUserId', userId);
      updateAdminButton();
      updateFooterContent();
      renderBidHistory();
    }, () => {
      // If cancelled or failed, revert selection
      // Try to select previous user or first user
      const prev = localStorage.getItem('auctionUserId');
      if (prev && String(prev) !== String(selectedUser.id)) {
        userSelect.value = prev;
        userId = prev;
      } else {
        userSelect.selectedIndex = 0;
        userId = userSelect.value;
      }
      localStorage.setItem('auctionUserId', userId);
      updateAdminButton();
      updateFooterContent();
      renderBidHistory();
    });
    return;
  }
  localStorage.setItem('auctionUserId', userId);
  updateAdminButton();
  updateFooterContent();
  renderBidHistory();
};

function showAdmin2FAModal(onSuccess, onCancel) {
  if (document.getElementById('admin2faBlur')) return;
  const blur = document.createElement('div');
  blur.className = 'admin-modal-blur';
  blur.id = 'admin2faBlur';
  blur.innerHTML = `
    <div class="admin-modal" style="max-width:320px;width:95vw;padding:1.2em 1.1em 1.1em 1.1em;position:relative;">
      <button class="admin-modal-close" title="Close" style="position:absolute;top:0.5em;right:0.5em;font-size:1.2em;width:1.8em;height:1.8em;line-height:1.2em;padding:0;border:none;background:transparent;color:#bfc9d1;cursor:pointer;">&times;</button>
      <h2 style="font-size:1.18em;margin-bottom:0.7em;">Admin Verification</h2>
      <div class="admin-modal-error" id="admin2faError" style="margin-bottom:0.5em;"></div>
      <div id="admin2faCells" style="display:flex;gap:0.35em;justify-content:center;margin-bottom:0.9em;">
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
        <input class="admin2fa-cell" type="text" inputmode="numeric" maxlength="1" pattern="\\d" autocomplete="one-time-code" style="width:2.1em;height:2.1em;font-size:1.15em;" />
      </div>
      <div style="color:#bfc9d1;font-size:0.95em;margin-bottom:0.8em;">Default code is <b>000000</b></div>
      <button id="admin2faSubmit" style="width:100%;padding:0.5em 0;font-size:1em;">Verify</button>
    </div>
  `;
  document.body.appendChild(blur);
  const cells = Array.from(blur.querySelectorAll('.admin2fa-cell'));
  const error = document.getElementById('admin2faError');
  const closeBtn = blur.querySelector('.admin-modal-close');
  const submitBtn = document.getElementById('admin2faSubmit');
  function closeModal() {
    blur.remove();
    if (onCancel) onCancel();
  }
  closeBtn.onclick = closeModal;
  blur.onclick = (e) => {
    if (e.target === blur) closeModal();
  };
  function getCode() {
    return cells.map((cell) => cell.value.trim()).join('');
  }
  function verify() {
    const val = getCode();
    if (!/^\d{6}$/.test(val)) {
      error.textContent = 'Enter a valid 6-digit code.';
      cells[0].focus();
      return;
    }
    if (val !== '000000') {
      error.textContent = 'Incorrect code.';
      cells.forEach((cell) => (cell.value = ''));
      cells[0].focus();
      return;
    }
    blur.remove();
    if (onSuccess) onSuccess();
  }
  submitBtn.onclick = verify;
  cells.forEach((cell, idx) => {
    cell.addEventListener('input', (e) => {
      const v = e.target.value;
      if (!/\d/.test(v)) {
        e.target.value = '';
        return;
      }
      if (v && idx < 5) {
        cells[idx + 1].focus();
      }
    });
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !cell.value && idx > 0) {
        cells[idx - 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        verify();
      }
    });
  });
  setTimeout(() => cells[0].focus(), 100);
}

function updateAdminButton() {
  const adminBar = document.getElementById('adminBtnBar');
  if (!adminBar) return;
  adminBar.innerHTML = '';
  const selectedAuction = (auctions || []).find((a) => a.id == auctionId);
  const isEnded = selectedAuction && selectedAuction.status === 'ENDED';
  const selectedUser = users.find((u) => String(u.id) === String(userSelect.value));
  if (selectedUser && selectedUser.role === 'ADMIN') {
    // Add button
    const addBtn = document.createElement('button');
    addBtn.id = 'addAuctionBtn';
    addBtn.className = 'admin-btn admin-capsule';
    addBtn.title = 'Add Auction';
    addBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:0.3em;"><path d="M12 5v14m7-7H5" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Add';
    addBtn.onclick = function () {
      showAddAuctionModal();
    };
    adminBar.appendChild(addBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.id = 'deleteAuctionBtn';
    delBtn.className = 'admin-btn admin-capsule';
    delBtn.title = 'Delete Auction';
    delBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:0.3em;"><path d="M6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19V7H6V19ZM19 4H15.5L14.79 3.29C14.6134 3.1134 14.3528 3 14.08 3H9.92C9.64721 3 9.38662 3.1134 9.21 3.29L8.5 4H5C4.44772 4 4 4.44772 4 5V6C4 6.55228 4.44772 7 5 7H19C19.5523 7 20 6.55228 20 6V5C20 4.44772 19.5523 4 19 4Z" fill="#ff6f3c"/></svg>Delete';
    delBtn.onclick = function () {
      if (!auctionId) return;
      if (
        !confirm(
          'Are you sure you want to delete this auction? This cannot be undone.',
        )
      )
        return;
      fetch(`http://localhost:3000/auctions/${auctionId}`, {
        method: 'DELETE',
        headers: { 'x-api-key': 'my-secret-api-key' },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to delete auction');
          return res.json();
        })
        .then(() => {
          return fetch('http://localhost:3000/auctions', {
            headers: { 'x-api-key': 'my-secret-api-key' },
          });
        })
        .then((res) => res.json())
        .then((data) => {
          auctions = data;
          if (!auctions.some((a) => a.id == auctionId)) {
            auctionId = auctions[0]?.id;
          }
          localStorage.setItem('auctionAuctionId', auctionId);
          renderAuctionList();
          initSocket();
          updateAuctionTimer();
          updateAdminButton();
        })
        .catch((err) => {
          alert('Error deleting auction');
        });
    };
    adminBar.appendChild(delBtn);

    // End button
    const endBtn = document.createElement('button');
    endBtn.id = 'endAuctionBtn';
    endBtn.className = 'admin-btn admin-capsule';
    endBtn.title = 'End Auction';
    endBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:0.3em;"><circle cx="12" cy="12" r="10" stroke="#ff6f3c" stroke-width="2" fill="none"/><rect x="8" y="8" width="8" height="8" rx="2" fill="#ff6f3c"/></svg>End';
    endBtn.style.display = isEnded ? 'none' : '';
    endBtn.onclick = function () {
      if (!auctionId) return;
      if (
        !confirm(
          'Are you sure you want to end this auction? This cannot be undone.',
        )
      )
        return;
      if (socket && auctionId && !endBtn.disabled) {
        socket.emit('auctionEnd', { auctionId: Number(auctionId) });
      }
    };
    adminBar.appendChild(endBtn);
  }
}

function showAddAuctionModal() {
  if (document.getElementById('modalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalOverlay';
  overlay.innerHTML = `
          <div class="modal">
            <button class="modal-close" title="Close">&times;</button>
            <h2>Add Auction</h2>
            <form id="addAuctionForm">
              <label for="carIdInput">Car Name</label>
              <input id="carIdInput" name="carId" type="text" required placeholder="Enter car name" />
              <label for="startingBidInput" style="margin-top:1em;">Starting Bid ($)</label>
              <input id="startingBidInput" name="startingBid" type="number" min="0" required placeholder="Enter starting bid" style="margin-bottom:1em;" />
              <div class="modal-actions">
                <button type="submit" class="admin-btn" style="font-weight:700;">Add</button>
              </div>
            </form>
          </div>
        `;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  const form = overlay.querySelector('#addAuctionForm');
  form.onsubmit = function (e) {
    e.preventDefault();
    const carId = form.carId.value.trim();
    const startingBid = parseInt(form.startingBid.value, 10);
    if (!carId || isNaN(startingBid)) return;

    fetch('http://localhost:3000/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'my-secret-api-key',
      },
      body: JSON.stringify({ carId, startingBid }),
    })
      .then((res) => res.json())
      .then((data) => {
        closeModal();

        return fetch('http://localhost:3000/auctions', {
          headers: { 'x-api-key': 'my-secret-api-key' },
        });
      })
      .then((res) => res.json())
      .then((data) => {
        auctions = data;
        renderAuctionList();
        updateAdminButton();
      })
      .catch((err) => {
        alert('Error adding auction');
        closeModal();
      });
  };
  function closeModal() {
    overlay.remove();
  }
}
