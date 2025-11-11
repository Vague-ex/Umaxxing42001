// Initialize Supabase Client
const supabaseUrl = 'https://guceyenzaktklmpbcjph.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y2V5ZW56YWt0a2xtcGJjanBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzkwNjEsImV4cCI6MjA3NTIxNTA2MX0.XrSUj3Fp4FnhSJRKJesIM5x_YFT14m-pOaCfAOEiNBI';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
window.supabaseClient = supabaseClient; // expose for admin

// State
let allBanners = [];
const STORAGE_KEY = 'target_banner_id';

function getTargetId(){ try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; } }
function setTargetId(id){ try { localStorage.setItem(STORAGE_KEY, id || ''); } catch {} }

// Utils
function parseDate(dateString) {
    if (!dateString) return null;
    const parts = String(dateString).split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
}
function formatDate(dateString) {
    const d = parseDate(dateString);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
function diffDaysFromToday(dateString) {
    const d = parseDate(dateString);
    if (!d) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    const ms = d.getTime() - today.getTime();
    return Math.ceil(ms / (1000*60*60*24));
}

// Fetch tables
async function fetchCharacterBanners() {
    const names = ['Character Banners', 'character_banners'];
    for (const name of names) {
        const { data, error } = await supabaseClient.from(name).select('*');
        if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find'))) continue;
        if (error) { console.error('Character fetch error:', error); continue; }
        if (Array.isArray(data)) return data;
    }
    return [];
}
async function fetchSupportCardBanners() {
    const names = ['Support Card Banners', 'support_card_banners'];
    for (const name of names) {
        const { data, error } = await supabaseClient.from(name).select('*');
        if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find'))) continue;
        if (error) { console.error('Support fetch error:', error); continue; }
        if (Array.isArray(data)) return data;
    }
    return [];
}

function normalizeRows(chars, supports) {
    const normChars = chars.map(r => ({
        id: `char_${r.id}`,
        table: 'character',
        name: r.name,
        featured: r.name, // placeholder: single character name as featured
        start_date: r.start_date,
        end_date: r.end_date,
        rarity: r.rarity,
        banner_image: r.banner_image || ''
    }));
    const normSupports = supports.map(r => ({
        id: `supp_${r.id}`,
        table: 'support',
        name: r.name,
        featured: r.type ? `${r.type} ${r.rarity || ''}`.trim() : r.rarity || r.name,
        start_date: r.start_date,
        end_date: r.end_date,
        rarity: r.rarity,
        banner_image: r.banner_image || ''
    }));
    return [...normChars, ...normSupports]
        .filter(x => !!x.start_date)
        .sort((a,b) => {
            const da = parseDate(a.start_date)?.getTime() ?? 0;
            const db = parseDate(b.start_date)?.getTime() ?? 0;
            return db - da; // newest first
        });
}

function sortByStartDesc(list) {
    return list.slice().sort((a,b) => {
        const da = parseDate(a.start_date)?.getTime() ?? 0;
        const db = parseDate(b.start_date)?.getTime() ?? 0;
        return db - da;
    });
}

function applyFilters() {
    let list = sortByStartDesc(allBanners);

    // Hide missed when toggleMissed is off (timeline only)
    const showMissed = document.getElementById('toggleMissed')?.checked;
    if (!showMissed) {
        list = list.filter(x => (diffDaysFromToday(x.start_date) ?? 0) >= 0);
    }

    // Year
    const yearSel = document.getElementById('filterYear');
    const typeSel = document.getElementById('filterType');
    const searchInput = document.getElementById('filterSearch');

    const year = yearSel?.value || '';
    const type = typeSel?.value || '';
    const search = searchInput?.value || '';

    if (year) {
        list = list.filter(x => {
            const d = parseDate(x.start_date);
            return d && d.getFullYear().toString() === year;
        });
    }
    if (type) {
        list = list.filter(x => x.table === type);
    }
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(x => x.name?.toLowerCase().includes(q));
    }

    renderBanners(list);
    populateBannerSelect(list);
}

function populateBannerSelect(list){
    const sel = document.getElementById('bannerSelect');
    const btn = document.getElementById('btnSetTargetFromSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a banner...</option>' +
        list.map(b => `<option value="${b.id}">${b.name} — ${formatDate(b.start_date)}</option>`).join('');
    const tgt = getTargetId();
    if (tgt) sel.value = tgt;
    if (btn) btn.style.display = sel.style.display === 'none' ? 'none' : '';
}

function selectBannerById(id){
    const banner = allBanners.find(b => b.id === id);
    if (!banner) return;
    window.dispatchEvent(new CustomEvent('banner:selected', { detail: banner }));
    // Scroll to card if present
    const el = document.querySelector(`[data-banner-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setTarget(id){
    setTargetId(id);
    selectBannerById(id);
    applyFilters(); // re-render to update target highlight
}

function renderBanners(banners) {
    const container = document.getElementById('bannersContainer');
    const empty = document.getElementById('bannersEmpty');
    if (!container) return;
    container.innerHTML = '';
    if (!banners || banners.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const tgt = getTargetId();

    banners.forEach(item => {
        const days = diffDaysFromToday(item.start_date);
        const isPast = days !== null && days < 0;
        const isTarget = tgt && tgt === item.id;
        const col = document.createElement('div');
        col.className = 'col-12';
        col.innerHTML = `
            <div class="banner-card ${isPast ? 'past' : ''} ${isTarget ? 'target' : ''}" data-banner-id="${item.id}" role="button">
                ${item.banner_image ? `<img src="${item.banner_image}" alt="${item.name}">` : ''}
                <div class="content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="title">${item.name} ${isTarget ? '<span class="badge target-badge ms-2">Target</span>' : ''}</div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-${item.table === 'character' ? 'primary' : 'info'} banner-badge">${item.table === 'character' ? 'Character' : 'Support'}</span>
                            <button type="button" class="btn btn-sm ${isTarget ? 'btn-warning' : 'btn-outline-warning'} set-target"><i class="bi bi-star${isTarget ? '-fill' : ''}"></i></button>
                        </div>
                    </div>
                    <div class="text-muted meta">${item.featured || ''}</div>
                    <div class="mt-1">Start: <strong>${formatDate(item.start_date)}</strong>${item.end_date ? ` · End: <strong>${formatDate(item.end_date)}</strong>` : ''}</div>
                </div>
            </div>`;
        col.querySelector('.banner-card').addEventListener('click', (e) => {
            if (!e.target.closest('.set-target')) selectBannerById(item.id);
        });
        col.querySelector('.set-target').addEventListener('click', (e) => { e.stopPropagation(); setTarget(item.id); });
        container.appendChild(col);
    });
}

function renderToday() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const dayEl = document.getElementById('currentWeekday');
    if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
    if (dayEl) dayEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
}

function populateYearFilter() {
    const select = document.getElementById('filterYear');
    if (!select) return;
    const years = Array.from(new Set(allBanners.map(b => parseDate(b.start_date)?.getFullYear()).filter(Boolean))).sort((a,b) => b - a);
    select.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
}

// Init
document.addEventListener('DOMContentLoaded', async function() {
    // changelog
    document.getElementById('changelogLink').addEventListener('click', function(e) {
        e.preventDefault();
        var changelogModal = new bootstrap.Modal(document.getElementById('changelogModal'));
        changelogModal.show();
    });
    var changelogModal = new bootstrap.Modal(document.getElementById('changelogModal'));
    changelogModal.show();

    // Admin link
    const adminLink = document.getElementById('adminLink');
    adminLink?.addEventListener('click', function(e){
        e.preventDefault();
        var adminModal = new bootstrap.Modal(document.getElementById('adminModal'));
        adminModal.show();
        window.dispatchEvent(new Event('admin:open'));
    });

    renderToday();

    // fetch and normalize
    const [chars, supports] = await Promise.all([
        fetchCharacterBanners(),
        fetchSupportCardBanners()
    ]);
    allBanners = normalizeRows(chars, supports);
    populateYearFilter();
    applyFilters();

    // Wire filters & UI
    ['toggleMissed','filterYear','filterType','filterSearch'].forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('input', applyFilters);
        el?.addEventListener('change', applyFilters);
    });

    const browseToggle = document.getElementById('browseAllToggle');
    const bannerSelect = document.getElementById('bannerSelect');
    const btnSetTargetFromSelect = document.getElementById('btnSetTargetFromSelect');
    const container = document.getElementById('bannersContainer');

    function updateBrowseMode(){
        const browse = browseToggle?.checked;
        if (browse){
            bannerSelect.style.display = 'none';
            btnSetTargetFromSelect.style.display = 'none';
            container.parentElement.style.display = '';
        } else {
            bannerSelect.style.display = '';
            btnSetTargetFromSelect.style.display = '';
            container.parentElement.style.display = 'none';
        }
    }
    browseToggle?.addEventListener('change', updateBrowseMode);
    bannerSelect?.addEventListener('change', (e) => { const id = e.target.value; if (id) selectBannerById(id); });
    btnSetTargetFromSelect?.addEventListener('click', () => { const id = bannerSelect.value; if (id) setTarget(id); });
    updateBrowseMode();

    // Auto-select saved target on load
    const tgtId = getTargetId();
    if (tgtId){
        selectBannerById(tgtId);
        const sel = document.getElementById('bannerSelect');
        if (sel) sel.value = tgtId;
    }
});