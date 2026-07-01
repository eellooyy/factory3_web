/* factory3_io_script.js */
(function () {
    'use strict';

    /* ─────────────────────────────────────────
       Supabase 클라이언트
    ───────────────────────────────────────── */
    const supabaseUrl = 'https://npiflqoscsvnnauvqhrr.supabase.co';
    const supabaseKey = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    /* ─────────────────────────────────────────
       상수 & 상태
    ───────────────────────────────────────── */
    const WD_KR = ['일', '월', '화', '수', '목', '금', '토'];

    const state = {
        year:          new Date().getFullYear(),
        month:         new Date().getMonth() + 1,
        loading:       false,
        initialLoaded: false,   // 최초 전체 로드 완료 여부
        selectedDate:  null,
        selectedPanel: null,
        selectedCol:   null,
    };

    // 날짜 → { in_a, in_d, out_a, out_d, stock_a, stock_d, usage_media: {}, usage_paper: {} }
    let dataCache   = {};
    let baselineRow = null; // { date, stock_a, stock_d }

    let oldestYear    = state.year;
    let oldestMonth   = state.month;
    let isLoadingPrev = false;
    let headerApi     = null;

    /* ─────────────────────────────────────────
       날짜 헬퍼
    ───────────────────────────────────────── */
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function yesterdayStr() {
        const t = new Date();
        t.setDate(t.getDate() - 1);
        return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    }
    function pad(n)     { return String(n).padStart(2, '0'); }
    function fmtKo(ds)  {
        const d = new Date(ds + 'T00:00:00');
        return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${WD_KR[d.getDay()]})`;
    }
    function isFuture(ds) {
        const today = new Date(); today.setHours(0,0,0,0);
        return new Date(ds + 'T00:00:00') > today;
    }
    function getDatesOfMonth(y, m) {
        const days = new Date(y, m, 0).getDate();
        return Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i+1)}`);
    }
    function fmtDate(d) {
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }

    /* ─────────────────────────────────────────
       매체 매핑 헬퍼 (레거시 지원용 유지)
    ───────────────────────────────────────── */
    function getMediaNameByCol(col) {
        const names = ['', '본지', '별쇄', '경인일보', '기독교타임즈', '대학신문', '평화신문'];
        return names[col] || '';
    }

    /* ─────────────────────────────────────────
       숫자 포맷
    ───────────────────────────────────────── */
  function fmtNum(v, ds) {
    const today = yesterdayStr(); // 어제 날짜까지가 데이터 유효 범위
    
    // ds(현재 행 날짜)가 오늘이거나 미래라면 '-' 표시
    if (new Date(ds) >= new Date(todayStr())) { 
        return '<span class="f3io-empty">-</span>'; 
    }
    
    const n = Number(v);
    if (isNaN(n) || n === 0) return '<span class="f3io-empty">0</span>';
    return `<span${n < 0 ? ' class="f3io-negative"' : ''}>${n.toLocaleString()}</span>`;
}

    function updateDateText(str) {
        const el = document.getElementById('f3ioDateText');
        if (el) el.textContent = str ? fmtKo(str) : '';
    }

    /* ─────────────────────────────────────────
       재고 누적 계산 (baseline 다음 날 ~ targetDate)
    ───────────────────────────────────────── */
    function calcStock(targetDate) {
        if (!baselineRow) return { stock_a: 0, stock_d: 0 };
        let sa = baselineRow.stock_a;
        let sd = baselineRow.stock_d;
        const cur = new Date(baselineRow.date + 'T00:00:00');
        cur.setDate(cur.getDate() + 1);
        const end = new Date(targetDate + 'T00:00:00');
        while (cur <= end) {
            const r = dataCache[fmtDate(cur)] || {};
            sa += (r.in_a || 0) - (r.out_a || 0);
            sd += (r.in_d || 0) - (r.out_d || 0);
            cur.setDate(cur.getDate() + 1);
        }
        return { stock_a: sa, stock_d: sd };
    }

    function recalcAllStocks() {
        Object.keys(dataCache).sort().forEach(ds => {
            const { stock_a, stock_d } = calcStock(ds);
            dataCache[ds].stock_a = stock_a;
            dataCache[ds].stock_d = stock_d;
        });
    }

    /* ─────────────────────────────────────────
       Supabase 로드 — 초기 1회 전체 로드
    ───────────────────────────────────────── */

    // factory3_io 테이블 전체 로드
    async function loadIoTable() {
        const { data, error } = await supabase
            .from('factory3_io')
            .select('date, stock_a, stock_d, in_a, in_d')
            .order('date', { ascending: true });

        if (error) {
            console.error('[factory3_io] factory3_io 테이블 로드 오류:', error);
            throw new Error(`factory3_io 테이블 로드 실패: ${error.message}`);
        }

        if (data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                dataCache[row.date].in_a = row.in_a || 0;
                dataCache[row.date].in_d = row.in_d || 0;

                if ((row.stock_a || 0) !== 0 || (row.stock_d || 0) !== 0) {
                    if (!baselineRow || row.date > baselineRow.date) {
                        baselineRow = { date: row.date, stock_a: row.stock_a || 0, stock_d: row.stock_d || 0 };
                    }
                }
            });
        }
    }

    // Panel 1의 출고 데이터 로드용 (geup_out 유형만 필터링하여 보존)
    async function loadOutgoing() {
        const start = baselineRow ? baselineRow.date : `${state.year}-01-01`;
        const end   = todayStr();

        const { data, error } = await supabase
            .from('factory3_geupji_real')
            .select('date, col_id, value, item_type')
            .eq('item_type', 'geup_out')
            .gte('date', start)
            .lte('date', end);

        if (error) {
            console.error('[factory3_io] 출고 데이터 로드 오류:', error);
            return;
        }

        if (data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                if (row.col_id === 'A') dataCache[row.date].out_a = row.value || 0;
                if (row.col_id === 'D') dataCache[row.date].out_d = row.value || 0;
            });
        }
    }

    // 신규 추가: factory3_usage 테이블 데이터 매핑 및 계산 로직
    async function loadUsageData() {
        const start = baselineRow ? baselineRow.date : `${state.year}-01-01`;
        const end   = todayStr();

        const { data, error } = await supabase
            .from('factory3_usage')
            .select('print_date, media_name, item_code, usage_qty')
            .gte('print_date', start)
            .lte('print_date', end);

        if (error) {
            console.error('[factory3_io] factory3_usage 로드 오류:', error);
            return;
        }

        if (data) {
            data.forEach(row => {
                const date = row.print_date;
                if (!dataCache[date]) dataCache[date] = {};
                
                // 구조 초기화
                if (!dataCache[date].usage_media) {
                    dataCache[date].usage_media = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                }
                if (!dataCache[date].usage_paper) {
                    dataCache[date].usage_paper = { A: 0, D: 0 };
                }

                const qty = Number(row.usage_qty) || 0;

                // 1. 매체별 사용량 매핑 (하위 레벨 순서 일치)
                if (row.media_name === '매일경제신문') dataCache[date].usage_media[1] += qty;
                else if (row.media_name === '매일경제신문(특집)') dataCache[date].usage_media[2] += qty;
                else if (row.media_name === '경인일보') dataCache[date].usage_media[3] += qty;
                else if (row.media_name === '기독교타임즈') dataCache[date].usage_media[4] += qty;
                else if (row.media_name === '한국대학신문') dataCache[date].usage_media[5] += qty;
                else if (row.media_name === '가톨릭평화신문') dataCache[date].usage_media[6] += qty;

                // 2. 용지별 사용량 매핑 (아이템 코드 일치)
                if (row.item_code === '11ANP-0000001') dataCache[date].usage_paper.A += qty;
                else if (row.item_code === '11ANP-0000003') dataCache[date].usage_paper.D += qty;
            });
        }
    }

    /* ─────────────────────────────────────────
       입고 저장 (upsert)
    ───────────────────────────────────────── */
    async function saveIncoming(dateStr, in_a, in_d) {
        const { error } = await supabase
            .from('factory3_io')
            .upsert({ date: dateStr, in_a, in_d }, { onConflict: 'date' });

        if (error) { alert('저장 실패: ' + error.message); return false; }
        return true;
    }

    /* ─────────────────────────────────────────
       저장 핸들러
    ───────────────────────────────────────── */
    async function handleSave() {
        if (!state.selectedDate) return;
        const ds = state.selectedDate;

        const row1   = document.querySelector(`#f3ioBody1 tr[data-date="${ds}"]`);
        const inputA = row1 ? row1.querySelector('td[data-col="1"] .f3io-in-input') : null;
        const inputD = row1 ? row1.querySelector('td[data-col="2"] .f3io-in-input') : null;

        const in_a = inputA ? (parseInt(inputA.value, 10) || 0) : (dataCache[ds]?.in_a || 0);
        const in_d = inputD ? (parseInt(inputD.value, 10) || 0) : (dataCache[ds]?.in_d || 0);

        const ok = await saveIncoming(ds, in_a, in_d);
        if (!ok) return;

        if (!dataCache[ds]) dataCache[ds] = {};
        dataCache[ds].in_a = in_a;
        dataCache[ds].in_d = in_d;
        recalcAllStocks();
        rerenderAllRows();
        alert('저장 완료');
    }

    /* ─────────────────────────────────────────
       편집 모드 진입 / 종료
    ───────────────────────────────────────── */
    function onEditModeEnter() {
        if (!state.selectedDate) {
            alert('먼저 입고를 수정할 날짜 행을 클릭해 선택해주세요.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }

        const ds  = state.selectedDate;
        const d   = dataCache[ds] || {};
        const row = document.querySelector(`#f3ioBody1 tr[data-date="${ds}"]`);
        if (!row) return;

        const tdA = row.querySelector('td[data-col="1"]');
        const tdD = row.querySelector('td[data-col="2"]');

        function makeInput(val) {
            const inp = document.createElement('input');
            inp.type      = 'number';
            inp.min       = '0';
            inp.value     = val;
            inp.className = 'f3io-in-input';
            return inp;
        }

        if (tdA) {
            tdA.innerHTML = '';
            const inp = makeInput(d.in_a || 0);
            tdA.appendChild(inp);
            inp.addEventListener('keydown', e => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    const inpD = row.querySelector('td[data-col="2"] .f3io-in-input');
                    if (inpD) { inpD.focus(); inpD.select(); }
                }
            });
            inp.focus(); inp.select();
        }

        if (tdD) {
            tdD.innerHTML = '';
            const inp = makeInput(d.in_d || 0);
            tdD.appendChild(inp);
            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const saveBtn = document.getElementById('gf3IoSaveBtn');
                    if (saveBtn && !saveBtn.disabled) saveBtn.click();
                }
            });
        }
    }

    function onEditModeExit() {
        rerenderAllRows();
    }

    /* ─────────────────────────────────────────
       DOM 갱신 (실시간 리렌더링 및 교차 오류 검증)
    ───────────────────────────────────────── */
    function rerenderAllRows() {
        // Panel 1: 입출고 및 재고 대장
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            tr.querySelectorAll('td[data-col]').forEach(td => {
                if (td.querySelector('.f3io-in-input')) return;
                const col = td.getAttribute('data-col');
                if      (col === '1') td.innerHTML = fmtNum(d.in_a,    ds);
                else if (col === '2') td.innerHTML = fmtNum(d.in_d,    ds);
                else if (col === '3') td.innerHTML = fmtNum(d.out_a,   ds);
                else if (col === '4') td.innerHTML = fmtNum(d.out_d,   ds);
                else if (col === '5') td.innerHTML = fmtNum(d.stock_a, ds);
                else if (col === '6') td.innerHTML = fmtNum(d.stock_d, ds);
            });
        });

        // Panel 2: 매체별 사용량 및 교차 오류 검증
        document.querySelectorAll('#f3ioBody2 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            const usageMedia = d.usage_media || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            const usagePaper = d.usage_paper || { A: 0, D: 0 };
            
            let mediaSum = 0;
            const paperSum = (usagePaper.A || 0) + (usagePaper.D || 0);
            
            tr.querySelectorAll('td[data-col]').forEach(td => {
                const col = Number(td.getAttribute('data-col'));
                if (col >= 1 && col <= 6) {
                    const val = usageMedia[col] || 0;
                    td.innerHTML = fmtNum(val, ds);
                    mediaSum += val;
                } else if (col === 7) {
                    td.innerHTML = fmtNum(mediaSum, ds);
                    
                    // 검증: 매체별 합계와 용지별 합계(A+D)가 불일치할 경우 경고 스타일 적용
                    if (mediaSum !== paperSum) {
                        td.classList.add('f3io-sum-mismatch');
                    } else {
                        td.classList.remove('f3io-sum-mismatch');
                    }
                }
            });
        });

        // Panel 3: 용지별 사용량
        document.querySelectorAll('#f3ioBody3 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            const usagePaper = d.usage_paper || { A: 0, D: 0 };
            
            tr.querySelectorAll('td[data-col]').forEach(td => {
                const col = td.getAttribute('data-col');
                if (col === '1') td.innerHTML = fmtNum(usagePaper.A || 0, ds);
                if (col === '2') td.innerHTML = fmtNum(usagePaper.D || 0, ds);
            });
        });
    }

    /* ─────────────────────────────────────────
       스크롤 동기화 & 무한 스크롤
    ───────────────────────────────────────── */
    let _syncLock = false;
    const PANEL_IDS = ['f3ioScrollPanel1', 'f3ioScrollPanel2', 'f3ioScrollPanel3'];

    function bindScrollSync() {
        PANEL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('scroll', () => {
                if (_syncLock) return;
                _syncLock = true;
                const top = el.scrollTop;
                PANEL_IDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if (t) t.scrollTop = top;
                });
                hideCursors();
                _syncLock = false;
                if (top <= 10 && !isLoadingPrev && !state.loading) loadPrevMonth();
            });
        });
    }

    /* ─────────────────────────────────────────
       하이라이트 & 커서
    ───────────────────────────────────────── */
    function hideCursors() {
        [1,2,3].forEach(i => { const c = document.getElementById(`f3ioCursor${i}`); if (c) c.classList.remove('active'); });
    }

    function showCursor(idx, td) {
        const cur = document.getElementById(`f3ioCursor${idx}`);
        const pan = document.getElementById(`f3ioScrollPanel${idx}`);
        if (!cur || !pan || !td) return;
        let top = 0, left = 0, el = td;
        while (el && el !== pan && el !== document.body) { top += el.offsetTop; left += el.offsetLeft; el = el.offsetParent; }
        cur.style.width  = td.offsetWidth  + 'px';
        cur.style.height = td.offsetHeight + 'px';
        cur.style.left   = left + 'px';
        cur.style.top    = top  + 'px';
        cur.classList.add('active');
    }

    function clearHighlights() {
        document.querySelectorAll('.f3io-selected-row').forEach(el => el.classList.remove('f3io-selected-row'));
        document.querySelectorAll('.f3io-selected-cell').forEach(el => el.classList.remove('f3io-selected-cell'));
        document.querySelectorAll('.f3io-header-active').forEach(el => el.classList.remove('f3io-header-active'));
        hideCursors();
    }

    function applyHighlight(panelIdx, ds, colDataCol) {
        if (headerApi && headerApi.isEditMode()) return;
        clearHighlights();
        state.selectedDate  = ds;
        state.selectedPanel = panelIdx;
        state.selectedCol   = colDataCol;
        updateDateText(ds);

        PANEL_IDS.forEach((id, i) => {
            const body = document.getElementById(`f3ioBody${i+1}`);
            if (!body) return;
            const row = body.querySelector(`tr[data-date="${ds}"]`);
            if (row) row.classList.add('f3io-selected-row');
        });

        const clickedBody = document.getElementById(`f3ioBody${panelIdx}`);
        if (clickedBody && colDataCol !== null) {
            const row = clickedBody.querySelector(`tr[data-date="${ds}"]`);
            if (row) {
                const td = row.querySelector(`td[data-col="${colDataCol}"]`);
                if (td) { td.classList.add('f3io-selected-cell'); showCursor(panelIdx, td); }
            }
        }

        if (colDataCol !== null) {
            const pan = document.getElementById(`f3ioScrollPanel${panelIdx}`);
            if (pan) {
                const lv2 = pan.querySelector(`.f3io-thead-lv2 th[data-col="${colDataCol}"]`);
                if (lv2) {
                    lv2.classList.add('f3io-header-active');
                    const pg = lv2.getAttribute('data-parent-group');
                    if (pg) {
                        const lv1 = pan.querySelector(`.f3io-thead-lv1 th[data-group="${pg}"]`);
                        if (lv1) lv1.classList.add('f3io-header-active');
                    } else {
                        pan.querySelectorAll('.f3io-thead-lv1 th.f3io-top-group-th').forEach(th => th.classList.add('f3io-header-active'));
                    }
                }
            }
        }
    }

    /* ─────────────────────────────────────────
       키보드 네비게이션
    ───────────────────────────────────────── */
    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (headerApi && headerApi.isEditMode()) return;
            if (!state.selectedDate || !state.selectedPanel || !state.selectedCol) return;
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
            e.preventDefault();

            let panelIdx = Number(state.selectedPanel);
            let colNum   = Number(state.selectedCol);
            const body   = document.getElementById(`f3ioBody${panelIdx}`);
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
                const colCount = { 1:6, 2:7, 3:2 };
                if (e.key === 'ArrowLeft') {
                    colNum--;
                    if (colNum < 1) { if (panelIdx > 1) { panelIdx--; colNum = colCount[panelIdx]; } else colNum = 1; }
                } else {
                    colNum++;
                    if (colNum > colCount[panelIdx]) { if (panelIdx < 3) { panelIdx++; colNum = 1; } else colNum = colCount[panelIdx]; }
                }
                applyHighlight(panelIdx, state.selectedDate, String(colNum));
                scrollToActiveCell(panelIdx);
            }
        });
    }

    function scrollToActiveCell(idx) {
        const pan = document.getElementById(`f3ioScrollPanel${idx}`);
        const td  = document.querySelector(`#f3ioBody${idx} tr[data-date="${state.selectedDate}"] td[data-col="${state.selectedCol}"]`);
        if (!pan || !td) return;
        let top = 0, el = td;
        while (el && el !== pan && el !== document.body) { top += el.offsetTop; el = el.offsetParent; }
        const bot = top + td.offsetHeight;
        if (bot > pan.scrollTop + pan.clientHeight) pan.scrollTop = bot - pan.clientHeight + 10;
        else if (top < pan.scrollTop + 88)           pan.scrollTop = top - 88 - 10;
    }

    /* ─────────────────────────────────────────
       렌더링 헬퍼
    ───────────────────────────────────────── */
    function showLoading() {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }].forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#aeaeb2;font-size:13px;">불러오는 중...</td></tr>`;
        });
    }
    function showError(msg) {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }].forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#ff3b30;font-size:13px;">${msg}</td></tr>`;
        });
    }

    function buildRow(ds) {
        const d = dataCache[ds] || {};
        return { 
            date:ds, 
            in_a:d.in_a||0, 
            in_d:d.in_d||0, 
            out_a:d.out_a||0, 
            out_d:d.out_d||0, 
            stock_a:d.stock_a||0, 
            stock_d:d.stock_d||0,
            usage_media: d.usage_media || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            usage_paper: d.usage_paper || { A: 0, D: 0 }
        };
    }

    function generateRowsHTML(rows) {
        let html1='', html2='', html3='';
        rows.forEach(row => {
            const d   = new Date(row.date + 'T00:00:00');
            const isT = row.date === yesterdayStr();
            const trC = isT ? 'f3io-row-today' : '';
            const wd  = d.getDay();
            const wdC = wd === 6 ? 'f3io-sat' : wd === 0 ? 'f3io-sun' : '';
            const m   = pad(d.getMonth()+1);
            const dy  = pad(d.getDate());
            const wn  = WD_KR[wd];

            const dateTd    = `<td class="f3io-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            // Panel 1 HTML
            html1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell f3io-editable-cell" data-col="1">${fmtNum(row.in_a,    row.date)}</td>
                <td class="f3io-data-cell f3io-editable-cell" data-col="2">${fmtNum(row.in_d,    row.date)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="3">${fmtNum(row.out_a,   row.date)}</td>
                <td class="f3io-data-cell"                    data-col="4">${fmtNum(row.out_d,   row.date)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="5">${fmtNum(row.stock_a, row.date)}</td>
                <td class="f3io-data-cell"                    data-col="6">${fmtNum(row.stock_d, row.date)}</td>
            </tr>`;

            // Panel 2 HTML: 매체별 동적 생성 및 합계 계산
            let mediaHtml = '';
            let mediaSum = 0;
            const usageMedia = row.usage_media;
            const usagePaper = row.usage_paper;
            const paperSum = (usagePaper.A || 0) + (usagePaper.D || 0);

            for (let col = 1; col <= 6; col++) {
                const val = usageMedia[col] || 0;
                mediaHtml += `<td class="f3io-data-cell" data-col="${col}">${fmtNum(val, row.date)}</td>`;
                mediaSum += val;
            }

            // 매체별 합계와 용지별 합계 비교 검증 클래스 추가
            const mismatchClass = (mediaSum !== paperSum) ? ' f3io-sum-mismatch' : '';

            html2 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                ${mediaHtml}
                <td class="f3io-data-cell f3io-sum-col${mismatchClass}" data-col="7">${fmtNum(mediaSum, row.date)}</td>
            </tr>`;

            // Panel 3 HTML: 용지별 실사용량 매핑 (A, D)
            html3 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(usagePaper.A, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(usagePaper.D, row.date)}</td>
            </tr>`;
        });
        return { html1, html2, html3 };
    }

    function renderInitial(rows) {
        const b1 = document.getElementById('f3ioBody1');
        const b2 = document.getElementById('f3ioBody2');
        const b3 = document.getElementById('f3ioBody3');
        if (!b1||!b2||!b3) return;
        const h = generateRowsHTML(rows);
        b1.innerHTML = h.html1;
        b2.innerHTML = h.html2;
        b3.innerHTML = h.html3;
    }

    /* ─────────────────────────────────────────
       데이터 로드
    ───────────────────────────────────────── */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        try {
            if (!state.initialLoaded) {
                await loadIoTable();
                await loadOutgoing();
                await loadUsageData(); // 신규 추가된 테이블 대조 로직
                recalcAllStocks();
                state.initialLoaded = true;
            }

            const dates = getDatesOfMonth(state.year, state.month);
            const rows  = dates.map(ds => buildRow(ds));
            renderInitial(rows);
            scrollToToday();
        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            showError(`데이터 로드 실패: ${err.message}<br><small>Supabase RLS 정책을 확인하세요.</small>`);
        } finally {
            state.loading = false;
        }
    }

    function getMonthRows(y, m) {
        return getDatesOfMonth(y, m).map(ds => buildRow(ds));
    }

    function loadPrevMonth(isAutoFill = false) {
        return new Promise(resolve => {
            if (isLoadingPrev) return resolve();
            isLoadingPrev = true;
            oldestMonth--;
            if (oldestMonth < 1) { oldestMonth = 12; oldestYear--; }

            const panel1     = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            const rows  = getMonthRows(oldestYear, oldestMonth);
            const htmls = generateRowsHTML(rows);
            document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
            document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
            document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

            requestAnimationFrame(() => {
                if (panel1 && !isAutoFill) {
                    const diff = panel1.scrollHeight - prevHeight;
                    PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTop += diff; });
                }
                isLoadingPrev = false;
                resolve();
            });
        });
    }

    /* ─────────────────────────────────────────
       클릭 이벤트
    ───────────────────────────────────────── */
    function bindBodyClicks() {
        [[1,'f3ioBody1'], [2,'f3ioBody2'], [3,'f3ioBody3']].forEach(([pi, bid]) => {
            const body = document.getElementById(bid);
            if (!body) return;
            body.addEventListener('click', e => {
                const td = e.target.closest('td');
                if (!td || td.classList.contains('f3io-date-td')) return;
                const tr = td.closest('tr[data-date]');
                if (!tr) return;
                applyHighlight(pi, tr.getAttribute('data-date'), td.getAttribute('data-col'));
            });
        });
    }

    /* ─────────────────────────────────────────
       오늘 스크롤
    ───────────────────────────────────────── */
    function scrollToToday() {
        setTimeout(() => requestAnimationFrame(() => {
            const today  = todayStr();
            const panel1 = document.getElementById('f3ioScrollPanel1');
            if (!panel1) return;

            let row = panel1.querySelector(`tr[data-date="${today}"]`)
                   || panel1.querySelector(`tr[data-date="${yesterdayStr()}"]`);

            if (row) {
                let top = 0, el = row;
                while (el && el !== panel1 && el !== document.body) { top += el.offsetTop; el = el.offsetParent; }
                const offset = panel1.clientHeight / 3;
                const target = top - offset;

                if (target < 0 && !isLoadingPrev) {
                    loadPrevMonth(true).then(() => requestAnimationFrame(() => {
                        let nr = panel1.querySelector(`tr[data-date="${today}"]`)
                              || panel1.querySelector(`tr[data-date="${yesterdayStr()}"]`);
                        if (nr) {
                            let nt = 0, nc = nr;
                            while (nc && nc !== panel1 && nc !== document.body) { nt += nc.offsetTop; nc = nc.offsetParent; }
                            PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTo({ top: Math.max(0, nt - offset), behavior:'auto' }); });
                        }
                    }));
                } else {
                    PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTo({ top: Math.max(0, target), behavior:'auto' }); });
                }
            }
            updateDateText(today);
        }), 50);
    }

    /* ─────────────────────────────────────────
       모듈 초기화
    ───────────────────────────────────────── */
    const Factory3IoModule = {
        init: function () {
            const now   = new Date();
            state.year  = now.getFullYear();
            state.month = now.getMonth() + 1;
            oldestYear  = state.year;
            oldestMonth = state.month;

            bindScrollSync();
            bindBodyClicks();
            bindKeyboardNav();

            headerApi = window.Factory3Header.init({
                idPrefix: 'Io',
                onDateChange: (dateStr) => {
                    if (headerApi && headerApi.isEditMode()) {
                        onEditModeExit();
                    }
                    const d = new Date(dateStr);
                    state.year  = d.getFullYear();
                    state.month = d.getMonth() + 1;
                    oldestYear  = state.year;
                    oldestMonth = d.getMonth() + 1;
                    clearHighlights();
                    loadData();
                },
                onSave: handleSave,
            });

            if (!headerApi) return;

            const editBtn = document.getElementById('gf3IoEditBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    setTimeout(() => {
                        if (headerApi.isEditMode()) {
                            onEditModeEnter();
                        } else {
                            onEditModeExit();
                        }
                    }, 0);
                });
            }

            const saveBtn = document.getElementById('gf3IoSaveBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    setTimeout(() => {
                        if (!headerApi.isEditMode()) onEditModeExit();
                    }, 300);
                });
            }

            ['gf3IoPrevBtn', 'gf3IoNextBtn', 'gf3IoExcelBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) { btn.disabled = true; btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }
            });

            loadData();
        },
        destroy: function () {}
    };

    window.Factory3IoModule = Factory3IoModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Factory3IoModule.init());
    } else {
        Factory3IoModule.init();
    }

})();