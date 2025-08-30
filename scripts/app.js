/*
 * LoveConnect main script
 * Handles navigation, data storage, form submissions, games, chat and interactive features.
 */

document.addEventListener('DOMContentLoaded', () => {
  try {
  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  /* Data persistence using localStorage */
  // Add profile info (names and photos) to default data
  const defaultData = {
    events: [],
    messages: [],
    memories: [],
    tasks: [],
    bucketList: [],
    profile: { myName: '', partnerName: '', myPhoto: null, partnerPhoto: null, startDate: null }
  };
  let data = loadData();

  function loadData() {
    try {
      const stored = localStorage.getItem('loveconnectData');
      const obj = stored ? JSON.parse(stored) : { ...defaultData };
      // Ensure profile exists to prevent undefined errors when new properties are added in future updates
      if (!obj.profile) obj.profile = { myName: '', partnerName: '', myPhoto: null, partnerPhoto: null, startDate: null };
      // Ensure startDate exists in profile
      if (obj.profile && typeof obj.profile.startDate === 'undefined') {
        obj.profile.startDate = null;
      }
      // Ensure messages have pinned flag
      if (Array.isArray(obj.messages)) {
        obj.messages.forEach(m => {
          if (typeof m.pinned === 'undefined') m.pinned = false;
        });
      }
      // Ensure memories have tags array
      if (Array.isArray(obj.memories)) {
        obj.memories.forEach(m => {
          if (!Array.isArray(m.tags)) m.tags = [];
        });
      }
      // Ensure bucketList exists
      if (!Array.isArray(obj.bucketList)) obj.bucketList = [];
      return obj;
    } catch (e) {
      console.warn('Failed to parse stored data', e);
      return { ...defaultData };
    }
  }

  function saveData() {
    localStorage.setItem('loveconnectData', JSON.stringify(data));
  }

  /* Navigation */
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  function showSection(sectionId) {
    sections.forEach(sec => {
      sec.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
    // Close sidebar on small screens
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  }

  // Navigation via hash – update visible section on hash change
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    showSection(hash);
  }
  window.addEventListener('hashchange', handleHash);
  handleHash();

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  /* Theme toggle */
  const themeToggle = document.getElementById('themeToggle');
  // Load saved theme
  const savedTheme = localStorage.getItem('loveconnectTheme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  }
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('loveconnectTheme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });

  /* Notification permission */
  if ('Notification' in window && localStorage.getItem('loveconnectNotifyPermission') !== 'denied') {
    Notification.requestPermission().then(permission => {
      localStorage.setItem('loveconnectNotifyPermission', permission);
    });
  }

  /* Internationalization */
  const langToggle = document.getElementById('langToggle');
  let currentLang = localStorage.getItem('loveconnectLang') || 'en';
  if (langToggle) {
    langToggle.value = currentLang;
    langToggle.addEventListener('change', () => {
      currentLang = langToggle.value;
      localStorage.setItem('loveconnectLang', currentLang);
      renderDailyPrompt();
    });
  }

  // Daily prompts in English and German
  const dailyPrompts = {
    en: [
      'What made you smile today?',
      'Describe a moment when you felt really loved by your partner.',
      'What is something new you would like to try together?',
      'Share a song that reminds you of your partner.',
      'What small act of kindness did your partner do recently that you appreciated?' ,
      'What is a quality of your partner that you admire the most?',
      'Describe your ideal date night.',
      'If you could travel anywhere together, where would it be?',
      'What do you appreciate about your relationship?',
      'What goal do you want to achieve together this month?'
    ],
    de: [
      'Was hat dich heute zum Lächeln gebracht?',
      'Beschreibe einen Moment, in dem du dich von deinem Partner wirklich geliebt gefühlt hast.',
      'Was würdet ihr gerne Neues zusammen ausprobieren?',
      'Teile einen Song, der dich an deinen Partner erinnert.',
      'Welche kleine Aufmerksamkeit deines Partners hast du kürzlich geschätzt?',
      'Welche Eigenschaft deines Partners bewunderst du am meisten?',
      'Beschreibe dein ideales Date.',
      'Wenn ihr zusammen reisen könntet, wohin würde es gehen?',
      'Was schätzt du an eurer Beziehung?',
      'Welches Ziel möchtet ihr diesen Monat gemeinsam erreichen?'
    ]
  };

  const dailyPromptContainer = document.getElementById('dailyPrompt');

  function renderDailyPrompt() {
    if (!dailyPromptContainer) return;
    const prompts = dailyPrompts[currentLang] || dailyPrompts.en;
    const now = new Date();
    // compute day-of-year index
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const prompt = prompts[dayOfYear % prompts.length];
    dailyPromptContainer.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.className = 'prompt-text';
    textSpan.textContent = prompt;
    dailyPromptContainer.appendChild(textSpan);
    const btn = document.createElement('button');
    btn.textContent = currentLang === 'de' ? 'Diskutieren' : 'Discuss';
    btn.addEventListener('click', () => {
      // Send the prompt as a message and navigate to chat
      sendMessage(prompt, 'sent');
      simulateReply();
      window.location.hash = '#chat';
    });
    dailyPromptContainer.appendChild(btn);
  }

  /* Dashboard update */
  function updateDashboard() {
    document.getElementById('eventsCount').textContent = data.events.length;
    document.getElementById('messagesCount').textContent = data.messages.length;
    document.getElementById('memoriesCount').textContent = data.memories.length;
    document.getElementById('tasksCount').textContent = data.tasks.length;
    // Compute upcoming reminders: tasks due within next 24h or overdue and not completed
    let dueSoonCount = 0;
    const now = new Date();
    data.tasks.forEach(task => {
      if (task.completed) return;
      if (task.due) {
        const dueDate = new Date(task.due);
        if (dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
          dueSoonCount++;
        }
      }
    });
    const remEl = document.getElementById('remindersCount');
    if (remEl) remEl.textContent = dueSoonCount;
  }

  /* Calendar logic */
  const calendarForm = document.getElementById('calendarForm');
  const eventsList = document.getElementById('eventsList');
  const eventFilter = document.getElementById('eventFilter');

  calendarForm.addEventListener('submit', e => {
    e.preventDefault();
    const date = document.getElementById('eventDate').value;
    const category = document.getElementById('eventCategory').value;
    const title = document.getElementById('eventTitle').value.trim();
    if (!date || !title) return;
    const id = Date.now();
    data.events.push({ id, date, category, title });
    saveData();
    renderEvents();
    renderCalendarGrid();
    updateDashboard();
    // reset form
    calendarForm.reset();
  });

  function renderEvents() {
    // Filter by selected category
    const filter = eventFilter ? eventFilter.value : '';
    let eventsToRender = [...data.events];
    if (filter) {
      eventsToRender = eventsToRender.filter(e => e.category === filter);
    }
    // Sort events by date ascending
    const sorted = eventsToRender.sort((a, b) => a.date.localeCompare(b.date));
    eventsList.innerHTML = '';
    if (sorted.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = currentLang === 'de' ? 'Keine Ereignisse' : 'No events yet';
      empty.style.fontStyle = 'italic';
      empty.style.color = 'var(--color-text)';
      eventsList.appendChild(empty);
      return;
    }
    sorted.forEach(event => {
      const li = document.createElement('li');
      li.style.borderLeftColor = getCategoryColour(event.category);
      // Display category name for clarity
      const categoryLabel = document.createElement('strong');
      categoryLabel.textContent = event.date;
      li.appendChild(categoryLabel);
      const span = document.createElement('span');
      span.textContent = ' ' + event.title;
      li.appendChild(span);
      // Add delete button
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.title = 'Delete event';
      btn.addEventListener('click', () => {
        data.events = data.events.filter(e => e.id !== event.id);
        saveData();
        renderEvents();
        renderCalendarGrid();
        updateDashboard();
      });
      li.appendChild(btn);
      eventsList.appendChild(li);
    });
  }

  // Update events when filter changes
  if (eventFilter) {
    eventFilter.addEventListener('change', () => {
      renderEvents();
    });
  }

  /* Enhanced calendar grid rendering */
  const calendarControls = document.getElementById('calendarControls');
  const calendarMonthLabel = document.getElementById('calendarMonth');
  const calendarGrid = document.getElementById('calendarGrid');
  const dayDetails = document.getElementById('dayDetails');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let selectedDate = null;

  function renderCalendarGrid() {
    if (!calendarGrid) return;
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayIndex = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    calendarGrid.innerHTML = '';
    // Update month label
    const monthName = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (calendarMonthLabel) calendarMonthLabel.textContent = monthName;
    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.classList.add('day');
      let dayNum;
      let dateObj;
      if (i < startDayIndex) {
        dayNum = daysInPrevMonth - (startDayIndex - i - 1);
        cell.classList.add('other-month');
        dateObj = new Date(currentYear, currentMonth - 1, dayNum);
      } else if (i >= startDayIndex + daysInMonth) {
        dayNum = i - (startDayIndex + daysInMonth) + 1;
        cell.classList.add('other-month');
        dateObj = new Date(currentYear, currentMonth + 1, dayNum);
      } else {
        dayNum = i - startDayIndex + 1;
        dateObj = new Date(currentYear, currentMonth, dayNum);
      }
      cell.textContent = dayNum;
      const dateStr = dateObj.toISOString().slice(0, 10);
      if (data.events.some(ev => ev.date === dateStr)) {
        cell.classList.add('has-event');
      }
      cell.addEventListener('click', () => {
        selectedDate = dateStr;
        showDayDetails(dateStr);
      });
      calendarGrid.appendChild(cell);
    }
  }

  function showDayDetails(dateStr) {
    if (!dayDetails) return;
    dayDetails.innerHTML = '';
    const dateObj = new Date(dateStr);
    const heading = document.createElement('h3');
    heading.textContent = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    dayDetails.appendChild(heading);
    const eventsForDay = data.events.filter(ev => ev.date === dateStr);
    if (eventsForDay.length > 0) {
      const list = document.createElement('ul');
      eventsForDay.forEach(ev => {
        const li = document.createElement('li');
        li.style.borderLeftColor = getCategoryColour(ev.category);
        const span = document.createElement('span');
        span.textContent = ev.title;
        li.appendChild(span);
        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.title = 'Delete';
        delBtn.addEventListener('click', () => {
          data.events = data.events.filter(e => e.id !== ev.id);
          saveData();
          renderEvents();
          renderCalendarGrid();
          showDayDetails(dateStr);
          updateDashboard();
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      });
      dayDetails.appendChild(list);
    }
    // Add event form for this day
    const form = document.createElement('form');
    form.classList.add('form-inline');
    form.innerHTML = `
      <select id="dayEventCategory">
        <option value="green">Happy</option>
        <option value="red">Challenge</option>
        <option value="blue">Future</option>
        <option value="pink">Special</option>
        <option value="purple">Private</option>
      </select>
      <input type="text" id="dayEventTitle" placeholder="Add event or note" required />
      <button type="submit">Add</button>
    `;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const cat = form.querySelector('#dayEventCategory').value;
      const title = form.querySelector('#dayEventTitle').value.trim();
      if (!title) return;
      const id = Date.now();
      data.events.push({ id, date: dateStr, category: cat, title });
      saveData();
      renderEvents();
      renderCalendarGrid();
      showDayDetails(dateStr);
      updateDashboard();
      form.reset();
    });
    dayDetails.appendChild(form);
  }

  // Month navigation
  if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendarGrid();
    });
    nextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendarGrid();
    });
  }

  // Calendar import/export
  const exportCalendarBtn = document.getElementById('exportCalendar');
  const importFileInput = document.getElementById('importFile');
  if (exportCalendarBtn) {
    exportCalendarBtn.addEventListener('click', () => {
      if (!data.events || data.events.length === 0) {
        alert(currentLang === 'de' ? 'Keine Ereignisse zum Exportieren' : 'No events to export');
        return;
      }
      let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
      data.events.forEach(ev => {
        const dt = new Date(ev.date);
        // Format date as YYYYMMDD
        const dateStr = dt.toISOString().slice(0,10).replace(/-/g, '');
        ics += 'BEGIN:VEVENT\n';
        ics += 'UID:' + ev.id + '@loveconnect\n';
        ics += 'DTSTART;VALUE=DATE:' + dateStr + '\n';
        ics += 'SUMMARY:' + (ev.title || '') + '\n';
        ics += 'CATEGORIES:' + (ev.category || '') + '\n';
        ics += 'END:VEVENT\n';
      });
      ics += 'END:VCALENDAR';
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loveconnect-events.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  if (importFileInput) {
    importFileInput.addEventListener('change', () => {
      const file = importFileInput.files && importFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function() {
        const text = reader.result;
        try {
          const lines = text.split(/\r?\n/);
          let currentEvent = null;
          lines.forEach(line => {
            if (line.startsWith('BEGIN:VEVENT')) {
              currentEvent = {};
            } else if (line.startsWith('END:VEVENT')) {
              if (currentEvent && currentEvent.date && currentEvent.title) {
                const id = Date.now() + Math.floor(Math.random()*1000);
                data.events.push({ id, date: currentEvent.date, category: currentEvent.category || 'pink', title: currentEvent.title });
              }
              currentEvent = null;
            } else if (currentEvent) {
              if (line.startsWith('DTSTART')) {
                const parts = line.split(':');
                const dateStr = parts[1].trim();
                // If date is basic format, convert to YYYY-MM-DD
                if (/^\d{8}$/.test(dateStr)) {
                  currentEvent.date = dateStr.slice(0,4)+'-'+dateStr.slice(4,6)+'-'+dateStr.slice(6,8);
                }
              } else if (line.startsWith('SUMMARY:')) {
                currentEvent.title = line.substring(8).trim();
              } else if (line.startsWith('CATEGORIES:')) {
                currentEvent.category = line.substring(11).trim();
              }
            }
          });
          saveData();
          renderEvents();
          renderCalendarGrid();
          updateDashboard();
          alert(currentLang === 'de' ? 'Import abgeschlossen' : 'Import completed');
        } catch (err) {
          alert(currentLang === 'de' ? 'Import fehlgeschlagen' : 'Import failed');
        }
        importFileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  function getCategoryColour(cat) {
    switch (cat) {
      case 'green': return 'var(--color-green)';
      case 'red': return 'var(--color-red)';
      case 'blue': return 'var(--color-blue)';
      case 'pink': return 'var(--color-pink)';
      case 'purple': return 'var(--color-purple)';
      default: return 'var(--color-accent)';
    }
  }

  /* Chat logic */
  const chatWindow = document.getElementById('chatWindow');
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('sendButton');
  const stickerButton = document.getElementById('stickerButton');
  const stickerPicker = document.getElementById('stickerPicker');
  const attachmentInput = document.getElementById('chatAttachment');
  const chatSearchInput = document.getElementById('chatSearch');
  const recordButton = document.getElementById('recordButton');
  const typingIndicator = document.createElement('p');
  typingIndicator.textContent = 'Partner is typing…';
  typingIndicator.style.fontStyle = 'italic';
  typingIndicator.style.margin = '0.5rem';

  // Voice note recording state
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // Predefined replies and stickers
  const automatedReplies = [
    'I love you! ❤️',
    'Miss you so much!',
    'Can’t wait to see you!',
    'You mean the world to me 😘',
    'Thinking about you 💭'
  ];
  const stickers = ['❤️','😍','😘','🥰','💖','💞','🌹','🎶','😻','💌'];

  function renderMessages() {
    // Clear containers
    chatWindow.innerHTML = '';
    const pinnedContainer = document.getElementById('pinnedMessages');
    if (pinnedContainer) pinnedContainer.innerHTML = '';
    // Filter messages by search query
    const query = chatSearchInput ? chatSearchInput.value.trim().toLowerCase() : '';
    const filtered = data.messages.filter(msg => {
      if (query) {
        const text = msg.text ? msg.text.toLowerCase() : '';
        // Search only in text for simplicity
        return text.includes(query);
      }
      return true;
    });
    // Separate pinned
    const pinnedMessages = filtered.filter(m => m.pinned);
    const normalMessages = filtered.filter(m => !m.pinned);
    // Render pinned messages in a separate container
    if (pinnedContainer) {
      pinnedMessages.forEach(msg => {
        const pmDiv = document.createElement('div');
        pmDiv.className = 'pinned-message';
        pmDiv.textContent = msg.text || (msg.audio ? '[Voice Note]' : '[Image]');
        // unpin button
        const unpin = document.createElement('button');
        unpin.className = 'unpin';
        unpin.textContent = '✕';
        unpin.title = currentLang === 'de' ? 'Lösen' : 'Unpin';
        unpin.addEventListener('click', () => {
          msg.pinned = false;
          saveData();
          renderMessages();
        });
        pmDiv.appendChild(unpin);
        pinnedContainer.appendChild(pmDiv);
      });
    }
    // Render normal messages
    normalMessages.forEach(msg => {
      const div = document.createElement('div');
      div.classList.add('chat-message', msg.sender);
      // Name label
      const nameLabel = document.createElement('small');
      nameLabel.classList.add('message-name');
      nameLabel.textContent = msg.sender === 'sent'
        ? (data.profile && data.profile.myName ? data.profile.myName : (currentLang === 'de' ? 'Du' : 'You'))
        : (data.profile && data.profile.partnerName ? data.profile.partnerName : (currentLang === 'de' ? 'Partner' : 'Partner'));
      div.appendChild(nameLabel);
      // Text
      if (msg.text) {
        const textSpan = document.createElement('span');
        textSpan.textContent = msg.text;
        div.appendChild(textSpan);
      }
      // Image attachment
      if (msg.image) {
        const img = document.createElement('img');
        img.src = msg.image;
        img.alt = 'Image';
        div.appendChild(img);
      }
      // Audio attachment
      if (msg.audio) {
        const audioEl = document.createElement('audio');
        audioEl.controls = true;
        audioEl.src = msg.audio;
        audioEl.style.display = 'block';
        audioEl.style.marginTop = '4px';
        div.appendChild(audioEl);
      }
      // Timestamp with status
      if (msg.timestamp) {
        const time = document.createElement('small');
        const dt = new Date(msg.timestamp);
        time.classList.add('message-time');
        let statusSymbols = '';
        if (msg.sender === 'sent') {
          if (msg.status === 'read') {
            statusSymbols = ' ✓✓';
          } else {
            statusSymbols = ' ✓';
          }
        }
        time.textContent = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + statusSymbols;
        div.appendChild(time);
      }
      // Pin button
      const pinBtn = document.createElement('button');
      pinBtn.classList.add('delete-message');
      pinBtn.textContent = msg.pinned ? '★' : '☆';
      pinBtn.title = msg.pinned ? (currentLang === 'de' ? 'Lösen' : 'Unpin') : (currentLang === 'de' ? 'Anheften' : 'Pin');
      pinBtn.addEventListener('click', () => {
        msg.pinned = !msg.pinned;
        saveData();
        renderMessages();
      });
      div.appendChild(pinBtn);
      // Delete button
      const del = document.createElement('button');
      del.textContent = '✕';
      del.title = currentLang === 'de' ? 'Löschen' : 'Delete message';
      del.classList.add('delete-message');
      del.addEventListener('click', () => {
        data.messages = data.messages.filter(m => m.id !== msg.id);
        saveData();
        renderMessages();
        updateDashboard();
      });
      div.appendChild(del);
      chatWindow.appendChild(div);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function sendMessage(text = '', sender = 'sent', image = null, audio = null) {
    if (!text && !image && !audio) return;
    const id = Date.now();
    const timestamp = new Date().toISOString();
    const status = sender === 'sent' ? 'sent' : undefined;
    const messageObj = { id, sender, timestamp, pinned: false };
    if (text) messageObj.text = text;
    if (image) messageObj.image = image;
    if (audio) messageObj.audio = audio;
    if (status) messageObj.status = status;
    data.messages.push(messageObj);
    saveData();
    renderMessages();
    updateDashboard();
  }

  sendButton.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (!text) return;
    sendMessage(text, 'sent');
    chatInput.value = '';
    // Simulate partner reply
    simulateReply();
  });

  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendButton.click();
    }
  });

  // Attachment input listener
  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      const file = attachmentInput.files && attachmentInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function() {
        const imageData = reader.result;
        // Send message with image (no text)
        sendMessage('', 'sent', imageData);
        // Clear file input so same file can be selected again
        attachmentInput.value = '';
        // partner replies
        simulateReply();
      };
      reader.readAsDataURL(file);
    });
  }

  function simulateReply() {
    // show typing indicator
    chatWindow.appendChild(typingIndicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    const delay = Math.random() * 2000 + 1000;
    setTimeout(() => {
      if (typingIndicator.parentNode) typingIndicator.parentNode.removeChild(typingIndicator);
      const reply = automatedReplies[Math.floor(Math.random() * automatedReplies.length)];
      sendMessage(reply, 'received');
      // Mark last sent message as read
      for (let i = data.messages.length - 1; i >= 0; i--) {
        const msg = data.messages[i];
        if (msg.sender === 'sent' && msg.status === 'sent') {
          msg.status = 'read';
          break;
        }
      }
      saveData();
      renderMessages();
    }, delay);
  }

  // Stickers
  stickerButton.addEventListener('click', () => {
    stickerPicker.classList.toggle('hidden');
    if (!stickerPicker.classList.contains('hidden')) {
      populateStickers();
    }
  });

  // Chat search listener
  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', () => {
      renderMessages();
    });
  }

  // Voice note recording logic
  if (recordButton) {
    recordButton.addEventListener('click', () => {
      if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];
          mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
          };
          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = function() {
              const audioData = reader.result;
              sendMessage('', 'sent', null, audioData);
              simulateReply();
            };
            reader.readAsDataURL(blob);
          };
          mediaRecorder.start();
          recordButton.textContent = '⏹️';
          isRecording = true;
        }).catch(err => {
          alert(currentLang === 'de' ? 'Mikrofonzugriff verweigert' : 'Microphone access denied');
        });
      } else {
        if (mediaRecorder) {
          mediaRecorder.stop();
        }
        recordButton.textContent = '🎤';
        isRecording = false;
      }
    });
  }

  function populateStickers() {
    stickerPicker.innerHTML = '';
    stickers.forEach(sticker => {
      const btn = document.createElement('button');
      btn.textContent = sticker;
      btn.addEventListener('click', () => {
        sendMessage(sticker, 'sent');
        stickerPicker.classList.add('hidden');
        // partner replies to sticker
        simulateReply();
      });
      stickerPicker.appendChild(btn);
    });
  }

  /* Memories logic */
  const memoryForm = document.getElementById('memoryForm');
  const memoryFile = document.getElementById('memoryFile');
  const memoryText = document.getElementById('memoryText');
  const memoriesTimeline = document.getElementById('memoriesTimeline');
  const memorySearch = document.getElementById('memorySearch');

  memoryForm.addEventListener('submit', e => {
    e.preventDefault();
    const file = memoryFile.files[0];
    const note = memoryText.value.trim();
    // Tags processing
    const tagsInput = document.getElementById('memoryTags');
    let tags = [];
    if (tagsInput && tagsInput.value.trim() !== '') {
      tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    }
    const id = Date.now();
    const timestamp = new Date().toISOString();
    // handle file asynchronously
    if (file) {
      const reader = new FileReader();
      reader.onload = function() {
        const imageData = reader.result || '';
        data.memories.push({ id, image: imageData, text: note, timestamp, tags });
        saveData();
        renderMemories();
        updateDashboard();
      };
      reader.readAsDataURL(file);
    } else {
      data.memories.push({ id, image: null, text: note, timestamp, tags });
      saveData();
      renderMemories();
      updateDashboard();
    }
    memoryForm.reset();
  });

  function renderMemories() {
    memoriesTimeline.innerHTML = '';
    // Apply search filter if available
    const query = memorySearch ? memorySearch.value.trim().toLowerCase() : '';
    let memoriesToRender = [...data.memories];
    if (query) {
      memoriesToRender = memoriesToRender.filter(mem => {
        const text = mem.text ? mem.text.toLowerCase() : '';
        const tagsStr = Array.isArray(mem.tags) ? mem.tags.join(' ').toLowerCase() : '';
        return text.includes(query) || tagsStr.includes(query);
      });
    }
    const sorted = memoriesToRender.sort((a, b) => b.id - a.id);
    if (sorted.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.textContent = currentLang === 'de' ? 'Noch keine Erinnerungen' : 'No memories yet';
      emptyDiv.style.fontStyle = 'italic';
      emptyDiv.style.color = 'var(--color-text)';
      memoriesTimeline.appendChild(emptyDiv);
      return;
    }
    sorted.forEach(mem => {
      const div = document.createElement('div');
      div.classList.add('memory-item');
      if (mem.image) {
        const img = document.createElement('img');
        img.src = mem.image;
        img.alt = 'Memory photo';
        img.loading = 'lazy';
        // When clicked, open lightbox
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          openLightbox(mem.image);
        });
        div.appendChild(img);
      }
      if (mem.text) {
        const p = document.createElement('p');
        p.textContent = mem.text;
        div.appendChild(p);
      }
      // Tags
      if (Array.isArray(mem.tags) && mem.tags.length > 0) {
        const tagSpan = document.createElement('small');
        tagSpan.style.display = 'block';
        tagSpan.style.fontSize = '0.7rem';
        tagSpan.style.color = 'var(--color-blue)';
        tagSpan.textContent = mem.tags.map(t => '#' + t).join(' ');
        div.appendChild(tagSpan);
      }
      const small = document.createElement('small');
      const date = new Date(mem.timestamp);
      small.textContent = date.toLocaleString();
      div.appendChild(small);
      // delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.background = 'none';
      delBtn.style.border = 'none';
      delBtn.style.color = 'var(--color-red)';
      delBtn.style.float = 'right';
      delBtn.addEventListener('click', () => {
        data.memories = data.memories.filter(m => m.id !== mem.id);
        saveData();
        renderMemories();
        updateDashboard();
      });
      div.appendChild(delBtn);

      // Share button for Web Share API
      if (navigator.share) {
        const shareBtn = document.createElement('button');
        shareBtn.textContent = '📤';
        shareBtn.title = currentLang === 'de' ? 'Teilen' : 'Share';
        shareBtn.style.background = 'none';
        shareBtn.style.border = 'none';
        shareBtn.style.color = 'var(--color-blue)';
        shareBtn.style.float = 'right';
        shareBtn.style.marginRight = '1.5rem';
        shareBtn.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          try {
            const shareData = {
              title: 'LoveConnect Memory',
              text: mem.text || ''
            };
            await navigator.share(shareData);
          } catch (err) {
            console.warn('Share cancelled', err);
          }
        });
        div.appendChild(shareBtn);
      }
      memoriesTimeline.appendChild(div);
    });
  }

  // Memory search listener
  if (memorySearch) {
    memorySearch.addEventListener('input', () => {
      renderMemories();
    });
  }

  /* Games logic */
  const wyrButton = document.getElementById('wyrButton');
  const wyrQuestion = document.getElementById('wyrQuestion');
  const todButton = document.getElementById('todButton');
  const todQuestion = document.getElementById('todQuestion');

  // Example question banks.  You can expand these lists.
  const wouldYouRather = [
    'travel the world together or build your dream home?',
    'have a romantic dinner on the beach or a cosy cabin getaway?',
    're‑watch your favourite movie or discover a new book together?',
    'plan your future for hours or live spontaneously for a day?',
    'cook dinner together or order takeout and cuddle?' 
  ];
  const truthOrDare = [
    'Truth: What first attracted you to your partner?',
    'Dare: Send a voice note telling them how much you miss them.',
    'Truth: Describe your favourite memory of your relationship.',
    'Dare: Plan a surprise virtual date for your partner.',
    'Truth: What habit of your partner do you secretly adore?' 
  ];

  function newWYR() {
    const q = wouldYouRather[Math.floor(Math.random() * wouldYouRather.length)];
    wyrQuestion.textContent = `Would you rather… ${q}`;
  }
  function newTOD() {
    const q = truthOrDare[Math.floor(Math.random() * truthOrDare.length)];
    todQuestion.textContent = q;
  }
  wyrButton.addEventListener('click', newWYR);
  todButton.addEventListener('click', newTOD);

  /* Planning logic */
  const taskForm = document.getElementById('taskForm');
  const taskList = document.getElementById('taskList');

  /* Bucket list logic */
  const bucketForm = document.getElementById('bucketForm');
  const bucketListEl = document.getElementById('bucketList');

  if (bucketForm && bucketListEl) {
    bucketForm.addEventListener('submit', e => {
      e.preventDefault();
      const item = document.getElementById('bucketItem').value.trim();
      if (!item) return;
      const id = Date.now();
      data.bucketList.push({ id, item });
      saveData();
      renderBucketList();
      bucketForm.reset();
    });
  }

  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const due = document.getElementById('taskDue').value;
    if (!title) return;
    const id = Date.now();
    data.tasks.push({ id, title, due, completed: false });
    saveData();
    renderTasks();
    updateDashboard();
    taskForm.reset();
  });

  function renderTasks() {
    taskList.innerHTML = '';
    const sorted = [...data.tasks].sort((a, b) => {
      if (a.completed === b.completed) {
        return (a.due || '').localeCompare(b.due || '');
      }
      return a.completed ? 1 : -1;
    });
    sorted.forEach(task => {
      const li = document.createElement('li');
      // Determine due soon highlight
      li.style.borderLeftColor = task.completed ? 'var(--color-green)' : 'var(--color-accent)';
      // Remove any existing due-soon class
      li.classList.remove('due-soon');
      if (!task.completed && task.due) {
        const now = new Date();
        const dueDate = new Date(task.due);
        // If due within next 24 hours or overdue
        if (dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
          li.classList.add('due-soon');
          li.style.borderLeftColor = 'var(--color-red)';
        }
      }
      const span = document.createElement('span');
      let dueText = '';
      if (task.due) {
        try {
          const dt = new Date(task.due);
          dueText = ' (due ' + dt.toLocaleString() + ')';
        } catch (e) {
          dueText = ' (due ' + task.due + ')';
        }
      }
      span.textContent = task.title + dueText;
      if (task.completed) {
        span.style.textDecoration = 'line-through';
      }
      li.appendChild(span);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.completed;
      cb.addEventListener('change', () => {
        task.completed = cb.checked;
        saveData();
        renderTasks();
        updateDashboard();
      });
      li.appendChild(cb);
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        data.tasks = data.tasks.filter(t => t.id !== task.id);
        saveData();
        renderTasks();
        updateDashboard();
      });
      li.appendChild(delBtn);
      taskList.appendChild(li);
    });
    if (sorted.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = currentLang === 'de' ? 'Keine Aufgaben' : 'No tasks yet';
      empty.style.fontStyle = 'italic';
      empty.style.color = 'var(--color-text)';
      taskList.appendChild(empty);
    }
  }

  /**
   * Render bucket list items to the planning page
   */
  function renderBucketList() {
    if (!bucketListEl) return;
    bucketListEl.innerHTML = '';
    if (data.bucketList.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = currentLang === 'de' ? 'Noch keine Bucket‑List‑Einträge' : 'No bucket list items yet';
      empty.style.fontStyle = 'italic';
      empty.style.color = 'var(--color-text)';
      bucketListEl.appendChild(empty);
      return;
    }
    data.bucketList.forEach(({ id, item }) => {
      const li = document.createElement('li');
      li.textContent = item;
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        data.bucketList = data.bucketList.filter(b => b.id !== id);
        saveData();
        renderBucketList();
      });
      li.appendChild(delBtn);
      bucketListEl.appendChild(li);
    });
  }

  // Reminder notifications
  const notifiedTaskIds = new Set();
  function checkReminders() {
    if (Notification.permission !== 'granted') return;
    const now = new Date();
    data.tasks.forEach(task => {
      if (task.completed || !task.due) return;
      const dueDate = new Date(task.due);
      const diff = dueDate.getTime() - now.getTime();
      // if due within next hour and not yet notified
      if (diff <= 60 * 60 * 1000 && diff >= 0 && !notifiedTaskIds.has(task.id)) {
        const body = (currentLang === 'de' ? 'Aufgabe fällig: ' : 'Task due: ') + task.title + ' (' + dueDate.toLocaleString() + ')';
        new Notification('LoveConnect', { body });
        notifiedTaskIds.add(task.id);
      }
    });
  }
  setInterval(checkReminders, 60000);

  /* Interactive logic */
  const hugButton = document.getElementById('hugButton');
  const hugAnimation = document.getElementById('hugAnimation');
  const loveMeterButton = document.getElementById('loveMeterButton');
  const loveMeterResult = document.getElementById('loveMeterResult');
  const couponButton = document.getElementById('couponButton');
  const couponResult = document.getElementById('couponResult');

  // Preload audio elements
  const sounds = {
    notification: new Audio('sounds/notification.mp3'),
    kiss: new Audio('sounds/kiss.mp3'),
    hug: new Audio('sounds/hug.mp3')
  };

  hugButton.addEventListener('click', () => {
    playSound('hug');
    // Vibration feedback for hug
    if (navigator.vibrate) {
      navigator.vibrate([150, 50, 150]);
    }
    // generate multiple hearts
    for (let i = 0; i < 6; i++) {
      createHeart(i * 200);
    }
  });

  function createHeart(delay) {
    setTimeout(() => {
      const heart = document.createElement('div');
      heart.className = 'heart';
      heart.style.left = Math.random() * 90 + '%';
      heartAnimationContainer().appendChild(heart);
      setTimeout(() => {
        heart.remove();
      }, 2000);
    }, delay);
  }

  function heartAnimationContainer() {
    return hugAnimation;
  }

  loveMeterButton.addEventListener('click', () => {
    playSound('kiss');
    const value = Math.floor(Math.random() * 101); // 0‑100
    // update progress bar
    const meterBar = document.getElementById('loveMeterBar');
    if (meterBar) {
      meterBar.style.width = value + '%';
    }
    let message;
    if (value > 80) message = `Your love meter is at ${value}% – on fire! 🔥`;
    else if (value > 50) message = `Your love meter is at ${value}% – warm and cosy ✨`;
    else if (value > 20) message = `Your love meter is at ${value}% – keep the sparks going 💖`;
    else message = `Your love meter is at ${value}% – time for some extra love! 💌`;
    loveMeterResult.textContent = message;
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  });

  // Love coupons
  const coupons = [
    'Redeem for a surprise date night 🌙',
    'Good for one long video call 📞',
    'Entitles you to a love letter 💌',
    'Redeem for a movie night 🎬',
    'Good for a heartfelt playlist 🎶'
  ];

  couponButton.addEventListener('click', () => {
    playSound('notification');
    const c = coupons[Math.floor(Math.random() * coupons.length)];
    couponResult.textContent = c;
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  });

  function playSound(name) {
    const sound = sounds[name];
    if (sound) {
      // reset and play
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  /* Profile logic */
  const profileForm = document.getElementById('profileForm');
  const myNameInput = document.getElementById('myName');
  const partnerNameInput = document.getElementById('partnerName');
  const startDateInput = document.getElementById('startDate');
  const myPhotoInput = document.getElementById('myPhoto');
  const partnerPhotoInput = document.getElementById('partnerPhoto');
  const profileDisplay = document.getElementById('profileDisplay');

  function updateGreeting() {
    const greet = document.getElementById('greeting');
    if (greet) {
      if (data.profile && data.profile.myName && data.profile.partnerName) {
        greet.textContent = `Hi ${data.profile.myName} & ${data.profile.partnerName}!`;
      } else {
        greet.textContent = '';
      }
    }

    // Show how long the couple has been together if start date provided
    const rel = document.getElementById('relationshipDays');
    if (rel) {
      if (data.profile && data.profile.startDate) {
        try {
          const start = new Date(data.profile.startDate);
          const nowDate = new Date();
          const diff = nowDate.getTime() - start.getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (currentLang === 'de') {
            rel.textContent = `Seit ${days} Tagen zusammen`;
          } else {
            rel.textContent = `Together for ${days} days`;
          }
        } catch (e) {
          rel.textContent = '';
        }
      } else {
        rel.textContent = '';
      }
    }
  }

  function renderProfile() {
    if (!profileDisplay) return;
    profileDisplay.innerHTML = '';
    const namesProvided = data.profile && (data.profile.myName || data.profile.partnerName);
    if (namesProvided) {
      const namesDiv = document.createElement('div');
      namesDiv.style.display = 'flex';
      namesDiv.style.gap = '1rem';
      namesDiv.style.alignItems = 'center';
      // My profile
      if (data.profile.myName) {
        const me = document.createElement('div');
        me.style.textAlign = 'center';
        if (data.profile.myPhoto) {
          const img = document.createElement('img');
          img.src = data.profile.myPhoto;
          img.alt = data.profile.myName;
          img.style.width = '60px';
          img.style.height = '60px';
          img.style.borderRadius = '50%';
          me.appendChild(img);
        }
        const nameP = document.createElement('p');
        nameP.textContent = data.profile.myName;
        nameP.style.margin = '0.3rem 0';
        me.appendChild(nameP);
        namesDiv.appendChild(me);
      }
      // Partner profile
      if (data.profile.partnerName) {
        const partnerDiv = document.createElement('div');
        partnerDiv.style.textAlign = 'center';
        if (data.profile.partnerPhoto) {
          const img2 = document.createElement('img');
          img2.src = data.profile.partnerPhoto;
          img2.alt = data.profile.partnerName;
          img2.style.width = '60px';
          img2.style.height = '60px';
          img2.style.borderRadius = '50%';
          partnerDiv.appendChild(img2);
        }
        const nameP2 = document.createElement('p');
        nameP2.textContent = data.profile.partnerName;
        nameP2.style.margin = '0.3rem 0';
        partnerDiv.appendChild(nameP2);
        namesDiv.appendChild(partnerDiv);
      }
      profileDisplay.appendChild(namesDiv);
    }
    updateGreeting();
  }

  if (profileForm) {
    profileForm.addEventListener('submit', e => {
      e.preventDefault();
      // Save names
      if (data.profile) {
        data.profile.myName = myNameInput.value.trim();
        data.profile.partnerName = partnerNameInput.value.trim();
        // Save relationship start date if provided
        if (startDateInput && startDateInput.value) {
          data.profile.startDate = startDateInput.value;
        } else {
          data.profile.startDate = null;
        }
      }
      // Handle photos
      const file1 = myPhotoInput && myPhotoInput.files && myPhotoInput.files[0];
      const file2 = partnerPhotoInput && partnerPhotoInput.files && partnerPhotoInput.files[0];
      // Function to read a file and assign to data
      const readFile = (file, key) => {
        return new Promise(resolve => {
          if (!file) {
            resolve();
            return;
          }
          const reader = new FileReader();
          reader.onload = function(evt) {
            data.profile[key] = evt.target.result;
            resolve();
          };
          reader.readAsDataURL(file);
        });
      };
      Promise.all([
        readFile(file1, 'myPhoto'),
        readFile(file2, 'partnerPhoto')
      ]).then(() => {
        saveData();
        renderProfile();
        renderMessages();
        updateDashboard();
        profileForm.reset();
      });
    });
  }

  // Backup/restore actions
  const exportBackupBtn = document.getElementById('exportBackup');
  const importBackupInput = document.getElementById('importBackup');
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(data);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loveconnect-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  if (importBackupInput) {
    importBackupInput.addEventListener('change', () => {
      const file = importBackupInput.files && importBackupInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const obj = JSON.parse(reader.result);
          // basic validation
          if (obj && typeof obj === 'object') {
            data = obj;
            saveData();
            renderEvents();
            renderMessages();
            renderMemories();
            renderTasks();
            renderProfile();
            renderCalendarGrid();
            updateDashboard();
            alert(currentLang === 'de' ? 'Wiederherstellung abgeschlossen' : 'Restore completed');
          }
        } catch (err) {
          alert(currentLang === 'de' ? 'Wiederherstellung fehlgeschlagen' : 'Restore failed');
        }
        importBackupInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  /* Utility */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* Lightbox functionality */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;
  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', e => {
      // close when clicking background
      if (e.target === lightbox) closeLightbox();
    });
  }

  /* Onboarding flow: show only once */
  const onboardingEl = document.getElementById('onboarding');
  const onboardingBtn = document.getElementById('onboardingStart');
  if (onboardingEl && onboardingBtn) {
    const seen = localStorage.getItem('loveconnectOnboardingSeen');
    if (!seen) {
      onboardingEl.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      onboardingBtn.addEventListener('click', () => {
        onboardingEl.classList.add('hidden');
        localStorage.setItem('loveconnectOnboardingSeen', 'true');
        document.body.style.overflow = '';
      });
    }
  }

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd + K opens chat search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const chatLink = document.querySelector('a[data-section="chat"]');
      if (chatLink) {
        chatLink.click();
      }
      if (chatSearchInput) {
        chatSearchInput.focus();
      }
    }
  });

  // Initial render
  renderEvents();
  renderMessages();
  renderMemories();
  renderTasks();
  // Render bucket list items
  if (typeof renderBucketList === 'function') {
    renderBucketList();
  }
  updateDashboard();
  newWYR();
  newTOD();
  // Render profile and calendar grid on load
  if (typeof renderProfile === 'function') {
    renderProfile();
  }
  if (typeof renderCalendarGrid === 'function') {
    renderCalendarGrid();
  }
  // Render daily prompt on load
  if (typeof renderDailyPrompt === 'function') {
    renderDailyPrompt();
  }
  } catch (err) {
    console.error(err);
    const pre = document.createElement('pre');
    pre.textContent = 'Error in LoveConnect script:\n' + (err && err.stack || err);
    pre.style.color = 'red';
    pre.style.whiteSpace = 'pre-wrap';
    document.body.appendChild(pre);
  }
});