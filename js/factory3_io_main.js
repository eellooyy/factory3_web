/* js/factory3_io_main.js */
window.Factory3Io = window.Factory3Io || {};

(function () {
    'use strict';

    const Utils = Factory3Io.Utils;
    const API = Factory3Io.API;
    const Render = Factory3Io.Render;

    Factory3Io.CHUNK_DAYS = 21;

    Factory3Io.Main = {
        init: async function () {
            // 초기 구동 시 스크롤, 클릭, 키보드 네비게이션 이벤트를 선행 바인딩합니다.
            bindScrollSync();
            bindBodyClicks();
            bindKeyboardNav();

            // 공통 헤더 모듈 연동 정의
            Factory3Io.state.headerApi = window.Factory3Header.init({
                idPrefix: 'Io',
                onDateChange: (dateStr) => {
                    if (Factory3Io.state.headerApi && Factory3Io.state.headerApi.isEditMode()) {
                        onEditModeExit();
                    }
                    clearHighlights();
                    loadDataChunk(dateStr);
                },
                onSave: handleSave,
            });

            // 헤더 액션 컨트롤러 제어
            const editBtn = document.getElementById('gf3IoEditBtn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    setTimeout(() => {
                        if (Factory3Io.state.headerApi.isEditMode()) {
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
                        if (!Factory3Io.state.headerApi.isEditMode()) onEditModeExit();
                    }, 300);
                });
            }

            // 불필요한 컨트롤 일시 비활성화 처리
            ['gf3IoPrevBtn', 'gf3IoNextBtn', 'gf3IoExcelBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) { btn.disabled = true; btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }
            });

            // 기본값으로 어제 날짜 기준 레이아웃 구동 시작
            await loadDataChunk(Utils.yesterdayStr());
        }
    };

    /* ─────────────────────────────────────────
       초기 로드 및 지연 로드 컨트롤러
    ───────────────────────────────────────── */
    async function loadDataChunk(targetDateStr) {
        if (Factory3Io.state.loading) return;
        Factory3Io.state.loading = true;

        Render.showLoading();

        try {
            const baseDate = targetDateStr || Utils.todayStr();
            // [요구사항] 과거 3주(21일전) ~ 미래 1주(7일후) 일괄 프레임 스케줄링 지정
            const start = Utils.addDays(baseDate, -21);
            const end = Utils.addDays(baseDate, 7);
            
            // 병렬 최적화 구조로 Supabase View 호출 통합 처리
            await API.fetchBaseline(start);
            await Promise.all([
                API.loadIoTableRange(start, end),
                API.loadOutgoingRange(start, end),
                API.loadUsageDataRange(start, end)
            ]);
            
            // DB에 데이터가 비어있어도 날짜 행을 무조건 출력하도록 껍데기 세팅
            const dates = Utils.getDatesRange(start, end);
            dates.forEach(ds => {
                if (!Factory3Io.dataCache[ds]) {
                    Factory3Io.dataCache[ds] = {};
                }
            });

            // 실시간 재고 롤링 연산 가동
            API.recalcAllStocks();

            const rows = dates.map(ds => Render.buildRow(ds));
            Render.renderInitial(rows);

            Factory3Io.state.oldestLoadedDate = start;
            Factory3Io.state.initialLoaded = true;
            
            // 어제 위치가 화면 상단 정렬 세팅을 유도하도록 스크롤바 조절
            scrollToYesterday(baseDate);
            Render.updateDateText(baseDate);

        } catch (err) {
            console.error('[factory3_io] 로드 실패:', err);
            Render.showError(`데이터 로드 실패: ${err.message}`);
        } finally {
            Factory3Io.state.loading = false;
        }
    }

    /* ─────────────────────────────────────────
       과거 스크롤 도달 시 역방향 청크 렌더링
    ───────────────────────────────────────── */
    async function loadPrevChunk() {
        if (Factory3Io.state.isLoadingPrev || Factory3Io.state.loading || !Factory3Io.state.oldestLoadedDate) return;
        Factory3Io.state.isLoadingPrev = true;

        try {
            const end = Utils.addDays(Factory3Io.state.oldestLoadedDate, -1);
            const start = Utils.addDays(end, -(Factory3Io.CHUNK_DAYS - 1));

            await API.fetchBaseline(start);
            await Promise.all([
                API.loadIoTableRange(start, end),
                API.loadOutgoingRange(start, end),
                API.loadUsageDataRange(start, end)
            ]);

            const dates = Utils.getDatesRange(start, end);
            dates.forEach(ds => {
                if (!Factory3Io.dataCache[ds]) Factory3Io.dataCache[ds] = {};
            });

            API.recalcAllStocks();

            const rows = dates.map(ds => Render.buildRow(ds));
            const htmls = Render.generateRowsHTML(rows);

            const panel1 = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            // 과거 데이터를 상단 갱신 처리
            document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
            document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
            document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

            Render.rerenderAllRows();
            Factory3Io.state.oldestLoadedDate = start;

            // 스크롤 포커스 튕김 방지용 스크롤 상쇄 연산 실행
            requestAnimationFrame(() => {
                if (panel1) {
                    const diff = panel1.scrollHeight - prevHeight;
                    Factory3Io.PANEL_IDS.forEach(id => { 
                        const p = document.getElementById(id); 
                        if (p) p.scrollTop += diff; 
                    });
                }
            });
        } catch (err) {
            console.error('[factory3_io] 이전 데이터 로드 오류:', err);
        } finally {
            Factory3Io.state.isLoadingPrev = false;
        }
    }

    /* ─────────────────────────────────────────
       입고실적 편집 및 일괄 저장 처리
    ───────────────────────────────────────── */
    async function handleSave() {
        const today = Utils.todayStr();
        const editDates = Utils.getDatesRange(Utils.addDays(today, -6), today);
        
        editDates.forEach(ds => {
            const row = document.querySelector(`#f3ioBody1 tr[data-date="${ds}"]`);
            if (!row) return;

            const inputA = row.querySelector('td[data-col="1"] .f3io-in-input');
            const inputD = row.querySelector('td[data-col="2"] .f3io-in-input');

            if (!Factory3Io.dataCache[ds]) Factory3Io.dataCache[ds] = {};
            if (inputA) Factory3Io.dataCache[ds].in_a = parseInt(inputA.value, 10) || 0;
            if (inputD) Factory3Io.dataCache[ds].in_d = parseInt(inputD.value, 10) || 0;
        });

        API.recalcAllStocks();

        const batchRows = editDates.map(ds => {
            const cacheData = Factory3Io.dataCache[ds] || {};
            return {
                date: ds,
                in_a: cacheData.in_a || 0,
                in_d: cacheData.in_d || 0,
                stock_a: cacheData.stock_a || 0,
                stock_d: cacheData.stock_d || 0
            };
        });

        const ok = await API.saveIncomingBatch(batchRows);
        if (!ok) return;

        if (Factory3Io.state.headerApi && Factory3Io.state.headerApi.isEditMode()) {
            Factory3Io.state.headerApi.toggleEditMode();
        }
        onEditModeExit();
        alert('최근 7일치 입고 실적 및 연산 재고가 실시간으로 일괄 저장되었습니다.');
    }

    function onEditModeEnter() {
        const today = Utils.todayStr();
        const editDates = Utils.getDatesRange(Utils.addDays(today, -6), today);
        let firstInput = null;

        editDates.forEach(ds => {
            const d = Factory3Io.dataCache[ds] || {};
            const row = document.querySelector(`#f3ioBody1 tr[data-date="${ds}"]`);
            if (!row) return;

            const tdA = row.querySelector('td[data-col="1"]');
            const tdD = row.querySelector('td[data-col="2"]');

            function makeInput(val) {
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.min = '0';
                inp.value = val;
                inp.className = 'f3io-in-input';
                return inp;
            }

            if (tdA) {
                tdA.innerHTML = '';
                const inp = makeInput(d.in_a || 0);
                tdA.appendChild(inp);
                if (!firstInput) firstInput = inp;
            }
            if (tdD) {
                tdD.innerHTML = '';
                const inp = makeInput(d.in_d || 0);
                tdD.appendChild(inp);
            }
        });

        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }

    function onEditModeExit() {
        Render.rerenderAllRows(true);
    }

    /* ─────────────────────────────────────────
       인터랙션: 스크롤 동기화 및 포커싱 자동 배치
    ───────────────────────────────────────── */
    let _syncLock = false;

    function bindScrollSync() {
        Factory3Io.PANEL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('scroll', () => {
                if (_syncLock) return;
                _syncLock = true;
                const top = el.scrollTop;
                Factory3Io.PANEL_IDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if (t) t.scrollTop = top;
                });
                hideCursors();
                _syncLock = false;

                // 스크롤 상단 근접 시 무한 스크롤 트리거 작동
                if (top <= 10 && !Factory3Io.state.isLoadingPrev && !Factory3Io.state.loading && Factory3Io.state.oldestLoadedDate) {
                    loadPrevChunk();
                }
            });
        });
    }

    function scrollToYesterday(targetDateStr) {
        setTimeout(() => requestAnimationFrame(() => {
            const target = targetDateStr || Utils.yesterdayStr();
            const row = document.querySelector(`#f3ioBody1 tr[data-date="${target}"]`);
            if (!row) return;
            
            const topPos = row.offsetTop;
            Factory3Io.PANEL_IDS.forEach(id => { 
                const p = document.getElementById(id); 
                // 어제 날짜 기준 가운데 윗쪽에 위치하도록 스크롤 패널 안착 분기
                if (p) p.scrollTop = topPos - 44; 
            });
        }), 50);
    }

    /* ─────────────────────────────────────────
       인터랙션: 셀 하이라이트 및 가상 글래스 커서
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
        if (Factory3Io.state.headerApi && Factory3Io.state.headerApi.isEditMode()) return;
        clearHighlights();
        Factory3Io.state.selectedDate  = ds;
        Factory3Io.state.selectedPanel = panelIdx;
        Factory3Io.state.selectedCol   = colDataCol;
        Render.updateDateText(ds);

        // 3개 대장 패널 행 동시 도색
        Factory3Io.PANEL_IDS.forEach((id, i) => {
            const body = document.getElementById(`f3ioBody${i+1}`);
            if (!body) return;
            const row = body.querySelector(`tr[data-date="${ds}"]`);
            if (row) row.classList.add('f3io-selected-row');
        });

        // 단일 타겟 셀 스포트라이트 및 유리 커서 작동
        const clickedBody = document.getElementById(`f3ioBody${panelIdx}`);
        if (clickedBody && colDataCol !== null) {
            const row = clickedBody.querySelector(`tr[data-date="${ds}"]`);
            if (row) {
                const td = row.querySelector(`td[data-col="${colDataCol}"]`);
                if (td) { td.classList.add('f3io-selected-cell'); showCursor(panelIdx, td); }
            }
        }

        // 헤더 대조 매핑 하이라이트
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
       인터랙션: 키보드 제어 및 클릭 리스너 연결
    ───────────────────────────────────────── */
    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (Factory3Io.state.headerApi && Factory3Io.state.headerApi.isEditMode()) return;
            if (!Factory3Io.state.selectedDate || !Factory3Io.state.selectedPanel || !Factory3Io.state.selectedCol) return;
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
            e.preventDefault();

            let panelIdx = Number(Factory3Io.state.selectedPanel);
            let colNum   = Number(Factory3Io.state.selectedCol);
            const body   = document.getElementById(`f3ioBody${panelIdx}`);
            if (!body) return;
            const curRow = body.querySelector(`tr[data-date="${Factory3Io.state.selectedDate}"]`);
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
                applyHighlight(panelIdx, Factory3Io.state.selectedDate, String(colNum));
                scrollToActiveCell(panelIdx);
            }
        });
    }

    function scrollToActiveCell(idx) {
        const pan = document.getElementById(`f3ioScrollPanel${idx}`);
        const td  = document.querySelector(`#f3ioBody${idx} tr[data-date="${Factory3Io.state.selectedDate}"] td[data-col="${Factory3Io.state.selectedCol}"]`);
        if (!pan || !td) return;
        let top = 0, el = td;
        while (el && el !== pan && el !== document.body) { top += el.offsetTop; el = el.offsetParent; }
        const bot = top + td.offsetHeight;
        if (bot > pan.scrollTop + pan.clientHeight) pan.scrollTop = bot - pan.clientHeight + 10;
        else if (top < pan.scrollTop + 88)           pan.scrollTop = top - 88 - 10;
    }

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

    // 모듈 자동 가동 구조화 선언 연동
    document.addEventListener('DOMContentLoaded', () => {
        if (Factory3Io.Main && typeof Factory3Io.Main.init === 'function') {
            Factory3Io.Main.init();
        }
    });

})();