// Initialize Supabase Client
const supabaseUrl = 'https://guceyenzaktklmpbcjph.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y2V5ZW56YWt0a2xtcGJjanBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzkwNjEsImV4cCI6MjA3NTIxNTA2MX0.XrSUj3Fp4FnhSJRKJesIM5x_YFT14m-pOaCfAOEiNBI';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

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

    banners.forEach(item => {
        const days = diffDaysFromToday(item.start_date);
        const isPast = days !== null && days < 0;
        const col = document.createElement('div');
        col.className = 'col-12';
        col.innerHTML = `
            <div class="banner-card ${isPast ? 'past' : ''}">
                ${item.banner_image ? `<img src="${item.banner_image}" alt="${item.name}">` : ''}
                <div class="content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="title">${item.name}</div>
                        <span class="badge bg-${item.table === 'character' ? 'primary' : 'info'} banner-badge">${item.table === 'character' ? 'Character' : 'Support'}</span>
                    </div>
                    <div class="text-muted meta">${item.featured || ''}</div>
                    <div class="mt-1">Start: <strong>${formatDate(item.start_date)}</strong>${item.end_date ? ` · End: <strong>${formatDate(item.end_date)}</strong>` : ''}</div>
                </div>
            </div>`;
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

    renderToday();

    // fetch and render
    const [chars, supports] = await Promise.all([
        fetchCharacterBanners(),
        fetchSupportCardBanners()
    ]);
    const combined = normalizeRows(chars, supports);
    renderBanners(combined);
});