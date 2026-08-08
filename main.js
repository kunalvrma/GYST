let CONFIG = null;
        const SUGG_KEY = 'mf_sugg';
        const PATTERN_KEY = 'mf_patterns';
        const API_KEY_STORE = 'mf_api_url';
        const QUEUE_KEY = 'mf_sync_queue';
        const CONFIG_CACHE_KEY = 'mf_config';
        const THEME_KEY = 'mf_theme';
        const HISTORY_KEY = 'mf_history';
        const HUD_VERSION = 'v2.1';
        let API_URL = localStorage.getItem(API_KEY_STORE);
        let initialized = false;
        let isSyncing = false;

        const ICONS = {
            'Income':            'INC',
            'Groceries':         'GRC',
            'Transport':         'TRN',
            'Utilities':         'UTL',
            'Health':            'HLT',
            'Education':         'EDU',
            'Dining & Lifestyle':'DINE',
            'Relationships':     'REL',
            'Vice':              'VCE',
            'Overheads':         'OVH',
            'Investments':       'INV',
            'Escrow / Lending':  'ESC',
            'Transfer (Self)':   'XFR',
            'Adjustment':        'ADJ',
        };

        // Category groups — defines display order, grouping, and color class.
        // Vice is last in Wants (end of a perfect 3-item row). Investments and
        // Overheads are single-item groups — rendered full-width intentionally.
        const BUCKET_GROUPS = [
            { label: 'Survival', cls: 'grp-survival',
              cats: ['Groceries', 'Transport', 'Utilities', 'Health', 'Education'] },
            { label: 'Wants',    cls: 'grp-wants',
              cats: ['Dining & Lifestyle', 'Relationships', 'Vice'] },
            { label: 'Wealth',   cls: 'grp-wealth',
              cats: ['Investments'] },
            { label: 'One-Off',  cls: 'grp-oneoff',
              cats: ['Overheads'] },
            { label: 'Nonspend', cls: 'grp-nonspend',
              cats: ['Income', 'Escrow / Lending', 'Transfer (Self)', 'Adjustment'] },
        ];

        const st = {
            flowVal: null,
            flowCls: null,
            account: null,
            dest: null,
            cat: null,
        };

        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function getQueue() {
            try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
            catch (e) { return []; }
        }

        function saveQueue(q) {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
            updateSyncIndicator();
        }

        function updateSyncIndicator() {
            const q = getQueue();
            const ind = document.getElementById('sync-indicator');
            if (ind) {
                ind.classList.toggle('hidden', q.length === 0);
            }
        }

        async function processQueue() {
            if (isSyncing || !API_URL) return;
            const q = getQueue();
            if (q.length === 0) return;

            isSyncing = true;
            const entry = q[0];

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'submitEntry', data: entry }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                }).then(r => r.json());

                if (res.ok) {
                    const currentQ = getQueue();
                    if (currentQ.length > 0 && currentQ[0].id === entry.id) {
                        currentQ.shift();
                        saveQueue(currentQ);
                    }
                    setTimeout(() => {
                        isSyncing = false;
                        processQueue();
                    }, 500);
                } else {
                    toast('Log failed: ' + res.error, 'err');
                    isSyncing = false;
                }
            } catch (error) {
                toast(`Offline: ${q.length} queued`, 'err');
                isSyncing = false;
            }
        }

        function initTheme() {
            let theme = localStorage.getItem(THEME_KEY);
            if (!theme) {
                theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
            document.documentElement.setAttribute('data-theme', theme);
        }

        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem(THEME_KEY, next);
        }

        function toggleDrawer() {
            const overlay = document.getElementById('drawer-overlay');
            const drawer = document.getElementById('drawer');
            const isOpening = !drawer.classList.contains('open');
            overlay.classList.toggle('open');
            drawer.classList.toggle('open');
            if (isOpening) {
                renderHistory();
                openDrawerPanel('main');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            init();
        });

        async function init() {
            if (!initialized) {
                document.getElementById('connect-btn').addEventListener('click', saveApiUrl);
                document.getElementById('drawer-reset-btn').addEventListener('click', () => { toggleDrawer(); resetApiUrl(); });
                document.getElementById('hamburger-btn').addEventListener('click', toggleDrawer);
                document.getElementById('hamburger-btn-dash').addEventListener('click', toggleDrawer);
                document.getElementById('drawer-overlay').addEventListener('click', toggleDrawer);
                document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
                document.getElementById('sbtn').addEventListener('click', doSubmit);
                document.getElementById('amount').addEventListener('input', renderPatternMatches);
                document.getElementById('nav-log').addEventListener('click', () => switchTab('log'));
                document.getElementById('nav-dashboard').addEventListener('click', () => switchTab('dashboard'));
                document.getElementById('tm-go').addEventListener('click', fetchSnapshot);
                document.getElementById('ds-verify-open').addEventListener('click', toggleVerifyPanel);
                document.getElementById('ds-verify-calc').addEventListener('click', calcGhostMoney);
                // Drawer sub-panels
                document.getElementById('drawer-accounts-btn').addEventListener('click', () => openDrawerPanel('accounts'));
                document.getElementById('drawer-guide-btn').addEventListener('click', () => openDrawerPanel('guide'));
                document.getElementById('drawer-faq-btn').addEventListener('click', () => openDrawerPanel('faq'));
                document.getElementById('drawer-about-btn').addEventListener('click', () => openDrawerPanel('about'));
                document.getElementById('accounts-back-btn').addEventListener('click', () => openDrawerPanel('main'));
                document.getElementById('guide-back-btn').addEventListener('click', () => openDrawerPanel('main'));
                document.getElementById('faq-back-btn').addEventListener('click', () => openDrawerPanel('main'));
                document.getElementById('about-back-btn').addEventListener('click', () => openDrawerPanel('main'));
                document.getElementById('acct-add-btn').addEventListener('click', acctMgrAdd);
                document.getElementById('acct-save-btn').addEventListener('click', acctMgrSave);
                document.getElementById('acct-new-input').addEventListener('keydown', e => { if (e.key === 'Enter') acctMgrAdd(); });
                initialized = true;
            }
            
            updateSyncIndicator();

            if (!API_URL) {
                showSetup();
                return;
            }
            
            processQueue();

            const cached = localStorage.getItem(CONFIG_CACHE_KEY);
            if (cached) {
                try {
                    CONFIG = JSON.parse(cached);
                    renderAppFromConfig();
                } catch (e) {}
            } else {
                showLoading();
            }

            try {
                fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'getConfig' }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                })
                .then(r => r.json())
                .then(res => {
                    if (res.ok && res.data) {
                        // Version check — if server version changed, bust the cache
                        const cachedCfg = CONFIG;
                        const serverVersion = res.data.version;
                        if (cachedCfg && serverVersion && cachedCfg.version !== serverVersion) {
                            localStorage.removeItem(CONFIG_CACHE_KEY);
                        }
                        const newConfigStr = JSON.stringify(res.data);
                        if (newConfigStr !== cached) {
                            CONFIG = res.data;
                            localStorage.setItem(CONFIG_CACHE_KEY, newConfigStr);
                            renderAppFromConfig();
                        }
                    } else if (!cached) {
                        throw new Error(res.error || 'Failed to connect');
                    }
                })
                .catch(err => {
                    if (!cached) {
                        hideLoading();
                        toast(err.message, 'err');
                        showSetup();
                    }
                });
            } catch (err) {
                if (!cached) {
                    hideLoading();
                    toast(err.message, 'err');
                    showSetup();
                }
            }
        }

        function renderAppFromConfig() {
            st.flowVal = st.flowVal || CONFIG.defaults.flow;
            st.flowCls = st.flowCls || CONFIG.defaults.flowCls;
            st.account = st.account || CONFIG.defaults.account || null;
            
            hideLoading();
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('bottom-nav').classList.remove('hidden');
            
            renderFlowButtons();
            renderAccountButtons('acct-grid', setAcct, st.account);
            renderAccountButtons('dest-grid', setDest, st.dest);
            renderCategoryButtons();
            applyFlowState();
        }

        function showSetup() {
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('load-app').classList.add('hidden');
            document.getElementById('setup-app').classList.remove('hidden');
            document.getElementById('api-url-input').value = API_URL || '';
        }

        function showLoading() {
            document.getElementById('setup-app').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('load-app').classList.remove('hidden');
        }

        function hideLoading() {
            document.getElementById('load-app').classList.add('hidden');
        }

        function saveApiUrl() {
            const url = document.getElementById('api-url-input').value.trim();
            if (!url) return;
            API_URL = url;
            localStorage.setItem(API_KEY_STORE, API_URL);
            init();
        }

        function resetApiUrl() {
            const q = getQueue();
            if (q.length > 0) {
                const ok = confirm('You have ' + q.length + ' unsynced entries that will be lost if you disconnect. Continue anyway?');
                if (!ok) return;
            }
            localStorage.removeItem(API_KEY_STORE);
            localStorage.removeItem(CONFIG_CACHE_KEY);
            localStorage.removeItem(QUEUE_KEY);
            API_URL = null;
            updateSyncIndicator();
            showSetup();
        }

        function renderFlowButtons() {
            const grid = document.getElementById('flow-grid');
            grid.innerHTML = '';
            CONFIG.flows.forEach(flow => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fb';
                btn.dataset.value = flow.value;
                btn.dataset.cls = flow.cls;
                btn.textContent = flow.label;
                btn.addEventListener('click', () => setFlow(flow));
                grid.appendChild(btn);
            });
        }

        function renderAccountButtons(gridId, handler, selected) {
            const grid = document.getElementById(gridId);
            grid.innerHTML = '';
            CONFIG.accounts.forEach(account => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ab';
                btn.dataset.value = account;
                btn.textContent = account;
                btn.classList.toggle('on', account === selected);
                btn.addEventListener('click', () => handler(account));
                grid.appendChild(btn);
            });
        }

        function renderCategoryButtons() {
            const grid = document.getElementById('cat-grid');
            grid.innerHTML = '';

            BUCKET_GROUPS.forEach(group => {
                // Outer wrapper: label + button sub-grid
                const wrapper = document.createElement('div');
                wrapper.className = 'cat-grp-wrapper';

                // Vertical label
                const lbl = document.createElement('div');
                lbl.className = `cat-grp-lbl ${group.cls}`;
                lbl.textContent = group.label;
                wrapper.appendChild(lbl);

                // 3-col sub-grid for buttons
                const subGrid = document.createElement('div');
                subGrid.className = 'cat-grp-buttons';

                const count = group.cats.length;
                group.cats.forEach((category, idx) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `cb ${group.cls}`;
                    btn.dataset.value = category;
                    btn.innerHTML = '<span class="i"></span><span></span>';
                    btn.querySelector('.i').textContent = ICONS[category] || '···';
                    btn.querySelector('span:last-child').textContent = category;
                    btn.classList.toggle('on', category === st.cat);
                    btn.addEventListener('click', () => setCat(category));

                    // Span last item to fill incomplete row
                    if (idx === count - 1) {
                        const rem = count % 3;
                        if (rem === 1) btn.style.gridColumn = 'span 3';
                        if (rem === 2) btn.style.gridColumn = 'span 2';
                    }

                    subGrid.appendChild(btn);
                });

                wrapper.appendChild(subGrid);
                grid.appendChild(wrapper);
            });
        }

        function setFlow(flow) {
            st.flowVal = flow.value;
            st.flowCls = flow.cls;
            st.cat = st.flowCls === 'tr' ? CONFIG.defaults.transferCategory : null;
            st.dest = st.flowCls === 'tr' ? st.dest : null;
            applyFlowState();
            renderSuggestions();
        }

        function setAcct(account) {
            st.account = account;
            renderAccountButtons('acct-grid', setAcct, st.account);
            renderSuggestions();
        }

        function setDest(account) {
            st.dest = account;
            renderAccountButtons('dest-grid', setDest, st.dest);
        }

        function setCat(category) {
            st.cat = category;
            renderCategoryButtons();
            renderSuggestions();
        }

        function applyFlowState() {
            document.querySelectorAll('.fb').forEach(btn => {
                btn.className = 'fb';
                if (btn.dataset.value === st.flowVal) btn.classList.add('sel-' + st.flowCls);
            });

            const isTransfer = st.flowCls === 'tr';
            document.getElementById('dest-sec').classList.toggle('hidden', !isTransfer);
            document.getElementById('cat-sec').classList.toggle('hidden', isTransfer);
            renderAccountButtons('dest-grid', setDest, st.dest);
            renderCategoryButtons();
            updateSubmitColor();
        }

        function doSubmit() {
            const amountRaw = document.getElementById('amount').value.trim();
            const desc = document.getElementById('desc').value.trim();
            const tag = document.getElementById('tag').value.trim();
            const btn = document.getElementById('sbtn');

            if (amountRaw === '' || Number.isNaN(Number(amountRaw)) || Number(amountRaw) < 0) {
                toast('Enter a valid amount', 'err');
                return;
            }
            if (!st.account) {
                toast('Select an account', 'err');
                return;
            }
            if (!st.cat) {
                toast('Select a category', 'err');
                return;
            }
            if (st.flowCls === 'tr' && !st.dest) {
                toast('Select destination account', 'err');
                return;
            }
            if (st.account && !CONFIG.accounts.includes(st.account)) {
                toast('Selected account no longer exists — please choose again.', 'err');
                return;
            }
            if (st.cat && !CONFIG.categories.includes(st.cat)) {
                toast('Selected category no longer exists — please choose again.', 'err');
                return;
            }
            if (st.dest && !CONFIG.accounts.includes(st.dest)) {
                toast('Selected destination account no longer exists — please choose again.', 'err');
                return;
            }

            // Immediately clear the form and show success (Optimistic UI)
            btn.classList.add('c-ok');
            btn.textContent = 'LOGGED';
            toast('Logged', 'ok');
            
            saveSuggestion(st.flowVal, st.account, st.cat, desc);
            savePattern(amountRaw, st.flowVal, st.account, st.cat, st.dest, desc, tag);
            
            setTimeout(resetForm, 400);

            const entryData = {
                id: generateUUID(),
                flow: st.flowVal,
                account: st.account,
                amount: amountRaw,
                destination: st.dest,
                category: st.cat,
                description: desc,
                tag: tag,
            };

            const q = getQueue();
            q.push(entryData);
            saveQueue(q);
            saveToHistory(entryData);

            processQueue();
        }

        function resetForm() {
            document.getElementById('amount').value = '';
            document.getElementById('desc').value = '';
            document.getElementById('tag').value = '';
            const btn = document.getElementById('sbtn');
            btn.disabled = false;
            btn.classList.remove('c-ok', 'c-er');
            btn.textContent = 'LOG ENTRY';
            if (st.flowCls !== 'tr') st.cat = null;
            st.account = null;
            renderAccountButtons('acct-grid', setAcct, st.account);
            updateSubmitColor();
            renderCategoryButtons();
            renderSuggestions();
            document.getElementById('qf-row').classList.add('hidden');
            document.getElementById('amount').focus();
        }

        function updateSubmitColor() {
            const btn = document.getElementById('sbtn');
            btn.classList.remove('c-in', 'c-tr');
            if (st.flowCls === 'in') btn.classList.add('c-in');
            if (st.flowCls === 'tr') btn.classList.add('c-tr');
        }

        function getPatternData() {
            try { return JSON.parse(localStorage.getItem(PATTERN_KEY) || '{}'); } 
            catch (e) { return {}; }
        }

        function setPatternData(data) {
            localStorage.setItem(PATTERN_KEY, JSON.stringify(data));
        }

        function savePattern(amount, flow, account, cat, dest, desc, tag) {
            if (!amount) return;
            const data = getPatternData();
            if (!data[amount]) data[amount] = {};
            const key = JSON.stringify({ flow, account, cat, dest, desc, tag });
            data[amount][key] = (data[amount][key] || 0) + 1;
            
            data[amount] = Object.fromEntries(
                Object.entries(data[amount]).sort((a, b) => b[1] - a[1]).slice(0, 5)
            );
            setPatternData(data);
        }

        function applyPattern(pStr) {
            const p = JSON.parse(pStr);
            st.flowVal = p.flow;
            st.flowCls = CONFIG.flows.find(f => f.value === p.flow)?.cls || 'out';
            st.account = p.account;
            st.cat = p.cat;
            st.dest = p.dest;
            document.getElementById('desc').value = p.desc || '';
            document.getElementById('tag').value = p.tag || '';
            
            applyFlowState();
            renderAccountButtons('acct-grid', setAcct, st.account);
            document.getElementById('qf-row').classList.add('hidden');
        }

        function renderPatternMatches() {
            const amt = document.getElementById('amount').value.trim();
            const row = document.getElementById('qf-row');
            row.innerHTML = '';
            
            if (!amt || isNaN(amt)) {
                row.classList.add('hidden');
                return;
            }
            
            const data = getPatternData();
            const matches = data[amt];
            if (!matches) {
                row.classList.add('hidden');
                return;
            }
            
            const top = Object.entries(matches).sort((a, b) => b[1] - a[1]);
            if (!top.length) {
                row.classList.add('hidden');
                return;
            }

            top.forEach(([pStr]) => {
                const p = JSON.parse(pStr);
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'sc';
                chip.style.borderColor = 'var(--blu)';
                chip.style.color = 'var(--blu)';
                const destText = p.dest ? ` ➔ ${p.dest}` : '';
                const descText = p.desc ? ` · ${p.desc}` : '';
                const tagText = p.tag ? ` (${p.tag})` : '';
                chip.textContent = `⚡ ${p.account}${destText} · ${p.cat}${descText}${tagText}`;
                chip.addEventListener('click', () => applyPattern(pStr));
                row.appendChild(chip);
            });
            row.classList.remove('hidden');
        }

        function getSuggData() {
            try {
                return JSON.parse(localStorage.getItem(SUGG_KEY) || '{}');
            } catch (error) {
                return {};
            }
        }

        function setSuggData(data) {
            localStorage.setItem(SUGG_KEY, JSON.stringify(data));
        }

        function trimSuggCombo(combo) {
            return Object.fromEntries(
                Object.entries(combo).sort((a, b) => b[1] - a[1]).slice(0, 20)
            );
        }

        function saveSuggestion(flow, account, cat, desc) {
            if (!desc || !cat) return;
            const data = getSuggData();
            const key = `${flow}|${account}|${cat}`;
            if (!data[key]) data[key] = {};
            data[key][desc] = (data[key][desc] || 0) + 1;
            data[key] = trimSuggCombo(data[key]);
            setSuggData(data);
        }

        function renderSuggestions() {
            const row = document.getElementById('sugg-row');
            row.innerHTML = '';
            if (!st.cat) {
                row.classList.add('hidden');
                return;
            }

            const data = getSuggData();
            const combo = data[`${st.flowVal}|${st.account}|${st.cat}`];
            if (!combo) {
                row.classList.add('hidden');
                return;
            }

            const top = Object.entries(combo).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (!top.length) {
                row.classList.add('hidden');
                return;
            }

            top.forEach(([desc]) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'sc';
                chip.textContent = desc;
                chip.addEventListener('click', () => {
                    document.getElementById('desc').value = desc;
                    row.querySelectorAll('.sc').forEach(item => item.classList.remove('picked'));
                    chip.classList.add('picked');
                });
                row.appendChild(chip);
            });
            row.classList.remove('hidden');
        }

        let toastTimer;
        function toast(message, type) {
            if (type === 'ok') {
                const flowText = document.getElementById('flow-text');
                if (flowText) {
                    flowText.textContent = 'Flowed';
                    flowText.style.color = 'var(--grn)';
                    setTimeout(() => {
                        flowText.textContent = 'Flow';
                        flowText.style.color = '';
                    }, 2500);
                }
                return;
            }

            const el = document.getElementById('toast');
            el.textContent = message;
            el.style.color = type === 'err' ? 'var(--red)' : 'var(--grn)';
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => el.textContent = '', 3000);
        }

        // ── Transaction History ──────────────────────────

        function getHistory() {
            try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
            catch (e) { return []; }
        }

        function saveToHistory(entry) {
            const history = getHistory();
            history.unshift({ ...entry, timestamp: Date.now() });
            if (history.length > 5) history.length = 5;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }

        function renderHistory() {
            const list = document.getElementById('history-list');
            const empty = document.getElementById('history-empty');
            if (!list) return;

            const history = getHistory();
            list.innerHTML = '';

            if (history.length === 0) {
                if (empty) empty.classList.remove('hidden');
                return;
            }
            if (empty) empty.classList.add('hidden');

            history.forEach(entry => {
                const chip = document.createElement('button');
                chip.type = 'button';
                const sign = entry.flow === 'IN (+)' ? '+' : entry.flow === 'TRANSFER' ? '↔' : '−';
                const cls = entry.flow === 'IN (+)' ? 'in' : entry.flow === 'TRANSFER' ? 'tr' : 'out';
                chip.className = `sc hc hc-${cls}`;

                const destText = entry.destination ? ` → ${entry.destination}` : '';
                const descText = entry.description ? ` · ${entry.description}` : '';
                const time = timeAgo(entry.timestamp);

                chip.innerHTML = `<span class="hc-body">${sign}₹${Number(entry.amount).toLocaleString('en-IN')} · ${entry.account}${destText} · ${entry.category}${descText}</span><span class="hc-time">${time}</span>`;

                chip.addEventListener('click', () => {
                    applyHistoryEntry(entry);
                    toggleDrawer();
                });
                list.appendChild(chip);
            });
        }

        function applyHistoryEntry(entry) {
            if (!CONFIG) return;
            st.flowVal = entry.flow;
            st.flowCls = CONFIG.flows.find(f => f.value === entry.flow)?.cls || 'out';
            st.account = entry.account;
            st.cat = entry.category;
            st.dest = entry.destination || null;
            document.getElementById('desc').value = entry.description || '';
            document.getElementById('tag').value = entry.tag || '';

            applyFlowState();
            renderAccountButtons('acct-grid', setAcct, st.account);
        }

        function timeAgo(ts) {
            const diff = Date.now() - ts;
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            return `${days}d ago`;
        }

        // ── Dashboard ─────────────────────────────────────────────────

        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let lastSnapshot = null;

        function switchTab(tab) {
            const isLog  = tab === 'log';
            document.getElementById('main-app').classList.toggle('hidden', !isLog);
            document.getElementById('dash-app').classList.toggle('hidden', isLog);
            document.getElementById('nav-log').classList.toggle('active', isLog);
            document.getElementById('nav-dashboard').classList.toggle('active', !isLog);

            if (!isLog) {
                // Pre-fill Time Machine with current period
                const now = new Date();
                const selMonth = document.getElementById('tm-month');
                const selYear  = document.getElementById('tm-year');
                if (!selYear.value) {
                    selMonth.value = String(now.getMonth() + 1);
                    selYear.value  = String(now.getFullYear());
                }
                if (!lastSnapshot) fetchSnapshot();
            }
        }

        async function fetchSnapshot() {
            if (!API_URL) return;
            const month = parseInt(document.getElementById('tm-month').value, 10);
            const year  = parseInt(document.getElementById('tm-year').value, 10);
            if (!month || !year || year < 2020 || year > 2099) {
                toast('Set a valid month and year first', 'err');
                return;
            }

            const goBtn = document.getElementById('tm-go');
            goBtn.disabled = true;
            goBtn.textContent = '...';

            dsShow('ds-loading');
            dsHide('ds-error');
            dsHide('ds-hero');
            dsHide('ds-accounts');
            dsHide('ds-mtd');
            dsHide('ds-ytd');
            dsHide('ds-escrow');
            dsHide('ds-expense');

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'getSnapshot', data: { month, year } }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                }).then(r => r.json());

                dsHide('ds-loading');
                goBtn.disabled = false;
                goBtn.textContent = 'GO';

                if (!res.ok) throw new Error(res.error || 'Snapshot failed');

                lastSnapshot = res.data;
                renderSnapshot(res.data);
            } catch (err) {
                dsHide('ds-loading');
                goBtn.disabled = false;
                goBtn.textContent = 'GO';
                const errEl = document.getElementById('ds-error');
                errEl.textContent = err.message;
                dsShow('ds-error');
            }
        }

        function renderSnapshot(d) {
            renderHero(d.hero);
            renderAccounts(d.accounts);
            renderMtd(d.mtd);
            renderYtd(d.ytd);
            renderEscrow(d.escrow);
            renderExpense(d.expenseByMonth);
        }

        function renderHero(h) {
            const nw = Number(h.netWorth) || 0;
            const nwEl = document.getElementById('dh-networth');
            nwEl.textContent = fmtRs(nw);
            nwEl.className = 'ds-hero-value' + (nw < 0 ? ' negative' : '');
            document.getElementById('dh-liquidity').textContent  = fmtRs(h.totalLiquidity);
            document.getElementById('dh-truewealth').textContent = fmtRs(h.trueWealth);
            document.getElementById('dh-today').textContent      = fmtRs(h.todayExpense);
            document.getElementById('dh-runway').textContent     = h.runway > 999 ? '999+' : Number(h.runway).toFixed(1);
            document.getElementById('dh-burn').textContent       = fmtRs(Math.round(h.monthlyBurn));
            dsShow('ds-hero');
        }

        function renderAccounts(accounts) {
            const list = document.getElementById('ds-acct-list');
            list.innerHTML = '';
            accounts.forEach(a => {
                const row = document.createElement('div');
                row.className = 'ds-acct-row';
                const balClass = a.balance > 0 ? 'positive' : a.balance < 0 ? 'negative' : 'zero';
                row.innerHTML = `<span class="ds-acct-name">${esc(a.name)}</span>
                    <span class="ds-acct-bal ${balClass}">${fmtRs(a.balance)}</span>`;
                list.appendChild(row);
            });
            // rebuild verify inputs too (so they match current accounts)
            buildVerifyInputs(accounts);
            dsShow('ds-accounts');
        }

        function buildVerifyInputs(accounts) {
            const container = document.getElementById('ds-verify-inputs');
            container.innerHTML = '';
            accounts.forEach(a => {
                const row = document.createElement('div');
                row.className = 'ds-verify-input-row';
                row.innerHTML = `<span class="ds-verify-input-name">${esc(a.name)}</span>
                    <input class="ds-verify-input-field" type="number" placeholder="0"
                           data-account="${esc(a.name)}" data-system="${a.balance}" inputmode="decimal">`;
                container.appendChild(row);
            });
        }

        function toggleVerifyPanel() {
            const panel = document.getElementById('ds-verify-panel');
            const isHidden = panel.classList.contains('hidden');
            panel.classList.toggle('hidden', !isHidden);
            document.getElementById('ds-verify-open').textContent = isHidden ? 'Close' : 'Verify';
            document.getElementById('ds-ghost-results').classList.add('hidden');
            document.getElementById('ds-ghost-results').innerHTML = '';
        }

        function calcGhostMoney() {
            const inputs = document.querySelectorAll('.ds-verify-input-field');
            const results = document.getElementById('ds-ghost-results');
            results.innerHTML = '';
            let hasData = false;

            inputs.forEach(inp => {
                const actual = parseFloat(inp.value);
                if (isNaN(actual)) return;
                hasData = true;
                const system = parseFloat(inp.dataset.system);
                const diff = actual - system;
                const absDiff = Math.abs(diff);
                const row = document.createElement('div');
                row.className = 'ds-ghost-row';
                let valClass = absDiff < 1 ? 'clean' : absDiff <= 100 ? 'low' : 'high';
                const sign = diff > 0 ? '+' : '';
                row.innerHTML = `<span class="ds-ghost-name">${esc(inp.dataset.account)}</span>
                    <span class="ds-ghost-val ${valClass}">${absDiff < 1 ? '✓ Clean' : sign + fmtRs(diff)}</span>`;
                results.appendChild(row);
            });

            if (!hasData) { toast('Enter at least one actual balance', 'err'); return; }
            results.classList.remove('hidden');
        }

        function renderMtd(mtd) {
            const { period, income, buckets, categories } = mtd;
            document.getElementById('ds-mtd-period').textContent = `${MONTHS[period.month - 1]} ${period.year}`;
            document.getElementById('ds-mtd-income').textContent = fmtRs(income);

            renderBuckets('ds-mtd-buckets', [
                { name: 'Survival', allowance: buckets.survival.allowance, spent: buckets.survival.spent, remaining: buckets.survival.remaining, isMtd: true },
                { name: 'Wealth',   allowance: buckets.wealth.allowance,   spent: buckets.wealth.spent,   remaining: buckets.wealth.remaining, isMtd: true },
                { name: 'Wants',    allowance: buckets.wants.allowance,    spent: buckets.wants.spent,    remaining: buckets.wants.remaining, isMtd: true },
            ], true);

            renderCategoryRows('ds-mtd-cats', categories);
            dsShow('ds-mtd');
        }

        function renderYtd(ytd) {
            const { period, income, buckets, categories } = ytd;
            document.getElementById('ds-ytd-period').textContent = String(period.year);
            document.getElementById('ds-ytd-income').textContent = fmtRs(income);

            renderBuckets('ds-ytd-buckets', [
                { name: 'Survival', pct: buckets.survival.pct, spent: buckets.survival.spent, target: buckets.survival.target, isMtd: false },
                { name: 'Wealth',   pct: buckets.wealth.pct,   spent: buckets.wealth.spent,   target: buckets.wealth.target, isMtd: false },
                { name: 'Wants',    pct: buckets.wants.pct,    spent: buckets.wants.spent,    target: buckets.wants.target, isMtd: false },
            ], false);

            renderCategoryRows('ds-ytd-cats', categories);
            dsShow('ds-ytd');
        }

        function renderBuckets(containerId, buckets, isMtd) {
            const el = document.getElementById(containerId);
            el.innerHTML = '';
            buckets.forEach(b => {
                const div = document.createElement('div');
                div.className = 'ds-bucket';

                let fillPct, fillClass, metaText, remainText, remainClass;

                if (isMtd) {
                    const allowance = b.allowance || 1;
                    fillPct = Math.min((b.spent / allowance) * 100, 100);
                    fillClass = fillPct < 75 ? 'ok' : fillPct < 100 ? 'warn' : 'over';
                    metaText = `of ${fmtRs(b.allowance)} allowance`;
                    const rem = b.remaining;
                    remainText = (rem >= 0 ? '+' : '') + fmtRs(rem) + ' left';
                    remainClass = rem >= 0 ? 'positive' : 'negative';
                } else {
                    fillPct = Math.min((b.pct || 0) * 100, 100);
                    const targetPct = b.target * 100;
                    fillClass = fillPct <= targetPct ? 'ok' : fillPct <= targetPct * 1.2 ? 'warn' : 'over';
                    metaText = `${(b.pct * 100).toFixed(1)}% of income · target ${(b.target * 100).toFixed(0)}%`;
                    remainText = '';
                    remainClass = '';
                }

                div.innerHTML = `
                    <div class="ds-bucket-top">
                        <span class="ds-bucket-name">${b.name}</span>
                        <span class="ds-bucket-meta">${metaText}</span>
                    </div>
                    <div class="ds-bucket-bar-bg">
                        <div class="ds-bucket-bar-fill ${fillClass}" style="width:${fillPct.toFixed(1)}%"></div>
                    </div>
                    <div class="ds-bucket-nums">
                        <span class="ds-bucket-spent">${fmtRs(b.spent)}</span>
                        ${remainText ? `<span class="ds-bucket-remain ${remainClass}">${remainText}</span>` : ''}
                    </div>`;
                el.appendChild(div);
            });
        }

        function renderCategoryRows(containerId, categories) {
            const el = document.getElementById(containerId);
            el.innerHTML = '';
            categories.forEach(c => {
                const row = document.createElement('div');
                row.className = 'ds-cat-row';
                const descEl = `<span class="ds-cat-desc collapsed">${esc(c.description || '—')}</span>`;
                row.innerHTML = `<span class="ds-cat-name">${esc(c.category)}</span>
                    <span class="ds-cat-amt">${fmtRs(c.amount)}</span>
                    ${descEl}`;
                // Tap to expand/collapse description
                row.addEventListener('click', () => {
                    const d = row.querySelector('.ds-cat-desc');
                    d.classList.toggle('collapsed');
                });
                el.appendChild(row);
            });
        }

        function renderEscrow(escrow) {
            const list = document.getElementById('ds-escrow-list');
            list.innerHTML = '';
            if (!escrow || escrow.length === 0) {
                list.innerHTML = '<div style="padding:12px 14px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--t3);">No escrow / lending entries</div>';
            } else {
                escrow.forEach(e => {
                    const row = document.createElement('div');
                    row.className = 'ds-escrow-row';
                    const pos = e.netPosition;
                    const posClass = pos < 0 ? 'owe' : pos > 0 ? 'owed' : 'zero';
                    const posLabel = pos < 0 ? `You owe ${fmtRs(Math.abs(pos))}` : pos > 0 ? `Owes you ${fmtRs(pos)}` : 'Settled';
                    const dateStr = e.asOf ? new Date(e.asOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
                    row.innerHTML = `<span class="ds-escrow-person">${esc(e.person)}</span>
                        <div class="ds-escrow-right">
                            <span class="ds-escrow-pos ${posClass}">${posLabel}</span>
                            ${dateStr ? `<span class="ds-escrow-date">${dateStr}</span>` : ''}
                        </div>`;
                    list.appendChild(row);
                });
            }
            dsShow('ds-escrow');
        }

        function renderExpense(data) {
            const list = document.getElementById('ds-expense-list');
            list.innerHTML = '';
            if (!data || data.length === 0) {
                list.innerHTML = '<div style="padding:12px 14px;font-family:\'DM Mono\',monospace;font-size:11px;color:var(--t3);">No expense history</div>';
            } else {
                data.forEach(row => {
                    if (!row.year) return;
                    const el = document.createElement('div');
                    el.className = 'ds-exp-row';
                    const monthName = MONTHS[(row.month || 1) - 1] || '';
                    el.innerHTML = `<span class="ds-exp-period">${monthName} ${row.year}</span>
                        <span class="ds-exp-total">${fmtRs(row.total)}</span>`;
                    list.appendChild(el);
                });
            }
            dsShow('ds-expense');
        }

        // ── Helpers ───────────────────────────────────────────────────

        function fmtRs(val) {
            const n = Number(val) || 0;
            const abs = Math.abs(n);
            const str = '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
            return n < 0 ? '\u2212' + str : str;
        }

        function esc(str) {
            return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function dsShow(id) { document.getElementById(id).classList.remove('hidden'); }
        function dsHide(id) { document.getElementById(id).classList.add('hidden'); }

        // ── Drawer Panel Navigation ───────────────────────────────────

        const DRAWER_PANELS = ['main', 'accounts', 'guide', 'faq', 'about'];

        function openDrawerPanel(name) {
            DRAWER_PANELS.forEach(p => {
                const el = document.getElementById('drawer-' + p);
                if (el) el.classList.toggle('hidden', p !== name);
            });
            if (name === 'accounts') renderAcctMgr();
        }

        // Reset to main panel whenever drawer is opened
        const _origToggleDrawer = toggleDrawer;

        // ── Accounts Manager ─────────────────────────────────────────

        let _acctList = [];

        function renderAcctMgr() {
            _acctList = CONFIG && CONFIG.accounts ? [...CONFIG.accounts] : [];
            _paintAcctMgr();
        }

        function _paintAcctMgr() {
            const list = document.getElementById('acct-mgr-list');
            list.innerHTML = '';
            _acctList.forEach((name, idx) => {
                const item = document.createElement('div');
                item.className = 'acct-mgr-item';
                item.innerHTML = `<span class="acct-mgr-name">${esc(name)}</span>
                    <button class="acct-del-btn" data-idx="${idx}" type="button" title="Remove">&#215;</button>`;
                list.appendChild(item);
            });
            list.querySelectorAll('.acct-del-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx, 10);
                    _acctList.splice(idx, 1);
                    _paintAcctMgr();
                });
            });
        }

        function acctMgrAdd() {
            const input = document.getElementById('acct-new-input');
            const val = input.value.trim();
            if (!val) return;
            if (_acctList.map(a => a.toLowerCase()).includes(val.toLowerCase())) {
                input.value = '';
                return;
            }
            _acctList.push(val);
            input.value = '';
            _paintAcctMgr();
        }

        async function acctMgrSave() {
            if (!API_URL) return;
            const saveBtn = document.getElementById('acct-save-btn');
            const msg = document.getElementById('acct-save-msg');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            msg.className = 'acct-save-msg hidden';

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'updateAccounts', data: _acctList }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                }).then(r => r.json());

                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';

                if (!res.ok) throw new Error(res.error || 'Save failed');

                // Update live config cache so Log Entry form reflects change immediately
                if (CONFIG) {
                    CONFIG.accounts = [..._acctList];
                    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(CONFIG));
                    renderAccountButtons('acct-grid', setAcct, st.account);
                    renderAccountButtons('dest-grid', setDest, st.dest);
                }

                msg.textContent = `Saved ${res.data.updated} accounts`;
                msg.className = 'acct-save-msg ok';
                setTimeout(() => msg.classList.add('hidden'), 3000);
            } catch (err) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
                msg.textContent = err.message;
                msg.className = 'acct-save-msg err';
            }
        }
