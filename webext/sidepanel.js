const TEXT_REASONS = ['redirect', 'mirror', 'broken', 'weird'];
const $ = (id) => document.getElementById(id);

const s = { domains: [], i: 0, tabId: null, verdict: null, reason: null, tags: new Set(), buffer: '', last: null, captchaOpen: false };
const items = [];
const captcha = { codes: [], el: null };

const api = async (path, body) => {
    const res = await fetch(`http://127.0.0.1:4401${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
};

const save = () => chrome.storage.local.set({ queue: { domains: s.domains, i: s.i, tabId: s.tabId } });

const show = (name) => ['setup', 'review', 'done'].forEach(id => $(id).hidden = id !== name);

const openSite = async () => {
    const url = 'http://' + s.domains[s.i];
    try {
        if (s.tabId == null) throw 0;
        await chrome.tabs.update(s.tabId, { url, active: true });
    } catch {
        s.tabId = (await chrome.tabs.create({ url, active: true })).id;
    }
    save();
};

const render = () => {
    $('yes').classList.toggle('on', s.verdict === 'Y');
    $('no').classList.toggle('on', s.verdict === 'N');
    $('why').hidden = s.verdict !== 'N';
    $('count').hidden = s.reason !== 'domains';
    $('buffer').textContent = s.buffer ? '> ' + s.buffer : '';
    if (captcha.el) captcha.el.hidden = !s.captchaOpen;
    const matches = s.buffer ? items.filter(it => it.name.toLowerCase().startsWith(s.buffer.toLowerCase())) : [];
    items.forEach(it => {
        it.el.classList.toggle('on', it.kind === 'reason' ? s.reason === it.name : it.kind === 'tag' ? s.tags.has(it.name) : s.captchaOpen);
        it.el.classList.toggle('match', matches.length > 1 && matches.includes(it));
    });
};

const resetEntry = () => {
    s.verdict = 'N';
    s.reason = null;
    s.tags.clear();
    s.buffer = '';
    s.last = null;
    s.captchaOpen = false;
    $('count').value = '';
    $('note').value = '';
    $('error').textContent = '';
    render();
};

const loadSite = async () => {
    const domain = s.domains[s.i];
    resetEntry();
    $('progress').textContent = `${s.i + 1} / ${s.domains.length}`;
    $('site').textContent = domain;
    document.activeElement?.blur();
};

const skipKnown = async () => {
    while (s.i < s.domains.length) {
        const known = await api('/lookup?domain=' + encodeURIComponent(s.domains[s.i])).catch(() => []);
        if (!known.length) return true;
        s.i++;
    }
    return false;
};

const finish = () => {
    s.domains = [];
    s.i = 0;
    s.tabId = null;
    save();
    show('done');
};

const setVerdict = (v) => {
    s.verdict = v;
    s.buffer = '';
    s.last = null;
    $('error').textContent = '';
    render();
};

const pick = (it) => {
    if (it.kind === 'tag') s.tags.has(it.name) ? s.tags.delete(it.name) : s.tags.add(it.name);
    else if (it.kind === 'toggle') {
        s.captchaOpen = !s.captchaOpen;
        if (!s.captchaOpen && captcha.codes.includes(s.reason)) s.reason = null;
    } else {
        s.reason = it.name;
        if (captcha.codes.includes(it.name)) s.captchaOpen = true;
    }
    render();
};

const focusFor = (it) => {
    if (it.name === 'domains') $('count').focus();
    else if (TEXT_REASONS.includes(it.name)) $('note').focus();
};

const find = (b) => {
    const low = b.toLowerCase();
    const matches = items.filter(it => it.name.toLowerCase().startsWith(low));
    return matches.find(it => it.name.toLowerCase() === low) || (matches.length === 1 ? matches[0] : matches.length ? null : undefined);
};

const typeahead = (key) => {
    if (/^\d$/.test(key) && (!s.buffer || /^\d+$/.test(s.buffer))) {
        s.buffer += key;
        s.reason = 'domains';
        s.last = null;
        $('count').value = s.buffer;
        render();
        return;
    }
    let b = s.buffer + key;
    let hit = find(b);
    if (hit === undefined) {
        b = key;
        hit = find(b);
    }
    s.buffer = hit === undefined ? '' : b;
    if (hit && hit !== s.last) pick(hit);
    s.last = hit || null;
    if (hit && b.toLowerCase() === hit.name.toLowerCase()) focusFor(hit);
    render();
};

const next = async () => {
    const domain = s.domains[s.i];
    if (!s.verdict) return $('error').textContent = 'press Y or N';
    if (s.verdict === 'N' && !s.reason) return $('error').textContent = 'pick a reason';
    $('next').disabled = true;
    try {
        await api('/record', { domain, verdict: s.verdict, reason: s.reason, count: Number($('count').value) || 1, tags: [...s.tags], note: $('note').value });
    } catch (e) {
        $('error').textContent = e.message;
        $('next').disabled = false;
        return;
    }
    $('next').disabled = false;
    s.i++;
    if (!await skipKnown()) return finish();
    await openSite();
    loadSite();
};

const start = async (domains, i = 0, tabId = null) => {
    Object.assign(s, { domains, i, tabId });
    if (tabId == null && !await skipKnown()) return finish();
    show('review');
    if (tabId == null) await openSite();
    loadSite();
};

const buildChips = (groups, tags) => {
    const root = $('reasons');
    const add = (parent, kind, name, title) => {
        const el = document.createElement('button');
        el.textContent = name === 'domains' ? 'N domains' : name;
        el.title = title || '';
        el.addEventListener('click', (e) => {
            const it = items.find(it => it.el === el);
            s.buffer = '';
            s.last = null;
            pick(it);
            if (it.kind === 'reason') focusFor(it);
            if (e.detail > 0 && document.activeElement === el) el.blur();
        });
        parent.append(el);
        items.push({ kind, name, el });
    };
    const group = (title, fill) => {
        const h = document.createElement('h4');
        h.textContent = title;
        const box = document.createElement('div');
        box.className = 'chips';
        fill(box);
        const wrap = document.createElement('div');
        wrap.append(h, box);
        root.append(wrap);
        return wrap;
    };
    groups.forEach(g => {
        const wrap = group(g.title.toLowerCase(), box => g.reasons.forEach(r => add(box, 'reason', r.code, r.desc)));
        if (g.title !== 'CAPTCHA') return;
        captcha.el = wrap;
        captcha.codes = g.reasons.map(r => r.code);
    });
    group('other', box => {
        add(box, 'reason', 'domains', 'type digits to set the count');
        add(box, 'toggle', 'captcha', 'show captcha reasons');
    });
    tags.forEach(t => add($('tags'), 'tag', t));
};

$('start').addEventListener('click', () => {
    const domains = [...new Set($('list').value.split(/[\s,]+/).map(d => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '')).filter(Boolean))];
    if (!domains.length) return $('setup-error').textContent = 'paste some domains';
    start(domains);
});

$('again').addEventListener('click', () => {
    $('list').value = '';
    show('setup');
    $('list').focus();
});

$('yes').addEventListener('click', () => setVerdict('Y'));
$('no').addEventListener('click', () => setVerdict('N'));
$('next').addEventListener('click', next);

addEventListener('keydown', (e) => {
    if ($('review').hidden) return;
    const t = e.target;
    const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    if (e.key === 'Escape') {
        if (typing) return t.blur();
        if (s.buffer) {
            s.buffer = '';
            s.last = null;
        } else if (s.verdict) resetEntry();
        return render();
    }
    if (e.key === 'Enter') {
        if (!typing && t instanceof HTMLButtonElement && t !== $('next') && t.matches(':focus-visible')) return;
        e.preventDefault();
        return next();
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
        s.buffer = s.buffer.slice(0, -1);
        if (s.reason === 'domains') $('count').value = s.buffer;
        return render();
    }
    if (e.key.length !== 1 || e.key === ' ') return;
    e.preventDefault();
    const k = e.key.toLowerCase();
    if (k === 'y' && !s.buffer || k === 'n' && s.verdict === 'Y') return setVerdict(k.toUpperCase());
    if (s.verdict === 'N') typeahead(e.key);
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'focus') return;
    window.focus();
    document.activeElement?.blur();
    if (!$('setup').hidden) $('list').focus();
});

(async () => {
    try {
        const { groups, tags } = await api('/reasons');
        buildChips(groups, tags);
    } catch {
        $('setup-error').textContent = 'server not running: bun webext';
    }
    const { queue } = await chrome.storage.local.get('queue');
    if (queue?.domains?.length) start(queue.domains, queue.i, queue.tabId ?? null).then(() => {
        if (queue.tabId == null) return;
        chrome.tabs.get(queue.tabId).catch(() => { s.tabId = null; });
    });
})();
