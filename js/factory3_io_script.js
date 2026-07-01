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
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        loading: false,
        selectedDate: null,
        selectedPanel: null,
        selectedCol: null,
    };

    // 날짜 → { in_a, in_d, out_a, out_d, stock_a, stock_d } 캐시
    let dataCache  = {};
    // 초기 기준 재고 행 { date, stock_a, stock_d }
    let baselineRow = null;

    let oldestYear  = state.year;
    let oldestMonth = state.month;
    let isLoadingPrev = false;
    let headerApi   = null;

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
    function pad(n) { return String(n).padStart(2, '0'); }
    function fmtKo(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${WD_KR[d.getDay()]})`;
    }
    function isFuture(dateStr) {
        const today = new Date(); today.setHours(0,0,0,0);
        return new Date(dateStr + 'T00:00:00') > today;
    }
    function getDatesOfMonth(year, month) {
        const days = new Date(year, month, 0).getDate();
        return Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i+1)}`);
    }
    function fmtDate(d) {
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }

    /* ─────────────────────────────────────────
       숫자 포맷 (읽기 전용 셀용)
    ───────────────────────────────────────── */
    function fmtNum(v, dateStr) {
        if (isFuture(dateStr)) return '<span class="f3io-empty">-</span>';
        const n = Number(v);
        if (!v && v !== 0 || isNaN(n)) return '<span class="f3io-empty">0</span>';
        if (n === 0) return '<span class="f3io-empty">0</span>';
        const cls = n < 0 ? ' class="f3io-negative"' : '';
        return `<span${cls}>${n.toLocaleString()}</span>`;
    }

    function updateDateText(str) {
        const el = document.getElementById('f3ioDateText');
        if (el) el.textContent = str ? fmtKo(str) : '';
    }

    /* ─────────────────────────────────────────
       재고 누적 계산
       baselineRow.date 다음 날부터 targetDate까지 누적
    ───────────────────────────────────────── */
    function calcStock(targetDate) {
        if (!baselineRow) return { stock_a: 0, stock_d: 0 };

        let sa = baselineRow.stock_a;
        let sd = baselineRow.stock_d;

        const cur = new Date(baselineRow.date + 'T00:00:00');
        cur.setDate(cur.getDate() + 1);
        const end = new Date(targetDate + 'T00:00:00');

        while (cur <= end) {
            const ds = fmtDate(cur);
            const row = dataCache[ds] || {};
            sa += (row.in_a || 0) - (row.out_a || 0);
            sd += (row.in_d || 0) - (row.out_d || 0);
            cur.setDate(cur.getDate() + 1);
        }
        return { stock_a: sa, stock_d: sd };
    }

    /* ─────────────────────────────────────────
       Supabase 로드
    ───────────────────────────────────────── */

    // factory3_io 테이블에서 전체 데이터 로드 (기준 재고 + 입고)
    async function loadIoTable() {
        const { data, error } = await supabase
            .from('factory3_io')
            .select('date, stock_a, stock_d, in_a, in_d')
            .order('date', { ascending: true });

        if (error) { console.error('factory3_io 로드 오류:', error); return; }

        if (data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                dataCache[row.date].in_a = row.in_a || 0;
                dataCache[row.date].in_d = row.in_d || 0;

                // stock_a 또는 stock_d가 설정된 행 = 기준 재고 행
                if ((row.stock_a || 0) !== 0 || (row.stock_d || 0) !== 0) {
                    // 가장 최근 기준행을 baseline으로
                    if (!baselineRow || row.date > baselineRow.date) {
                        baselineRow = {
                            date: row.date,
                            stock_a: row.stock_a || 0,
                            stock_d: row.stock_d || 0,
                        };
                    }
                }
            });
        }
    }

    // geupji 테이블에서 출고(geup_out) 로드
    async function loadOutgoing(startDate, endDate) {
        const { data, error } = await supabase
            .from('factory3_geupji_real')
            .select('date, col_id, value')
            .eq('item_type', 'geup_out')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) { console.error('출고 로드 오류:', error); return; }

        if (data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                if (row.col_id === 'A') dataCache[row.date].out_a = row.value || 0;
                if (row.col_id === 'D') dataCache[row.date].out_d = row.value || 0;
            });
        }
    }

    // 특정 월 데이터 로드 → 재고 계산 → row 배열 반환
    async function loadMonth(year, month) {
        const dates = getDatesOfMonth(year, month);
        const startDate = dates[0];
        const endDate   = dates[dates.length - 1];

        // 출고만 추가 로드 (io 테이블은 최초 1회 전체 로드)
        await loadOutgoing(startDate, endDate);

        // 재고 계산 후 캐시에 저장
        dates.forEach(ds => {
            const stock = calcStock(ds);
            if (!dataCache[ds]) dataCache[ds] = {};
            dataCache[ds].stock_a = stock.stock_a;
            dataCache[ds].stock_d = stock.stock_d;
        });

        return dates.map(ds => buildRow(ds));
    }

    function buildRow(dateStr) {
        const d = dataCache[dateStr] || {};
        return {
            date:    dateStr,
            in_a:    d.in_a    || 0,
            in_d:    d.in_d    || 0,
            out_a:   d.out_a   || 0,
            out_d:   d.out_d   || 0,
            stock_a: d.stock_a || 0,
            stock_d: d.stock_d || 0,
        };
    }

    /* ─────────────────────────────────────────
       입고 저장 (factory3_io 테이블 upsert)
    ───────────────────────────────────────── */
    async function saveIncoming(dateStr, in_a, in_d) {
        const { error } = await supabase
            .from('factory3_io')
            .upsert({ date: dateStr, in_a, in_d }, { onConflict: 'date' });

        if (error) { alert('저장 실패: ' + error.message); return false; }
        return true;
    }

    /* ─────────────────────────────────────────
       저장 핸들러 (헤더 onSave 콜백)
       편집 모드 종료 시 headerApi가 toggleEditMode를 호출한 뒤 onSave 실행
    ───────────────────────────────────────── */
    async function handleSave() {
        if (!state.selectedDate) return;
        const dateStr = state.selectedDate;

        // 입고 A, D input 값 수집
        const row1 = document.querySelector(`#f3ioBody1 tr[data-date="${dateStr}"]`);
        if (!row1) return;

        const inputA = row1.querySelector('td[data-col="1"] .f3io-in-input');
        const inputD = row1.querySelector('td[data-col="2"] .f3io-in-input');

        const in_a = inputA ? (parseInt(inputA.value, 10) || 0) : 0;
        const in_d = inputD ? (parseInt(inputD.value, 10) || 0) : 0;

        const ok = await saveIncoming(dateStr, in_a, in_d);
        if (!ok) return;

        // 캐시 업데이트 → 재고 재계산 → DOM 갱신
        if (!dataCache[dateStr]) dataCache[dateStr] = {};
        dataCache[dateStr].in_a = in_a;
        dataCache[dateStr].in_d = in_d;
        recalcAllStocks();
        rerenderAllRows();
        alert('저장 완료');
    }

    /* ─────────────────────────────────────────
       재고 재계산 & DOM 갱신
    ───────────────────────────────────────── */
    function recalcAllStocks() {
        const allDates = Object.keys(dataCache).sort();
        allDates.forEach(ds => {
            const stock = calcStock(ds);
            dataCache[ds].stock_a = stock.stock_a;
            dataCache[ds].stock_d = stock.stock_d;
        });
    }

    function rerenderAllRows() {
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            const cells = tr.querySelectorAll('td[data-col]');
            cells.forEach(td => {
                const col = td.getAttribute('data-col');
                // 편집 중인 input은 건드리지 않음
                if (td.querySelector('.f3io-in-input')) return;
                if      (col === '1') td.innerHTML = fmtNum(d.in_a,    ds);
                else if (col === '2') td.innerHTML = fmtNum(d.in_d,    ds);
                else if (col === '3') td.innerHTML = fmtNum(d.out_a,   ds);
                else if (col === '4') td.innerHTML = fmtNum(d.out_d,   ds);
                else if (col === '5') td.innerHTML = fmtNum(d.stock_a, ds);
                else if (col === '6') td.innerHTML = fmtNum(d.stock_d, ds);
            });
        });
    }

    /* ─────────────────────────────────────────
       편집 모드 (헤더 toggleEditMode 연동)
       — 헤더가 .gf3-td.editable .gf3-input 의 readonly를 토글함
       — 따라서 입고 A, D 셀에 gf3-td editable 구조 + gf3-input 클래스를 사용
       — 단, 렌더링은 span으로 하다가 편집 모드 진입 시 input으로 교체
    ───────────────────────────────────────── */

    // 편집 모드 진입 시 선택된 날짜의 in_a, in_d 셀을 input으로 교체
    function onEditModeEnter() {
        if (!state.selectedDate) return;
        const ds  = state.selectedDate;
        const d   = dataCache[ds] || {};
        const row = document.querySelector(`#f3ioBody1 tr[data-date="${ds}"]`);
        if (!row) return;

        const tdA = row.querySelector('td[data-col="1"]');
        const tdD = row.querySelector('td[data-col="2"]');

        if (tdA) {
            tdA.innerHTML = '';
            const inp = document.createElement('input');
            inp.type      = 'number';
            inp.min       = '0';
            inp.value     = d.in_a || 0;
            inp.className = 'f3io-in-input';
            tdA.appendChild(inp);
            inp.focus();
            inp.select();

            inp.addEventListener('keydown', e => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    const inpD = row.querySelector('td[data-col="2"] .f3io-in-input');
                    if (inpD) { inpD.focus(); inpD.select(); }
                }
            });
        }
        if (tdD) {
            tdD.innerHTML = '';
            const inp = document.createElement('input');
            inp.type      = 'number';
            inp.min       = '0';
            inp.value     = d.in_d || 0;
            inp.className = 'f3io-in-input';
            tdD.appendChild(inp);

            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // 저장 버튼 클릭과 동일한 효과
                    const saveBtn = document.getElementById('gf3IoSaveBtn');
                    if (saveBtn && !saveBtn.disabled) saveBtn.click();
                }
            });
        }
    }

    // 편집 모드 종료 시 input → span 복원 (저장 여부와 무관하게 DOM 복원)
    function onEditModeExit() {
        rerenderAllRows();
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
                const srcTop = el.scrollTop;
                PANEL_IDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if (t) t.scrollTop = srcTop;
                });
                hideCursors();
                _syncLock = false;
                if (srcTop <= 10 && !isLoadingPrev && !state.loading) loadPrevMonth();
            });
        });
    }

    /* ─────────────────────────────────────────
       하이라이트 & 커서
    ───────────────────────────────────────── */
    function hideCursors() {
        [1, 2, 3].forEach(i => {
            const c = document.getElementById(`f3ioCursor${i}`);
            if (c) c.classList.remove('active');
        });
    }

    function showCursor(panelIdx, td) {
        const cursorEl = document.getElementById(`f3ioCursor${panelIdx}`);
        const panelEl  = document.getElementById(`f3ioScrollPanel${panelIdx}`);
        if (!cursorEl || !panelEl || !td) return;
        let top = 0, left = 0, current = td;
        while (current && current !== panelEl && current !== document.body) {
            top  += current.offsetTop;
            left += current.offsetLeft;
            current = current.offsetParent;
        }
        cursorEl.style.width  = td.offsetWidth  + 'px';
        cursorEl.style.height = td.offsetHeight + 'px';
        cursorEl.style.left   = left + 'px';
        cursorEl.style.top    = top  + 'px';
        cursorEl.classList.add('active');
    }

    function clearHighlights() {
        document.querySelectorAll('.f3io-selected-row').forEach(el => el.classList.remove('f3io-selected-row'));
        document.querySelectorAll('.f3io-selected-cell').forEach(el => el.classList.remove('f3io-selected-cell'));
        document.querySelectorAll('.f3io-header-active').forEach(el => el.classList.remove('f3io-header-active'));
        hideCursors();
    }

    function applyHighlight(panelIdx, dateStr, colDataCol) {
        // 편집 중엔 하이라이트 변경 불가
        if (headerApi && headerApi.isEditMode()) return;

        clearHighlights();
        state.selectedDate  = dateStr;
        state.selectedPanel = panelIdx;
        state.selectedCol   = colDataCol;
        updateDateText(dateStr);

        PANEL_IDS.forEach((id, i) => {
            const body = document.getElementById(`f3ioBody${i + 1}`);
            if (!body) return;
            const row = body.querySelector(`tr[data-date="${dateStr}"]`);
            if (row) row.classList.add('f3io-selected-row');
        });

        const clickedBody = document.getElementById(`f3ioBody${panelIdx}`);
        if (clickedBody && colDataCol !== null) {
            const row = clickedBody.querySelector(`tr[data-date="${dateStr}"]`);
            if (row) {
                const targetTd = row.querySelector(`td[data-col="${colDataCol}"]`);
                if (targetTd) { targetTd.classList.add('f3io-selected-cell'); showCursor(panelIdx, targetTd); }
            }
        }

        if (colDataCol !== null) {
            const panel = document.getElementById(`f3ioScrollPanel${panelIdx}`);
            if (panel) {
                const lv2Th = panel.querySelector(`.f3io-thead-lv2 th[data-col="${colDataCol}"]`);
                if (lv2Th) {
                    lv2Th.classList.add('f3io-header-active');
                    const pg = lv2Th.getAttribute('data-parent-group');
                    if (pg) {
                        const lv1Th = panel.querySelector(`.f3io-thead-lv1 th[data-group="${pg}"]`);
                        if (lv1Th) lv1Th.classList.add('f3io-header-active');
                    } else {
                        panel.querySelectorAll('.f3io-thead-lv1 th.f3io-top-group-th').forEach(th => th.classList.add('f3io-header-active'));
                    }
                }
            }
        }

        // 수정 버튼 — 패널1(입고열)이고 미래가 아닐 때만 활성
        const editBtn = document.getElementById('gf3IoEditBtn');
        if (editBtn && headerApi && headerApi.state.isAdmin) {
            editBtn.disabled = (panelIdx !== 1 || isFuture(dateStr));
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
            const currentRow = body.querySelector(`tr[data-date="${state.selectedDate}"]`);
            if (!currentRow) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const target = e.key === 'ArrowUp' ? currentRow.previousElementSibling : currentRow.nextElementSibling;
                if (target && target.getAttribute('data-date')) {
                    applyHighlight(panelIdx, target.getAttribute('data-date'), String(colNum));
                    scrollToActiveCell(panelIdx);
                }
            } else {
                const colCount = { 1: 6, 2: 7, 3: 2 };
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

    function scrollToActiveCell(panelIdx) {
        const panel    = document.getElementById(`f3ioScrollPanel${panelIdx}`);
        const activeTd = document.querySelector(`#f3ioBody${panelIdx} tr[data-date="${state.selectedDate}"] td[data-col="${state.selectedCol}"]`);
        if (!panel || !activeTd) return;
        let top = 0, cur = activeTd;
        while (cur && cur !== panel && cur !== document.body) { top += cur.offsetTop; cur = cur.offsetParent; }
        const targetBottom = top + activeTd.offsetHeight;
        const headerHeight = 88;
        if (targetBottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = targetBottom - panel.clientHeight + 10;
        else if (top < panel.scrollTop + headerHeight)           panel.scrollTop = top - headerHeight - 10;
    }

    /* ─────────────────────────────────────────
       렌더링
    ───────────────────────────────────────── */
    function showLoading() {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }]
            .forEach(({ id, cols }) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#aeaeb2;font-size:13px;">불러오는 중...</td></tr>`;
            });
    }
    function showError(msg) {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }]
            .forEach(({ id, cols }) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#ff3b30;font-size:13px;">${msg}</td></tr>`;
            });
    }

    function generateRowsHTML(rows) {
        let html1 = '', html2 = '', html3 = '';

        rows.forEach(row => {
            const d     = new Date(row.date + 'T00:00:00');
            const isT   = row.date === yesterdayStr();
            const trCls = isT ? 'f3io-row-today' : '';
            let wdCls   = d.getDay() === 6 ? 'f3io-sat' : d.getDay() === 0 ? 'f3io-sun' : '';
            const mStr  = pad(d.getMonth() + 1);
            const dyStr = pad(d.getDate());
            const wd    = WD_KR[d.getDay()];

            const dateTd    = `<td class="f3io-date-td ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;

            // 패널1: 입고(A,D) 편집 가능 셀, 출고·재고는 읽기 전용
            html1 += `<tr class="${trCls}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell f3io-editable-cell" data-col="1">${fmtNum(row.in_a, row.date)}</td>
                <td class="f3io-data-cell f3io-editable-cell" data-col="2">${fmtNum(row.in_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="3">${fmtNum(row.out_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="4">${fmtNum(row.out_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="5">${fmtNum(row.stock_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="6">${fmtNum(row.stock_d, row.date)}</td>
            </tr>`;

            html2 += `<tr class="${trCls}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="3">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="4">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="5">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="6">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell f3io-sum-col" data-col="7">${fmtNum(null, row.date)}</td>
            </tr>`;

            html3 += `<tr class="${trCls}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(null, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(null, row.date)}</td>
            </tr>`;
        });

        return { html1, html2, html3 };
    }

    function renderInitial(rows) {
        const b1 = document.getElementById('f3ioBody1');
        const b2 = document.getElementById('f3ioBody2');
        const b3 = document.getElementById('f3ioBody3');
        if (!b1 || !b2 || !b3) return;
        const htmls = generateRowsHTML(rows);
        b1.innerHTML = htmls.html1;
        b2.innerHTML = htmls.html2;
        b3.innerHTML = htmls.html3;
    }

    /* ─────────────────────────────────────────
       데이터 로드
    ───────────────────────────────────────── */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        try {
            // io 테이블 전체 1회 로드 (baseline 포함)
            if (!baselineRow) await loadIoTable();

            const rows = await loadMonth(state.year, state.month);
            renderInitial(rows);
            scrollToToday();
        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            showError('데이터를 불러오지 못했습니다.');
        } finally {
            state.loading = false;
        }
    }

    function loadPrevMonth(isAutoFill = false) {
        return new Promise(resolve => {
            if (isLoadingPrev) return resolve();
            isLoadingPrev = true;
            oldestMonth--;
            if (oldestMonth < 1) { oldestMonth = 12; oldestYear--; }

            const panel1    = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            loadMonth(oldestYear, oldestMonth)
                .then(rows => {
                    const htmls = generateRowsHTML(rows);
                    document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
                    document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
                    document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

                    requestAnimationFrame(() => {
                        if (panel1 && !isAutoFill) {
                            const diff = panel1.scrollHeight - prevHeight;
                            PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTop += diff; });
                        }
                        resolve();
                    });
                })
                .catch(() => resolve())
                .finally(() => { isLoadingPrev = false; });
        });
    }

    /* ─────────────────────────────────────────
       클릭 이벤트
    ───────────────────────────────────────── */
    function bindBodyClicks() {
        [[1,'f3ioBody1'], [2,'f3ioBody2'], [3,'f3ioBody3']].forEach(([panelIdx, bodyId]) => {
            const body = document.getElementById(bodyId);
            if (!body) return;
            body.addEventListener('click', e => {
                const td = e.target.closest('td');
                if (!td || td.classList.contains('f3io-date-td')) return;
                const tr = td.closest('tr[data-date]');
                if (!tr) return;
                applyHighlight(panelIdx, tr.getAttribute('data-date'), td.getAttribute('data-col'));
            });
        });
    }

    /* ─────────────────────────────────────────
       오늘 스크롤
    ───────────────────────────────────────── */
    function scrollToToday() {
        setTimeout(() => {
            requestAnimationFrame(() => {
                const today  = todayStr();
                const panel1 = document.getElementById('f3ioScrollPanel1');
                if (!panel1) return;

                let row = panel1.querySelector(`tr[data-date="${today}"]`);
                if (!row) row = panel1.querySelector(`tr[data-date="${yesterdayStr()}"]`);

                if (row) {
                    let top = 0, cur = row;
                    while (cur && cur !== panel1 && cur !== document.body) { top += cur.offsetTop; cur = cur.offsetParent; }

                    const offset       = panel1.clientHeight / 3;
                    const targetScroll = top - offset;

                    if (targetScroll < 0 && !isLoadingPrev) {
                        loadPrevMonth(true).then(() => {
                            requestAnimationFrame(() => {
                                let nr = panel1.querySelector(`tr[data-date="${today}"]`);
                                if (!nr) nr = panel1.querySelector(`tr[data-date="${yesterdayStr()}"]`);
                                if (nr) {
                                    let nt = 0, nc = nr;
                                    while (nc && nc !== panel1 && nc !== document.body) { nt += nc.offsetTop; nc = nc.offsetParent; }
                                    PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTo({ top: Math.max(0, nt - offset), behavior:'auto' }); });
                                }
                            });
                        });
                    } else {
                        PANEL_IDS.forEach(id => { const p = document.getElementById(id); if (p) p.scrollTo({ top: Math.max(0, targetScroll), behavior:'auto' }); });
                    }
                }
                updateDateText(today);
            });
        }, 50);
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
                    const d = new Date(dateStr);
                    state.year  = d.getFullYear();
                    state.month = d.getMonth() + 1;
                    oldestYear  = state.year;
                    oldestMonth = state.month;
                    clearHighlights();
                    dataCache = {};
                    baselineRow = null;
                    loadData();
                },
                onSave: handleSave,
            });

            if (!headerApi) return;

            // 헤더의 toggleEditMode가 편집 모드 진입/종료를 처리함
            // 편집 버튼 클릭 → 헤더가 toggleEditMode 호출 → 우리는 MutationObserver로 감지
            // 대신 editBtn에 추가 리스너로 진입/종료 시점 처리
            const editBtn = document.getElementById('gf3IoEditBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    // 클릭 시점: isEditMode는 아직 토글 전 (헤더가 호출 후 토글)
                    // → 다음 tick에 확인
                    setTimeout(() => {
                        if (headerApi.isEditMode()) {
                            onEditModeEnter();
                        } else {
                            onEditModeExit();
                        }
                    }, 0);
                });
            }

            // 저장 후 편집 모드 종료 감지 (handleSave 후 헤더가 toggleEditMode 호출하지 않음)
            // → handleSave에서 직접 exit 처리 (헤더 toggleEditMode 수동 호출)
            const saveBtn = document.getElementById('gf3IoSaveBtn');
            if (saveBtn) {
                // 헤더 기본 saveBtn 리스너 이후 추가 처리
                saveBtn.addEventListener('click', () => {
                    setTimeout(() => {
                        if (!headerApi.isEditMode()) {
                            // 헤더가 이미 toggleEditMode 호출해서 종료됨
                            onEditModeExit();
                        }
                    }, 100);
                });
            }

            // prev/next/excel 버튼 비활성화 (factory3_io 페이지에서 불필요)
            ['gf3IoPrevBtn', 'gf3IoNextBtn', 'gf3IoExcelBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.3';
                    btn.style.pointerEvents = 'none';
                }
            });

            // 초기 수정 버튼 비활성화 (행 선택 후 활성화)
            const eb = document.getElementById('gf3IoEditBtn');
            if (eb) eb.disabled = true;

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