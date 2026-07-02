/* js/factory3_contrast_script.js */
(function () {
    'use strict';

    const WD_KR = ['일', '월', '화', '수', '목', '금', '토'];

    // 항상 어제 날짜를 기준으로 달을 잡습니다 (과거 한 달 데이터 포커스)
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);

    const state = {
        year: yesterdayObj.getFullYear(),
        month: yesterdayObj.getMonth() + 1,
        selectedDate: null,
        selectedPanel: null,
        selectedCol: null,
    };

    let dataCache = {};
    const PIDS = ['f3ctScrollPanel1', 'f3ctScrollPanel2', 'f3ctScrollPanel3', 'f3ctScrollPanel4', 'f3ctScrollPanel5', 'f3ctScrollPanel6'];

    function pad(n) { return String(n).padStart(2, '0'); }
    
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    
    function yesterdayStr() {
        return `${yesterdayObj.getFullYear()}-${pad(yesterdayObj.getMonth()+1)}-${pad(yesterdayObj.getDate())}`;
    }
    
    function getDatesOfMonth(y, m) {
        return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${y}-${pad(m)}-${pad(i+1)}`);
    }

    // 어제 날짜를 초과하는 "미래" 데이터는 모두 빈 공간(-)으로 렌더링
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
            // 미래 날짜면 0 세팅, 렌더러에서 빈공간 처리
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
        const dates = getDatesOfMonth(state.year, state.month);
        const rows = dates.map(ds => buildRow(ds));

        let h1='', h2='', h3='', h4='', h5='', h6='';

        rows.forEach(row => {
            const d = new Date(row.date + 'T00:00:00');
            const trC = row.date === yesterdayStr() ? 'f3ct-row-today' : '';
            const wd = d.getDay();
            const wdC = wd === 6 ? 'f3ct-sat' : wd === 0 ? 'f3ct-sun' : '';
            const m = pad(d.getMonth()+1), dy = pad(d.getDate()), wn = WD_KR[wd];

            // 날짜 td는 1번 패널에만 넣기 위해 따로 뺌
            const dateTd = `<td class="f3ct-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            // 패널 1 (날짜 열 포함)
            h1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.jigo_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.jigo_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.jigo_sum, row.date)}</td>
            </tr>`;

            // 패널 2~6 (날짜 열 제거됨, 데이터 열만 존재)
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
                clearHighlights();
                _syncLock = false;
            });
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.f3ct-selected-row').forEach(e => e.classList.remove('f3ct-selected-row'));
        document.querySelectorAll('.f3ct-selected-cell').forEach(e => e.classList.remove('f3ct-selected-cell'));
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

    // 어제 날짜 행이 컨테이너 상단 25% 부근에 오도록 정밀 포커싱
    function scrollToYesterday() {
        setTimeout(() => requestAnimationFrame(() => {
            const targetDate = yesterdayStr();
            const row = document.querySelector(`#f3ctBody1 tr[data-date="${targetDate}"]`);
            if (row) {
                const pan = document.getElementById('f3ctScrollPanel1');
                let top = 0, el = row;
                while (el && el !== pan && el !== document.body) { 
                    top += el.offsetTop; 
                    el = el.offsetParent; 
                }
                const targetScrollTop = top - (pan.clientHeight / 4); // 상단에서 약 25% 지점
                PIDS.forEach(id => { 
                    const p = document.getElementById(id); 
                    if (p) p.scrollTop = targetScrollTop; 
                });
            }
        }), 120);
    }

    // 완전히 사용 불가능하도록 모든 제어 버튼 차단 (안전장치)
    function forceDisableAllButtons() {
        const blockIds = ['gf3ContrastPrevBtn', 'gf3ContrastNextBtn', 'gf3ContrastTodayBtn', 'gf3ContrastEditBtn', 'gf3ContrastSaveBtn'];
        blockIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
                btn.classList.add('style-disabled');
                // 클릭, 호버 등 이벤트 트리거 원천 차단
                btn.style.pointerEvents = 'none'; 
            }
        });
    }

    const Module = {
        init: function () {
            forceDisableAllButtons();
            bindScrollSync(); 
            bindClicks();

            // 헤더 초기화 연계 (읽기 전용 페이지이므로 이벤트를 빈 함수로 봉쇄하여 '나가시겠습니까' 팝업 무력화)
            if (window.Factory3Header) {
                window.Factory3Header.init({
                    idPrefix: 'Contrast',
                    onDateChange: () => {}, 
                    onSave: () => {}
                });
            }

            // 고정된 현재 텍스트(어제 날짜) 강제 삽입
            const dateEl = document.getElementById('gf3ContrastDateText');
            if(dateEl) {
                const d = yesterdayObj;
                dateEl.textContent = `${d.getFullYear()}년 ${d.getMonth()+1}월`; 
                // 캘린더 영역 통째로 클릭 막기
                dateEl.parentElement.style.pointerEvents = 'none';
            }

            renderAllRows();
            scrollToYesterday();
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Module.init);
    else Module.init();

})();