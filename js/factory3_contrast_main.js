/* js/factory3_contrast_main.js */
(function () {
    'use strict';

    window.Factory3Contrast = window.Factory3Contrast || {};

    const state = {
        selectedDate: Factory3Contrast.constant.yesterdayStr(),
        selectedPanel: null,
        selectedCol: null,
    };

    let _syncLock = false;
    function bindScrollSync() {
        Factory3Contrast.constant.PIDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('scroll', () => {
                if (_syncLock) return;
                _syncLock = true;
                const top = el.scrollTop;
                Factory3Contrast.constant.PIDS.filter(x => x !== id).forEach(tid => {
                    const t = document.getElementById(tid); if(t) t.scrollTop = top;
                });
                _syncLock = false;
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
                Factory3Contrast.render.applyHighlight(i, tr.getAttribute('data-date'), td.getAttribute('data-col'));
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
                    Factory3Contrast.render.applyHighlight(panelIdx, target.getAttribute('data-date'), String(colNum));
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
                Factory3Contrast.render.applyHighlight(panelIdx, state.selectedDate, String(colNum));
                Factory3Contrast.render.scrollToActiveCell(panelIdx);
            }
        });
    }

    const Module = {
        init: async function () { // async 추가
            bindScrollSync(); 
            bindClicks();
            bindKeyboardNav();

            if (window.Factory3Header) {
                window.Factory3Header.init({
                    idPrefix: 'Contrast',
                    onDateChange: async (ds) => { // async 추가
                        state.selectedDate = ds;
                        Factory3Contrast.render.clearHighlights();
                        
                        // 날짜 변경 시 Supabase에서 새로운 범위의 데이터를 로드합니다.
                        await Factory3Contrast.api.fetchDataRange(ds); 
                        
                        Factory3Contrast.render.renderAllRows(); 
                        Factory3Contrast.render.scrollToDate(ds); 
                    }, 
                    onSave: () => {} 
                });
            }

            state.selectedDate = Factory3Contrast.constant.yesterdayStr();
            
            // 최초 실행 시 Supabase에서 데이터를 연동합니다.
            await Factory3Contrast.api.fetchDataRange(state.selectedDate);
            
            Factory3Contrast.render.renderAllRows();
            Factory3Contrast.render.scrollToDate(Factory3Contrast.constant.yesterdayStr());
        }
    };

    Factory3Contrast.main = {
        state: state
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Module.init);
    else Module.init();

})();