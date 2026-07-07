/* js/factory3_contrast_constant.js */
(function () {
    'use strict';

    window.Factory3Contrast = window.Factory3Contrast || {};

    function pad(n) { 
        return String(n).padStart(2, '0'); 
    }

    Factory3Contrast.constant = {
        WD_KR: ['일', '월', '화', '수', '목', '금', '토'],
        PIDS: ['f3ctScrollPanel1', 'f3ctScrollPanel2', 'f3ctScrollPanel3', 'f3ctScrollPanel4', 'f3ctScrollPanel5', 'f3ctScrollPanel6'],
        pad: pad,
        todayStr: function() {
            const d = new Date();
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        },
        yesterdayStr: function() {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        }
    };
})();