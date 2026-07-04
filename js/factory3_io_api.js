/* js/factory3_io_api.js */
window.Factory3Io = window.Factory3Io || {};

Factory3Io.API = {
    /* ─────────────────────────────────────────
       재고 누적 계산 (가장 오래된 기말재고 기준점을 찾아 순방향 전체 계산)
    ───────────────────────────────────────── */
    recalcAllStocks: function () {
        const dates = Object.keys(Factory3Io.dataCache).sort();
        
        let anchorDate = null;
        let currentSa = 0;
        let currentSd = 0;

        // 1. 외부 베이스라인 데이터 점검
        if (Factory3Io.baselineRow) {
            anchorDate = Factory3Io.baselineRow.date;
            currentSa = Factory3Io.baselineRow.stock_a;
            currentSd = Factory3Io.baselineRow.stock_d;
        }

        // 2. 현재 캐시 영역 내에서 가장 최초로 등장하는 수동입력 실재고(예: 6월 29일) 탐색 및 기준점 고정
        for (const ds of dates) {
            const r = Factory3Io.dataCache[ds];
            if ((r.db_stock_a || r.db_stock_d) && (!anchorDate || ds <= anchorDate)) {
                anchorDate = ds;
                currentSa = r.db_stock_a || 0;
                currentSd = r.db_stock_d || 0;
            }
        }

        // 3. 기준점 이후의 모든 날짜 연산 처리
        dates.forEach(ds => {
            const r = Factory3Io.dataCache[ds];
            if (anchorDate && ds === anchorDate) {
                // 기준일 당일은 입력값 보존
                r.stock_a = currentSa;
                r.stock_d = currentSd;
            } else if (anchorDate && ds > anchorDate) {
                // 기준일 이후는 이전 실재고 기반 롤링 연산
                currentSa += (r.in_a || 0) - (r.out_a || 0);
                currentSd += (r.in_d || 0) - (r.out_d || 0);
                r.stock_a = currentSa;
                r.stock_d = currentSd;
            } else {
                // 기준일 이전 데이터 세팅
                r.stock_a = r.db_stock_a || 0;
                r.stock_d = r.db_stock_d || 0;
            }
        });
    },

    /* ─────────────────────────────────────────
       Supabase 연동 쿼리
    ───────────────────────────────────────── */
    fetchBaseline: async function (beforeDate) {
        const { data, error } = await Factory3Io.supabase
            .from('factory3_io')
            .select('date, stock_a, stock_d')
            .lt('date', beforeDate)
            .order('date', { ascending: false })
            .limit(50);

        let found = null;
        if (!error && data && data.length > 0) {
            for (const r of data) {
                if (r.stock_a !== 0 || r.stock_d !== 0) { found = r; break; }
            }
        }
        if (found) {
            if (!Factory3Io.baselineRow || found.date < Factory3Io.baselineRow.date) {
                Factory3Io.baselineRow = { date: found.date, stock_a: found.stock_a || 0, stock_d: found.stock_d || 0 };
            }
        }
    },

    loadIoTableRange: async function (start, end) {
        // [중요 수정]: stock_a, stock_d 컬럼을 함께 로드하여 수동 입력된 재고값을 캐싱합니다.
        const { data, error } = await Factory3Io.supabase
            .from('factory3_io')
            .select('date, in_a, in_d, stock_a, stock_d')
            .gte('date', start)
            .lte('date', end);

        if (error) throw error;
        if (data) {
            data.forEach(row => {
                if (!Factory3Io.dataCache[row.date]) Factory3Io.dataCache[row.date] = {};
                Factory3Io.dataCache[row.date].in_a = row.in_a || 0;
                Factory3Io.dataCache[row.date].in_d = row.in_d || 0;
                Factory3Io.dataCache[row.date].db_stock_a = row.stock_a || 0;
                Factory3Io.dataCache[row.date].db_stock_d = row.stock_d || 0;
            });
        }
    },

    loadOutgoingRange: async function (start, end) {
        const { data, error } = await Factory3Io.supabase
            .from('factory3_geupji_real')
            .select('date, col_id, value, item_type')
            .eq('item_type', 'geup_out')
            .gte('date', start)
            .lte('date', end);

        if (!error && data) {
            data.forEach(row => {
                if (!Factory3Io.dataCache[row.date]) Factory3Io.dataCache[row.date] = {};
                if (row.col_id === 'A') Factory3Io.dataCache[row.date].out_a = row.value || 0;
                if (row.col_id === 'D') Factory3Io.dataCache[row.date].out_d = row.value || 0;
            });
        }
    },

    loadUsageDataRange: async function (start, end) {
        // [대폭 최적화 수정]: 원본 factory3_usage 테이블을 받아와 브라우저 단에서 직접 더하던 부하를 없애고,
        // DB 단에서 이미 완벽히 일별 합산/정렬이 끝난 Supabase View인 'v_factory3_usage_daily'를 즉시 호출합니다.
        const { data, error } = await Factory3Io.supabase
            .from('v_factory3_usage_daily')
            .select('print_date, media_1, media_2, media_3, media_4, media_5, media_6, paper_a, paper_d')
            .gte('print_date', start)
            .lte('print_date', end);

        if (!error && data) {
            data.forEach(row => {
                const date = row.print_date;
                if (!Factory3Io.dataCache[date]) Factory3Io.dataCache[date] = {};
                
                // [기존 렌더링 시스템과의 완벽 호환 보장]
                // 불러온 뷰 데이터를 기존 factory3_io_render.js가 참조하던 데이터 트리 포맷과 100% 동일하게 매핑합니다.
                // 이 덕분에 화면 렌더링 측 소스코드를 건드릴 필요가 없어 안정성이 극대화됩니다.
                Factory3Io.dataCache[date].usage_media = {
                    1: Number(row.media_1) || 0,
                    2: Number(row.media_2) || 0,
                    3: Number(row.media_3) || 0,
                    4: Number(row.media_4) || 0,
                    5: Number(row.media_5) || 0,
                    6: Number(row.media_6) || 0
                };

                Factory3Io.dataCache[date].usage_paper = {
                    A: Number(row.paper_a) || 0,
                    D: Number(row.paper_d) || 0
                };
            });
        }
    },

    /* ─────────────────────────────────────────
       [신규 추가] 최근 7일치 입고 및 연산재고 일괄 Upsert 함수
    ───────────────────────────────────────── */
    saveIncomingBatch: async function (batchRows) {
        const { error } = await Factory3Io.supabase
            .from('factory3_io')
            .upsert(batchRows, { onConflict: 'date' });

        if (error) {
            alert('일괄 저장 실패: ' + error.message);
            return false;
        }
        return true;
    }
};