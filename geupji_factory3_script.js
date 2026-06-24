/* geupji_factory3_script.js */
(function() {
    'use strict';

    const supabaseUrl = 'https://npiflqoscsvnnauvqhrr.supabase.co';
    const supabaseKey = 'sb_publishable_ir-mHSsX6SSIQwHerkLbfA_2qCOP3KW'; 
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    let state = { currentDate: null, isEditMode: false, fp: null, isAdmin: false, prevWanA: 0, prevWanD: 0 }; 
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

    function confirmLeaveEditMode() {
        if (state.isEditMode) {
            return confirm("저장되지 않은 변경사항이 있습니다. 나가시겠습니까?");
        }
        return true;
    }

    async function loadData(dateStr) {
        if(state.isEditMode) toggleEditMode(); 
        
        try {
            const { data, error } = await supabase
                .from('factory3_geupji_real')
                .select('*')
                .eq('date', dateStr);

            if (error) { console.error("Supabase 로드 에러:", error); return; }

            document.querySelectorAll('.gf3-input').forEach(input => input.value = "");
            const loadedStartBalCols = new Set(); 
            state.prevWanA = 0; state.prevWanD = 0;

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
                        const el = document.querySelector(`.gf3-input[data-row="${r}"][data-col="${c}"]`);
                        if (el) el.value = val;
                        
                        if (r === "1" && item.memo) {
                            const memoEl = document.querySelector(`.gf3-input[data-row="1"][data-col="H"]`);
                            if (memoEl) memoEl.value = item.memo;
                        }
                    }
                });
            }
            
            const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
            const missingStartBalCols = cols.filter(col => !loadedStartBalCols.has(col));
            const prevDate = utils.addDays(dateStr, -1);
            const { data: prevData, error: prevError } = await supabase
                .from('factory3_geupji_real')
                .select('*')
                .eq('date', prevDate);
            
            if (!prevError && prevData) {
                prevData.forEach(item => {
                    if (item.item_type === 'end_bal_10' && missingStartBalCols.includes(item.col_id)) {
                        const valNum = item.value ? Number(item.value) : 0;
                        if (valNum !== 0) {
                            const el = document.querySelector(`.gf3-input[data-row="1"][data-col="${item.col_id}"]`);
                            if (el) el.value = valNum.toLocaleString();
                        }
                    }
                    if (item.item_type === 'side_wan_1') {
                        if (item.col_id === 'A') state.prevWanA = item.value ? Number(item.value) : 0;
                        if (item.col_id === 'D') state.prevWanD = item.value ? Number(item.value) : 0;
                    }
                });
            }
            calculateAutoFields();
        } catch (err) {
            console.error("시스템 에러:", err);
        }
    }

    function calculateAutoFields() {
        let usageD = 0; let usageA = 0; let endBalD = 0; let endBalA = 0; 
        let sumTodayRollD = 0; let sumTodayRollA = 0;

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
                    if (cellVal > 0 && cellVal <= 19) {
                        if (col === 'B') sumTodayRollD += cellVal;
                        else sumTodayRollA += cellVal;
                    }
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
        
        if(elGeupA) elGeupA.value = geupA > 0 ? geupA.toLocaleString() + " kg" : "0 kg";
        if(elGeupD) elGeupD.value = geupD > 0 ? geupD.toLocaleString() + " kg" : "0 kg";

        const rawChulgoA = state.prevWanA - (sumTodayRollA + wanA);
        const rawChulgoD = state.prevWanD - (sumTodayRollD + wanD);
        const chulgoA = Math.abs(rawChulgoA);
        const chulgoD = Math.abs(rawChulgoD);

        const elChulgoA = document.getElementById('sideChulgoA');
        const elChulgoD = document.getElementById('sideChulgoD');

        if(elChulgoA) elChulgoA.value = chulgoA.toLocaleString() + " R/L";
        if(elChulgoD) elChulgoD.value = chulgoD.toLocaleString() + " R/L";
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
                    } else if (this.id === 'sideWanA' || this.id === 'sideWanD') {
                        this.value = v.toLocaleString() + " R/L";
                    } else {
                        const row = parseInt(this.dataset.row, 10);
                        if (row >= 2 && row <= 7) {
                            this.value = v >= 20 ? v.toLocaleString() + " kg" : v.toLocaleString() + " R/L";
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

            let nextRow = row; let nextColIdx = colIdx; let shouldMove = false;

            if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); nextRow = row + 1; shouldMove = true; } 
            else if (e.key === 'ArrowUp') { e.preventDefault(); nextRow = row - 1; shouldMove = true; } 
            else if (e.key === 'ArrowLeft') { e.preventDefault(); nextColIdx = colIdx - 1; shouldMove = true; } 
            else if (e.key === 'ArrowRight') { e.preventDefault(); nextColIdx = colIdx + 1; shouldMove = true; }

            if (shouldMove) {
                if (nextRow === 8 || nextRow === 9) {
                    if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow = 10;
                    if (e.key === 'ArrowUp') nextRow = 7;
                }
                if (nextRow >= 1 && nextRow <= 10 && nextColIdx >= 0 && nextColIdx < cols.length) {
                    const nextCol = cols[nextColIdx];
                    const nextInput = elements.wrapper.querySelector(`.gf3-input[data-row="${nextRow}"][data-col="${nextCol}"]`);
                    if (nextInput && !nextInput.readOnly) {
                        nextInput.focus(); nextInput.select();
                    }
                }
            }
        });
    }

    function toggleEditMode() {
        if (!state.isAdmin) return; 
        state.isEditMode = !state.isEditMode;
        
        if (state.isEditMode) {
            elements.wrapper.classList.add('edit-mode');
            elements.editBtn.textContent = '보기';
            elements.saveBtn.disabled = false;
            elements.wrapper.querySelectorAll('.gf3-td.editable .gf3-input').forEach(input => input.readOnly = false);
        } else {
            elements.wrapper.classList.remove('edit-mode');
            elements.editBtn.textContent = '수정';
            elements.saveBtn.disabled = true;
            elements.wrapper.querySelectorAll('.gf3-td.editable .gf3-input').forEach(input => input.readOnly = true);
        }
    }

    // ==========================================
    // 💡 엑셀 출력 기능 구현 (SheetJS 활용)
    // ==========================================
    function exportToExcel() {
        if (!window.XLSX) {
            alert("엑셀 모듈을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        // 엑셀 버튼 로딩 상태 적용
        const btnInner = elements.excelBtn.innerHTML;
        elements.excelBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">hourglass_empty</span>처리중...';
        elements.excelBtn.disabled = true;

        setTimeout(() => {
            try {
                const val = (selector) => { const el = document.querySelector(selector); return el ? el.value : ""; };

                // 화면 구조와 동일하게 2차원 배열 구성 (사이드 패널은 메인 표 아래에 배치)
                const ws_data = [
                    ["", "788", "R51", "R52", "R53", "R54", "R55", "특집", ""],
                    ["사용 전 잔량", val('[data-row="1"][data-col="B"]'), val('[data-row="1"][data-col="C"]'), val('[data-row="1"][data-col="D"]'), val('[data-row="1"][data-col="E"]'), val('[data-row="1"][data-col="F"]'), val('[data-row="1"][data-col="G"]'), val('[data-row="1"][data-col="H"]'), ""],
                    ["완 롤", val('[data-row="2"][data-col="B"]'), val('[data-row="2"][data-col="C"]'), val('[data-row="2"][data-col="D"]'), val('[data-row="2"][data-col="E"]'), val('[data-row="2"][data-col="F"]'), val('[data-row="2"][data-col="G"]'), "", ""],
                    ["", val('[data-row="3"][data-col="B"]'), val('[data-row="3"][data-col="C"]'), val('[data-row="3"][data-col="D"]'), val('[data-row="3"][data-col="E"]'), val('[data-row="3"][data-col="F"]'), val('[data-row="3"][data-col="G"]'), "사용량 총계:", val('#statTotalUsage')],
                    ["", val('[data-row="4"][data-col="B"]'), val('[data-row="4"][data-col="C"]'), val('[data-row="4"][data-col="D"]'), val('[data-row="4"][data-col="E"]'), val('[data-row="4"][data-col="F"]'), val('[data-row="4"][data-col="G"]'), "실사용량:", val('#statRealUsage')],
                    ["", val('[data-row="5"][data-col="B"]'), val('[data-row="5"][data-col="C"]'), val('[data-row="5"][data-col="D"]'), val('[data-row="5"][data-col="E"]'), val('[data-row="5"][data-col="F"]'), val('[data-row="5"][data-col="G"]'), "증감:", val('#statDiff')],
                    ["", val('[data-row="6"][data-col="B"]'), val('[data-row="6"][data-col="C"]'), val('[data-row="6"][data-col="D"]'), val('[data-row="6"][data-col="E"]'), val('[data-row="6"][data-col="F"]'), val('[data-row="6"][data-col="G"]'), "", ""],
                    ["", val('[data-row="7"][data-col="B"]'), val('[data-row="7"][data-col="C"]'), val('[data-row="7"][data-col="D"]'), val('[data-row="7"][data-col="E"]'), val('[data-row="7"][data-col="F"]'), val('[data-row="7"][data-col="G"]'), "", ""],
                    ["사용 전 합계", val('[data-row="8"][data-col="B"]'), val('[data-row="8"][data-col="C"]'), val('[data-row="8"][data-col="D"]'), val('[data-row="8"][data-col="E"]'), val('[data-row="8"][data-col="F"]'), val('[data-row="8"][data-col="G"]'), "사용량 A (1576mm):", val('#statUsageA')],
                    ["사용량", val('[data-row="9"][data-col="B"]'), val('[data-row="9"][data-col="C"]'), val('[data-row="9"][data-col="D"]'), val('[data-row="9"][data-col="E"]'), val('[data-row="9"][data-col="F"]'), val('[data-row="9"][data-col="G"]'), "사용량 D (788mm):", val('#statUsageD')],
                    ["사용 후 잔량", val('[data-row="10"][data-col="B"]'), val('[data-row="10"][data-col="C"]'), val('[data-row="10"][data-col="D"]'), val('[data-row="10"][data-col="E"]'), val('[data-row="10"][data-col="F"]'), val('[data-row="10"][data-col="G"]'), "", ""],
                    [], // 11번 행은 간격을 위한 빈 줄
                    ["", "", "", "완롤 잔량", "", "급지 재고", "", "급지 출고", ""],
                    ["", "", "", "A", "D", "A", "D", "A", "D"],
                    ["", "", "", val('#sideWanA'), val('#sideWanD'), val('#sideGeupA'), val('#sideGeupD'), val('#sideChulgoA'), val('#sideChulgoD')]
                ];

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(ws_data);

                // 화면에 맞춘 셀 병합(Merge) 설정
                ws['!merges'] = [
                    { s: {r: 0, c: 7}, e: {r: 0, c: 8} }, // 특집 헤더 병합
                    { s: {r: 1, c: 7}, e: {r: 1, c: 8} }, // 메모 입력칸
                    { s: {r: 2, c: 0}, e: {r: 7, c: 0} }, // "완 롤" 세로 병합 (행 2~7)
                    { s: {r: 2, c: 7}, e: {r: 2, c: 8} }, // 특집 우측 빈칸 병합
                    { s: {r: 6, c: 7}, e: {r: 6, c: 8} },
                    { s: {r: 7, c: 7}, e: {r: 7, c: 8} },
                    { s: {r: 10, c: 7}, e: {r: 10, c: 8} }, // 맨 우하단
                    // 미니 테이블 제목 셀 병합
                    { s: {r: 12, c: 3}, e: {r: 12, c: 4} },
                    { s: {r: 12, c: 5}, e: {r: 12, c: 6} },
                    { s: {r: 12, c: 7}, e: {r: 12, c: 8} }
                ];

                // 열(Column) 너비 강제 지정
                ws['!cols'] = [
                    {wpx: 110}, {wpx: 85}, {wpx: 85}, {wpx: 85}, {wpx: 85}, {wpx: 85}, {wpx: 85}, {wpx: 150}, {wpx: 120}
                ];

                // 디자인/스타일 적용 (선 굵기, 색상 등)
                const thickBorder = { style: 'medium', color: {rgb: "000000"} };
                const range = XLSX.utils.decode_range(ws['!ref']);
                
                for (let R = range.s.r; R <= range.e.r; R++) {
                    for (let C = range.s.c; C <= range.e.c; C++) {
                        const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
                        if (!ws[cell_ref]) ws[cell_ref] = {t: 's', v: ''};

                        let cell = ws[cell_ref];
                        let style = {
                            font: { name: "맑은 고딕", sz: 11, color: {rgb: "000000"} },
                            alignment: { vertical: "center", horizontal: "center" },
                            border: {
                                top: {style: 'thin', color: {rgb: "8e8e93"}}, bottom: {style: 'thin', color: {rgb: "8e8e93"}},
                                left: {style: 'thin', color: {rgb: "8e8e93"}}, right: {style: 'thin', color: {rgb: "8e8e93"}}
                            },
                            fill: { fgColor: {rgb: "ffffff"} }
                        };

                        // 빈 행(11번째) 및 표 범위 바깥 영역은 선 없음 처리
                        if (R === 11 || (R >= 12 && C < 3)) {
                             style.border = {};
                        } else {
                             // 바탕색 처리 (구분, 타이틀 라인)
                             if (R === 0 || (C === 0 && R <= 10) || R === 12) {
                                 style.fill = { fgColor: {rgb: "f5f5f7"} };
                             }

                             // 두꺼운 외곽선 디자인 (테이블 테두리)
                             if (R === 0) style.border.top = thickBorder;
                             if (R === 10) style.border.bottom = thickBorder;
                             if (R === 7 && C <= 6) style.border.bottom = thickBorder;
                             if (C === 0) style.border.left = thickBorder;
                             if (C === 6) style.border.right = thickBorder;
                             if (C === 8 && R <= 10) style.border.right = thickBorder;
                             if (R === 0 && C >= 7) style.border.top = thickBorder;

                             // 하단 사이드 테이블 디자인 처리
                             if (R === 12) style.border.top = thickBorder;
                             if (R === 14 && C >= 3) style.border.bottom = thickBorder;
                             if (R >= 12 && C === 3) style.border.left = thickBorder;
                             if (R >= 12 && C === 8) style.border.right = thickBorder;
                        }

                        // 진하게(Bold) 표시
                        if (R === 8 || R === 9 || (R >= 12 && R <= 13) || C === 0) {
                            style.font.bold = true;
                        }

                        // 특집 영역 (우측 정렬 및 중간선 제거로 병합처럼 보이게)
                        if (C === 7 && R >= 3 && R <= 9) {
                             style.alignment.horizontal = "right";
                             style.border.right = {}; 
                             if(R!==8 && R!==9) style.border.left = {}; 
                             style.border.top = {}; style.border.bottom = {};
                        }
                        if (C === 8 && R >= 3 && R <= 9) {
                             if(R!==8 && R!==9) style.border.left = {};
                             style.border.top = {}; style.border.bottom = {};
                        }

                        cell.s = style;
                    }
                }

                // 가로 출력에 알맞게 자동 맞춤 인쇄 설정
                ws['!pageSetup'] = {
                    orientation: 'landscape', // 가로 방향 출력
                    fitToWidth: 1,           // 한 페이지 너비에 맞춤
                    fitToHeight: 1,
                    paperSize: 9,            // A4
                    horizontalCentered: true // 가로 중앙 정렬
                };

                // 여백 설정
                ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

                XLSX.utils.book_append_sheet(wb, ws, "일지");

                // 규칙에 따른 파일명 지정하여 다운로드
                const fileName = `3공장_급지일지_${state.currentDate}.xlsx`;
                XLSX.writeFile(wb, fileName);
                
            } catch (err) {
                alert("엑셀 생성 중 오류가 발생했습니다: " + err.message);
            } finally {
                // 저장 완료 후 버튼 원상 복구
                elements.excelBtn.innerHTML = btnInner;
                elements.excelBtn.disabled = false;
            }
        }, 100); 
    }

    const GeupjiFactory3Module = {
        init: function() {
            const savedRole = sessionStorage.getItem('gf3_role');

            if (savedRole === 'admin') {
                state.isAdmin = true;  
            } else if (savedRole === 'readonly') {
                state.isAdmin = false; 
            } else {
                const pwInput = prompt("접속 비밀번호를 입력하세요:");
                if (pwInput === "edit0000") {
                    state.isAdmin = true; sessionStorage.setItem('gf3_role', 'admin'); 
                } else if (pwInput === "mk1324") {
                    state.isAdmin = false; sessionStorage.setItem('gf3_role', 'readonly'); 
                } else {
                    alert("비밀번호가 올바르지 않습니다."); location.href = "about:blank"; return; 
                }
            }

            window.addEventListener('beforeunload', function(e) {
                if (state.isEditMode) { e.preventDefault(); e.returnValue = ''; }
            });

            elements.wrapper = document.querySelector('.gf3-wrapper');
            if(!elements.wrapper) return;
            
            elements.dateText = document.getElementById('gf3DateText');
            elements.prevBtn = document.getElementById('gf3PrevBtn');
            elements.nextBtn = document.getElementById('gf3NextBtn');
            elements.todayBtn = document.getElementById('gf3TodayBtn');
            elements.editBtn = document.getElementById('gf3EditBtn');
            elements.saveBtn = document.getElementById('gf3SaveBtn');
            elements.excelBtn = document.getElementById('gf3ExcelBtn'); // 엑셀 버튼 등록
            
            if(state.isAdmin) elements.editBtn.disabled = false;

            const today = utils.getTodayStr();
            state.currentDate = utils.addDays(today, -1);
            elements.dateText.innerText = utils.formatKoDate(state.currentDate);

            let justClosed = false;

            state.fp = flatpickr("#gf3Flatpickr", {
                locale: "ko", dateFormat: "Y-m-d", defaultDate: state.currentDate,
                positionElement: elements.dateText, position: "auto center", clickOpens: false, 
                onReady: function(selectedDates, dateStr, instance) { instance.calendarContainer.style.marginTop = "10px"; },
                onChange: (dates, str) => {
                    if (!confirmLeaveEditMode()) { state.fp.setDate(state.currentDate, false); return; }
                    state.currentDate = str;
                    elements.dateText.innerText = utils.formatKoDate(str);
                    loadData(str);
                },
                onClose: () => { justClosed = true; setTimeout(() => { justClosed = false; }, 200); }
            });

            elements.dateText.addEventListener('click', (e) => {
                e.stopPropagation(); if (justClosed) return; 
                if (state.fp) state.fp.toggle();
            });
            
            elements.prevBtn.addEventListener('click', () => {
                if (!confirmLeaveEditMode()) return; 
                const prev = utils.addDays(state.currentDate, -1);
                state.fp.setDate(prev); state.currentDate = prev;
                elements.dateText.innerText = utils.formatKoDate(prev);
                loadData(prev);
            });

            elements.nextBtn.addEventListener('click', () => {
                if (!confirmLeaveEditMode()) return; 
                const next = utils.addDays(state.currentDate, 1);
                state.fp.setDate(next); state.currentDate = next;
                elements.dateText.innerText = utils.formatKoDate(next);
                loadData(next);
            });

            elements.todayBtn.addEventListener('click', () => {
                const today = utils.getTodayStr();
                if (state.currentDate !== today) {
                    if (!confirmLeaveEditMode()) return; 
                    state.fp.setDate(today); state.currentDate = today;
                    elements.dateText.innerText = utils.formatKoDate(today);
                    loadData(today);
                }
            });

            elements.editBtn.addEventListener('click', toggleEditMode);
            elements.excelBtn.addEventListener('click', exportToExcel); // 엑셀 버튼 이벤트 연결

            elements.saveBtn.addEventListener('click', async () => {
                if (!state.isEditMode) return;
                
                const rawPayloadData = [];
                const cols = ['B', 'C', 'D', 'E', 'F', 'G'];
                const extractVal = (el) => el ? el.value.replace(/,/g, '').replace(/kg/g, '').replace(/R\/L/g, '').trim() : "";

                cols.forEach(col => {
                    const startEl = document.querySelector(`.gf3-input[data-row="1"][data-col="${col}"]`);
                    const memoEl = document.querySelector(`.gf3-input[data-row="1"][data-col="H"]`);
                    rawPayloadData.push({ item_type: 'start_bal_1', col_id: col, value: extractVal(startEl), memo: memoEl ? memoEl.value : "" });
                    
                    for (let r = 2; r <= 7; r++) {
                        const wanEl = document.querySelector(`.gf3-input[data-row="${r}"][data-col="${col}"]`);
                        rawPayloadData.push({ item_type: `wan_roll_${r}`, col_id: col, value: extractVal(wanEl), memo: "" });
                    }
                    
                    const endEl = document.querySelector(`.gf3-input[data-row="10"][data-col="${col}"]`);
                    rawPayloadData.push({ item_type: 'end_bal_10', col_id: col, value: extractVal(endEl), memo: "" });
                });

                rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'A', value: extractVal(document.getElementById('sideWanA')), memo: "" });
                rawPayloadData.push({ item_type: 'side_wan_1', col_id: 'D', value: extractVal(document.getElementById('sideWanD')), memo: "" });
                rawPayloadData.push({ item_type: 'side_geup', col_id: 'A', value: extractVal(document.getElementById('sideGeupA')), memo: "" });
                rawPayloadData.push({ item_type: 'side_geup', col_id: 'D', value: extractVal(document.getElementById('sideGeupD')), memo: "" });
                rawPayloadData.push({ item_type: 'stat_total_usage', col_id: 'H', value: extractVal(document.getElementById('statTotalUsage')), memo: "" });

                const finalInsertData = rawPayloadData
                    .map(item => ({
                        date: state.currentDate, item_type: item.item_type, col_id: item.col_id,
                        value: parseInt(item.value, 10) || 0, memo: item.memo || ""
                    }))
                    .filter(item => item.value !== 0 || item.memo.trim() !== "");

                try {
                    const { error: deleteError } = await supabase.from('factory3_geupji_real').delete().eq('date', state.currentDate);
                    if (deleteError) { alert('기존 데이터 초기화 실패: ' + deleteError.message); return; }

                    if (finalInsertData.length > 0) {
                        const { error: insertError } = await supabase.from('factory3_geupji_real').insert(finalInsertData);
                        if (insertError) { alert('저장 실패: ' + insertError.message); } 
                        else { alert('저장 완료되었습니다.'); toggleEditMode(); loadData(state.currentDate); }
                    } else {
                        alert('저장 완료되었습니다. (모든 값이 지워져 해당 날짜의 데이터가 초기화되었습니다.)');
                        toggleEditMode(); loadData(state.currentDate);
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