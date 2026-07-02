/* js/factory3_contrast_script.js */
(function () {
    'use strict';

    // 향후 마지막 연동 타이밍에 채워넣을 Supabase 초기 설정 가이드부
    // const supabaseUrl = 'YOUR_SUPABASE_URL';
    // const supabaseKey = 'YOUR_SUPABASE_KEY';
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
    let headerApi = null;

    // 패널 식별 아이디 바인딩 (6개 패널 추적 배열식 구조화)
    const PIDS = [
        'f3ctScrollPanel1', 
        'f3ctScrollPanel2', 
        'f3ctScrollPanel3', 
        'f3ctScrollPanel4', 
        'f3ctScrollPanel5', 
        'f3ctScrollPanel6'
    ];

    function pad(n) { return String(n).padStart(2, '0'); }
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function yesterdayStr() {
        const t = new Date(); t.setDate(t.getDate() - 1);
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function fmtKo(ds) {
        const d = new Date(ds + 'T00:00:00');
        return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${WD_KR[d.getDay()]})`;
    }
    function getDatesOfMonth(y, m) {
        return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${y}-${pad(m)}-${pad(i+1)}`);
    }

    function fmtNum(v, ds) {
        const rowDate = new Date(ds + 'T00:00:00');
        const todayDate = new Date(todayStr() + 'T00:00:00');

        if (rowDate > todayDate) {
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

    // 데이터 연산 및 로드 스키마 시뮬레이션
    function buildRow(ds) {
        if (!dataCache[ds]) {
            const isPast = new Date(ds + 'T00:00:00') <= new Date();
            // DB 로드 연결 포인트용 캐싱 더미셋
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

    // 3번 요구사항 반영: 6개의 독립 패널 구조에 맞춘 HTML 분할 주입 로직 기용
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

            const dateTd = `<td class="f3ct-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            // 패널 1: 지고재고
            h1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.jigo_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.jigo_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.jigo_sum, row.date)}</td>
            </tr>`;

            // 패널 2: 급지재고
            h2 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.geupji_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.geupji_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.geupji_sum, row.date)}</td>
            </tr>`;

            // 패널 3: 실재고
            h3 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.real_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.real_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.real_sum, row.date)}</td>
            </tr>`;

            // 패널 4: ERP 재고
            h4 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.erp_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.erp_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.erp_sum, row.date)}</td>
            </tr>`;

            // 패널 5: 실재고 - ERP 재고
            h5 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3ct-data-cell" data-col="1">${fmtNum(row.diff_a, row.date)}</td>
                <td class="f3ct-data-cell" data-col="2">${fmtNum(row.diff_d, row.date)}</td>
                <td class="f3ct-data-cell f3ct-sum-col" data-col="3">${fmtNum(row.diff_sum, row.date)}</td>
            </tr>`;

            // 패널 6: 증감
            h6 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
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

    // 6개 다중 패널 수직 스크롤 상호 연동 동기화 제어 함수
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
        updateDateText(ds);

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

    // 5번 요구사항 반영: 오늘 혹은 전일 데이터 행을 패널 내 상단에서 25~30% 지점(중간 기준 위쪽)에 자동 안착시키는 연산 스크롤 기법
    function scrollToToday() {
        setTimeout(() => requestAnimationFrame(() => {
            const targetDate = yesterdayStr();
            const row = document.querySelector(`#f3ctBody1 tr[data-date="${targetDate}"]`);
            if (row) {
                const pan = document.getElementById('f3ctScrollPanel1');
                let top = 0;
                let el = row;
                while (el && el !== pan && el !== document.body) { 
                    top += el.offsetTop; 
                    el = el.offsetParent; 
                }
                
                // 포커싱 행이 중앙보다 약간 위쪽에 거치되도록 컨테이너 크기의 4.5분의 1 가량 차감 조정
                const targetScrollTop = top - (pan.clientHeight / 4.5);
                
                PIDS.forEach(id => { 
                    const p = document.getElementById(id); 
                    if (p) p.scrollTop = targetScrollTop; 
                });
            }
            updateDateText(targetDate);
        }), 120);
    }

    const Module = {
        init: function () {
            bindScrollSync(); 
            bindClicks();

            // 공통 헤더 초기화 연계 (수정 및 저장 콜백 제거 상태로 선언)
            headerApi = window.Factory3Header.init({
                idPrefix: 'Contrast',
                onDateChange: (ds) => {
                    const d = new Date(ds);
                    state.year = d.getFullYear(); 
                    state.month = d.getMonth() + 1;
                    clearHighlights(); 
                    renderAllRows();
                },
                onSave: () => {} // 순수 보기 전용이므로 저장 콜백 빈 상태 선언
            });

            renderAllRows();
            scrollToToday();
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Module.init);
    else Module.init();

})();