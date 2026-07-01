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
        fp: null,
        selectedDate: null,
        selectedPanel: null,
        selectedCol: null,
        editMode: false,
        editDate: null,
    };

    // 전체 로드된 데이터 캐시 (날짜 → row)
    let dataCache = {}; // { 'YYYY-MM-DD': { in_a, in_d, out_a, out_d, stock_a, stock_d, ... } }
    let initialStock = { date: null, stock_a: 0, stock_d: 0 }; // 최초 기준 재고
    let oldestYear = state.year;
    let oldestMonth = state.month;
    let isLoadingPrev = false;
    let headerApi = null;

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr + 'T00:00:00');
        return target > today;
    }

    // YYYY-MM-DD 형식의 날짜 배열 (해당 월의 모든 날짜)
    function getDatesOfMonth(year, month) {
        const days = new Date(year, month, 0).getDate();
        const dates = [];
        for (let i = 1; i <= days; i++) {
            dates.push(`${year}-${pad(month)}-${pad(i)}`);
        }
        return dates;
    }

    /* ─────────────────────────────────────────
       숫자 포맷
    ───────────────────────────────────────── */
    function fmtNum(v, dateStr) {
        if (isFuture(dateStr)) return '<span class="f3io-empty">-</span>';
        if (v === null || v === undefined || v === '') return '<span class="f3io-empty">0</span>';
        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3io-empty">0</span>';
        const cls = n < 0 ? ' class="f3io-negative"' : '';
        return `<span${cls}>${n.toLocaleString()}</span>`;
    }

    function updateDateText(str) {
        const el = document.getElementById('f3ioDateText');
        if (!el) return;
        el.textContent = str ? fmtKo(str) : '';
    }

    /* ─────────────────────────────────────────
       재고 누적 계산
       초기재고 기준일부터 지정 날짜까지 순차 계산
    ───────────────────────────────────────── */
    function calcStock(targetDate) {
        if (!initialStock.date) return { stock_a: 0, stock_d: 0 };

        // 기준일부터 targetDate까지 날짜 목록 생성
        const start = new Date(initialStock.date + 'T00:00:00');
        const end   = new Date(targetDate + 'T00:00:00');

        let stock_a = initialStock.stock_a;
        let stock_d = initialStock.stock_d;

        // 기준일 다음 날부터 순차 누적
        const cur = new Date(start);
        cur.setDate(cur.getDate() + 1);

        while (cur <= end) {
            const ds = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
            const row = dataCache[ds];
            if (row) {
                stock_a = stock_a + (row.in_a || 0) - (row.out_a || 0);
                stock_d = stock_d + (row.in_d || 0) - (row.out_d || 0);
            }
            cur.setDate(cur.getDate() + 1);
        }

        return { stock_a, stock_d };
    }

    /* ─────────────────────────────────────────
       Supabase 데이터 로드
    ───────────────────────────────────────── */

    // 초기재고 기준점 로드
    async function loadInitialStock() {
        const { data, error } = await supabase
            .from('paper_initial_stock')
            .select('*')
            .order('date', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            initialStock = {
                date: data[0].date,
                stock_a: data[0].stock_a || 0,
                stock_d: data[0].stock_d || 0,
            };
        }
    }

    // 특정 기간의 입고 데이터 로드 → dataCache에 병합
    async function loadIncoming(startDate, endDate) {
        const { data, error } = await supabase
            .from('paper_incoming')
            .select('date, in_a, in_d')
            .gte('date', startDate)
            .lte('date', endDate);

        if (!error && data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                dataCache[row.date].in_a = row.in_a || 0;
                dataCache[row.date].in_d = row.in_d || 0;
            });
        }
    }

    // 특정 기간의 출고 데이터 로드 (geupji 테이블에서 geup_out) → dataCache에 병합
    async function loadOutgoing(startDate, endDate) {
        const { data, error } = await supabase
            .from('factory3_geupji_real')
            .select('date, col_id, value')
            .eq('item_type', 'geup_out')
            .gte('date', startDate)
            .lte('date', endDate);

        if (!error && data) {
            data.forEach(row => {
                if (!dataCache[row.date]) dataCache[row.date] = {};
                if (row.col_id === 'A') dataCache[row.date].out_a = row.value || 0;
                if (row.col_id === 'D') dataCache[row.date].out_d = row.value || 0;
            });
        }
    }

    // 월 단위로 전체 로드 (입고 + 출고 + 재고 계산)
    async function loadMonth(year, month) {
        const dates = getDatesOfMonth(year, month);
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        await Promise.all([
            loadIncoming(startDate, endDate),
            loadOutgoing(startDate, endDate),
        ]);

        // 재고 계산하여 캐시에 저장
        dates.forEach(ds => {
            const stock = calcStock(ds);
            if (!dataCache[ds]) dataCache[ds] = {};
            dataCache[ds].stock_a = stock.stock_a;
            dataCache[ds].stock_d = stock.stock_d;
        });

        return dates.map(ds => buildRow(ds));
    }

    // dataCache에서 화면 row 객체 생성
    function buildRow(dateStr) {
        const d = dataCache[dateStr] || {};
        return {
            date: dateStr,
            in_a: d.in_a || 0,
            in_d: d.in_d || 0,
            out_a: d.out_a || 0,
            out_d: d.out_d || 0,
            stock_a: d.stock_a || 0,
            stock_d: d.stock_d || 0,
        };
    }

    /* ─────────────────────────────────────────
       입고 저장 / 수정
    ───────────────────────────────────────── */
    async function saveIncoming(dateStr, in_a, in_d) {
        const { error } = await supabase
            .from('paper_incoming')
            .upsert({ date: dateStr, in_a, in_d }, { onConflict: 'date' });

        if (error) {
            alert('저장 실패: ' + error.message);
            return false;
        }
        return true;
    }

    /* ─────────────────────────────────────────
       편집 모드 UI
    ───────────────────────────────────────── */
    function enterEditMode(dateStr) {
        if (state.editMode) return;
        state.editMode = true;
        state.editDate = dateStr;

        const row = document.querySelector(`#f3ioBody1 tr[data-date="${dateStr}"]`);
        if (!row) return;

        const d = dataCache[dateStr] || {};
        const in_a = d.in_a || 0;
        const in_d = d.in_d || 0;

        // 입고 A (col=1), 입고 D (col=2) 셀만 input 활성화
        const tdA = row.querySelector('td[data-col="1"]');
        const tdD = row.querySelector('td[data-col="2"]');

        if (tdA) {
            tdA.innerHTML = `<input class="f3io-edit-input" id="editInputA" type="number" value="${in_a}" min="0">`;
            const input = tdA.querySelector('input');
            if (input) { input.focus(); input.select(); }
        }
        if (tdD) {
            tdD.innerHTML = `<input class="f3io-edit-input" id="editInputD" type="number" value="${in_d}" min="0">`;
        }

        // 저장/취소 버튼 상태 변경
        const saveBtn = document.getElementById('gf3IoSaveBtn');
        const editBtn = document.getElementById('gf3IoEditBtn');
        if (saveBtn) saveBtn.disabled = false;
        if (editBtn) editBtn.disabled = true;
    }

    function exitEditMode(save) {
        if (!state.editMode) return;

        if (save && state.editDate) {
            const inputA = document.getElementById('editInputA');
            const inputD = document.getElementById('editInputD');
            const in_a = inputA ? (parseInt(inputA.value, 10) || 0) : 0;
            const in_d = inputD ? (parseInt(inputD.value, 10) || 0) : 0;

            saveIncoming(state.editDate, in_a, in_d).then(ok => {
                if (ok) {
                    // 캐시 업데이트 후 재고 재계산 & 재렌더링
                    if (!dataCache[state.editDate]) dataCache[state.editDate] = {};
                    dataCache[state.editDate].in_a = in_a;
                    dataCache[state.editDate].in_d = in_d;
                    recalcAndRerender();
                    alert('저장 완료');
                }
            });
        }

        state.editMode = false;
        state.editDate = null;

        const saveBtn = document.getElementById('gf3IoSaveBtn');
        const editBtn = document.getElementById('gf3IoEditBtn');
        if (saveBtn) saveBtn.disabled = true;
        if (editBtn) editBtn.disabled = false;

        // 현재 달 재렌더링 (편집 취소 시에도 원래 값으로 복원)
        if (!save) recalcAndRerender();
    }

    // 캐시 기반으로 재고 재계산 후 DOM 전체 갱신
    function recalcAndRerender() {
        // 초기재고 기준일 이후 모든 캐시된 날짜의 재고 재계산
        const allDates = Object.keys(dataCache).sort();
        allDates.forEach(ds => {
            const stock = calcStock(ds);
            dataCache[ds].stock_a = stock.stock_a;
            dataCache[ds].stock_d = stock.stock_d;
        });

        // 현재 DOM에 있는 모든 row 갱신
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d = dataCache[ds] || {};
            const cells = tr.querySelectorAll('td[data-col]');
            cells.forEach(td => {
                const col = td.getAttribute('data-col');
                if (col === '1') td.innerHTML = fmtNum(d.in_a, ds);
                else if (col === '2') td.innerHTML = fmtNum(d.in_d, ds);
                else if (col === '3') td.innerHTML = fmtNum(d.out_a, ds);
                else if (col === '4') td.innerHTML = fmtNum(d.out_d, ds);
                else if (col === '5') td.innerHTML = fmtNum(d.stock_a, ds);
                else if (col === '6') td.innerHTML = fmtNum(d.stock_d, ds);
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
                const srcTop = el.scrollTop;

                PANEL_IDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid);
                    if (t) t.scrollTop = srcTop;
                });

                hideCursors();
                _syncLock = false;

                if (srcTop <= 10 && !isLoadingPrev && !state.loading) {
                    loadPrevMonth();
                }
            });
        });
    }

    /* ─────────────────────────────────────────
       글래스 커서, 하이라이트 & 키보드 이동
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
        if (clickedBody) {
            const row = clickedBody.querySelector(`tr[data-date="${dateStr}"]`);
            if (row && colDataCol !== null) {
                const targetTd = row.querySelector(`td[data-col="${colDataCol}"]`);
                if (targetTd) {
                    targetTd.classList.add('f3io-selected-cell');
                    showCursor(panelIdx, targetTd);
                }
            }
        }

        if (colDataCol !== null) {
            const panel = document.getElementById(`f3ioScrollPanel${panelIdx}`);
            if (panel) {
                const targetLv2Th = panel.querySelector(`.f3io-thead-lv2 th[data-col="${colDataCol}"]`);
                if (targetLv2Th) {
                    targetLv2Th.classList.add('f3io-header-active');
                    const parentGroup = targetLv2Th.getAttribute('data-parent-group');
                    if (parentGroup) {
                        const targetLv1Th = panel.querySelector(`.f3io-thead-lv1 th[data-group="${parentGroup}"]`);
                        if (targetLv1Th) targetLv1Th.classList.add('f3io-header-active');
                    } else {
                        panel.querySelectorAll('.f3io-thead-lv1 th').forEach(th => {
                            if (th.classList.contains('f3io-top-group-th')) th.classList.add('f3io-header-active');
                        });
                    }
                }
            }
        }

        // 수정 버튼 활성화 (패널1 = 입고/출고/재고 패널)
        const editBtn = document.getElementById('gf3IoEditBtn');
        if (editBtn) editBtn.disabled = (panelIdx !== 1 || isFuture(dateStr));
    }

    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (!state.selectedDate || !state.selectedPanel || !state.selectedCol) return;
            const key = e.key;
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
            e.preventDefault();

            let panelIdx = Number(state.selectedPanel);
            let colNum   = Number(state.selectedCol);
            let dateStr  = state.selectedDate;

            const body = document.getElementById(`f3ioBody${panelIdx}`);
            if (!body) return;
            const currentRow = body.querySelector(`tr[data-date="${dateStr}"]`);
            if (!currentRow) return;

            if (key === 'ArrowUp' || key === 'ArrowDown') {
                const targetRow = key === 'ArrowUp' ? currentRow.previousElementSibling : currentRow.nextElementSibling;
                if (targetRow && targetRow.getAttribute('data-date')) {
                    applyHighlight(panelIdx, targetRow.getAttribute('data-date'), String(colNum));
                    scrollToActiveCell(panelIdx);
                }
            } else {
                const colCount = { 1: 6, 2: 7, 3: 2 };
                if (key === 'ArrowLeft') {
                    colNum--;
                    if (colNum < 1) { if (panelIdx > 1) { panelIdx--; colNum = colCount[panelIdx]; } else colNum = 1; }
                } else {
                    colNum++;
                    if (colNum > colCount[panelIdx]) { if (panelIdx < 3) { panelIdx++; colNum = 1; } else colNum = colCount[panelIdx]; }
                }
                applyHighlight(panelIdx, dateStr, String(colNum));
                scrollToActiveCell(panelIdx);
            }
        });
    }

    function scrollToActiveCell(panelIdx) {
        const panel    = document.getElementById(`f3ioScrollPanel${panelIdx}`);
        const activeTd = document.querySelector(`#f3ioBody${panelIdx} tr[data-date="${state.selectedDate}"] td[data-col="${state.selectedCol}"]`);
        if (!panel || !activeTd) return;

        let top = 0, current = activeTd;
        while (current && current !== panel && current !== document.body) {
            top += current.offsetTop;
            current = current.offsetParent;
        }

        const targetBottom = top + activeTd.offsetHeight;
        const scrollTop    = panel.scrollTop;
        const panelHeight  = panel.clientHeight;
        const headerHeight = 88;

        if (targetBottom > scrollTop + panelHeight) panel.scrollTop = targetBottom - panelHeight + 10;
        else if (top < scrollTop + headerHeight)    panel.scrollTop = top - headerHeight - 10;
    }

    /* ─────────────────────────────────────────
       렌더링
    ───────────────────────────────────────── */
    function generateRowsHTML(rows) {
        let html1 = '', html2 = '', html3 = '';

        rows.forEach(row => {
            const d     = new Date(row.date + 'T00:00:00');
            const isT   = row.date === yesterdayStr();
            const trCls = isT ? 'f3io-row-today' : '';

            let wdCls = '';
            if (d.getDay() === 6) wdCls = 'f3io-sat';
            else if (d.getDay() === 0) wdCls = 'f3io-sun';

            const mStr  = pad(d.getMonth() + 1);
            const dyStr = pad(d.getDate());
            const wd    = WD_KR[d.getDay()];

            const dateTd    = `<td class="f3io-date-td ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;

            html1 += `<tr class="${trCls}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(row.in_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(row.in_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="3">${fmtNum(row.out_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="4">${fmtNum(row.out_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="5">${fmtNum(row.stock_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="6">${fmtNum(row.stock_d, row.date)}</td>
            </tr>`;

            // 패널 2, 3은 현재 geupji 데이터 미연동 → 빈 행 유지
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
        const body1 = document.getElementById('f3ioBody1');
        const body2 = document.getElementById('f3ioBody2');
        const body3 = document.getElementById('f3ioBody3');
        if (!body1 || !body2 || !body3) return;

        const htmls = generateRowsHTML(rows);
        body1.innerHTML = htmls.html1;
        body2.innerHTML = htmls.html2;
        body3.innerHTML = htmls.html3;
    }

    /* ─────────────────────────────────────────
       데이터 로드
    ───────────────────────────────────────── */
    function showLoading() {
        const specs = [
            { id: 'f3ioBody1', cols: 7 },
            { id: 'f3ioBody2', cols: 8 },
            { id: 'f3ioBody3', cols: 3 },
        ];
        specs.forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#aeaeb2;font-size:13px;">불러오는 중...</td></tr>`;
        });
    }

    function showError(msg) {
        const specs = [
            { id: 'f3ioBody1', cols: 7 },
            { id: 'f3ioBody2', cols: 8 },
            { id: 'f3ioBody3', cols: 3 },
        ];
        specs.forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#ff3b30;font-size:13px;">${msg}</td></tr>`;
        });
    }

    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        try {
            // 초기재고 기준점이 아직 없으면 로드
            if (!initialStock.date) {
                await loadInitialStock();
            }

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

            const panel1 = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            loadMonth(oldestYear, oldestMonth)
                .then(rows => {
                    const htmls = generateRowsHTML(rows);
                    document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
                    document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
                    document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

                    requestAnimationFrame(() => {
                        if (panel1 && !isAutoFill) {
                            const newHeight = panel1.scrollHeight;
                            const diff = newHeight - prevHeight;
                            PANEL_IDS.forEach(id => {
                                const p = document.getElementById(id);
                                if (p) p.scrollTop += diff;
                            });
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
        [[1, 'f3ioBody1'], [2, 'f3ioBody2'], [3, 'f3ioBody3']].forEach(([panelIdx, bodyId]) => {
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
                    let top = 0, current = row;
                    while (current && current !== panel1 && current !== document.body) {
                        top += current.offsetTop;
                        current = current.offsetParent;
                    }

                    const offset = panel1.clientHeight / 3;
                    const targetScroll = top - offset;

                    if (targetScroll < 0 && !isLoadingPrev) {
                        loadPrevMonth(true).then(() => {
                            requestAnimationFrame(() => {
                                let newRow = panel1.querySelector(`tr[data-date="${today}"]`);
                                if (!newRow) newRow = panel1.querySelector(`tr[data-date="${yesterdayStr()}"]`);
                                if (newRow) {
                                    let newTop = 0, curr = newRow;
                                    while (curr && curr !== panel1 && curr !== document.body) {
                                        newTop += curr.offsetTop;
                                        curr = curr.offsetParent;
                                    }
                                    const finalScroll = newTop - offset;
                                    PANEL_IDS.forEach(id => {
                                        const p = document.getElementById(id);
                                        if (p) p.scrollTo({ top: Math.max(0, finalScroll), behavior: 'auto' });
                                    });
                                }
                            });
                        });
                    } else {
                        PANEL_IDS.forEach(id => {
                            const p = document.getElementById(id);
                            if (p) p.scrollTo({ top: Math.max(0, targetScroll), behavior: 'auto' });
                        });
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
                    if (state.editMode) exitEditMode(false);
                    const d = new Date(dateStr);
                    state.year  = d.getFullYear();
                    state.month = d.getMonth() + 1;
                    oldestYear  = state.year;
                    oldestMonth = state.month;
                    clearHighlights();
                    dataCache = {};
                    loadData();
                },
                onSave: () => exitEditMode(true),
            });

            // 수정 버튼 클릭 → 선택된 날짜 편집 모드 진입
            const editBtn = document.getElementById('gf3IoEditBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    if (state.selectedDate && state.selectedPanel === 1) {
                        enterEditMode(state.selectedDate);
                    }
                });
            }

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