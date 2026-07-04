/* js/factory3_contrast_constant.js */
(function () {
    'use strict';

    const todayObj = new Date();
    const yesterdayObj = new Date();
    yesterdayObj.setDate(todayObj.getDate() - 1);

    function pad(n) { 
        return String(n).padStart(2, '0'); 
    }

    window.FC_CONST = {
        WD_KR: ['일', '월', '화', '수', '목', '금', '토'],
        PIDS: ['f3ctScrollPanel1', 'f3ctScrollPanel2', 'f3ctScrollPanel3', 'f3ctScrollPanel4', 'f3ctScrollPanel5', 'f3ctScrollPanel6'],
        pad: pad,
        todayStr: function() {
            return `${todayObj.getFullYear()}-${pad(todayObj.getMonth()+1)}-${pad(todayObj.getDate())}`;
        },
        yesterdayStr: function() {
            return `${yesterdayObj.getFullYear()}-${pad(yesterdayObj.getMonth()+1)}-${pad(yesterdayObj.getDate())}`;
        }
    };
})();