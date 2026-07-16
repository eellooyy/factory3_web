/* js/factory3_io_main.js */
window.Factory3Io = window.Factory3Io || {};

(function () {
    'use strict';

    const Utils = Factory3Io.Utils;
    const API = Factory3Io.API;
    const Render = Factory3Io.Render;

    Factory3Io.CHUNK_DAYS = 21;

    // DB 원본 데이터 캐시 백업용 객체
    Factory3Io.originalDbCache = {};

    Factory3Io.Main = {
        init: async function () {
            // 초기 구동 시 스크롤, 클릭, 키보드 네비게이션 이벤트를 선행 바인딩합니다.
            bindScrollSync();
            bindBodyClicks();
            bindBodyDoubleClicks(); /* 더블클릭 이벤트(모든 셀 확장) 연동 */
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

            // 마스터(비밀번호 0000) 권한 여부 감지 및 새로고침 동기화 버튼 활성화 처리
            const role = sessionStorage.getItem('gf3_role');
            const syncBtn = document.getElementById('gf3IoTitleSyncBtn');
            if (role === 'master' && syncBtn) {
                syncBtn.style.display = 'inline-flex';
                
                syncBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // 클릭 이벤트가 부모 랩으로 버블링되어 드롭다운 메뉴가 열리는 현상 방지
                    await handleSyncStocks();
                });

                // 마우스 오버 효과 추가
                syncBtn.addEventListener('mouseover', () => {
                    syncBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
                });
                syncBtn.addEventListener('mouseout', () => {
                    syncBtn.style.backgroundColor = 'transparent';
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
            const start = Utils.addDays(baseDate, -21);
            const end = Utils.addDays(baseDate, 7);
            
            await API.fetchBaseline(start);
            await Promise.all([
                API.loadIoTableRange(start, end),
                API.loadOutgoingRange(start, end),
                API.loadUsageDataRange(start, end),
                API.loadMemoRange(start, end)
            ]);
            
            const dates = Utils.getDatesRange(start, end);
            dates.forEach(ds => {
                if (!Factory3Io.dataCache[ds]) {
                    Factory3Io.dataCache[ds] = {};
                }
            });

            // --- [추가] 재고 연산 전 DB 원본 데이터를 안전하게 백업 및 복제합니다. ---
            Factory3Io.originalDbCache = {};
            dates.forEach(ds => {
                const cacheVal = Factory3Io.dataCache[ds] || {};
                Factory3Io.originalDbCache[ds] = {
                    in_a: cacheVal.in_a || 0,
                    in_d: cacheVal.in_d || 0,
                    stock_a: cacheVal.stock_a || 0,
                    stock_d: cacheVal.stock_d || 0
                };
            });

            API.recalcAllStocks();

            const rows = dates.map(ds => Render.buildRow(ds));
            Render.renderInitial(rows);

            Factory3Io.state.oldestLoadedDate = start;
            Factory3Io.state.initialLoaded = true;
            
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
                API.loadUsageDataRange(start, end),
                API.loadMemoRange(start, end)
            ]);

            const dates = Utils.getDatesRange(start, end);
            dates.forEach(ds => {
                if (!Factory3Io.dataCache[ds]) Factory3Io.dataCache[ds] = {};
            });

            // --- [추가] 과거 청크 로드 시에도 DB 원본 값을 원본 백업 캐시에 병합(Merge)합니다. ---
            if (!Factory3Io.originalDbCache) Factory3Io.originalDbCache = {};
            dates.forEach(ds => {
                const cacheVal = Factory3Io.dataCache[ds] || {};
                Factory3Io.originalDbCache[ds] = {
                    in_a: cacheVal.in_a || 0,
                    in_d: cacheVal.in_d || 0,
                    stock_a: cacheVal.stock_a || 0,
                    stock_d: cacheVal.stock_d || 0
                };
            });

            API.recalcAllStocks();

            const rows = dates.map(ds => Render.buildRow(ds));
            const htmls = Render.generateRowsHTML(rows);

            const panel1 = document.getElementById('f3ioScrollPanel1');
            const prevHeight = panel1 ? panel1.scrollHeight : 0;

            document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
            document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
            document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);

            Render.rerenderAllRows();
            Factory3Io.state.oldestLoadedDate = start;

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

        // --- [추가] 일괄 저장 성공 시 백업용 originalDbCache 역시 최신 DB 상태로 함께 갱신 처리합니다. ---
        if (!Factory3Io.originalDbCache) Factory3Io.originalDbCache = {};
        batchRows.forEach(row => {
            const ds = row.date;
            Factory3Io.originalDbCache[ds] = {
                in_a: row.in_a,
                in_d: row.in_d,
                stock_a: row.stock_a,
                stock_d: row.stock_d
            };
        });

        if (Factory3Io.state.headerApi && Factory3Io.state.headerApi.isEditMode()) {
            Factory3Io.state.headerApi.toggleEditMode();
        }
        onEditModeExit();
        alert('최근 7일치 입고 실적 및 연산 재고가 실시간으로 일괄 저장되었습니다.');
    }

    /* ─────────────────────────────────────────
       [수정] 마스터 전용: 재고 실시간 동기화/재계산 처리 (어제까지만 반영)
    ───────────────────────────────────────── */
    async function handleSyncStocks() {
        if (Factory3Io.state.loading) return;

        // 1. 최신 계산 상태 보장
        API.recalcAllStocks();

        // 2. 변동 사항 검지 (Dirty Checking)
        const allDates = Object.keys(Factory3Io.dataCache);
        const batchRows = [];
        const todayStr = Utils.todayStr(); // 오늘 날짜 문자열 가져오기

        allDates.forEach(ds => {
            // [수정] 오늘을 포함한 미래 날짜는 계산 및 DB 동기화 대상에서 제외 (어제 날짜까지만 처리)
            if (ds >= todayStr) return;

            const current = Factory3Io.dataCache[ds] || {};
            const original = (Factory3Io.originalDbCache && Factory3Io.originalDbCache[ds]) || {};

            const isChanged = (
                (current.in_a || 0) !== (original.in_a || 0) ||
                (current.in_d || 0) !== (original.in_d || 0) ||
                (current.stock_a || 0) !== (original.stock_a || 0) ||
                (current.stock_d || 0) !== (original.stock_d || 0)
            );

            if (isChanged) {
                batchRows.push({
                    date: ds,
                    in_a: current.in_a || 0,
                    in_d: current.in_d || 0,
                    stock_a: current.stock_a || 0,
                    stock_d: current.stock_d || 0
                });
            }
        });

        if (batchRows.length === 0) {
            alert('갱신할 재고 변동 사항이 없습니다. 현재 데이터베이스가 최신 상태입니다.');
            return;
        }

        if (!confirm(`어제까지의 재고 변동 사항이 발견된 ${batchRows.length}일치의 데이터를 DB에 최종 저장하시겠습니까?`)) {
            return;
        }

        // 3. 아이콘 360도 회전 애니메이션 시작 및 DB 전송
        const syncBtn = document.getElementById('gf3IoTitleSyncBtn');
        const iconSpan = syncBtn ? syncBtn.querySelector('.material-symbols-outlined') : null;

        if (iconSpan) {
            iconSpan.style.transition = 'transform 1s ease-in-out';
            iconSpan.style.transform = 'rotate(720deg)';
        }

        const ok = await API.saveIncomingBatch(batchRows);
        if (ok) {
            // 성공 시 캐시 백업 업데이트
            if (!Factory3Io.originalDbCache) Factory3Io.originalDbCache = {};
            batchRows.forEach(row => {
                const ds = row.date;
                Factory3Io.originalDbCache[ds] = {
                    in_a: row.in_a,
                    in_d: row.in_d,
                    stock_a: row.stock_a,
                    stock_d: row.stock_d
                };
            });

            Render.rerenderAllRows(true);
            alert('재고가 실시간으로 성공적으로 재계산 및 연동 저장되었습니다.');
        } else {
            alert('재고 데이터베이스 동기화에 실패했습니다.');
        }

        // 애니메이션 효과 정상 초기화
        if (iconSpan) {
            setTimeout(() => {
                iconSpan.style.transition = 'none';
                iconSpan.style.transform = 'rotate(0deg)';
            }, 1000);
        }
    }

    function onEditModeEnter() {
        const wrapper = document.querySelector('.f3io-wrapper');
        if (wrapper) wrapper.classList.add('edit-mode');

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
                tdA.classList.add('f3io-active-edit-cell');
                const inp = makeInput(d.in_a || 0);
                tdA.appendChild(inp);
                if (!firstInput) firstInput = inp;
            }
            if (tdD) {
                tdD.innerHTML = '';
                tdD.classList.add('f3io-active-edit-cell');
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
        const wrapper = document.querySelector('.f3io-wrapper');
        if (wrapper) wrapper.classList.remove('edit-mode');

        document.querySelectorAll('.f3io-active-edit-cell').forEach(td => {
            td.classList.remove('f3io-active-edit-cell');
        });

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

        Factory3Io.PANEL_IDS.forEach((id, i) => {
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
        Factory3Io.PANEL_IDS.forEach((id, i) => {
            const body = document.getElementById(`f3ioBody${i+1}`);
            if (!body) return;
            body.addEventListener('click', e => {
                const td = e.target.closest('td');
                if (!td) return;
                // 1회 클릭 시 기존 하이라이팅 및 인풋 컴포넌트(입고 DB 입력) 제어 로직 보존
                if (td.classList.contains('f3io-date-td')) {
                    const tr = td.closest('tr[data-date]');
                    if (tr) applyHighlight(i+1, tr.getAttribute('data-date'), null);
                } else {
                    const tr = td.closest('tr[data-date]');
                    if (tr) applyHighlight(i+1, tr.getAttribute('data-date'), td.getAttribute('data-col'));
                }
            });
        });
    }

    /* ─ 모든 데이터 셀 더블 클릭 시 엑셀형 메모 입력 처리 ─ */
    function bindBodyDoubleClicks() {
        Factory3Io.PANEL_IDS.forEach((id, i) => {
            const body = document.getElementById(`f3ioBody${i+1}`);
            if (!body) return;
            
            body.addEventListener('dblclick', async (e) => {
                const td = e.target.closest('td');
                if (!td) return;
                const tr = td.closest('tr[data-date]');
                if (!tr) return;
                
                const ds = tr.getAttribute('data-date');
                if (!Factory3Io.dataCache[ds]) Factory3Io.dataCache[ds] = {};
                if (!Factory3Io.dataCache[ds].memos) Factory3Io.dataCache[ds].memos = {};
                
                const d = Factory3Io.dataCache[ds];
                
                let colId = 'ALL';
                let cellLabel = '날짜';
                
                // 날짜 컬럼 분기 파악
                if (td.classList.contains('f3io-date-td')) {
                    colId = 'ALL';
                    cellLabel = '날짜';
                } else {
                    const colAttr = td.getAttribute('data-col');
                    if (!colAttr) return; 
                    colId = `p${i+1}_c${colAttr}`; // 예시: p1_c1 (패널1의 1번째 열 = 입고 A)
                    
                    // 프롬프트 가이드용 텍스트 매핑
                    if (i === 0) {
                        const labels = { '1': '입고 A', '2': '입고 D', '3': '출고 A', '4': '출고 D', '5': '재고 A', '6': '재고 D' };
                        cellLabel = labels[colAttr] || `입출고 열 ${colAttr}`;
                    } else if (i === 1) {
                        const labels = { '1': '본지', '2': '별쇄', '3': '경인일보', '4': '기독교타임즈', '5': '대학신문', '6': '평화신문', '7': '매체합계' };
                        cellLabel = labels[colAttr] || `매체 열 ${colAttr}`;
                    } else if (i === 2) {
                        const labels = { '1': '용지 A', '2': '용지 D' };
                        cellLabel = labels[colAttr] || `용지 열 ${colAttr}`;
                    }
                }
                
                const currentMemo = d.memos[colId] || '';
                const dateKo = Utils.fmtKo(ds);
                const newMemo = prompt(`${dateKo} [${cellLabel}] 셀의 메모를 입력하세요 (내용을 비우면 메모가 삭제됩니다):`, currentMemo);
                
                if (newMemo !== null && newMemo !== currentMemo) {
                    const finalMemo = newMemo.trim() === '' ? null : newMemo.trim();
                    
                    // 1. 캐시 선 반영
                    if (finalMemo) {
                        d.memos[colId] = finalMemo;
                    } else {
                        delete d.memos[colId];
                    }
                    
                    // 2. 화면 즉시 리랜더링 적용 (빨간 삼각형 실시간 반영)
                    Render.rerenderAllRows(true);
                    
                    // 3. 백그라운드 DB 갱신
                    const ok = await API.saveMemo(ds, colId, finalMemo);
                    if (!ok) {
                        // 저장 실패 시 캐시 및 화면 원상 복구
                        if (currentMemo) {
                            d.memos[colId] = currentMemo;
                        } else {
                            delete d.memos[colId];
                        }
                        Render.rerenderAllRows(true);
                    }
                }
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