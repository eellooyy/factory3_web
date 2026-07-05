/* js/factory3_contrast_render.js */
(function () {
    'use strict';

    function renderAllRows() {
        const targetStr = window.FC_MAIN.state.selectedDate || window.FC_CONST.yesterdayStr();
        const dates = window.FC_API.getDatesRange(targetStr);
        const rows = dates.map(ds => window.FC_API.buildRow(ds));

        // 오타 완전 수정 완료 (h6('')에서 h6=''으로 원복)
        let h1='', h2='', h3='', h4='', h5='', h6='';

        rows.forEach(row => {
            const d = new Date(row.date + 'T00:00:00');
            const trC = row.date === window.FC_CONST.yesterdayStr() ? 'f3ct-row-today' : '';
            const wd = d.getDay();
            const wdC = wd === 6 ? 'f3ct-sat' : wd === 0 ? 'f3ct-sun' : '';
            const m = window.FC_CONST.pad(d.getMonth()+1), dy = window.FC_CONST.pad(d.getDate()), wn = window.FC_CONST.WD_KR[wd];
            const dateTd = `<td class="f3ct-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            h1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${window.FC_API.fmtNum(row.jigo_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${window.FC_API.fmtNum(row.jigo_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${window.FC_API.fmtNum(row.jigo_sum, row.date)}</td>
            </tr>`;
            h2 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${window.FC_API.fmtNum(row.geupji_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${window.FC_API.fmtNum(row.geupji_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${window.FC_API.fmtNum(row.geupji_sum, row.date)}</td>
            </tr>`;
            h3 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${window.FC_API.fmtNum(row.real_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${window.FC_API.fmtNum(row.real_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${window.FC_API.fmtNum(row.real_sum, row.date)}</td>
            </tr>`;
            h4 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${window.FC_API.fmtNum(row.erp_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${window.FC_API.fmtNum(row.erp_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${window.FC_API.fmtNum(row.erp_sum, row.date)}</td>
            </tr>`;
            h5 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell" data-col="1">${window.FC_API.fmtNum(row.diff_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${window.FC_API.fmtNum(row.diff_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${window.FC_API.fmtNum(row.diff_sum, row.date)}</td>
            </tr>`;
            h6 += `<tr class="${trC}" data-date="${row.date}">
                <td class="f3ct-data-cell f3ct-sum-col" data-col="1">${window.FC_API.fmtNum(row.jeunggam, row.date)}</td>
            </tr>`;
        });

        document.getElementById('f3ctBody1').innerHTML = h1;
        document.getElementById('f3ctBody2').innerHTML = h2;
        document.getElementById('f3ctBody3').innerHTML = h3;
        document.getElementById('f3ctBody4').innerHTML = h4;
        document.getElementById('f3ctBody5').innerHTML = h5;
        document.getElementById('f3ctBody6').innerHTML = h6;
    }

    function clearHighlights() {
        document.querySelectorAll('.f3ct-selected-row').forEach(e => e.classList.remove('f3ct-selected-row'));
        document.querySelectorAll('.f3ct-selected-cell').forEach(e => e.classList.remove('f3ct-selected-cell'));
        document.querySelectorAll('.f3ct-header-active').forEach(e => e.classList.remove('f3ct-header-active')); 
        [1,2,3,4,5,6].forEach(i => { const c = document.getElementById(`f3ctCursor${i}`); if (c) c.classList.remove('active'); });
    }

    function applyHighlight(panelIdx, ds, col) {
        clearHighlights();
        window.FC_MAIN.state.selectedDate = ds; 
        window.FC_MAIN.state.selectedPanel = panelIdx; 
        window.FC_MAIN.state.selectedCol = col;

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

    function scrollToActiveCell(idx) {
        const pan = document.getElementById(`f3ctScrollPanel${idx}`);
        const td  = document.querySelector(`#f3ctBody${idx} tr[data-date="${window.FC_MAIN.state.selectedDate}"] td[data-col="${window.FC_MAIN.state.selectedCol}"]`);
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
                window.FC_CONST.PIDS.forEach(id => { 
                    const p = document.getElementById(id); 
                    if (p) p.scrollTop = targetScrollTop; 
                });
            }
        }), 120);
    }

    window.FC_RENDER = {
        renderAllRows: renderAllRows,
        clearHighlights: clearHighlights,
        applyHighlight: applyHighlight,
        scrollToActiveCell: scrollToActiveCell,
        scrollToDate: scrollToDate
    };
})();