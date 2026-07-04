/* js/factory3_contrast_script.js */
(function () {
    'use strict';

    const WD_KR = ['일', '월', '화', '수', '목', '금', '토'];

    const todayObj = new Date();
    const yesterdayObj = new Date();
    yesterdayObj.setDate(todayObj.getDate() - 1);

    function pad(n) { return String(n).padStart(2, '0'); }
    
    function todayStr() {
        return `${todayObj.getFullYear()}-${pad(todayObj.getMonth()+1)}-${pad(todayObj.getDate())}`;
    }
    
    function yesterdayStr() {
        return `${yesterdayObj.getFullYear()}-${pad(yesterdayObj.getMonth()+1)}-${pad(yesterdayObj.getDate())}`;
    }

    const state = {
        selectedDate: yesterdayStr(),
        selectedPanel: null,
        selectedCol: null,
    };

    let dataCache = {};
    const PIDS = ['f3ctScrollPanel1', 'f3ctScrollPanel2', 'f3ctScrollPanel3', 'f3ctScrollPanel4', 'f3ctScrollPanel5', 'f3ctScrollPanel6'];

    function getDatesRange(targetDateStr) {
        const dates = [];
        const baseDate = new Date(targetDateStr + 'T00:00:00');
        for (let i = -15; i <= 15; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            dates.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
        }
        return dates;
    }

    function fmtNum(v, ds) {
        const rowDate = new Date(ds + 'T00:00:00');
        const yesterdayDate = new Date(yesterdayStr() + 'T00:00:00'); 

        if (rowDate > yesterdayDate) {
            return '<span class="f3ct-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3ct-empty">0</span>';
        return `<span${n < 0 ? ' class="f3ct-negative"' : ''}>${n.toLocaleString()}</span>`;
    }

    function buildRow(ds) {
        if (!dataCache[ds]) {
            const isPast = new Date(ds + 'T00:00:00') <= new Date(yesterdayStr() + 'T00:00:00');
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

    function renderAllRows() {
        const targetStr = state.selectedDate || yesterdayStr();
        const dates = getDatesRange(targetStr);
        const rows = dates.map(ds => buildRow(ds));

        let h1='', h2='', h3='', h4='', h5='', h6='';

        rows.forEach(row => {
            const d = new Date(row.date + 'T00:00:00');
            const trC = row.date === yesterdayStr() ? 'f3ct-row-today' : '';
            const wd = d.getDay();
            const wdC = wd === 6 ? 'f3ct-sat' : wd === 0 ? 'f3ct-sun' : '';
            const m = pad(d.getMonth()+1), dy = pad(d.getDate()), wn = WD_KR[wd];
            const dateTd = `<td class="f3ct-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            h1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.jigo_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.jigo_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.jigo_sum, row.date)}</td>
            </tr>`;
            h2 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.geupji_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.geupji_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.geupji_sum, row.date)}</td>
            </tr>`;
            h3 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.real_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.real_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.real_sum, row.date)}</td>
            </tr>`;
            h4 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.erp_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.erp_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.erp_sum, row.date)}</td>
            </tr>`;
            h5 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.diff_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.diff_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.diff_sum, row.date)}</td>
            </tr>`;
            h6 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell f3ct-sum-col" data-col="1">${fmtNum(row.jeunggam, row.date)}</td>
            </tr>`;
        });

        document.getElementById('f3ctBody1').innerHTML = h1;
        document.getElementById('f3ctBody2').innerHTML = h2;
        document.getElementById('f3ctBody3').innerHTML = h3;
        document.getElementById('f3ctBody4').innerHTML = h4;
        document.getElementById('f3ctBody5').innerHTML = h5;
        document.getElementById('f3ctBody6').innerHTML = h6;
    }

    let _syncLock = false;
    function bindScrollSync() {
        PIDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('scroll', () => {
                if (_syncLock) return;
                _syncLock = true;
                const top = el.scrollTop;
                PIDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if(t) t.scrollTop = top;
                });
                // 스크롤 시 강조가 풀리지 않도록 clearHighlights() 제거
                _syncLock = false;
            });
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.f3ct-selected-row').forEach(e => e.classList.remove('f3ct-selected-row'));
        document.querySelectorAll('.f3ct-selected-cell').forEach(e => e.classList.remove('f3ct-selected-cell'));
        document.querySelectorAll('.f3ct-header-active').forEach(e => e.classList.remove('f3ct-header-active')); 
        [1,2,3,4,5,6].forEach(i => { const c = document.getElementById(`f3ctCursor${i}`); if (c) c.classList.remove('active'); });
    }

    function applyHighlight(panelIdx, ds, col) {
        clearHighlights();
        state.selectedDate = ds; state.selectedPanel = panelIdx; state.selectedCol = col;

        [1,2,3,4,5,6].forEach(i => {
            const tr = document.querySelector(`#f3ctBody${i} tr[data-date="${ds}"]`);
            if (tr) tr.classList.add('f3ct-selected-row');
        });

        const td = document.querySelector(`#f3ctBody${panelIdx} tr[data-date="${ds}"] td[data-col="${col}"]`);
        if (td) {
            td.classList.add('f3ct-selected-cell');
            const cur = document.getElementById(`f3ctCursor${panelIdx}`);
            const pan = document.getElementById(`f3ctScrollPanel${panelIdx}`);
            
            if(cur && pan) {
                let top=0, left=0, el=td;
                while(el && el!==pan && el!==document.body) { top+=el.offsetTop; left+=el.offsetLeft; el=el.offsetParent; }
                cur.style.width = td.offsetWidth+'px'; cur.style.height = td.offsetHeight+'px';
                cur.style.left = left+'px'; cur.style.top = top+'px';
                cur.classList.add('active');
            }

            if (pan) {
                const lv2 = pan.querySelector(`.f3ct-thead-lv2 th[data-col="${col}"]`);
                if (lv2) {
                    lv2.classList.add('f3ct-header-active');
                    const lv1 = pan.querySelector(`.f3ct-thead-lv1 th.f3ct-group-th`);
                    if (lv1) lv1.classList.add('f3ct-header-active');
                }
            }
        }
    }

    function bindClicks() {
        [1,2,3,4,5,6].forEach(i => {
            const b = document.getElementById(`f3ctBody${i}`);
            if(!b) return;
            b.addEventListener('click', e => {
                const td = e.target.closest('td[data-col]');
                if (!td) return;
                const tr = td.closest('tr[data-date]');
                applyHighlight(i, tr.getAttribute('data-date'), td.getAttribute('data-col'));
            });
        });
    }

    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (!state.selectedDate || !state.selectedPanel || !state.selectedCol) return;
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
            e.preventDefault();

            let panelIdx = Number(state.selectedPanel);
            let colNum   = Number(state.selectedCol);
            const body   = document.getElementById(`f3ctBody${panelIdx}`);
            if (!body) return;
            const curRow = body.querySelector(`tr[data-date="${state.selectedDate}"]`);
            if (!curRow) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const target = e.key === 'ArrowUp' ? curRow.previousElementSibling : curRow.nextElementSibling;
                if (target && target.getAttribute('data-date')) {
                    applyHighlight(panelIdx, target.getAttribute('data-date'), String(colNum));
                    scrollToActiveCell(panelIdx);
                }
            } else {
                const colCount = { 1:3, 2:3, 3:3, 4:3, 5:3, 6:1 };
                
                if (e.key === 'ArrowLeft') {
                    colNum--;
                    if (colNum < 1) { 
                        if (panelIdx > 1) { panelIdx--; colNum = colCount[panelIdx]; } 
                        else colNum = 1; 
                    }
                } else {
                    colNum++;
                    if (colNum > colCount[panelIdx]) { 
                        if (panelIdx < 6) { panelIdx++; colNum = 1; } 
                        else colNum = colCount[panelIdx]; 
                    }
                }
                applyHighlight(panelIdx, state.selectedDate, String(colNum));
                scrollToActiveCell(panelIdx);
            }
        });
    }

    function scrollToActiveCell(idx) {
        const pan = document.getElementById(`f3ctScrollPanel${idx}`);
        const td  = document.querySelector(`#f3ctBody${idx} tr[data-date="${state.selectedDate}"] td[data-col="${state.selectedCol}"]`);
        if (!pan || !td) return;
        let top = 0, el = td;
        while (el && el !== pan && el !== document.body) { top += el.offsetTop; el = el.offsetParent; }
        const bot = top + td.offsetHeight;
        if (bot > pan.scrollTop + pan.clientHeight) pan.scrollTop = bot - pan.clientHeight + 10;
        else if (top < pan.scrollTop + 80)           pan.scrollTop = top - 80 - 10; 
    }

    function scrollToDate(targetDate) {
        setTimeout(() => requestAnimationFrame(() => {
            const row = document.querySelector(`#f3ctBody1 tr[data-date="${targetDate}"]`);
            if (row) {
                const pan = document.getElementById('f3ctScrollPanel1');
                let top = 0, el = row;
                while (el && el !== pan && el !== document.body) { 
                    top += el.offsetTop; 
                    el = el.offsetParent; 
                }
                const targetScrollTop = top - (pan.clientHeight / 3.5); 
                PIDS.forEach(id => { 
                    const p = document.getElementById(id); 
                    if (p) p.scrollTop = targetScrollTop; 
                });
            }
        }), 120);
    }

    const Module = {
        init: function () {
            bindScrollSync(); 
            bindClicks();
            bindKeyboardNav();

            if (window.Factory3Header) {
                window.Factory3Header.init({
                    idPrefix: 'Contrast',
                    onDateChange: (ds) => {
                        state.selectedDate = ds;
                        clearHighlights();
                        renderAllRows(); 
                        scrollToDate(ds); 
                    }, 
                    onSave: () => {} 
                });
            }

            state.selectedDate = yesterdayStr();
            renderAllRows();
            scrollToDate(yesterdayStr());
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Module.init);
    else Module.init();

})();