/* factory1_ft_api.js */
window.Factory1Ft = window.Factory1Ft || {};

window.Factory1Ft.Api = (function() {
    'use strict';

    return {
        // 데이터 조회
        fetchData: async function(dateStr) {
            const supabase = window.Factory3Utils.initSupabase();
            const { data, error } = await supabase
                .from(window.Factory1Ft.Constants.TABLE_NAME)
                .select('*')
                .eq('date', dateStr)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('1공장 데이터 조회 에러:', error);
                return null;
            }
            return data;
        },
        
        // 데이터 저장 (UPSERT)
        saveData: async function(payload) {
            const supabase = window.Factory3Utils.initSupabase();
            const { data, error } = await supabase
                .from(window.Factory1Ft.Constants.TABLE_NAME)
                .upsert(payload, { onConflict: 'date' })
                .select();

            if (error) {
                console.error('1공장 데이터 저장 에러:', error);
                throw error;
            }
            return data;
        }
    };
})();