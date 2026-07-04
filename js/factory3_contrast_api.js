/* js/factory3_contrast_api.js */
(function () {
    'use strict';

    const dataCache = {};

    function getDatesRange(targetDateStr) {
        const dates = [];
        const baseDate = new Date(targetDateStr + 'T00:00:00');
        for (let i = -15; i <= 15; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            dates.push(`${d.getFullYear()}-${window.FC_CONST.pad(d.getMonth()+1)}-${window.FC_CONST.pad(d.getDate())}`);
        }
        return dates;
    }

    function fmtNum(v, ds) {
        const rowDate = new Date(ds + 'T00:00:00');
        const yesterdayDate = new Date(window.FC_CONST.yesterdayStr() + 'T00:00:00'); 

        if (rowDate > yesterdayDate) {
            return '<span class="f3ct-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3ct-empty">0</span>';
        return `<span${n < 0 ? ' class="f3ct-negative"' : ''}>${n.toLocaleString()}</span>`;
    }

    function buildRow(ds) {
        if (!dataCache[ds]) {
            const isPast = new Date(ds + 'T00:00:00') <= new Date(window.FC_CONST.yesterdayStr() + 'T00:00:00');
            dataCache[ds] = {
                jigo_a: isPast ? Math.floor(Math.random() * 400000) + 100000 : 0,
                jigo_d: isPast ? Math.floor(Math.random() * 80000) + 20000 : 0,
                geupji_a: isPast ? Math.floor(Math.random() * 50000) : 0,
                geupji_d: isPast ? Math.floor(Math.random() * 15000) : 0,
                erp_a: isPast ? Math.floor(Math.random() * 420000) + 90000 : 0,
                erp_d: isPast ? Math.floor(Math.random() * 85000) + 15000 : 0
            };
        }
        const d = dataCache[ds];
        const real_a = (d.jigo_a || 0) + (d.geupji_a || 0);
        const real_d = (d.jigo_d || 0) + (d.geupji_d || 0);
        const diff_a = real_a - (d.erp_a || 0);
        const diff_d = real_d - (d.erp_d || 0);

        return { 
            date: ds,
            jigo_a: d.jigo_a, jigo_d: d.jigo_d, jigo_sum: d.jigo_a + d.jigo_d,
            geupji_a: d.geupji_a, geupji_d: d.geupji_d, geupji_sum: d.geupji_a + d.geupji_d,
            real_a, real_d, real_sum: real_a + real_d,
            erp_a: d.erp_a, erp_d: d.erp_d, erp_sum: d.erp_a + d.erp_d,
            diff_a, diff_d, diff_sum: diff_a + diff_d,
            jeunggam: diff_a + diff_d 
        };
    }

    window.FC_API = {
        dataCache: dataCache,
        getDatesRange: getDatesRange,
        fmtNum: fmtNum,
        buildRow: buildRow
    };
})();