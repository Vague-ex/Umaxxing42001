(function(){
    const client = window.supabaseClient;
    const TABLES = {
        characters: { name: 'Character Banners', cols: ['id','name','version','rarity','rate','start_date','end_date','is_rerun','is_limited','banner_image'] },
        supports: { name: 'Support Card Banners', cols: ['id','name','type','rarity','rate','start_date','end_date','is_rerun','is_limited','banner_image'] }
    };

    function val(v){ return v === undefined || v === null ? '' : v; }

    function toIsoDateIfNeeded(s){
        if (!s) return s;
        if (typeof s !== 'string') return s;
        const parts = s.split('/');
        if (parts.length === 3){
            const d = parts[0].padStart(2,'0');
            const m = parts[1].padStart(2,'0');
            const y = parts[2];
            return `${y}-${m}-${d}`; // yyyy-mm-dd
        }
        return s;
    }

    function normalizePayload(obj){
        const out = {...obj};
        if ('is_rerun' in out) out.is_rerun = !!out.is_rerun;
        if ('is_limited' in out) out.is_limited = !!out.is_limited;
        if ('rate' in out && out.rate !== '') out.rate = Number(out.rate);
        if ('start_date' in out) out.start_date = toIsoDateIfNeeded(out.start_date);
        if ('end_date' in out) out.end_date = toIsoDateIfNeeded(out.end_date);
        return out;
    }

    function showError(prefix, err){
        console.error(prefix, err);
        alert(prefix + ': ' + (err?.message || JSON.stringify(err)) + (err?.hint ? ('\nHint: ' + err.hint) : ''));
    }

    async function fetchAll(table){
        const { data, error } = await client.from(table).select('*').order('id');
        if (error){ showError('Fetch error', error); return []; }
        return data || [];
    }

    function renderTable(tbodyId, rows, isSupport){
        const tbody = document.getElementById(tbodyId);
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(buildRow(r, isSupport)));
    }

    function buildRow(r, isSupport){
        const tr = document.createElement('tr');
        const cols = isSupport ? TABLES.supports.cols : TABLES.characters.cols;
        cols.forEach(c => {
            const td = document.createElement('td');
            if (c === 'id'){
                td.textContent = r[c];
            } else if (c === 'is_rerun' || c === 'is_limited'){
                td.innerHTML = `<input type=\"checkbox\" ${r[c] ? 'checked' : ''} class=\"form-check-input\">`;
            } else {
                td.innerHTML = `<input type=\"text\" class=\"form-control form-control-sm\" value=\"${val(r[c])}\">`;
            }
            tr.appendChild(td);
        });
        const tdActions = document.createElement('td');
        tdActions.innerHTML = `<div class=\"d-flex gap-1\"><button class=\"btn btn-sm btn-success\">Save</button><button class=\"btn btn-sm btn-danger\">Delete</button></div>`;
        tdActions.children[0].addEventListener('click', async ()=>{
            const inputs = tr.querySelectorAll('input');
            const payload = {};
            let idx = 0;
            cols.forEach((c) => {
                if (c === 'id'){ return; }
                const input = inputs[idx++];
                if (c === 'is_rerun' || c === 'is_limited') payload[c] = input.checked; else payload[c] = input.value;
            });
            const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
            const norm = normalizePayload(payload);
            const { error } = await client.from(tableName).update(norm).eq('id', r.id);
            if (error){ showError('Save error', error); } else { await refresh(); }
        });
        tdActions.children[1].addEventListener('click', async ()=>{
            if (!confirm('Delete this row?')) return;
            const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
            const { error } = await client.from(tableName).delete().eq('id', r.id);
            if (error){ showError('Delete error', error); } else { await refresh(); }
        });
        tr.appendChild(tdActions);
        return tr;
    }

    function insertInlineRow(tbodyId, isSupport){
        const tbody = document.getElementById(tbodyId);
        const cols = isSupport ? TABLES.supports.cols : TABLES.characters.cols;
        const tr = document.createElement('tr');
        cols.forEach(c => {
            const td = document.createElement('td');
            if (c === 'id'){
                td.innerHTML = '<span class="text-muted">(auto)</span>';
            } else if (c === 'is_rerun' || c === 'is_limited'){
                td.innerHTML = `<input type=\"checkbox\" class=\"form-check-input\">`;
            } else {
                td.innerHTML = `<input type=\"text\" class=\"form-control form-control-sm\" placeholder=\"${c}\">`;
            }
            tr.appendChild(td);
        });
        const tdActions = document.createElement('td');
        tdActions.innerHTML = `<div class=\"d-flex gap-1\"><button class=\"btn btn-sm btn-primary\">Create</button><button class=\"btn btn-sm btn-outline-secondary\">Cancel</button></div>`;
        tdActions.children[0].addEventListener('click', async ()=>{
            const inputs = tr.querySelectorAll('input');
            const payload = {};
            let idx = 0;
            cols.forEach((c)=>{
                if (c === 'id') return;
                const input = inputs[idx++];
                if (c === 'is_rerun' || c === 'is_limited') payload[c] = input.checked; else payload[c] = input.value;
            });
            const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
            const norm = normalizePayload(payload);
            const { error } = await client.from(tableName).insert(norm);
            if (error){ showError('Insert error', error); } else { await refresh(); }
        });
        tdActions.children[1].addEventListener('click', async ()=>{ await refresh(); });
        tr.appendChild(tdActions);
        tbody.prepend(tr);
    }

    async function refresh(){
        const chars = await fetchAll(TABLES.characters.name); renderTable('charTableBody', chars, false);
        const supps = await fetchAll(TABLES.supports.name); renderTable('suppTableBody', supps, true);
    }

    document.addEventListener('DOMContentLoaded', function(){
        document.getElementById('addCharRow')?.addEventListener('click', ()=> insertInlineRow('charTableBody', false));
        document.getElementById('addSuppRow')?.addEventListener('click', ()=> insertInlineRow('suppTableBody', true));
        refresh();
    });

    window.addEventListener('admin:open', refresh);
})();
