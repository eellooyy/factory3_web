/* factory3_ilji_main.js */
(function() {
    'use strict';
    
    const App = window.Factory3Ilji;
    if (!App) return;

    const Factory3IljiModule = {
        init: function() {
            // 글로벌 공통 헤더로 3공장 설정값을 주입
            App.headerApi = window.Factory3Header.init({
                wrapperSelector: '.f3i-wrapper',
                inputSelector: '.f3i-td.editable .f3i-input',
                onDateChange: App.loadData,
                onSave: App.handleSave,
                onExportExcel: App.exportToExcel
            });
            
            if (!App.headerApi) return;

            App.bindInputFormatters();
            App.bindKeyboardNavigation();
            
            // 최초 로드 시 데이터 호출은 Header가 알아서 해줌
        }
    };
    
    window.Factory3IljiModule = Factory3IljiModule;

    // 페이지 접속 시 3공장 모듈 먼저 실행
    document.addEventListener('DOMContentLoaded', function() {
        Factory3IljiModule.init();
    });
})();