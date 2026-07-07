/* factory3_ilji_constant.js */
(function() {
    'use strict';
    
    // 전역 공유 객체 초기화
    window.Factory3Ilji = window.Factory3Ilji || {};
    
    // Supabase 설정
    Factory3Ilji.supabaseUrl = 'https://npiflqoscsvnnauvqhrr.supabase.co';
    Factory3Ilji.supabaseKey = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW'; 
    
    // 연산용 상수
    Factory3Ilji.FACTOR_788 = 571;
    Factory3Ilji.FACTOR_1576 = 1143;

    // 공통 유틸리티
    Factory3Ilji.utils = {
        parseNum: (val) => {
            if (!val) return 0;
            return parseInt(String(val).replace(/[^0-9.-]+/g, "")) || 0;
        },
        formatKg: (num) => {
            return num.toLocaleString() + " kg";
        }
    };

    // 전역 상태 및 헤더 API 플레이스홀더
    Factory3Ilji.state = { prevWanA: 0, prevWanD: 0 };
    Factory3Ilji.headerApi = null;
})();