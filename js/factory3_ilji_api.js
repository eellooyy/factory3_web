/* factory3_ilji_api.js */
(function() {
    'use strict';
    
    const App = window.Factory3Ilji;
    if (!App) return;

    // Supabase 클라이언트 초기화
    const supabase = Factory3Utils.initSupabase();

    // 데이터 불러오기
    App.loadData = async function(dateStr) {
        if (App.headerApi && App.headerApi.isEditMode()) App.headerApi.toggleEditMode();
        
        try {
            const { data, error } = await supabase
                .from('factory3_geupji_real')
                .select('*')
                .eq('date', dateStr);

            if (error) { console.error("Supabase 로드 에러:", error); return; }

            document.querySelectorAll('.f3i-input').forEach(input => input.value = "");
            const loadedStartBalCols = new Set(); 
            App.state.prevWanA = 0; App.state.prevWanD = 0;

            if (data && data.length > 0) {
                data.forEach(item => {
                    const typeTokens = item.item_type.split('_');
                    const r = typeTokens[typeTokens.length - 1]; 
                    const baseType = item.item_type.replace(`_${r}`, ''); 
                    const c = item.col_id;
                    const valNum = item.value ? Number(item.value) : 0;
                    let val = "";
                    
                    if (valNum !== 0) {
                        if (item.item_type === 'stat_total_usage') {
                            val = valNum.toLocaleString() + " kg";
                        } else if (item.item_type.startsWith('side_wan')) {
                            val = valNum.toLocaleString() + " R/L";
                        } else {
                            const rInt = parseInt(r, 10);
                            if (rInt >= 2 && rInt <= 7) {
                                val = valNum >= 20 ? valNum.toLocaleString() + " kg" : valNum.toLocaleString() + " R/L";
                            } else {
                                val = valNum.toLocaleString();
                            }
                        }
                    }

                    if (item.item_type === 'start_bal_1') loadedStartBalCols.add(c);
                    
                    if (baseType === 'side_wan') {
                        const el = document.getElementById(`sideWan${c}`);
                        if (el) el.value = val;
                    } else if (item.item_type === 'stat_total_usage') {
                        const el = document.getElementById('statTotalUsage');
                        if (el) el.value = val;
                    } else {
                        const el = document.querySelector(`.f3i-input[data-row="${r}"][data-col="${c}"]`);
                        if (el) el.value = val;
                        
                        if (r === "1" && item.memo) {
                            const memoEl = document.querySelector(`.f3i-input[data-row="1"][data-col="H"]`);
                            if (memoEl) memoEl.value = item.memo;
                        }
                    }
                });
            }
            
            const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
            const missingStartBalCols = cols.filter(col => !loadedStartBalCols.has(col));
            const prevDate = Factory3Utils.addDays(dateStr, -1);
            const { data: prevData, error: prevError } = await supabase
                .from('factory3_geupji_real')
                .select('*')
                .eq('date', prevDate);
            
            if (!prevError && prevData) {
                prevData.forEach(item => {
                    if (item.item_type === 'end_bal_10' && missingStartBalCols.includes(item.col_id)) {
                        const valNum = item.value ? Number(item.value) : 0;
                        if (valNum !== 0) {
                            const el = document.querySelector(`.f3i-input[data-row="1"][data-col="${item.col_id}"]`);
                            if (el) el.value = valNum.toLocaleString();
                        }
                    }
                    if (item.item_type === 'side_wan_1') {
                        if (item.col_id === 'A') App.state.prevWanA = item.value ? Number(item.value) : 0;
                        if (item.col_id === 'D') App.state.prevWanD = item.value ? Number(item.value) : 0;
                    }
                });
            }
            App.calculateAutoFields();
        } catch (err) {
            console.error("시스템 에러:", err);
        }
    };

    // 데이터 저장하기
    App.handleSave = async function() {
        const currentDate = App.headerApi.getCurrentDate();
        const rawPayloadData = [];
        const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
        const extractVal = (el) => el ? el.value.replace(/,/g, '').replace(/kg/g, '').replace(/R\/L/g, '').trim() : "";

        cols.forEach(col => {
            const startEl = document.querySelector(`.f3i-input[data-row="1"][data-col="${col}"]`);
            const memoEl = document.querySelector(`.f3i-input[data-row="1"][data-col="H"]`);
            rawPayloadData.push({ item_type: 'start_bal_1', col_id: col, value: extractVal(startEl), memo: memoEl ? memoEl.value : "" });

            for (let r = 2; r <= 7; r++) {
                const wanEl = document.querySelector(`.f3i-input[data-row="${r}"][data-col="${col}"]`);
                rawPayloadData.push({ item_type: `wan_roll_${r}`, col_id: col, value: extractVal(wanEl), memo: "" });
            }

            const endEl = document.querySelector(`.f3i-input[data-row="10"][data-col="${col}"]`);
            rawPayloadData.push({ item_type: 'end_bal_10', col_id: col, value: extractVal(endEl), memo: "" });
        });

        rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'A', value: extractVal(document.getElementById('sideWanA')), memo: "" });
        rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'D', value: extractVal(document.getElementById('sideWanD')), memo: "" });
        rawPayloadData.push({ item_type: 'geup_real', col_id: 'A', value: extractVal(document.getElementById('sideGeupA')), memo: "" });
        rawPayloadData.push({ item_type: 'geup_real', col_id: 'D', value: extractVal(document.getElementById('sideGeupD')), memo: "" });
        rawPayloadData.push({ item_type: 'geup_out', col_id: 'A', value: extractVal(document.getElementById('sideChulgoA')), memo: "" });
        rawPayloadData.push({ item_type: 'geup_out', col_id: 'D', value: extractVal(document.getElementById('sideChulgoD')), memo: "" });
        rawPayloadData.push({ item_type: 'stat_total_usage', col_id: 'H', value: extractVal(document.getElementById('statTotalUsage')), memo: "" });

        const finalInsertData = rawPayloadData
            .map(item => ({
                date: currentDate, item_type: item.item_type, col_id: item.col_id,
                value: parseInt(item.value, 10) || 0, memo: item.memo || ""
            }))
            .filter(item => item.value !== 0 || item.memo.trim() !== "");

        try {
            const { error: deleteError } = await supabase.from('factory3_geupji_real').delete().eq('date', currentDate);
            if (deleteError) { alert('기존 데이터 초기화 실패: ' + deleteError.message); return; }

            if (finalInsertData.length > 0) {
                const { error: insertError } = await supabase.from('factory3_geupji_real').insert(finalInsertData);
                if (insertError) { alert('저장 실패: ' + insertError.message); }
                else { alert('저장 완료되었습니다.'); App.headerApi.toggleEditMode(); App.loadData(currentDate); }
            } else {
                alert('저장 완료되었습니다. (모든 값이 지워져 해당 날짜의 데이터가 초기화되었습니다.)');
                App.headerApi.toggleEditMode(); App.loadData(currentDate);
            }
        } catch (err) {
            alert('네트워크 오류가 발생했습니다: ' + err.message);
        }
    };
})();