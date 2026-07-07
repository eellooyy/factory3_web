/* js/factory3_io_constant.js */
window.Factory3Io = window.Factory3Io || {};

/* ─────────────────────────────────────────
   상수 설정
───────────────────────────────────────── */
Factory3Io.WD_KR = ['일', '월', '화', '수', '목', '금', '토'];
Factory3Io.PANEL_IDS = ['f3ioScrollPanel1', 'f3ioScrollPanel2', 'f3ioScrollPanel3'];

/* ─────────────────────────────────────────
   공통 관리 상태값 및 캐시 선언
───────────────────────────────────────── */
Factory3Io.state = {
    loading:       false,
    initialLoaded: false,
    selectedDate:  null,
    selectedPanel: null,
    selectedCol:   null,
    oldestLoadedDate: null, 
    isLoadingPrev:    false,
    headerApi:        null
};

Factory3Io.dataCache = {};
Factory3Io.baselineRow = null; 

/* ─────────────────────────────────────────
   Supabase 클라이언트 초기화 (Factory3Utils 공통 모듈 사용)
───────────────────────────────────────── */
Factory3Io.supabase = Factory3Utils.initSupabase();

/* ─────────────────────────────────────────
   날짜 연산 유틸리티 헬퍼 (Factory3Utils 위임 구조)
───────────────────────────────────────── */
Factory3Io.Utils = {
    pad: function (n) { 
        return String(n).padStart(2, '0'); 
    },
    todayStr: function () {
        return Factory3Utils.getTodayStr();
    },
    yesterdayStr: function () {
        return Factory3Utils.addDays(Factory3Utils.getTodayStr(), -1);
    },
    fmtKo: function (ds) {
        return Factory3Utils.formatKoDate(ds);
    },
    fmtDate: function (d) {
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
    },
    addDays: function (ds, days) {
        return Factory3Utils.addDays(ds, days);
    },
    getDatesRange: function (start, end) {
        const arr = [];
        let curr = new Date(start + 'T00:00:00');
        const last = new Date(end + 'T00:00:00');
        while (curr <= last) {
            arr.push(this.fmtDate(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return arr;
    }
};