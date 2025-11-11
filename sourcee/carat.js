(function(){
    const DAILY_INCOME = 75;
    // Mon..Sun pattern (0=Sunday in JS, but we will map to Monday-start)
    // We'll define for Monday-start index: 0..6 => Mon..Sun
    const LOGIN_PATTERN = [25, 0, 25, 0, 25, 0, 75];

    const PVP_VALUES = {
        5: { promotion: 420, retention: 360, demotion: 250 },
        6: { promotion: null, retention: 420, demotion: 250 }
    };

    function nextMonday(date){
        const d = new Date(date);
        const day = d.getDay(); // 0..6 Sun..Sat
        const daysToAdd = (8 - (day === 0 ? 7 : day)) % 7 || 7; // days until next Monday
        d.setDate(d.getDate() + daysToAdd);
        d.setHours(0,0,0,0);
        return d;
    }

    function mondayIndex(date){
        // Return index 0..6 for Monday..Sunday for given date
        const day = date.getDay(); // 0 Sun .. 6 Sat
        // Convert JS day to Monday-start index
        return (day + 6) % 7; // Mon->0, Tue->1, ..., Sun->6
    }

    function sumLoginBonusesUntilNextMonday(fromDate){
        const start = new Date(fromDate);
        start.setHours(0,0,0,0);
        const end = nextMonday(start);
        let total = 0;
        for (let d = new Date(start); d < end; d.setDate(d.getDate()+1)){
            const idx = mondayIndex(d);
            total += LOGIN_PATTERN[idx] || 0;
        }
        return total;
    }

    function daysUntilNextMonday(fromDate){
        const start = new Date(fromDate);
        start.setHours(0,0,0,0);
        const end = nextMonday(start);
        const diffMs = end - start;
        return Math.floor(diffMs / (1000*60*60*24));
    }

    function computePvpReward(cls, outcome){
        const v = PVP_VALUES[cls] || {};
        const amt = v[outcome];
        return typeof amt === 'number' ? amt : 0;
    }

    function recalc(){
        const current = Number(document.getElementById('currentCarrats')?.value || 0);
        const cls = Number(document.getElementById('pvpClass')?.value || 5);
        let outcome = document.getElementById('pvpOutcome')?.value || 'retention';
        const hovering = document.getElementById('hoverToggle')?.checked || false;

        // Disable Promotion when class 6 is selected
        const outcomeSel = document.getElementById('pvpOutcome');
        if (cls === 6){
            Array.from(outcomeSel.options).forEach(opt => {
                if (opt.value === 'promotion') opt.disabled = true; else opt.disabled = false;
            });
            if (outcome === 'promotion') outcome = 'retention';
            outcomeSel.value = outcome;
        } else {
            Array.from(outcomeSel.options).forEach(opt => { opt.disabled = false; });
        }

        const today = new Date();
        const days = daysUntilNextMonday(today);
        const dailyIncome = days * DAILY_INCOME;
        const loginIncome = sumLoginBonusesUntilNextMonday(today);
        const pvpIncome = computePvpReward(cls, outcome);

        // Update UI
        document.getElementById('dailyIncome').textContent = `+${dailyIncome}`;
        document.getElementById('loginIncome').textContent = `+${loginIncome}`;
        document.getElementById('pvpIncome').textContent = `+${pvpIncome}`;
        const total = dailyIncome + loginIncome + pvpIncome;
        document.getElementById('totalIncome').textContent = `+${total}`;
        document.getElementById('projectedCarrats').textContent = `${current + total}`;

        // Hovering note (no change to math for now)
        if (hovering){
            // Optionally we could compute a range; keep as-is but could show tooltip later
        }
    }

    document.addEventListener('DOMContentLoaded', function(){
        ['currentCarrats','pvpClass','pvpOutcome','hoverToggle'].forEach(id => {
            const el = document.getElementById(id);
            if (el){
                el.addEventListener('input', recalc);
                el.addEventListener('change', recalc);
            }
        });
        recalc();
    });
})();
