/* factory3_ilji_main.js */
(function() {
    'use strict';
    
    const App = window.Factory3Ilji;
    if (!App) return;

    const Factory3IljiModule = {
        init: function() {
            // 헤더 공통 라이브러리 연동 수주 및 콜백 등록
            App.headerApi = Factory3Header.init({
                idPrefix: 'f3i',
                wrapperSelector: '.f3i-wrapper',
                inputSelector: '.f3i-td.editable .f3i-input',
                onDateChange: App.loadData,
                onSave: App.handleSave,
                onExportExcel: App.exportToExcel
            });
            if (!App.headerApi) return;

            App.bindInputFormatters();
            App.bindKeyboardNavigation();
            
            if (typeof App.bindSwapFeature === 'function') {
                App.bindSwapFeature();
            }

            // 1차/2차 집계 + 및 - 버튼 이벤트 바인딩
            const addMidBtn = document.getElementById('f3iAddMidBtn');
            if (addMidBtn) {
                addMidBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentLevel = App.getMidLevel();
                    if (currentLevel < 2) {
                        App.setMidLevel(currentLevel + 1);
                        App.calculateAutoFields();
                    }
                });
            }

            const removeMidBtn = document.getElementById('f3iRemoveMidBtn');
            if (removeMidBtn) {
                removeMidBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentLevel = App.getMidLevel();
                    if (currentLevel > 0) {
                        App.setMidLevel(currentLevel - 1);
                        App.calculateAutoFields();
                    }
                });
            }
            
            // 초기 로드 시점 데이터 조회 실행
            App.loadData(App.headerApi.getCurrentDate());
        },
        destroy: function() {
            if (App.headerApi) App.headerApi.destroy();
        }
    };
    
    window.Factory3IljiModule = Factory3IljiModule;

    // DOM 완성 시 실행 등록
    document.addEventListener('DOMContentLoaded', function() {
        Factory3IljiModule.init();
    });
})();