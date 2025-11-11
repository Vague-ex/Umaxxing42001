(function(){
    const DAILY_INCOME = 75;
    const LOGIN_PATTERN = [25, 0, 25, 0, 25, 0, 75]; // Mon..Sun
    const PVP_VALUES = {
        5: { promotion: 420, retention: 360, demotion: 250 },
        6: { promotion: null, retention: 420, demotion: 250 }
    };
    const PULL_COST = 160; // approximate per example 3640 -> ~22 pulls

    function fmt(n){
        return Number(n || 0).toLocaleString();
    }

    function parseDateStr(s){
        if (!s) return null;
        const parts = String(s).split('/');
        if (parts.length === 3){
            const d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);
            const dt = new Date(y,m,d); dt.setHours(0,0,0,0); return dt;
        }
        const d = new Date(s); if (isNaN(d.getTime())) return null; d.setHours(0,0,0,0); return d;
    }
    function mondayIndex(date){ return (date.getDay() + 6) % 7; }

    function countDays(from, to){
        const a = new Date(from); a.setHours(0,0,0,0);
        const b = new Date(to); b.setHours(0,0,0,0);
        return Math.max(0, Math.ceil((b - a) / (1000*60*60*24)));
    }

    function sumLoginBonuses(from, to){
        const start = new Date(from); start.setHours(0,0,0,0);
        const end = new Date(to); end.setHours(0,0,0,0);
        let total = 0;
        for (let d = new Date(start); d < end; d.setDate(d.getDate()+1)){
            total += LOGIN_PATTERN[mondayIndex(d)] || 0;
        }
        return total;
    }

    function nextMonday(date){
        const d = new Date(date); const day = d.getDay();
        const add = (8 - (day === 0 ? 7 : day)) % 7 || 7; d.setDate(d.getDate()+add); d.setHours(0,0,0,0); return d;
    }

    function countWeeklyResets(from, to){
        let count = 0; let n = nextMonday(from);
        while (n <= to){ count++; n.setDate(n.getDate()+7); }
        return count;
    }

    function pvpWeeklyRewardTotal(hovering){
        if (hovering){
            const c5promo = PVP_VALUES[5].promotion || 0;
            const c6demo = PVP_VALUES[6].demotion || 0;
            return c5promo + c6demo; // unstable swings both ways
        }
        return (PVP_VALUES[5].retention || 0) + (PVP_VALUES[6].retention || 0);
    }

    function getInputs(){
        return {
            current: Number(document.getElementById('currentCarrats')?.value || 0),
            cls: Number(document.getElementById('pvpClass')?.value || 5), // kept for future if needed
            outcome: document.getElementById('pvpOutcome')?.value || 'retention', // not used when hovering rule active
            hovering: document.getElementById('hoverToggle')?.checked || false,
            special: Number(document.getElementById('specialEvents')?.value || 0)
        };
    }

    function recalcForBanner(banner){
        const now = new Date(); now.setHours(0,0,0,0);
        const start = parseDateStr(banner?.start_date);
        const end = parseDateStr(banner?.end_date);

        // Determine target horizon
        let target = null; let days = 0;
        if (start && start > now){
            target = start;
            days = countDays(now, start);
        } else if (start && end && end > now){
            target = end;
            days = countDays(now, end);
        } else {
            target = now; days = 0;
        }

        const inputs = getInputs();
        const dailies = days * DAILY_INCOME;
        const weeklies = sumLoginBonuses(now, target);
        const weeks = countWeeklyResets(now, target);
        const pvpPerWeek = pvpWeeklyRewardTotal(inputs.hovering);
        const pvpTotal = weeks * pvpPerWeek;
        const special = inputs.special;

        const total = inputs.current + dailies + weeklies + pvpTotal + special;

        // Update UI
        document.getElementById('calcDays').textContent = `${days} days`;
        document.getElementById('calcStarting').textContent = fmt(inputs.current);
        document.getElementById('calcDailies').textContent = `+${fmt(dailies)}`;
        document.getElementById('calcWeeklies').textContent = `+${fmt(weeklies)}`;
        document.getElementById('calcPvp').textContent = `+${fmt(pvpTotal)}`;
        document.getElementById('calcSpecial').textContent = `+${fmt(special)}`;
        document.getElementById('calcTotal').textContent = fmt(total);
        const pulls = Math.floor(total / PULL_COST);
        document.getElementById('calcPulls').textContent = `This should give you about ${pulls} pulls for the banner!`;
    }

    function wireCommon(){
        ['currentCarrats','pvpClass','pvpOutcome','hoverToggle','specialEvents'].forEach(id => {
            const el = document.getElementById(id);
            if (el){ el.addEventListener('input', () => recalcForBanner(window.__selectedBanner)); el.addEventListener('change', () => recalcForBanner(window.__selectedBanner)); }
        });
    }

    document.addEventListener('DOMContentLoaded', function(){
        wireCommon();
        // Default: no banner selected, keep zeros
        recalcForBanner(null);
    });

    // Respond to selection from right side
    window.addEventListener('banner:selected', (e) => {
        window.__selectedBanner = e.detail;
        recalcForBanner(e.detail);
    });
})();
