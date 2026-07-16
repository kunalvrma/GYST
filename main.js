let CONFIG = null;
        const SUGG_KEY = 'mf_sugg';
        const PATTERN_KEY = 'mf_patterns';
        const API_KEY_STORE = 'mf_api_url';
        const QUEUE_KEY = 'mf_sync_queue';
        const CONFIG_CACHE_KEY = 'mf_config';
        const THEME_KEY = 'mf_theme';
        const HISTORY_KEY = 'mf_history';
        let API_URL = localStorage.getItem(API_KEY_STORE);
        let initialized = false;
        let isSyncing = false;

        const ICONS = {
            'Investments': 'INV',
            'Transport': 'TRN',
            'Utilities': 'UTL',
            'Income': 'INC',
            'Dining & Lifestyle': 'DINE',
            'Health': 'HLT',
            'Education': 'EDU',
            'Groceries': 'GRC',
            'Home Projects': 'HOME',
            'Relationships': 'REL',
            'Escrow / Lending': 'ESC',
            'Mandate': 'MAN',
            'Adjustment': 'ADJ',
            'Transfer (Self)': 'XFR',
            'Vice': 'VCE',
        };

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
            if (isOpening) renderHistory();
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
                document.getElementById('drawer-overlay').addEventListener('click', toggleDrawer);
                document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
                document.getElementById('sbtn').addEventListener('click', doSubmit);
                document.getElementById('amount').addEventListener('input', renderPatternMatches);
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
            localStorage.removeItem(API_KEY_STORE);
            localStorage.removeItem(CONFIG_CACHE_KEY);
            API_URL = null;
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
            CONFIG.categories.forEach(category => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'cb';
                btn.dataset.value = category;
                btn.innerHTML = '<span class="i"></span><span></span>';
                btn.querySelector('.i').textContent = ICONS[category] || 'CAT';
                btn.querySelector('span:last-child').textContent = category;
                btn.classList.toggle('on', category === st.cat);
                btn.addEventListener('click', () => setCat(category));
                grid.appendChild(btn);
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
