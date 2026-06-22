/* geupji_factory3_script.js */
(function() {
    'use strict';

    // ==========================================
    // 💡 Supabase 연결 설정
    // ==========================================
    const supabaseUrl = 'https://npiflqoscsvnnauvqhrr.supabase.co';
    // 공개되어도 안전한 Publishable 키입니다. (RLS로 보호됨)
    const supabaseKey = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW'; 
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 💡 isAdmin의 기본값을 false로 변경했습니다.
    let state = { currentDate: null, isEditMode: false, fp: null, isAdmin: false }; 
    let elements = {};

    const FACTOR_788 = 571;
    const FACTOR_1576 = 1143;

    const utils = {
        getTodayStr: () => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        },
        formatKoDate: (str) => {
            if(!str) return "";
            const d = new Date(str);
            const days = ['일','월','화','수','목','금','토'];
            return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일 (${days[d.getDay()]})`;
        },
        addDays: (dateStr, days) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() + days);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        },
        parseNum: (val) => {
            if (!val) return 0;
            return parseInt(String(val).replace(/[^0-9.-]+/g, "")) || 0;
        },
        formatKg: (num) => {
            return num.toLocaleString() + " kg";
        }
    };

    async function loadData(dateStr) {
        if(state.isEditMode) toggleEditMode(); 
        
        try {
            const { data, error } = await supabase
                .from('factory3_geupji_real')
                .select('*')
                .eq('date', dateStr);

            if (error) {
                console.error("Supabase 로드 에러:", error);
                return;
            }

            document.querySelectorAll('.gf3-input').forEach(input => input.value = "");
            
            const loadedStartBalCols = new Set(); // 오늘 데이터가 있는 열 체크

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
                        } else {
                            const rInt = parseInt(r, 10);
                            if (rInt >= 2 && rInt <= 7 && valNum >= 20) {
                                val = valNum.toLocaleString() + " kg";
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
                        const el = document.querySelector(`.gf3-input[data-row="${r}"][data-col="${c}"]`);
                        if (el) el.value = val;
                        
                        if (r === "1" && item.memo) {
                            const memoEl = document.querySelector(`.gf3-input[data-row="1"][data-col="H"]`);
                            if (memoEl) memoEl.value = item.memo;
                        }
                    }
                });
            }
            
            // --- 전일 사용 후 잔량 불러오기 (DB 저장 없이 단순 노출) ---
            const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
            const missingStartBalCols = cols.filter(col => !loadedStartBalCols.has(col));
            
            if (missingStartBalCols.length > 0) {
                const prevDate = utils.addDays(dateStr, -1);
                const { data: prevData, error: prevError } = await supabase
                    .from('factory3_geupji_real')
                    .select('*')
                    .eq('date', prevDate)
                    .eq('item_type', 'end_bal_10');
                
                if (!prevError && prevData) {
                    prevData.forEach(item => {
                        if (missingStartBalCols.includes(item.col_id)) {
                            const valNum = item.value ? Number(item.value) : 0;
                            if (valNum !== 0) {
                                const el = document.querySelector(`.gf3-input[data-row="1"][data-col="${item.col_id}"]`);
                                if (el) el.value = valNum.toLocaleString();
                            }
                        }
                    });
                }
            }
            // ------------------------------------
            
            calculateAutoFields();
        } catch (err) {
            console.error("시스템 에러:", err);
        }
    }

    function calculateAutoFields() {
        let usageD = 0; 
        let usageA = 0; 
        let endBalD = 0; 
        let endBalA = 0; 

        ['B','C','D','E','F','G'].forEach(col => {
            const factor = (col === 'B') ? FACTOR_788 : FACTOR_1576;
            
            const startBal = utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="1"]`)?.value);
            
            let wanKgSum = 0;
            for(let r=2; r<=7; r++) {
                let cellVal = utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="${r}"]`)?.value);
                if (cellVal >= 20) {
                    wanKgSum += cellVal;
                } else {
                    wanKgSum += (cellVal * factor);
                }
            }
            
            const beforeSum = startBal + wanKgSum;
            const beforeInput = document.querySelector(`.gf3-input[data-col="${col}"][data-row="8"]`);
            if (beforeInput) beforeInput.value = beforeSum > 0 ? beforeSum.toLocaleString() : "";

            const endBal = utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="10"]`)?.value);
            if (col === 'B') endBalD = endBal;
            else endBalA += endBal;

            let usage = 0;
            const usageInput = document.querySelector(`.gf3-input[data-col="${col}"][data-row="9"]`);
            if (usageInput) {
                if (beforeSum > 0 && endBal > 0) {
                     usage = beforeSum - endBal;
                     usageInput.value = usage !== 0 ? usage.toLocaleString() : "0";
                } else {
                     usageInput.value = ""; 
                }
            }

            if (col === 'B') usageD = usage;
            else usageA += usage;
        });

        const elUsageD = document.getElementById('statUsageD');
        const elUsageA = document.getElementById('statUsageA');
        const elRealUsage = document.getElementById('statRealUsage');
        const elDiff = document.getElementById('statDiff');

        if(elUsageD) elUsageD.value = usageD > 0 ? utils.formatKg(usageD) : "";
        if(elUsageA) elUsageA.value = usageA > 0 ? utils.formatKg(usageA) : "";
        
        const realUsage = usageD + usageA;
        if(elRealUsage) elRealUsage.value = realUsage > 0 ? utils.formatKg(realUsage) : "";

        // 수동 입력된 사용량 총계를 읽어와서 증감을 계산합니다.
        let totalUsageVal = utils.parseNum(document.getElementById('statTotalUsage')?.value);

        if (totalUsageVal > 0 && realUsage > 0) {
             const diff = totalUsageVal - realUsage;
             elDiff.value = utils.formatKg(diff);
        } else {
             if(elDiff) elDiff.value = "";
        }

        const wanA = utils.parseNum(document.getElementById('sideWanA')?.value);
        const wanD = utils.parseNum(document.getElementById('sideWanD')?.value);
        
        const geupD = endBalD + (wanD * FACTOR_788);
        const geupA = endBalA + (wanA * FACTOR_1576);

        const elGeupA = document.getElementById('sideGeupA');
        const elGeupD = document.getElementById('sideGeupD');
        
        if(elGeupA) elGeupA.value = geupA > 0 ? geupA.toLocaleString() : "0";
        if(elGeupD) elGeupD.value = geupD > 0 ? geupD.toLocaleString() : "0";
    }

    function bindInputFormatters() {
        elements.wrapper.querySelectorAll('.target-calc, #sideWanA, #sideWanD, #statTotalUsage').forEach(input => {
            input.addEventListener('focus', function() {
                if(this.readOnly) return;
                let v = utils.parseNum(this.value);
                this.value = v === 0 ? "" : v;
            });
            input.addEventListener('blur', function() {
                if(this.readOnly) return;
                let v = utils.parseNum(this.value);
                if (v === 0) {
                    this.value = "";
                } else {
                    if (this.id === 'statTotalUsage') {
                        this.value = v.toLocaleString() + " kg";
                    } else {
                        const row = parseInt(this.dataset.row, 10);
                        if (row >= 2 && row <= 7 && v >= 20) {
                            this.value = v.toLocaleString() + " kg";
                        } else {
                            this.value = v.toLocaleString();
                        }
                    }
                }
                calculateAutoFields();
            });
        });
    }

    function bindKeyboardNavigation() {
        elements.wrapper.addEventListener('keydown', function(e) {
            const target = e.target;
            if (!target.classList.contains('gf3-input')) return;

            const row = parseInt(target.dataset.row, 10);
            const col = target.dataset.col;
            if (!row || !col) return;

            const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
            const colIdx = cols.indexOf(col);
            if (colIdx === -1) return;

            let nextRow = row;
            let nextColIdx = colIdx;
            let shouldMove = false;

            if (e.key === 'Enter') {
                e.preventDefault();
                nextRow = row + 1;
                shouldMove = true;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                nextRow = row - 1;
                shouldMove = true;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                nextRow = row + 1;
                shouldMove = true;
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                nextColIdx = colIdx - 1;
                shouldMove = true;
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextColIdx = colIdx + 1;
                shouldMove = true;
            }

            if (shouldMove) {
                if (nextRow === 8 || nextRow === 9) {
                    if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow = 10;
                    if (e.key === 'ArrowUp') nextRow = 7;
                }

                if (nextRow >= 1 && nextRow <= 10 && nextColIdx >= 0 && nextColIdx < cols.length) {
                    const nextCol = cols[nextColIdx];
                    const nextInput = elements.wrapper.querySelector(`.gf3-input[data-row="${nextRow}"][data-col="${nextCol}"]`);
                    if (nextInput && !nextInput.readOnly) {
                        nextInput.focus();
                        nextInput.select();
                    }
                }
            }
        });
    }

    function toggleEditMode() {
        if (!state.isAdmin) return; // 💡 권한 없으면 차단
        state.isEditMode = !state.isEditMode;
        
        if (state.isEditMode) {
            elements.wrapper.classList.add('edit-mode');
            elements.editBtn.textContent = '보기';
            elements.saveBtn.disabled = false;
            // 예외 없이 모든 editable 칸 쓰기 가능
            elements.wrapper.querySelectorAll('.gf3-td.editable .gf3-input').forEach(input => input.readOnly = false);
        } else {
            elements.wrapper.classList.remove('edit-mode');
            elements.editBtn.textContent = '수정';
            elements.saveBtn.disabled = true;
            elements.wrapper.querySelectorAll('.gf3-td.editable .gf3-input').forEach(input => input.readOnly = true);
        }
    }

    const GeupjiFactory3Module = {
        init: function() {
            // ==========================================
            // 🔒 비밀번호 체크 및 권한 할당
            // ==========================================
            const pwInput = prompt("접속 비밀번호를 입력하세요:");
            
            if (pwInput === "mk1324") {
                state.isAdmin = true;  // 수정 및 저장 가능
            } else if (pwInput === "mk1111") {
                state.isAdmin = false; // 읽기 전용 모드
                // alert("조회 모드로 접속되었습니다. (수정 불가)"); // 필요시 주석 해제하여 사용
            } else {
                alert("비밀번호가 올바르지 않습니다.");
                location.href = "about:blank"; 
                return; 
            }

            // ==========================================
            // 원래 로직 시작
            // ==========================================
            elements.wrapper = document.querySelector('.gf3-wrapper');
            if(!elements.wrapper) return;
            
            elements.dateText = document.getElementById('gf3DateText');
            elements.prevBtn = document.getElementById('gf3PrevBtn');
            elements.nextBtn = document.getElementById('gf3NextBtn');
            elements.todayBtn = document.getElementById('gf3TodayBtn');
            elements.editBtn = document.getElementById('gf3EditBtn');
            elements.saveBtn = document.getElementById('gf3SaveBtn');
            
            // 💡 권한에 따라 수정 버튼 활성화
            if(state.isAdmin) {
                elements.editBtn.disabled = false;
            }

            const today = utils.getTodayStr();
            state.currentDate = utils.addDays(today, -1);
            elements.dateText.innerText = utils.formatKoDate(state.currentDate);

            // 💡 캘린더 초기화 옵션
            // positionElement를 사용하면 Flatpickr가 해당 요소에 자체 클릭 리스너를 붙여
            // 토글이 불가능해지므로, appendTo + static 방식으로 위치를 잡습니다.
            let fpIsOpen = false;
            const calWrap = document.getElementById('gf3CalendarWrap');
            state.fp = flatpickr("#gf3Flatpickr", {
                locale: "ko", 
                dateFormat: "Y-m-d", 
                defaultDate: state.currentDate,
                appendTo: calWrap,
                static: true,
                onChange: (dates, str) => {
                    state.currentDate = str;
                    elements.dateText.innerText = utils.formatKoDate(str);
                    fpIsOpen = false;
                    loadData(str);
                },
                onOpen: () => { fpIsOpen = true; },
                onClose: () => { fpIsOpen = false; }
            });

            // 💡 날짜 클릭 시 캘린더 토글(열림/닫힘)
            // fpIsOpen 변수로 상태를 직접 추적하여 Flatpickr 내부 동작과 충돌 없이 토글합니다.
            elements.dateText.addEventListener('click', () => {
                if (fpIsOpen) {
                    state.fp.close();
                } else {
                    state.fp.open();
                }
            });
            
            elements.prevBtn.addEventListener('click', () => {
                const prev = utils.addDays(state.currentDate, -1);
                state.fp.setDate(prev);
                state.currentDate = prev;
                elements.dateText.innerText = utils.formatKoDate(prev);
                loadData(prev);
            });

            elements.nextBtn.addEventListener('click', () => {
                const next = utils.addDays(state.currentDate, 1);
                state.fp.setDate(next);
                state.currentDate = next;
                elements.dateText.innerText = utils.formatKoDate(next);
                loadData(next);
            });

            elements.todayBtn.addEventListener('click', () => {
                const today = utils.getTodayStr();
                if (state.currentDate !== today) {
                    state.fp.setDate(today);
                    state.currentDate = today;
                    elements.dateText.innerText = utils.formatKoDate(today);
                    loadData(today);
                }
            });

            elements.editBtn.addEventListener('click', toggleEditMode);

            elements.saveBtn.addEventListener('click', async () => {
                if (!state.isEditMode) return;
                
                const rawPayloadData = [];
                const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
                
                const extractVal = (el) => el ? el.value.replace(/,/g, '').replace(/kg/g, '').trim() : "";

                cols.forEach(col => {
                    const startEl = document.querySelector(`.gf3-input[data-row="1"][data-col="${col}"]`);
                    const memoEl = document.querySelector(`.gf3-input[data-row="1"][data-col="H"]`);
                    rawPayloadData.push({
                        item_type: 'start_bal_1',
                        col_id: col,
                        value: extractVal(startEl),
                        memo: memoEl ? memoEl.value : ""
                    });
                    
                    for (let r = 2; r <= 7; r++) {
                        const wanEl = document.querySelector(`.gf3-input[data-row="${r}"][data-col="${col}"]`);
                        rawPayloadData.push({
                            item_type: `wan_roll_${r}`,
                            col_id: col,
                            value: extractVal(wanEl),
                            memo: ""
                        });
                    }
                    
                    const endEl = document.querySelector(`.gf3-input[data-row="10"][data-col="${col}"]`);
                    rawPayloadData.push({
                        item_type: 'end_bal_10',
                        col_id: col,
                        value: extractVal(endEl),
                        memo: ""
                    });
                });

                rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'A', value: extractVal(document.getElementById('sideWanA')), memo: "" });
                rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'D', value: extractVal(document.getElementById('sideWanD')), memo: "" });
                rawPayloadData.push({ item_type: 'side_geup', col_id: 'A', value: extractVal(document.getElementById('sideGeupA')), memo: "" });
                rawPayloadData.push({ item_type: 'side_geup', col_id: 'D', value: extractVal(document.getElementById('sideGeupD')), memo: "" });
                
                rawPayloadData.push({ item_type: 'stat_total_usage', col_id: 'H', value: extractVal(document.getElementById('statTotalUsage')), memo: "" });

                // 💡 0이거나 빈칸인 데이터 걸러내기 (단, 메모가 있는 항목은 남김)
                const finalInsertData = rawPayloadData
                    .map(item => ({
                        date: state.currentDate,
                        item_type: item.item_type,
                        col_id: item.col_id,
                        value: parseInt(item.value, 10) || 0, 
                        memo: item.memo || ""
                    }))
                    .filter(item => item.value !== 0 || item.memo.trim() !== "");

                try {
                    // 1. 기존 날짜 데이터 일괄 삭제 (과거 데이터 수정 대응)
                    const { error: deleteError } = await supabase
                        .from('factory3_geupji_real')
                        .delete()
                        .eq('date', state.currentDate);

                    if (deleteError) {
                        alert('기존 데이터 초기화 실패: ' + deleteError.message);
                        return;
                    }

                    // 2. 유효한(0이 아닌) 데이터가 있을 경우에만 새로 일괄 삽입
                    if (finalInsertData.length > 0) {
                        const { error: insertError } = await supabase
                            .from('factory3_geupji_real')
                            .insert(finalInsertData);

                        if (insertError) {
                            alert('저장 실패: ' + insertError.message);
                        } else {
                            alert('저장 완료되었습니다.');
                            toggleEditMode(); 
                            loadData(state.currentDate); 
                        }
                    } else {
                        // 모든 칸을 다 지우고 저장했을 때의 처리
                        alert('저장 완료되었습니다. (모든 값이 지워져 해당 날짜의 데이터가 초기화되었습니다.)');
                        toggleEditMode();
                        loadData(state.currentDate);
                    }
                    
                } catch (err) {
                    alert('네트워크 오류가 발생했습니다: ' + err.message);
                }
            });

            bindInputFormatters();
            bindKeyboardNavigation(); 
            loadData(state.currentDate);
        },
        destroy: function() {
            if (state.fp) { state.fp.destroy(); state.fp = null; }
        }
    };
    window.GeupjiFactory3Module = GeupjiFactory3Module;

    document.addEventListener('DOMContentLoaded', function() {
        GeupjiFactory3Module.init();
    });
})();