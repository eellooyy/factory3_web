/* factory3_io_script.js */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // 1. 공통 헤더 및 날짜 컨트롤러 초기화
        if (typeof Factory3Header !== 'undefined') {
            Factory3Header.init({ idPrefix: 'Io' });
        }

        // 2. 입출고 대장 테이블 UI (3패널 구조, 스크롤 동기화) 초기화
        if (typeof Factory3IoTableModule !== 'undefined') {
            Factory3IoTableModule.init();
        }
    });
})();