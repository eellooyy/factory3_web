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
        loading:       false,
        initialLoaded: false,   // 최초 전체 로드 완료 여부
        selectedDate:  null,
        selectedPanel: null,
        selectedCol:   null,
        currentStartDate: null, // 현재 화면에 표시된 가장 오래된 날짜 (무한 스크롤용)
        currentEndDate:   null  // 현재 화면에 표시된 가장 최신 날짜
    };

    // 날짜 → { in_a, in_d, out_a, out_d, stock_a, stock_d, usage_media: {}, usage_paper: {} }
    let dataCache   = {};
    let baselineRow = null; // { date, stock_a, stock_d }

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
    function fmtDate(d) {
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }

    /* ─────────────────────────────────────────
       숫자 포맷 (입고 vs 출고/재고 분리)
    ───────────────────────────────────────── */
    function fmtNum(v, ds, allowToday = false) {
        const rowDate = new Date(ds + 'T00:00:00');
        const todayDate = new Date(todayStr() + 'T00:00:00');

        // 미래 날짜이거나, (오늘인데 입고(allowToday)가 아닌 경우) '-' 표시
        if (rowDate > todayDate || (rowDate.getTime() === todayDate.getTime() && !allowToday)) {
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
       Supabase 로드 — 캐싱을 위한 초기화
    ───────────────────────────────────────── */
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

    async function loadOutgoing() {
        const start = baselineRow ? baselineRow.date : '2026-01-01';
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

    async function loadUsageData() {
        const start = baselineRow ? baselineRow.date : '2026-01-01';
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
                
                if (!dataCache[date].usage_media) {
                    dataCache[date].usage_media = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                }
                if (!dataCache[date].usage_paper) {
                    dataCache[date].usage_paper = { A: 0, D: 0 };
                }

                const qty = Number(row.usage_qty) || 0;

                if (row.media_name === '매일경제신문') dataCache[date].usage_media[1] += qty;
                else if (row.media_name === '매일경제신문(특집)') dataCache[date].usage_media[2] += qty;
                else if (row.media_name === '경인일보') dataCache[date].usage_media[3] += qty;
                else if (row.media_name === '기독교타임즈') dataCache[date].usage_media[4] += qty;
                else if (row.media_name === '한국대학신문') dataCache[date].usage_media[5] += qty;
                else if (row.media_name === '가톨릭평화신문') dataCache[date].usage_media[6] += qty;

                if (row.item_code === '11ANP-0000001') dataCache[date].usage_paper.A += qty;
                else if (row.item_code === '11ANP-0000003') dataCache[date].usage_paper.D += qty;
            });
        }
    }

    /* ─────────────────────────────────────────
       입고 및 재고 동시 저장 (upsert)
    ───────────────────────────────────────── */
    async function saveIncoming(dateStr, in_a, in_d, stock_a, stock_d) {
        const { error } = await supabase
            .from('factory3_io')
            .upsert({ date: dateStr, in_a, in_d, stock_a, stock_d }, { onConflict: 'date' });

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

        if (!dataCache[ds]) dataCache[ds] = {};
        dataCache[ds].in_a = in_a;
        dataCache[ds].in_d = in_d;
        
        // stock_a, stock_d 실시간 누적치 반영 계산
        recalcAllStocks();

        const stock_a = dataCache[ds]?.stock_a || 0;
        const stock_d = dataCache[ds]?.stock_d || 0;

        // DB에 입고량 및 실시간 연산 재고값 동시 전달 기입
        const ok = await saveIncoming(ds, in_a, in_d, stock_a, stock_d);
        if (!ok) return;

        rerenderAllRows();
        alert('저장 완료');
    }

    /* ─────────────────────────────────────────
       편집 모드 진입 / 종료 (7일 수정 제한 가드 포함)
    ───────────────────────────────────────── */
    function onEditModeEnter() {
        if (!state.selectedDate) {
            alert('먼저 입고를 수정할 날짜 행을 클릭해 선택해주세요.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }

        const ds  = state.selectedDate;

        // [핵심 변경] 오늘 기준 7일전 체크 검증
        const todayObj = new Date(todayStr() + 'T00:00:00');
        const selectedObj = new Date(ds + 'T00:00:00');
        const diffTime = todayObj.getTime() - selectedObj.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays > 7 || diffDays < 0) {
            alert('입고 내역은 오늘 기준 7일 전 내역까지만 수정할 수 있습니다.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }

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
       DOM 갱신
    ───────────────────────────────────────── */
    function rerenderAllRows() {
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            tr.querySelectorAll('td[data-col]').forEach(td => {
                if (td.querySelector('.f3io-in-input')) return;
                const col = td.getAttribute('data-col');
                if      (col === '1') td.innerHTML = fmtNum(d.in_a,    ds, true);
                else if (col === '2') td.innerHTML = fmtNum(d.in_d,    ds, true);
                else if (col === '3') td.innerHTML = fmtNum(d.out_a,   ds, false);
                else if (col === '4') td.innerHTML = fmtNum(d.out_d,   ds, false);
                else if (col === '5') td.innerHTML = fmtNum(d.stock_a, ds, false);
                else if (col === '6') td.innerHTML = fmtNum(d.stock_d, ds, false);
            });
        });

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
                    td.innerHTML = fmtNum(val, ds, false);
                    mediaSum += val;
                } else if (col === 7) {
                    td.innerHTML = fmtNum(mediaSum, ds, false);
                    if (mediaSum !== paperSum && new Date(ds + 'T00:00:00') < new Date(todayStr() + 'T00:00:00')) {
                        td.classList.add('f3io-sum-mismatch');
                    } else {
                        td.classList.remove('f3io-sum-mismatch');
                    }
                }
            });
        });

        document.querySelectorAll('#f3ioBody3 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            const usagePaper = d.usage_paper || { A: 0, D: 0 };
            
            tr.querySelectorAll('td[data-col]').forEach(td => {
                const col = td.getAttribute('data-col');
                if (col === '1') td.innerHTML = fmtNum(usagePaper.A || 0, ds, false);
                if (col === '2') td.innerHTML = fmtNum(usagePaper.D || 0, ds, false);
            });
        });
    }

    /* ─────────────────────────────────────────
       스크롤 동기화 및 무한 스크롤 (7일씩 역산 로드)
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
                
                // 최상단 도달 시 기존 월 단위 로드가 아닌 7일 이전 영역 단위 추가 로드 작동
                if (top <= 10 && !isLoadingPrev && !state.loading) loadPrevPeriod();
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

            html1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell f3io-editable-cell" data-col="1">${fmtNum(row.in_a,    row.date, true)}</td>
                <td class="f3io-data-cell f3io-editable-cell" data-col="2">${fmtNum(row.in_d,    row.date, true)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="3">${fmtNum(row.out_a,   row.date, false)}</td>
                <td class="f3io-data-cell"                    data-col="4">${fmtNum(row.out_d,   row.date, false)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="5">${fmtNum(row.stock_a, row.date, false)}</td>
                <td class="f3io-data-cell"                    data-col="6">${fmtNum(row.stock_d, row.date, false)}</td>
            </tr>`;

            let mediaHtml = '';
            let mediaSum = 0;
            const usageMedia = row.usage_media;
            const usagePaper = row.usage_paper;
            const paperSum = (usagePaper.A || 0) + (usagePaper.D || 0);

            for (let col = 1; col <= 6; col++) {
                const val = usageMedia[col] || 0;
                mediaHtml += `<td class="f3io-data-cell" data-col="${col}">${fmtNum(val, row.date, false)}</td>`;
                mediaSum += val;
            }

            let mismatchClass = '';
            if (mediaSum !== paperSum && d < new Date(todayStr() + 'T00:00:00')) {
                mismatchClass = ' f3io-sum-mismatch';
            }

            html2 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                ${mediaHtml}
                <td class="f3io-data-cell f3io-sum-col${mismatchClass}" data-col="7">${fmtNum(mediaSum, row.date, false)}</td>
            </tr>`;

            html3 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(usagePaper.A, row.date, false)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(usagePaper.D, row.date, false)}</td>
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
       데이터 로드 (오늘 기준 7일전 범위 변경 반영)
    ───────────────────────────────────────── */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        try {
            if (!state.initialLoaded) {
                await loadIoTable();
                await loadOutgoing();
                await loadUsageData(); 
                recalcAllStocks();
                state.initialLoaded = true;
            }

            // [핵심 변경] 오늘 날짜 기준 7일 전 내역 리스트 구성 (오늘 포함 7개 행 생성)
            const rows = [];
            const anchorDate = new Date(todayStr() + 'T00:00:00');
            for (let i = 6; i >= 0; i--) {
                const targetDateObj = new Date(anchorDate.getTime());
                targetDateObj.setDate(anchorDate.getDate() - i);
                rows.push(buildRow(fmtDate(targetDateObj)));
            }

            if (rows.length > 0) {
                state.currentStartDate = rows[0].date;
                state.currentEndDate = rows[rows.length - 1].date;
            }

            renderInitial(rows);
            scrollToToday();
        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            showError(`데이터 로드 실패: ${err.message}<br><small>Supabase RLS 정책을 확인하세요.</small>`);
        } finally {
            state.loading = false;
        }
    }

    /* ─────────────────────────────────────────
       무한 스크롤 연동 추가 7일 단위 갱신 로직
    ───────────────────────────────────────── */
    function loadPrevPeriod(isAutoFill = false) {
        return new Promise(resolve => {
            if (isLoadingPrev) return resolve();
            isLoadingPrev = true;

            // 현재 표시 중인 최상단 날짜 기준 이전 7일 날짜를 확보
            const currentOldest = new Date(state.currentStartDate + 'T00:00:00');
            const rows = [];

            for (let i = 1; i <= 7; i++) {
                const prevDateObj = new Date(currentOldest.getTime());
                prevDateObj.setDate(currentOldest.getDate() - i);
                rows.push(buildRow(fmtDate(prevDateObj)));
            }
            
            // 오래된 날짜 순 정렬을 위해 리버스
            rows.reverse();

            if (rows.length > 0) {
                state.currentStartDate = rows[0].date;
            }

            const panel1     = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

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
                    loadPrevPeriod(true).then(() => requestAnimationFrame(() => {
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