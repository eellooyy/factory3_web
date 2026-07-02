/* js/factory3_contrast_script.js */
(function () {
    'use strict';

    // 향후 Supabase 연결 시 활성화
    // const supabaseUrl = 'YOUR_URL';
    // const supabaseKey = 'YOUR_KEY';
    // const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const WD_KR = ['일', '월', '화', '수', '목', '금', '토'];

    const state = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        loading: false,
        selectedDate: null,
        selectedPanel: null,
        selectedCol: null,
    };

    let dataCache = {};
    let oldestYear = state.year;
    let oldestMonth = state.month;
    let isLoadingPrev = false;
    let headerApi = null;

    // --- 유틸 함수 ---
    function pad(n) { return String(n).padStart(2, '0'); }
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function yesterdayStr() {
        const t = new Date(); t.setDate(t.getDate() - 1);
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function fmtKo(ds) {
        const d = new Date(ds + 'T00:00:00');
        return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${WD_KR[d.getDay()]})`;
    }
    function getDatesOfMonth(y, m) {
        return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${y}-${pad(m)}-${pad(i+1)}`);
    }

    // 숫자 렌더링 (음수일 경우 캡처본처럼 빨간색 처리 적용)
    function fmtNum(v, ds, allowToday = false) {
        const rowDate = new Date(ds + 'T00:00:00');
        const todayDate = new Date(todayStr() + 'T00:00:00');

        if (rowDate > todayDate || (rowDate.getTime() === todayDate.getTime() && !allowToday)) {
            return '<span class="f3ct-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3ct-empty">0</span>';
        return `<span${n < 0 ? ' class="f3ct-negative"' : ''}>${n.toLocaleString()}</span>`;
    }

    function updateDateText(str) {
        const el = document.getElementById('gf3ContrastDateText');
        if (el) el.textContent = str ? fmtKo(str) : '';
    }

    // --- 데이터 시뮬레이션 및 수식 계산 ---
    function buildRow(ds) {
        if (!dataCache[ds]) {
            // 초기 더미 데이터 생성 (추후 DB 연동 시 로드 로직으로 교체)
            const isPast = new Date(ds + 'T00:00:00') <= new Date();
            dataCache[ds] = {
                jigo_a: isPast ? 0 : 0, jigo_d: isPast ? 0 : 0,
                geupji_a: isPast ? 0 : 0, geupji_d: isPast ? 0 : 0,
                erp_a: isPast ? Math.floor(Math.random() * -50000) : 0,
                erp_d: isPast ? Math.floor(Math.random() * 5000) : 0
            };
        }
        const d = dataCache[ds];
        
        // 1. 실재고 (Real) = 지고 + 급지
        const real_a = (d.jigo_a || 0) + (d.geupji_a || 0);
        const real_d = (d.jigo_d || 0) + (d.geupji_d || 0);
        
        // 2. 실재고 - ERP 재고
        const diff_a = real_a - (d.erp_a || 0);
        const diff_d = real_d - (d.erp_d || 0);

        return { 
            date: ds,
            jigo_a: d.jigo_a, jigo_d: d.jigo_d, jigo_sum: d.jigo_a + d.jigo_d,
            geupji_a: d.geupji_a, geupji_d: d.geupji_d, geupji_sum: d.geupji_a + d.geupji_d,
            real_a, real_d, real_sum: real_a + real_d,
            erp_a: d.erp_a, erp_d: d.erp_d, erp_sum: d.erp_a + d.erp_d,
            diff_a, diff_d, diff_sum: diff_a + diff_d,
            // 증감: 차이 합계로 임시 맵핑 (또는 필요에 따라 전일 대비 등으로 수정 가능)
            jeunggam: diff_a + diff_d 
        };
    }

    // --- HTML 렌더링 ---
    function generateRowsHTML(rows) {
        let h1='', h2='', h3='';
        rows.forEach(row => {
            const d = new Date(row.date + 'T00:00:00');
            const trC = row.date === yesterdayStr() ? 'f3ct-row-today' : '';
            const wd = d.getDay();
            const wdC = wd === 6 ? 'f3ct-sat' : wd === 0 ? 'f3ct-sun' : '';
            const m = pad(d.getMonth()+1), dy = pad(d.getDate()), wn = WD_KR[wd];

            const dateTd = `<td class="f3ct-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;
            const resDateTd = `<td class="f3ct-date-td f3ct-responsive-date ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            // Panel 1: 날짜, 지고, 급지
            h1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.jigo_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.jigo_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.jigo_sum, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sep" data-col="4">${fmtNum(row.geupji_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="5">${fmtNum(row.geupji_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="6">${fmtNum(row.geupji_sum, row.date)}</td>
            </tr>`;

            // Panel 2: 실재고, ERP (편집 가능)
            h2 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.real_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.real_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.real_sum, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sep f3ct-editable-cell" data-col="4">${fmtNum(row.erp_a, row.date, true)}</td>
                <td class="f3ct-data-cell f3ct-editable-cell" data-col="5">${fmtNum(row.erp_d, row.date, true)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="6">${fmtNum(row.erp_sum, row.date, true)}</td>
            </tr>`;

            // Panel 3: 실재고-ERP, 증감
            h3 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.diff_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.diff_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.diff_sum, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sep f3ct-sum-col" data-col="4">${fmtNum(row.jeunggam, row.date)}</td>
            </tr>`;
        });
        return { h1, h2, h3 };
    }

    function renderAllRows() {
        const dates = getDatesOfMonth(state.year, state.month);
        const rows = dates.map(ds => buildRow(ds));
        const html = generateRowsHTML(rows);
        document.getElementById('f3ctBody1').innerHTML = html.h1;
        document.getElementById('f3ctBody2').innerHTML = html.h2;
        document.getElementById('f3ctBody3').innerHTML = html.h3;
    }

    // --- 편집 모드 핸들링 (ERP 데이터 수정) ---
    function onEditModeEnter() {
        if (!state.selectedDate) {
            alert('ERP 재고를 수정할 날짜 행을 선택해주세요.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }
        const ds = state.selectedDate;
        const d = dataCache[ds] || {};
        const row2 = document.querySelector(`#f3ctBody2 tr[data-date="${ds}"]`);
        if (!row2) return;

        const tdErpA = row2.querySelector('td[data-col="4"]');
        const tdErpD = row2.querySelector('td[data-col="5"]');

        function makeInput(val) {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.value = val;
            inp.className = 'f3ct-in-input';
            return inp;
        }

        if (tdErpA) {
            tdErpA.innerHTML = '';
            const inpA = makeInput(d.erp_a || 0);
            tdErpA.appendChild(inpA);
            inpA.focus(); inpA.select();
            inpA.addEventListener('keydown', e => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    const inpD = row2.querySelector('td[data-col="5"] .f3ct-in-input');
                    if (inpD) { inpD.focus(); inpD.select(); }
                }
            });
        }
        if (tdErpD) {
            tdErpD.innerHTML = '';
            const inpD = makeInput(d.erp_d || 0);
            tdErpD.appendChild(inpD);
            inpD.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('gf3ContrastSaveBtn').click();
                }
            });
        }
    }

    function onEditModeExit() { renderAllRows(); }

    async function handleSave() {
        if (!state.selectedDate) return;
        const ds = state.selectedDate;
        const row = document.querySelector(`#f3ctBody2 tr[data-date="${ds}"]`);
        const inpA = row ? row.querySelector('td[data-col="4"] .f3ct-in-input') : null;
        const inpD = row ? row.querySelector('td[data-col="5"] .f3ct-in-input') : null;

        const erp_a = inpA ? (parseInt(inpA.value, 10) || 0) : dataCache[ds].erp_a;
        const erp_d = inpD ? (parseInt(inpD.value, 10) || 0) : dataCache[ds].erp_d;

        // DB 연동 시 이 영역에 UPDATE 호출 작성
        dataCache[ds].erp_a = erp_a;
        dataCache[ds].erp_d = erp_d;

        renderAllRows();
        alert('저장되었습니다.');
    }

    // --- 스크롤 동기화 & 커서 (공통 모듈 차용) ---
    let _syncLock = false;
    const PIDS = ['f3ctScrollPanel1', 'f3ctScrollPanel2', 'f3ctScrollPanel3'];

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
        [1,2,3].forEach(i => { const c = document.getElementById(`f3ctCursor${i}`); if (c) c.classList.remove('active'); });
    }

    function applyHighlight(panelIdx, ds, col) {
        if (headerApi && headerApi.isEditMode()) return;
        clearHighlights();
        state.selectedDate = ds; state.selectedPanel = panelIdx; state.selectedCol = col;
        updateDateText(ds);

        [1,2,3].forEach(i => {
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
        [1,2,3].forEach(i => {
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

    function scrollToToday() {
        setTimeout(() => requestAnimationFrame(() => {
            const row = document.querySelector(`#f3ctBody1 tr[data-date="${yesterdayStr()}"]`) || document.querySelector(`#f3ctBody1 tr[data-date="${todayStr()}"]`);
            if (row) {
                const pan = document.getElementById('f3ctScrollPanel1');
                let top=0, el=row;
                while(el && el!==pan && el!==document.body) { top+=el.offsetTop; el=el.offsetParent; }
                PIDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTop = top - pan.clientHeight/3; });
            }
            updateDateText(yesterdayStr());
        }), 100);
    }

    const Module = {
        init: function () {
            bindScrollSync(); bindClicks();

            headerApi = window.Factory3Header.init({
                idPrefix: 'Contrast',
                onDateChange: (ds) => {
                    if (headerApi && headerApi.isEditMode()) onEditModeExit();
                    const d = new Date(ds);
                    state.year = d.getFullYear(); state.month = d.getMonth() + 1;
                    clearHighlights(); renderAllRows();
                },
                onSave: handleSave
            });

            document.getElementById('gf3ContrastEditBtn')?.addEventListener('click', () => {
                setTimeout(() => { headerApi.isEditMode() ? onEditModeEnter() : onEditModeExit(); }, 50);
            });
            document.getElementById('gf3ContrastSaveBtn')?.addEventListener('click', () => {
                setTimeout(() => { if (!headerApi.isEditMode()) onEditModeExit(); }, 200);
            });

            renderAllRows();
            scrollToToday();
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Module.init);
    else Module.init();

})();