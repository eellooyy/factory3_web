/* js/factory3_contrast_main.js */
(function () {
    'use strict';

    window.Factory3Contrast = window.Factory3Contrast || {};

    const state = {
        selectedDate: Factory3Contrast.constant.yesterdayStr(),
        selectedPanel: null,
        selectedCol: null,
        isScrollUnlocked: false, // 기본 락 상태
        oldestLoadedDate: null,
        loadedDates: [],
        loading: false,
        isLoadingPrev: false,
        headerApi: null
    };

    let _syncLock = false;
    function bindScrollSync() {
        Factory3Contrast.constant.PIDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('scroll', () => {
                if (!state.isScrollUnlocked) return; // 잠금 상태 시 동기화 및 로드 차단
                if (_syncLock) return;
                _syncLock = true;
                const top = el.scrollTop;
                Factory3Contrast.constant.PIDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if(t) t.scrollTop = top;
                });
                _syncLock = false;

                if (top <= 10 && !state.isLoadingPrev && !state.loading && state.oldestLoadedDate) {
                    loadPrevContrastChunk();
                }
            });
        });
    }

    function bindClicks() {
        [1,2,3,4,5,6].forEach(i => {
            const b = document.getElementById(`f3ctBody${i}`);
            if(!b) return;
            b.addEventListener('click', e => {
                const td = e.target.closest('td[data-col]');
                if (!td) return;
                const tr = td.closest('tr[data-date]');
                Factory3Contrast.render.applyHighlight(i, tr.getAttribute('data-date'), td.getAttribute('data-col'), true);
            });
        });
    }

    function bindKeyboardNav() {
        document.addEventListener('keydown', e => {
            if (!state.selectedDate || !state.selectedPanel || !state.selectedCol) return;
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
            e.preventDefault();

            let panelIdx = Number(state.selectedPanel);
            let colNum   = Number(state.selectedCol);
            const body   = document.getElementById(`f3ctBody${panelIdx}`);
            if (!body) return;
            const curRow = body.querySelector(`tr[data-date="${state.selectedDate}"]`);
            if (!curRow) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const target = e.key === 'ArrowUp' ? curRow.previousElementSibling : curRow.nextElementSibling;
                if (target && target.getAttribute('data-date')) {
                    Factory3Contrast.render.applyHighlight(panelIdx, target.getAttribute('data-date'), String(colNum), true);
                    Factory3Contrast.render.scrollToActiveCell(panelIdx);
                }
            } else {
                const colCount = { 1:3, 2:3, 3:3, 4:3, 5:3, 6:1 };
                
                if (e.key === 'ArrowLeft') {
                    colNum--;
                    if (colNum < 1) { 
                        if (panelIdx > 1) { panelIdx--; colNum = colCount[panelIdx]; } 
                        else colNum = 1; 
                    }
                } else {
                    colNum++;
                    if (colNum > colCount[panelIdx]) { 
                        if (panelIdx < 6) { panelIdx++; colNum = 1; } 
                        else colNum = colCount[panelIdx]; 
                    }
                }
                Factory3Contrast.render.applyHighlight(panelIdx, state.selectedDate, String(colNum), true);
                Factory3Contrast.render.scrollToActiveCell(panelIdx);
            }
        });
    }

    function bindScrollToggle() {
        const toggle = document.getElementById('contrastScrollToggle');
        if (!toggle) return;

        toggle.checked = !!state.isScrollUnlocked;
        updateScrollLockUI();

        toggle.addEventListener('change', (e) => {
            state.isScrollUnlocked = e.target.checked;
            updateScrollLockUI();
        });
    }

    function updateScrollLockUI() {
        Factory3Contrast.constant.PIDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (state.isScrollUnlocked) {
                el.classList.remove('locked');
            } else {
                el.classList.add('locked');
            }
        });
    }

    async function loadPrevContrastChunk() {
        if (state.isLoadingPrev || state.loading || !state.oldestLoadedDate) return;
        state.isLoadingPrev = true;

        try {
            const end = Factory3Utils.addDays(state.oldestLoadedDate, -1);
            const start = Factory3Utils.addDays(end, -14); // 15일 단위로 추가

            await Factory3Contrast.api.fetchDataRange(start, end);

            const dates = [];
            let curr = new Date(start + 'T00:00:00');
            const last = new Date(state.oldestLoadedDate + 'T00:00:00');
            while (curr < last) {
                const pad = Factory3Contrast.constant.pad;
                dates.push(`${curr.getFullYear()}-${pad(curr.getMonth()+1)}-${pad(curr.getDate())}`);
                curr.setDate(curr.getDate() + 1);
            }

            state.loadedDates = dates.concat(state.loadedDates);

            const panels = Factory3Contrast.constant.PIDS.map(id => document.getElementById(id));
            const prevHeights = panels.map(p => p ? p.scrollHeight : 0);

            Factory3Contrast.render.renderAllRows(state.loadedDates);
            state.oldestLoadedDate = start;

            requestAnimationFrame(() => {
                panels.forEach((p, idx) => {
                    if (p) {
                        const diff = p.scrollHeight - prevHeights[idx];
                        p.scrollTop += diff;
                    }
                });
            });
        } catch (err) {
            console.error('[factory3_contrast] 이전 데이터 로드 오류:', err);
        } finally {
            state.isLoadingPrev = false;
        }
    }

    async function loadInitialContrastData(startDate, endDate) {
        state.loading = true;
        try {
            await Factory3Contrast.api.fetchDataRange(startDate, endDate);

            const dates = [];
            let curr = new Date(startDate + 'T00:00:00');
            const last = new Date(endDate + 'T00:00:00');
            while (curr <= last) {
                const pad = Factory3Contrast.constant.pad;
                dates.push(`${curr.getFullYear()}-${pad(curr.getMonth()+1)}-${pad(curr.getDate())}`);
                curr.setDate(curr.getDate() + 1);
            }

            state.loadedDates = dates;
            state.oldestLoadedDate = startDate;

            Factory3Contrast.render.renderAllRows(dates);
            Factory3Contrast.render.scrollToDate(state.selectedDate || Factory3Contrast.constant.yesterdayStr());
        } catch (err) {
            console.error('[factory3_contrast] 초기 로드 실패:', err);
        } finally {
            state.loading = false;
        }
    }

    Factory3Contrast.main = {
        state: state,
        initModule: async function () {
            bindClicks();
            bindKeyboardNav();
            bindScrollSync();
            bindScrollToggle();
        },
        loadInitialData: loadInitialContrastData,
        loadPrevContrastChunk: loadPrevContrastChunk,
        updateScrollLockUI: updateScrollLockUI
    };

})();