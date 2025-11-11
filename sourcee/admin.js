(function(){
    const client = window.supabaseClient;
    const TABLES = {
        characters: { name: 'Character Banners', cols: ['id','name','version','rarity','rate','start_date','end_date','is_rerun','is_limited','banner_image'] },
        supports: { name: 'Support Card Banners', cols: ['id','name','type','rarity','rate','start_date','end_date','is_rerun','is_limited','banner_image'] }
    };

    function val(v){ return v === undefined || v === null ? '' : v; }

    async function fetchAll(table){
        const { data, error } = await client.from(table).select('*').order('id');
        if (error){ console.error('Admin fetch error', table, error); return []; }
        return data || [];
    }

    function renderTable(tbodyId, rows, isSupport){
        const tbody = document.getElementById(tbodyId);
        tbody.innerHTML = '';
        rows.forEach(r => {
            const tr = document.createElement('tr');
            const cols = isSupport ? TABLES.supports.cols : TABLES.characters.cols;
            cols.forEach(c => {
                const td = document.createElement('td');
                if (c === 'id'){
                    td.textContent = r[c];
                } else if (c === 'is_rerun' || c === 'is_limited'){
                    td.innerHTML = `<input type="checkbox" ${r[c] ? 'checked' : ''} class="form-check-input">`;
                } else {
                    td.innerHTML = `<input type="text" class="form-control form-control-sm" value="${val(r[c])}">`;
                }
                tr.appendChild(td);
            });
            const tdActions = document.createElement('td');
            tdActions.innerHTML = `<div class="d-flex gap-1"><button class="btn btn-sm btn-success">Save</button><button class="btn btn-sm btn-danger">Delete</button></div>`;
            // Save
            tdActions.children[0].addEventListener('click', async ()=>{
                const inputs = tr.querySelectorAll('input');
                const payload = {};
                let idx = 0;
                (isSupport ? TABLES.supports.cols : TABLES.characters.cols).forEach((c, i) => {
                    if (c === 'id'){ return; }
                    const input = inputs[idx++];
                    if (c === 'is_rerun' || c === 'is_limited'){
                        payload[c] = input.checked;
                    } else {
                        payload[c] = input.value;
                    }
                });
                const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
                const { error } = await client.from(tableName).update(payload).eq('id', r.id);
                if (error){ alert('Save error: ' + (error.message || error)); }
                else { await refresh(); }
            });
            // Delete
            tdActions.children[1].addEventListener('click', async ()=>{
                if (!confirm('Delete this row?')) return;
                const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
                const { error } = await client.from(tableName).delete().eq('id', r.id);
                if (error){ alert('Delete error: ' + (error.message || error)); }
                else { await refresh(); }
            });
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    }

    function makeBlankRow(isSupport){
        const row = {};
        (isSupport ? TABLES.supports.cols : TABLES.characters.cols).forEach(c => {
            row[c] = '';
        });
        return row;
    }

    async function addNew(isSupport){
        const tableName = isSupport ? TABLES.supports.name : TABLES.characters.name;
        const row = makeBlankRow(isSupport);
        // remove id for insert (auto or user edits later)
        delete row.id;
        const { error } = await client.from(tableName).insert(row);
        if (error){ alert('Add error: ' + (error.message || error)); }
        else { await refresh(); }
    }

    async function refresh(){
        const chars = await fetchAll(TABLES.characters.name);
        renderTable('charTableBody', chars, false);
        const supps = await fetchAll(TABLES.supports.name);
        renderTable('suppTableBody', supps, true);
    }

    document.addEventListener('DOMContentLoaded', function(){
        document.getElementById('addCharRow')?.addEventListener('click', ()=> addNew(false));
        document.getElementById('addSuppRow')?.addEventListener('click', ()=> addNew(true));
        // Standalone page: refresh immediately
        refresh();
    });

    // Modal-based fallback
    window.addEventListener('admin:open', refresh);
})();
