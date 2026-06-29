/* static/js/factory3_io_script.js */
(function () {
    'use strict';

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
    };

    let oldestYear = state.year;
    let oldestMonth = state.month;
    let isLoadingPrev = false;

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
        if (str) {
            el.textContent = fmtKo(str);
        } else {
            el.textContent = '';
        }
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

        const panelRect = panelEl.getBoundingClientRect();
        const tdRect    = td.getBoundingClientRect();

        cursorEl.style.width  = tdRect.width  + 'px';
        cursorEl.style.height = tdRect.height + 'px';
        cursorEl.style.left   = (tdRect.left  - panelRect.left + panelEl.scrollLeft) + 'px';
        cursorEl.style.top    = (tdRect.top   - panelRect.top  + panelEl.scrollTop)  + 'px';
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
                    
                    // 그룹 헤더(상위) 독립적 활성화
                    const parentGroup = targetLv2Th.getAttribute('data-parent-group');
                    if (parentGroup) {
                        const targetLv1Th = panel.querySelector(`.f3io-thead-lv1 th[data-group="${parentGroup}"]`);
                        if (targetLv1Th) targetLv1Th.classList.add('f3io-header-active');
                    } else {
                        // 그룹 구분이 없는 상단 헤더(패널 2, 3)
                        const lv1Ths = panel.querySelectorAll('.f3io-thead-lv1 th');
                        lv1Ths.forEach(th => {
                            if (th.classList.contains('f3io-top-group-th')) {
                                th.classList.add('f3io-header-active');
                            }
                        });
                    }
                }
            }
        }
    }

    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (!state.selectedDate || !state.selectedPanel || !state.selectedCol) return;
            
            const key = e.key;
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
            e.preventDefault();

            let panelIdx = Number(state.selectedPanel);
            let colNum = Number(state.selectedCol);
            let dateStr = state.selectedDate;

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
            } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
                // 패널 2의 컬럼 개수 7개 유지
                const colCount = { 1: 6, 2: 7, 3: 2 };

                if (key === 'ArrowLeft') {
                    colNum--;
                    if (colNum < 1) {
                        if (panelIdx > 1) {
                            panelIdx--;
                            colNum = colCount[panelIdx];
                        } else {
                            colNum = 1;
                        }
                    }
                } else if (key === 'ArrowRight') {
                    colNum++;
                    if (colNum > colCount[panelIdx]) {
                        if (panelIdx < 3) {
                            panelIdx++;
                            colNum = 1;
                        } else {
                            colNum = colCount[panelIdx];
                        }
                    }
                }
                applyHighlight(panelIdx, dateStr, String(colNum));
                scrollToActiveCell(panelIdx);
            }
        });
    }

    function scrollToActiveCell(panelIdx) {
        const panel = document.getElementById(`f3ioScrollPanel${panelIdx}`);
        const activeTd = document.querySelector(`#f3ioBody${panelIdx} tr[data-date="${state.selectedDate}"] td[data-col="${state.selectedCol}"]`);

        if (panel && activeTd) {
            const pRect = panel.getBoundingClientRect();
            const tdRect = activeTd.getBoundingClientRect();
            
            // 헤더 고정 높이 여백 보정 (대략 65px)
            if (tdRect.bottom > pRect.bottom) {
                panel.scrollTop += (tdRect.bottom - pRect.bottom + 10);
            } else if (tdRect.top < pRect.top + 65) {
                panel.scrollTop -= (pRect.top + 65 - tdRect.top + 10);
            }
        }
    }

    /* ─────────────────────────────────────────
       데이터 로드 & 렌더링
    ───────────────────────────────────────── */
    function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoading();

        fetch(`/api/factory3_io_data?year=${state.year}&month=${state.month}`)
            .then(r => {
                if (!r.ok) throw new Error('API error');
                return r.json();
            })
            .then(res => {
                if (res.status === 'success') {
                    renderInitial(res.data);
                    scrollToYesterday();
                } else {
                    showError(res.message || '데이터 조회 실패');
                }
            })
            .catch(err => {
                console.error('[factory3_io] 로드 실패:', err);
                showError('데이터를 불러오지 못했습니다.');
            })
            .finally(() => { state.loading = false; });
    }

    function loadPrevMonth() {
        isLoadingPrev = true;
        oldestMonth--;
        if (oldestMonth < 1) {
            oldestMonth = 12;
            oldestYear--;
        }

        const panel1 = document.getElementById('f3ioScrollPanel1');
        const prevHeight = panel1.scrollHeight;

        fetch(`/api/factory3_io_data?year=${oldestYear}&month=${oldestMonth}`)
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') {
                    const htmls = generateRowsHTML(res.data);
                    document.getElementById('f3ioBody1').insertAdjacentHTML('afterbegin', htmls.html1);
                    document.getElementById('f3ioBody2').insertAdjacentHTML('afterbegin', htmls.html2);
                    document.getElementById('f3ioBody3').insertAdjacentHTML('afterbegin', htmls.html3);
                    
                    requestAnimationFrame(() => {
                        const newHeight = panel1.scrollHeight;
                        const diff = newHeight - prevHeight;
                        PANEL_IDS.forEach(id => {
                            const p = document.getElementById(id);
                            if (p) p.scrollTop += diff;
                        });
                    });
                }
            })
            .finally(() => { isLoadingPrev = false; });
    }

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

    function generateRowsHTML(data) {
        let html1 = '', html2 = '', html3 = '';

        data.forEach(row => {
            const d     = new Date(row.date + 'T00:00:00');
            const isT   = row.date === yesterdayStr();
            const trCls = isT ? 'f3io-row-today' : '';

            let wdCls = '';
            if (d.getDay() === 6) wdCls = 'f3io-sat';
            else if (d.getDay() === 0) wdCls = 'f3io-sun';

            const mStr  = pad(d.getMonth() + 1);
            const dyStr = pad(d.getDate());
            const wd = WD_KR[d.getDay()];
            
            const dateTd = `<td class="f3io-date-td ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdCls}" data-date="${row.date}">${mStr}/${dyStr} (${wd})</td>`;

            // 매체 합계와 용지 합계(A+D) 비교 검증 로직 추가
            const paperTotal = Number(row.item_a || 0) + Number(row.item_d || 0);
            const mediaTotal = Number(row.med_total || 0);
            let mismatchCls = '';
            
            // 미래 날짜가 아니고, 두 합계가 다를 경우에만 오류 클래스 추가
            if (!isFuture(row.date) && paperTotal !== mediaTotal) {
                mismatchCls = ' f3io-sum-mismatch';
            }

            html1 += `<tr class="${trCls}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(row.in_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(row.in_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="3">${fmtNum(row.out_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="4">${fmtNum(row.out_d, row.date)}</td>
                <td class="f3io-data-cell f3io-sep" data-col="5">${fmtNum(row.stock_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="6">${fmtNum(row.stock_d, row.date)}</td>
            </tr>`;

            html2 += `<tr class="${trCls}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(row.med_bonji, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(row.med_byulsae, row.date)}</td>
                <td class="f3io-data-cell" data-col="3">${fmtNum(row.med_gyeongin, row.date)}</td>
                <td class="f3io-data-cell" data-col="4">${fmtNum(row.med_gidok, row.date)}</td>
                <td class="f3io-data-cell" data-col="5">${fmtNum(row.med_daehak, row.date)}</td>
                <td class="f3io-data-cell" data-col="6">${fmtNum(row.med_pyonghwa, row.date)}</td>
                <td class="f3io-data-cell f3io-sum-col${mismatchCls}" data-col="7">${fmtNum(row.med_total, row.date)}</td>
            </tr>`;

            html3 += `<tr class="${trCls}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${fmtNum(row.item_a, row.date)}</td>
                <td class="f3io-data-cell" data-col="2">${fmtNum(row.item_d, row.date)}</td>
            </tr>`;
        });

        return { html1, html2, html3 };
    }

    function renderInitial(data) {
        const body1 = document.getElementById('f3ioBody1');
        const body2 = document.getElementById('f3ioBody2');
        const body3 = document.getElementById('f3ioBody3');
        if (!body1 || !body2 || !body3) return;

        const htmls = generateRowsHTML(data);
        body1.innerHTML = htmls.html1;
        body2.innerHTML = htmls.html2;
        body3.innerHTML = htmls.html3;
    }

    function bindBodyClicks() {
        [[1, 'f3ioBody1'], [2, 'f3ioBody2'], [3, 'f3ioBody3']].forEach(([panelIdx, bodyId]) => {
            const body = document.getElementById(bodyId);
            if (!body) return;
            body.addEventListener('click', e => {
                const td = e.target.closest('td');
                if (!td || td.classList.contains('f3io-date-td')) return;
                const tr = td.closest('tr[data-date]');
                if (!tr) return;
                const dateStr  = tr.getAttribute('data-date');
                const colDataCol = td.getAttribute('data-col');
                applyHighlight(panelIdx, dateStr, colDataCol);
            });
        });
    }

    function scrollToYesterday() {
        requestAnimationFrame(() => {
            const yest = yesterdayStr();
            const panel1 = document.getElementById('f3ioScrollPanel1');
            if (!panel1) return;
            const row = panel1.querySelector(`tr[data-date="${yest}"]`);
            if (row) {
                const target = row.offsetTop - panel1.clientHeight / 2 + row.offsetHeight / 2;
                PANEL_IDS.forEach(id => {
                    const p = document.getElementById(id);
                    if (p) p.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
                });
            }
            updateDateText(yest);
        });
    }

    /* ─────────────────────────────────────────
       모듈 퍼블릭 인터페이스
    ───────────────────────────────────────── */
    const Factory3IoModule = {
        init: function () {
            const now  = new Date();
            state.year  = now.getFullYear();
            state.month = now.getMonth() + 1;
            oldestYear = state.year;
            oldestMonth = state.month;

            bindScrollSync();
            bindBodyClicks();
            bindKeyboardNav(); 

            // Initialize global Factory3Header
            window.Factory3Header.init({
                idPrefix: 'Io',
                onDateChange: (dateStr) => {
                    const d = new Date(dateStr);
                    state.year = d.getFullYear();
                    state.month = d.getMonth() + 1;
                    oldestYear = state.year;
                    oldestMonth = state.month;
                    
                    clearHighlights();
                    // Load data if needed based on the new date
                    loadData(); 
                }
            });

            loadData();
        },

        destroy: function () {
            // Nothing to destroy locally for flatpickr since Factory3Header handles it
        }
    };

    window.Factory3IoModule = Factory3IoModule;

    document.addEventListener('DOMContentLoaded', function() {
        Factory3IoModule.init();
    });
})();