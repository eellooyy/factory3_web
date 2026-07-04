/* js/factory3_io_constants.js */
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
   Supabase 클라이언트 초기화
───────────────────────────────────────── */
Factory3Io.supabaseUrl = 'https://npiflqoscsvnnauvqhrr.supabase.co';
Factory3Io.supabaseKey = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW';
Factory3Io.supabase = window.supabase.createClient(Factory3Io.supabaseUrl, Factory3Io.supabaseKey);

/* ─────────────────────────────────────────
   날짜 연산 유틸리티 헬퍼
───────────────────────────────────────── */
Factory3Io.Utils = {
    pad: function (n) { 
        return String(n).padStart(2, '0'); 
    },
    todayStr: function () {
        const t = new Date();
        return `${t.getFullYear()}-${this.pad(t.getMonth() + 1)}-${this.pad(t.getDate())}`;
    },
    yesterdayStr: function () {
        const t = new Date();
        t.setDate(t.getDate() - 1);
        return `${t.getFullYear()}-${this.pad(t.getMonth() + 1)}-${this.pad(t.getDate())}`;
    },
    fmtKo: function (ds) {
        if (!ds) return '';
        const d = new Date(ds + 'T00:00:00');
        if (isNaN(d.getTime())) return ds;
        return `${d.getFullYear()}년 ${this.pad(d.getMonth() + 1)}월 ${this.pad(d.getDate())}일 (${Factory3Io.WD_KR[d.getDay()]})`;
    },
    fmtDate: function (d) {
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
    },
    addDays: function (ds, days) {
        const d = new Date(ds + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return this.fmtDate(d);
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