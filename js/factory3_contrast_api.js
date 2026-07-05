/* js/factory3_contrast_api.js */
(function () {
    'use strict';

    // Supabase 프로젝트 정보
    const SUPABASE_URL = 'https://npiflqoscsvnnauvqhrr.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW'; 
    
    // Supabase 클라이언트 초기화
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const dataCache = {};

    function getDatesRange(targetDateStr) {
        const dates = [];
        const baseDate = new Date(targetDateStr + 'T00:00:00');
        for (let i = -15; i <= 15; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            dates.push(`${d.getFullYear()}-${window.FC_CONST.pad(d.getMonth()+1)}-${window.FC_CONST.pad(d.getDate())}`);
        }
        return dates;
    }

    // Supabase 뷰에서 데이터 범위 단위로 가져오기
    async function fetchDataRange(targetDateStr) {
        const dates = getDatesRange(targetDateStr);
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];

        const { data, error } = await supabase
            .from('v_daily_factory3_stock')
            .select('*')
            .gte('date', minDate)
            .lte('date', maxDate);

        if (error) {
            console.error('Supabase 데이터 로드 실패:', error);
            return;
        }

        // 가져온 데이터를 신규 DB 뷰 컬럼 구조에 맞게 캐시에 매핑
        data.forEach(row => {
            dataCache[row.date] = {
                jigo_a: row.jigo_a || 0,
                jigo_d: row.jigo_d || 0,
                jigo_sum: row.jigo_sum || 0,
                geupji_a: row.geupji_a || 0,     // 변경: row.geup_a -> row.geupji_a
                geupji_d: row.geupji_d || 0,     // 변경: row.geup_d -> row.geupji_d
                geupji_sum: row.geupji_sum || 0, // 변경: row.geup_sum -> row.geupji_sum
                real_a: row.real_a || 0,
                real_d: row.real_d || 0,
                real_sum: row.real_sum || 0,
                erp_a: row.erp_a || 0,
                erp_d: row.erp_d || 0,
                erp_sum: row.erp_sum || 0,
                diff_a: row.diff_a || 0,
                diff_d: row.diff_d || 0,
                diff_sum: row.diff_sum || 0,
                jeunggam: row.jeunggam || 0      // 변경: row.trend_sum -> row.jeunggam
            };
        });
    }

    function fmtNum(v, ds) {
        const rowDate = new Date(ds + 'T00:00:00');
        const yesterdayDate = new Date(window.FC_CONST.yesterdayStr() + 'T00:00:00'); 

        if (rowDate > yesterdayDate) {
            return '<span class="f3ct-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3ct-empty">0</span>';
        return `<span${n < 0 ? ' class="f3ct-negative"' : ''}>${n.toLocaleString()}</span>`;
    }

    function buildRow(ds) {
        // 캐시에 데이터가 없으면 공백 데이터 반환 (미래 날짜 대응)
        const d = dataCache[ds] || {
            jigo_a: 0, jigo_d: 0, jigo_sum: 0,
            geupji_a: 0, geupji_d: 0, geupji_sum: 0,
            real_a: 0, real_d: 0, real_sum: 0,
            erp_a: 0, erp_d: 0, erp_sum: 0,
            diff_a: 0, diff_d: 0, diff_sum: 0,
            jeunggam: 0
        };

        return { 
            date: ds,
            jigo_a: d.jigo_a, jigo_d: d.jigo_d, jigo_sum: d.jigo_sum,
            geupji_a: d.geupji_a, geupji_d: d.geupji_d, geupji_sum: d.geupji_sum,
            real_a: d.real_a, real_d: d.real_d, real_sum: d.real_sum,
            erp_a: d.erp_a, erp_d: d.erp_d, erp_sum: d.erp_sum,
            diff_a: d.diff_a, diff_d: d.diff_d, diff_sum: d.diff_sum,
            jeunggam: d.jeunggam
        };
    }

    window.FC_API = {
        dataCache: dataCache,
        getDatesRange: getDatesRange,
        fetchDataRange: fetchDataRange,
        fmtNum: fmtNum,
        buildRow: buildRow
    };
})();