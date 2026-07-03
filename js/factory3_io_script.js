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
    const CHUNK_DAYS = 21; // 3주치 (21일) 단위 지연 로딩

    const state = {
        loading:       false,
<<<<<<< HEAD
        initialLoaded: false,
=======
        initialLoaded: false,   // 최초 기본 재고 전체 로드 완료 여부
>>>>>>> parent of a78aaad (원복)
        selectedDate:  null,
        selectedPanel: null,
        selectedCol:   null,
<<<<<<< HEAD
        oldestLoadedStr: null,  // 현재 화면에 로드된 가장 오래된 날짜 (무한 스크롤용)
        newestLoadedStr: null   // 현재 화면에 로드된 가장 최신 날짜
=======
        currentStartDate: null, // 현재 화면에 표시된 가장 오래된 날짜 (무한 스크롤용)
        currentEndDate:   null  // 현재 화면에 표시된 가장 최신 날짜
>>>>>>> parent of c2887e0 (원복)
    };

    let dataCache   = {};
    let baselineRow = null; // { date, stock_a, stock_d }
<<<<<<< HEAD

<<<<<<< HEAD
    let oldestLoadedDate = null; // 무한 스크롤(위쪽) 기준점
    let isLoadingPrev    = false;
    let headerApi        = null;
=======
=======
>>>>>>> parent of c2887e0 (원복)
    let isLoadingPrev = false;
    let headerApi     = null;
>>>>>>> parent of a78aaad (원복)

    /* ─────────────────────────────────────────
       날짜 헬퍼
    ───────────────────────────────────────── */
    function todayStr() {
        const t = new Date();
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
<<<<<<< HEAD
<<<<<<< HEAD
    function addDays(ds, days) {
        const d = new Date(ds + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return fmtDate(d);
    }
    // start부터 end까지의 날짜 배열 생성
    function getDatesRange(start, end) {
        const arr = [];
        let curr = new Date(start + 'T00:00:00');
        const last = new Date(end + 'T00:00:00');
        while (curr <= last) {
            arr.push(fmtDate(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return arr;
=======
    function subtractDays(ds, days) {
        const d = new Date(ds + 'T00:00:00');
        d.setDate(d.getDate() - days);
        return fmtDate(d);
    }
    // 수정 가능 여부 판단 (오늘 기준으로 7일 전까지만 허용)
    function isEditableDate(ds) {
        const targetDate = new Date(ds + 'T00:00:00');
        const limitDate = new Date(todayStr() + 'T00:00:00');
        limitDate.setDate(limitDate.getDate() - 7);
        return targetDate >= limitDate;
    }
    // startStr부터 endStr까지의 날짜 배열 반환
    function getDatesRangeDesc(endStr, startStr) {
        let dates = [];
        let cur = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        while (cur <= end) {
            dates.push(fmtDate(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return dates;
>>>>>>> parent of a78aaad (원복)
    }
=======
>>>>>>> parent of c2887e0 (원복)

    /* ─────────────────────────────────────────
       숫자 포맷 (입고 vs 출고/재고 분리)
    ───────────────────────────────────────── */
    function fmtNum(v, ds, allowToday = false) {
        const rowDate = new Date(ds + 'T00:00:00');
        const todayDate = new Date(todayStr() + 'T00:00:00');

        if (rowDate > todayDate || (rowDate.getTime() === todayDate.getTime() && !allowToday)) {
            return '<span class="f3io-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3io-empty">0</span>';
        return `<span${n < 0 ? ' class="f3io-negative"' : ''}>${n.toLocaleString()}</span>`;
    }

    function updateDateText(str) {
        const el = document.getElementById('gf3IoDateText');
        if (el) el.textContent = str ? fmtKo(str) : '';
    }

    /* ─────────────────────────────────────────
<<<<<<< HEAD
       재고 누적 계산 (baseline 부터 순방향 전체 계산)
    ───────────────────────────────────────── */
    function recalcAllStocks() {
        if (!baselineRow) return;

        let currentSa = baselineRow.stock_a;
        let currentSd = baselineRow.stock_d;

        const dates = Object.keys(dataCache).sort();
        dates.forEach(ds => {
            // baselineRow 날짜보다 과거이거나 같은 경우엔 초기 기준값을 할당,
            // baselineRow 날짜 이후부터만 입고 출고를 가감하여 순방향 누적
            if (ds > baselineRow.date) {
                const r = dataCache[ds];
                currentSa += (r.in_a || 0) - (r.out_a || 0);
                currentSd += (r.in_d || 0) - (r.out_d || 0);
            }
            if (dataCache[ds]) {
                dataCache[ds].stock_a = currentSa;
                dataCache[ds].stock_d = currentSd;
            }
        });
    }

    /* ─────────────────────────────────────────
<<<<<<< HEAD
       Supabase 로드 — 지연 로딩 최적화 구간별 쿼리
    ───────────────────────────────────────── */

    // 1. 기준 재고(baseline) 탐색: 조회 구간 직전의 가장 최근 재고 기록 확보
    async function fetchBaseline(beforeDate) {
=======
       Supabase 로드 — 캐싱을 위한 초기화
    ───────────────────────────────────────── */
    async function loadIoTable() {
>>>>>>> parent of c2887e0 (원복)
        const { data, error } = await supabase
=======
       재고 누적 계산
    ───────────────────────────────────────── */
    function recalcAllStocks() {
        if (!baselineRow) return;
        let sa = baselineRow.stock_a;
        let sd = baselineRow.stock_d;
        
        const cur = new Date(baselineRow.date + 'T00:00:00');
        cur.setDate(cur.getDate() + 1);
        
        const dates = Object.keys(dataCache);
        if (dates.length === 0) return;
        const endStr = dates.reduce((a, b) => a > b ? a : b);
        const end = new Date(endStr + 'T00:00:00');

        while (cur <= end) {
            const ds = fmtDate(cur);
            if (!dataCache[ds]) dataCache[ds] = {};
            const r = dataCache[ds];
            sa += (r.in_a || 0) - (r.out_a || 0);
            sd += (r.in_d || 0) - (r.out_d || 0);
            r.stock_a = sa;
            r.stock_d = sd;
            cur.setDate(cur.getDate() + 1);
        }
    }

<<<<<<< HEAD
    /* ─────────────────────────────────────────
       Supabase 로드 — 기반 데이터 (재고 연산용 연속 데이터)
    ───────────────────────────────────────── */
    // 재고 계산을 위해 '입/출고' 내역은 최초 1회 전체/연속으로 불러옵니다.
    async function loadBaseStocks() {
        const { data: ioData, error: ioError } = await supabase
>>>>>>> parent of a78aaad (원복)
            .from('factory3_io')
            .select('date, stock_a, stock_d')
            .lt('date', beforeDate)
            .order('date', { ascending: false })
            .limit(100);
=======
    async function loadOutgoing() {
        const start = baselineRow ? baselineRow.date : '2026-01-01';
        const end   = todayStr();
>>>>>>> parent of c2887e0 (원복)

<<<<<<< HEAD
        let found = null;
        if (!error && data && data.length > 0) {
            for (const r of data) {
                if (r.stock_a !== 0 || r.stock_d !== 0) {
                    found = r;
                    break;
                }
            }
            if (!found) found = data[data.length - 1]; // 못 찾으면 가장 오래된 행이라도 기준점으로
        }

        if (found) {
            // 더 과거의 기준점을 찾았을 경우에만 갱신 (데이터 누적을 위해)
            if (!baselineRow || found.date < baselineRow.date) {
                baselineRow = { date: found.date, stock_a: found.stock_a || 0, stock_d: found.stock_d || 0 };
            }
        } else {
            if (!baselineRow) baselineRow = { date: '2000-01-01', stock_a: 0, stock_d: 0 };
        }
    }

    // 2. factory3_io 테이블 특정 구간 로드
    async function loadIoTableRange(start, end) {
        const { data, error } = await supabase
            .from('factory3_io')
            .select('date, in_a, in_d') // stock은 기준 계산용으로 fetchBaseline에서만 처리
            .gte('date', start)
            .lte('date', end);

        if (error) {
            console.error('[factory3_io] 입고 데이터 로드 오류:', error);
            throw error;
        }
        if (data) {
            data.forEach(row => {
=======
        if (ioError) throw new Error(`factory3_io 로드 실패: ${ioError.message}`);

        if (ioData) {
            ioData.forEach(row => {
>>>>>>> parent of a78aaad (원복)
                if (!dataCache[row.date]) dataCache[row.date] = {};
                dataCache[row.date].in_a = row.in_a || 0;
                dataCache[row.date].in_d = row.in_d || 0;
            });
        }

<<<<<<< HEAD
    // 3. 출고 데이터 특정 구간 로드
    async function loadOutgoingRange(start, end) {
        const { data, error } = await supabase
=======
        const start = baselineRow ? baselineRow.date : `${new Date().getFullYear()}-01-01`;
        const endStr = todayStr();

        const { data: outData, error: outError } = await supabase
>>>>>>> parent of a78aaad (원복)
            .from('factory3_geupji_real')
            .select('date, col_id, value, item_type')
            .eq('item_type', 'geup_out')
            .gte('date', start)
            .lte('date', endStr);

<<<<<<< HEAD
        if (!error && data) {
            data.forEach(row => {
=======
        if (outData) {
            outData.forEach(row => {
>>>>>>> parent of a78aaad (원복)
                if (!dataCache[row.date]) dataCache[row.date] = {};
                if (row.col_id === 'A') dataCache[row.date].out_a = row.value || 0;
                if (row.col_id === 'D') dataCache[row.date].out_d = row.value || 0;
            });
        }
        recalcAllStocks();
    }

<<<<<<< HEAD
<<<<<<< HEAD
    // 4. 사용량(Usage) 데이터 특정 구간 로드
    async function loadUsageDataRange(start, end) {
=======
    /* ─────────────────────────────────────────
       Supabase 로드 — 구간 데이터 (사용량 등 무거운 데이터)
    ───────────────────────────────────────── */
    // 스크롤 시 7일 단위로 끊어서 무거운 매체/용지 사용량만 패치합니다.
    async function loadUsageChunk(startStr, endStr) {
>>>>>>> parent of a78aaad (원복)
=======
    async function loadUsageData() {
        const start = baselineRow ? baselineRow.date : '2026-01-01';
        const end   = todayStr();

>>>>>>> parent of c2887e0 (원복)
        const { data, error } = await supabase
            .from('factory3_usage')
            .select('print_date, media_name, item_code, usage_qty')
            .gte('print_date', startStr)
            .lte('print_date', endStr);

<<<<<<< HEAD
        if (!error && data) {
            data.forEach(row => {
                const date = row.print_date;
                if (!dataCache[date]) dataCache[date] = {};
                
                if (!dataCache[date].usage_media) dataCache[date].usage_media = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                if (!dataCache[date].usage_paper) dataCache[date].usage_paper = { A: 0, D: 0 };

                const qty = Number(row.usage_qty) || 0;
=======
        if (error) {
            console.error('[factory3_io] usage chunk 로드 오류:', error);
            return;
        }

        // 캐시 구조 초기화
        let cur = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        while (cur <= end) {
            const ds = fmtDate(cur);
            if (!dataCache[ds]) dataCache[ds] = {};
            if (!dataCache[ds].usage_media) dataCache[ds].usage_media = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            if (!dataCache[ds].usage_paper) dataCache[ds].usage_paper = { A: 0, D: 0 };
            cur.setDate(cur.getDate() + 1);
        }

        if (data) {
            data.forEach(row => {
                const date = row.print_date;
<<<<<<< HEAD
                const qty = Number(row.usage_qty) || 0;

>>>>>>> parent of a78aaad (원복)
=======
                if (!dataCache[date]) dataCache[date] = {};
                
                if (!dataCache[date].usage_media) {
                    dataCache[date].usage_media = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                }
                if (!dataCache[date].usage_paper) {
                    dataCache[date].usage_paper = { A: 0, D: 0 };
                }

                const qty = Number(row.usage_qty) || 0;

>>>>>>> parent of c2887e0 (원복)
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
<<<<<<< HEAD
       초기 로드 (최근 3주치) 및 지연 로드 (이전 3주치)
    ───────────────────────────────────────── */
    async function loadDataChunk(targetDateStr) {
        if (state.loading) return;
        state.loading = true;

        dataCache = {}; // 초기화
        baselineRow = null;
        showLoading();

        try {
            const end = targetDateStr; 
            const start = addDays(end, -(CHUNK_DAYS - 1)); // 21일 구간
            
            await fetchBaseline(start);
            await loadIoTableRange(start, end);
            await loadOutgoingRange(start, end);
            await loadUsageDataRange(start, end);
            
            recalcAllStocks();

            const dates = getDatesRange(start, end);
            const rows  = dates.map(ds => buildRow(ds));
            renderInitial(rows);

            oldestLoadedDate = start;
            state.initialLoaded = true;
            scrollToBottom();
            updateDateText(end);

        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            showError(`데이터 로드 실패: ${err.message}`);
        } finally {
            state.loading = false;
        }
    }

    async function loadPrevChunk() {
        if (isLoadingPrev || state.loading || !oldestLoadedDate) return;
        isLoadingPrev = true;

        try {
            const end = addDays(oldestLoadedDate, -1);
            const start = addDays(end, -(CHUNK_DAYS - 1));

            // 새롭게 불러올 구간보다 더 과거의 기준점이 필요한지 갱신
            await fetchBaseline(start);
            
            await loadIoTableRange(start, end);
            await loadOutgoingRange(start, end);
            await loadUsageDataRange(start, end);
            
            // 캐시에 데이터가 추가되었으므로 다시 순방향 전체 정합성 재계산
            recalcAllStocks();

            const dates = getDatesRange(start, end);
            const rows  = dates.map(ds => buildRow(ds));
            const htmls = generateRowsHTML(rows);

            const panel1 = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
            document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
            document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

            // 누적 재고가 재계산되었을 수 있으므로 기존에 표시된 행들까지 전체 텍스트 갱신
            rerenderAllRows();
            
            oldestLoadedDate = start;

            // 스크롤 위치 보정
            requestAnimationFrame(() => {
                if (panel1) {
                    const diff = panel1.scrollHeight - prevHeight;
                    PANEL_IDS.forEach(id => { 
                        const p = document.getElementById(id); 
                        if (p) p.scrollTop += diff; 
                    });
                }
            });
        } catch (err) {
            console.error('[factory3_io] 이전 데이터 로드 오류:', err);
        } finally {
            isLoadingPrev = false;
        }
    }

    /* ─────────────────────────────────────────
       입고 저장 (upsert) & 누적 재고 실시간 업데이트
=======
       입고 및 재고 동시 저장 (upsert)
>>>>>>> parent of c2887e0 (원복)
    ───────────────────────────────────────── */
    async function saveIncoming(dateStr, in_a, in_d, stock_a, stock_d) {
        const { error } = await supabase
            .from('factory3_io')
            .upsert({ date: dateStr, in_a, in_d, stock_a, stock_d }, { onConflict: 'date' });

        if (error) { alert('저장 실패: ' + error.message); return false; }
        return true;
    }

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
        
<<<<<<< HEAD
        // 데이터 정합성을 위한 재고 누적 재계산 및 업데이트
=======
        // stock_a, stock_d 실시간 누적치 반영 계산
>>>>>>> parent of c2887e0 (원복)
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
<<<<<<< HEAD
       편집 모드 진입 / 종료 (7일 제한 로직 추가)
=======
       편집 모드 진입 / 종료 (7일 수정 제한 가드 포함)
>>>>>>> parent of c2887e0 (원복)
    ───────────────────────────────────────── */
    function onEditModeEnter() {
        if (!state.selectedDate) {
            alert('먼저 입고를 수정할 날짜 행을 클릭해 선택해주세요.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }
<<<<<<< HEAD
=======

        // 핵심: 7일 이전 날짜 수정 차단
        if (!isEditableDate(state.selectedDate)) {
            alert('7일 이전의 데이터는 수정할 수 없습니다.');
            if (headerApi) headerApi.toggleEditMode();
            return;
        }

>>>>>>> parent of a78aaad (원복)
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
<<<<<<< HEAD
       DOM 갱신 및 HTML 생성 (재계산 업데이트 지원)
=======
       DOM 갱신
>>>>>>> parent of c2887e0 (원복)
    ───────────────────────────────────────── */
    function rerenderAllRows() {
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = dataCache[ds] || {};
            tr.querySelectorAll('td[data-col]').forEach(td => {
                if (td.querySelector('.f3io-in-input')) return;
                const col = td.getAttribute('data-col');
<<<<<<< HEAD
<<<<<<< HEAD
=======
                
>>>>>>> parent of a78aaad (원복)
=======
>>>>>>> parent of c2887e0 (원복)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
                    
>>>>>>> parent of a78aaad (원복)
=======
>>>>>>> parent of c2887e0 (원복)
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

    function buildRow(ds) {
        const d = dataCache[ds] || {};
        return { 
            date:ds, 
            in_a:d.in_a||0, in_d:d.in_d||0, 
            out_a:d.out_a||0, out_d:d.out_d||0, 
            stock_a:d.stock_a||0, stock_d:d.stock_d||0,
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

            let mismatchClass = (mediaSum !== paperSum && d < new Date(todayStr() + 'T00:00:00')) ? ' f3io-sum-mismatch' : '';
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

    /* ─────────────────────────────────────────
<<<<<<< HEAD
<<<<<<< HEAD
       스크롤 동기화 & 상단 도달 시 이전 데이터 로드
=======
       스크롤 동기화 & 무한 스크롤(Chunk 방식)
>>>>>>> parent of a78aaad (원복)
=======
       스크롤 동기화 및 무한 스크롤 (7일씩 역산 로드)
>>>>>>> parent of c2887e0 (원복)
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
<<<<<<< HEAD
<<<<<<< HEAD

                // 스크롤 최상단 시 지연 로딩
                if (top <= 10 && !isLoadingPrev && !state.loading && oldestLoadedDate) {
                    loadPrevChunk();
                }
=======
                
                // 최상단 도달 시 이전 7일치 추가 로드
                if (top <= 10 && !isLoadingPrev && !state.loading) loadPrevChunk();
>>>>>>> parent of a78aaad (원복)
=======
                
                // 최상단 도달 시 기존 월 단위 로드가 아닌 7일 이전 영역 단위 추가 로드 작동
                if (top <= 10 && !isLoadingPrev && !state.loading) loadPrevPeriod();
>>>>>>> parent of c2887e0 (원복)
            });
        });
    }

    function scrollToBottom() {
        setTimeout(() => requestAnimationFrame(() => {
            const panel1 = document.getElementById('f3ioScrollPanel1');
            if (!panel1) return;
            PANEL_IDS.forEach(id => { 
                const p = document.getElementById(id); 
                if (p) p.scrollTop = p.scrollHeight; 
            });
        }), 50);
    }

    /* ─────────────────────────────────────────
       하이라이트 & 커서 (기존 유지)
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

<<<<<<< HEAD
    /* ─────────────────────────────────────────
       키보드 네비게이션 & 클릭 이벤트
    ───────────────────────────────────────── */
=======
>>>>>>> parent of a78aaad (원복)
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

<<<<<<< HEAD
=======
    /* ─────────────────────────────────────────
       렌더링 헬퍼
    ───────────────────────────────────────── */
    function showLoading() {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }].forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#aeaeb2;font-size:13px;">데이터를 불러오는 중...</td></tr>`;
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
            const d = new Date(row.date + 'T00:00:00');
            const todayStrVal = todayStr();
            const isT = row.date === todayStrVal;
            const trC = isT ? 'f3io-row-today' : '';
            const wd  = d.getDay();
            const wdC = wd === 6 ? 'f3io-sat' : wd === 0 ? 'f3io-sun' : '';
            const m   = pad(d.getMonth()+1);
            const dy  = pad(d.getDate());
            const wn  = WD_KR[wd];

            const dateTd    = `<td class="f3io-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

<<<<<<< HEAD
            // 7일 제한 검증 후 클래스 부여
            const isEditable = isEditableDate(row.date);
            const editableClass = isEditable ? 'f3io-editable-cell' : '';

=======
>>>>>>> parent of c2887e0 (원복)
            html1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell ${editableClass}" data-col="1">${fmtNum(row.in_a,    row.date, true)}</td>
                <td class="f3io-data-cell ${editableClass}" data-col="2">${fmtNum(row.in_d,    row.date, true)}</td>
                <td class="f3io-data-cell f3io-sep"         data-col="3">${fmtNum(row.out_a,   row.date, false)}</td>
                <td class="f3io-data-cell"                  data-col="4">${fmtNum(row.out_d,   row.date, false)}</td>
                <td class="f3io-data-cell f3io-sep"         data-col="5">${fmtNum(row.stock_a, row.date, false)}</td>
                <td class="f3io-data-cell"                  data-col="6">${fmtNum(row.stock_d, row.date, false)}</td>
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
            if (mediaSum !== paperSum && d < new Date(todayStrVal + 'T00:00:00')) {
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
        
        // 기존 데이터 초기화 (달력 이동 등의 케이스 대응)
        b1.innerHTML = '';
        b2.innerHTML = '';
        b3.innerHTML = '';

        const h = generateRowsHTML(rows);
        b1.innerHTML = h.html1;
        b2.innerHTML = h.html2;
        b3.innerHTML = h.html3;
    }

    /* ─────────────────────────────────────────
<<<<<<< HEAD
       데이터 로드 (초기 7일 구간)
=======
       데이터 로드 (오늘 기준 7일전 범위 변경 반영)
>>>>>>> parent of c2887e0 (원복)
    ───────────────────────────────────────── */
    async function loadData(targetDateStr = todayStr()) {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        try {
            // 재고 누적 계산을 위한 뼈대(입/출고) 데이터는 캐시가 비어있을 때 한 번만 전체 셋업
            if (!state.initialLoaded) {
<<<<<<< HEAD
                await loadBaseStocks();
                state.initialLoaded = true;
            }

            // 선택된 날짜를 기준으로 최근 7일(0~6일) 범위를 설정합니다.
            state.newestLoadedStr = targetDateStr;
            state.oldestLoadedStr = subtractDays(targetDateStr, 6);

            // 해당 구간의 무거운 데이터(사용량 등)만 로드
            await loadUsageChunk(state.oldestLoadedStr, state.newestLoadedStr);

            const dates = getDatesRangeDesc(state.newestLoadedStr, state.oldestLoadedStr);
            const rows  = dates.map(ds => buildRow(ds));
            
=======
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

>>>>>>> parent of c2887e0 (원복)
            renderInitial(rows);
            scrollToTarget(targetDateStr);
        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            showError(`데이터 로드 실패: ${err.message}`);
        } finally {
            state.loading = false;
        }
    }

    /* ─────────────────────────────────────────
<<<<<<< HEAD
       데이터 추가 로드 (스크롤 위로 - 이전 7일 구간)
    ───────────────────────────────────────── */
    async function loadPrevChunk() {
        return new Promise(async resolve => {
            if (isLoadingPrev || state.loading) return resolve();
            isLoadingPrev = true;
=======
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
>>>>>>> parent of c2887e0 (원복)

            // 기존에 불려온 가장 오래된 날짜의 하루 전부터 7일치를 계산
            const endStr = subtractDays(state.oldestLoadedStr, 1);
            const startStr = subtractDays(endStr, 6);

            const panel1 = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

<<<<<<< HEAD
            await loadUsageChunk(startStr, endStr);
            state.oldestLoadedStr = startStr;

            const dates = getDatesRangeDesc(endStr, startStr);
            const rows = dates.map(ds => buildRow(ds));
=======
>>>>>>> parent of c2887e0 (원복)
            const htmls = generateRowsHTML(rows);

            document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
            document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
            document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

            // 새 노드가 추가되어 높이가 변경되면 스크롤 위치 보정
            requestAnimationFrame(() => {
                if (panel1) {
                    const diff = panel1.scrollHeight - prevHeight;
                    PANEL_IDS.forEach(id => { 
                        const p = document.getElementById(id); 
                        if (p) p.scrollTop += diff; 
                    });
                }
                isLoadingPrev = false;
                resolve();
            });
        });
    }

    /* ─────────────────────────────────────────
       클릭 및 스크롤 이벤트
    ───────────────────────────────────────── */
>>>>>>> parent of a78aaad (원복)
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

<<<<<<< HEAD
=======
    function scrollToTarget(targetDs) {
        setTimeout(() => requestAnimationFrame(() => {
            const panel1 = document.getElementById('f3ioScrollPanel1');
            if (!panel1) return;

            let row = panel1.querySelector(`tr[data-date="${targetDs}"]`);
            if (row) {
<<<<<<< HEAD
                // 초기로드된 7일 데이터 중 가장 최신 데이터이므로 스크롤을 맨 아래로 내립니다.
                PANEL_IDS.forEach(id => { 
                    const p = document.getElementById(id); 
                    if (p) p.scrollTo({ top: p.scrollHeight, behavior:'auto' }); 
                });
=======
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
>>>>>>> parent of c2887e0 (원복)
            }
            updateDateText(targetDs);
        }), 50);
    }

>>>>>>> parent of a78aaad (원복)
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
<<<<<<< HEAD
=======
                    const d = new Date(dateStr);
>>>>>>> parent of c2887e0 (원복)
                    clearHighlights();
<<<<<<< HEAD
                    // 헤더 캘린더 등에서 기준일을 변경하면 해당일자 기준으로 다시 초기 3주치 로드
                    loadDataChunk(dateStr);
=======
                    // 달력에서 날짜를 선택하면, 해당 날짜를 기준으로 과거 7일을 다시 로드합니다.
                    loadData(dateStr);
>>>>>>> parent of a78aaad (원복)
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

<<<<<<< HEAD
            // 초기 페이지 진입 시 오늘을 기준으로 로드 시작
            loadDataChunk(todayStr());
=======
            loadData(todayStr());
>>>>>>> parent of a78aaad (원복)
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