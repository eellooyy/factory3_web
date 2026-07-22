/* factory3_ilji_render.js */
(function() {
    'use strict';
    
    const App = window.Factory3Ilji;
    if (!App) return;

    // 집계 레벨 (0, 1, 2) 관리
    App.midLevel = 0;

    App.getMidLevel = function() {
        return App.midLevel || 0;
    };

    App.updateRightSideSummaryRows = function(level) {
        const valTotal = document.getElementById('statTotalUsage')?.value || '';
        const valReal = document.getElementById('statRealUsage')?.value || '';
        const valDiff = document.getElementById('statDiff')?.value || '';

        const r2 = document.querySelector('.target-calc[data-row="2"]')?.closest('tr');
        const r3 = document.querySelector('.target-calc[data-row="3"]')?.closest('tr');
        const m1_1 = document.getElementById('f3iMidUsageRow1');
        const m1_2 = document.getElementById('f3iMidBalRow1');
        const r4 = document.querySelector('.target-calc[data-row="4"]')?.closest('tr');
        const r5 = document.querySelector('.target-calc[data-row="5"]')?.closest('tr');
        const m2_1 = document.getElementById('f3iMidUsageRow2');
        const m2_2 = document.getElementById('f3iMidBalRow2');
        const r6 = document.querySelector('.target-calc[data-row="6"]')?.closest('tr');
        const r7 = document.querySelector('.target-calc[data-row="7"]')?.closest('tr');

        const allRows = [r2, r3, m1_1, m1_2, r4, r5, m2_1, m2_2, r6, r7].filter(Boolean);

        let targetRows = [r3, r4, r5];
        if (level === 1) targetRows = [m1_1, m1_2, r4];
        else if (level === 2) targetRows = [m1_2, r4, r5];

        allRows.forEach(row => {
            row.querySelectorAll('.special-cell').forEach(el => el.remove());
        });

        allRows.forEach(row => {
            if (row === targetRows[0]) {
                row.insertAdjacentHTML('beforeend', '<th class="f3i-th special-cell special-label">사용량 총계:</th><td class="f3i-td editable special-cell"><input type="text" class="f3i-input" id="statTotalUsage" readonly></td>');
            } else if (row === targetRows[1]) {
                row.insertAdjacentHTML('beforeend', '<th class="f3i-th special-cell special-label">실사용량:</th><td class="f3i-td special-cell"><input type="text" class="f3i-input" id="statRealUsage" readonly></td>');
            } else if (row === targetRows[2]) {
                row.insertAdjacentHTML('beforeend', '<th class="f3i-th special-cell special-label">증감:</th><td class="f3i-td special-cell"><input type="text" class="f3i-input" id="statDiff" readonly></td>');
            } else {
                row.insertAdjacentHTML('beforeend', '<td class="f3i-td special-cell" colspan="2"></td>');
            }
        });

        if (document.getElementById('statTotalUsage')) document.getElementById('statTotalUsage').value = valTotal;
        if (document.getElementById('statRealUsage')) document.getElementById('statRealUsage').value = valReal;
        if (document.getElementById('statDiff')) document.getElementById('statDiff').value = valDiff;
    };

    App.setMidLevel = function(level) {
        App.midLevel = Math.max(0, Math.min(2, parseInt(level, 10) || 0));
        const uRow1 = document.getElementById('f3iMidUsageRow1');
        const bRow1 = document.getElementById('f3iMidBalRow1');
        const uRow2 = document.getElementById('f3iMidUsageRow2');
        const bRow2 = document.getElementById('f3iMidBalRow2');

        const th1 = document.getElementById('f3iWanTh1');
        const th2 = document.getElementById('f3iWanTh2');
        const th3 = document.getElementById('f3iWanTh3');

        const btnGroup = document.querySelector('.f3i-mid-btn-group');
        const box1 = th1?.querySelector('.f3i-wan-title-box');
        const box2 = th2?.querySelector('.f3i-wan-title-box');
        const box3 = th3?.querySelector('.f3i-wan-title-box');

        const addBtn = document.getElementById('f3iAddMidBtn');
        const remBtn = document.getElementById('f3iRemoveMidBtn');

        if (App.midLevel === 0) {
            if (uRow1) uRow1.classList.remove('show');
            if (bRow1) bRow1.classList.remove('show');
            if (uRow2) uRow2.classList.remove('show');
            if (bRow2) bRow2.classList.remove('show');

            if (th1) { th1.rowSpan = 6; th1.style.display = ""; }
            if (th2) { th2.style.display = "none"; }
            if (th3) { th3.style.display = "none"; }

            if (btnGroup && box1 && btnGroup.parentElement !== box1) {
                box1.appendChild(btnGroup);
            }

            if (addBtn) { addBtn.style.display = ""; addBtn.title = "1차 집계 추가"; }
            if (remBtn) { remBtn.style.display = "none"; }
        } else if (App.midLevel === 1) {
            if (uRow1) uRow1.classList.add('show');
            if (bRow1) bRow1.classList.add('show');
            if (uRow2) uRow2.classList.remove('show');
            if (bRow2) bRow2.classList.remove('show');

            if (th1) { th1.rowSpan = 2; th1.style.display = ""; }
            if (th2) { th2.rowSpan = 4; th2.style.display = ""; }
            if (th3) { th3.style.display = "none"; }

            if (btnGroup && box2 && btnGroup.parentElement !== box2) {
                box2.appendChild(btnGroup);
            }

            if (addBtn) { addBtn.style.display = ""; addBtn.title = "2차 집계 추가"; }
            if (remBtn) { remBtn.style.display = ""; remBtn.title = "1차 집계 삭제"; }
        } else if (App.midLevel === 2) {
            if (uRow1) uRow1.classList.add('show');
            if (bRow1) bRow1.classList.add('show');
            if (uRow2) uRow2.classList.add('show');
            if (bRow2) bRow2.classList.add('show');

            if (th1) { th1.rowSpan = 2; th1.style.display = ""; }
            if (th2) { th2.rowSpan = 2; th2.style.display = ""; }
            if (th3) { th3.rowSpan = 2; th3.style.display = ""; }

            if (btnGroup && box3 && btnGroup.parentElement !== box3) {
                box3.appendChild(btnGroup);
            }

            if (addBtn) { addBtn.style.display = "none"; }
            if (remBtn) { remBtn.style.display = ""; remBtn.title = "2차 집계 삭제"; }
        }

        App.updateRightSideSummaryRows(App.midLevel);
    };

    // 하위 호환성 헬퍼
    App.isMidRowsVisible = function() {
        return App.getMidLevel() > 0;
    };

    App.setMidRowsVisibility = function(visible) {
        App.setMidLevel(visible ? (App.getMidLevel() || 1) : 0);
    };

    // 자동 수식 계산
    App.calculateAutoFields = function() {
        let usageD = 0; let usageA = 0; let endBalD = 0; let endBalA = 0; 
        let sumTodayRollD = 0; let sumTodayRollA = 0;
        const midLevel = App.getMidLevel();

        ['B','C','D','E','F','G'].forEach(col => {
            const factor = (col === 'B') ? App.FACTOR_788 : App.FACTOR_1576;
            const startBal = App.utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="1"]`)?.value);
            
            let wanKgSum = 0;
            let wanKgSum2_3 = 0;
            let wanKgSum4_5 = 0;
            let wanKgSum6_7 = 0;

            for(let r=2; r<=7; r++) {
                let cellVal = App.utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="${r}"]`)?.value);
                let rowKg = 0;
                if (cellVal >= 20) {
                    rowKg = cellVal;
                } else {
                    rowKg = (cellVal * factor);
                    if (cellVal > 0 && cellVal <= 19) {
                        if (col === 'B') sumTodayRollD += cellVal;
                        else sumTodayRollA += cellVal;
                    }
                }
                wanKgSum += rowKg;
                if (r === 2 || r === 3) wanKgSum2_3 += rowKg;
                else if (r === 4 || r === 5) wanKgSum4_5 += rowKg;
                else if (r === 6 || r === 7) wanKgSum6_7 += rowKg;
            }
            
            const beforeSum = startBal + wanKgSum;
            const beforeInput = document.querySelector(`.f3i-input[data-col="${col}"][data-row="8"]`);
            if (beforeInput) beforeInput.value = beforeSum > 0 ? beforeSum.toLocaleString() : "";

            // 1차 집계 계산 처리 및 1차 사용량 확정 고정 (Lock)
            const midBalInput1 = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_bal_1"]`);
            const midUsageInput1 = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_usage_1"]`);
            const midBalVal1 = App.utils.parseNum(midBalInput1?.value);
            const paperBeforeMid1 = startBal + wanKgSum2_3;

            if (midLevel >= 1) {
                if (midUsageInput1 && midUsageInput1.dataset.fixedUsage !== undefined && midUsageInput1.dataset.fixedUsage !== "") {
                    // 고정된 계산값이 있으면 우선 적용 (스왑 시 재계산 방지)
                    const fixedVal = Number(midUsageInput1.dataset.fixedUsage);
                    midUsageInput1.value = fixedVal > 0 ? fixedVal.toLocaleString() : "0";
                } else if (midBalVal1 > 0 && paperBeforeMid1 > 0) {
                    const computedMidUsage1 = paperBeforeMid1 - midBalVal1;
                    if (midUsageInput1) {
                        midUsageInput1.dataset.fixedUsage = computedMidUsage1;
                        midUsageInput1.value = computedMidUsage1 > 0 ? computedMidUsage1.toLocaleString() : "0";
                    }
                } else if (midUsageInput1) {
                    midUsageInput1.value = "";
                }
            } else {
                if (midUsageInput1) { midUsageInput1.value = ""; delete midUsageInput1.dataset.fixedUsage; }
                if (midBalInput1) { midBalInput1.value = ""; }
            }

            // 2차 집계 계산 처리 및 2차 사용량 확정 고정 (Lock)
            const midBalInput2 = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_bal_2"]`);
            const midUsageInput2 = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_usage_2"]`);
            const midBalVal2 = App.utils.parseNum(midBalInput2?.value);
            const startingPaperForMid2 = (midBalVal1 > 0) ? midBalVal1 : paperBeforeMid1;
            const paperBeforeMid2 = startingPaperForMid2 + wanKgSum4_5;

            if (midLevel >= 2) {
                if (midUsageInput2 && midUsageInput2.dataset.fixedUsage !== undefined && midUsageInput2.dataset.fixedUsage !== "") {
                    // 고정된 계산값이 있으면 우선 적용 (스왑 시 재계산 방지)
                    const fixedVal = Number(midUsageInput2.dataset.fixedUsage);
                    midUsageInput2.value = fixedVal > 0 ? fixedVal.toLocaleString() : "0";
                } else if (midBalVal2 > 0 && paperBeforeMid2 > 0) {
                    const computedMidUsage2 = paperBeforeMid2 - midBalVal2;
                    if (midUsageInput2) {
                        midUsageInput2.dataset.fixedUsage = computedMidUsage2;
                        midUsageInput2.value = computedMidUsage2 > 0 ? computedMidUsage2.toLocaleString() : "0";
                    }
                } else if (midUsageInput2) {
                    midUsageInput2.value = "";
                }
            } else {
                if (midUsageInput2) { midUsageInput2.value = ""; delete midUsageInput2.dataset.fixedUsage; }
                if (midBalInput2) { midBalInput2.value = ""; }
            }

            const endBal = App.utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="10"]`)?.value);
            if (col === 'B') endBalD = endBal;
            else endBalA += endBal;

            let usage = 0;
            const usageInput = document.querySelector(`.f3i-input[data-col="${col}"][data-row="9"]`);
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

        if(elUsageD) elUsageD.value = usageD > 0 ? App.utils.formatKg(usageD) : "";
        if(elUsageA) elUsageA.value = usageA > 0 ? App.utils.formatKg(usageA) : "";
        
        const realUsage = usageD + usageA;
        if(elRealUsage) elRealUsage.value = realUsage > 0 ? App.utils.formatKg(realUsage) : "";

        let totalUsageVal = App.utils.parseNum(document.getElementById('statTotalUsage')?.value);
        if (totalUsageVal > 0 && realUsage > 0) {
             const diff = totalUsageVal - realUsage;
             elDiff.value = App.utils.formatKg(diff);
        } else {
             if(elDiff) elDiff.value = "";
        }

        const wanA = App.utils.parseNum(document.getElementById('sideWanA')?.value);
        const wanD = App.utils.parseNum(document.getElementById('sideWanD')?.value);
        const geupD = endBalD + (wanD * App.FACTOR_788);
        const geupA = endBalA + (wanA * App.FACTOR_1576);

        const elGeupA = document.getElementById('sideGeupA');
        const elGeupD = document.getElementById('sideGeupD');
        
        if(elGeupA) elGeupA.value = geupA > 0 ? geupA.toLocaleString() + " kg" : "0 kg";
        if(elGeupD) elGeupD.value = geupD > 0 ? geupD.toLocaleString() + " kg" : "0 kg";

        const rawChulgoA = App.state.prevWanA - (sumTodayRollA + wanA);
        const rawChulgoD = App.state.prevWanD - (sumTodayRollD + wanD);
        const chulgoA = Math.abs(rawChulgoA);
        const chulgoD = Math.abs(rawChulgoD);

        const elChulgoA = document.getElementById('sideChulgoA');
        const elChulgoD = document.getElementById('sideChulgoD');

        if(elChulgoA) elChulgoA.value = chulgoA.toLocaleString() + " R/L";
        if(elChulgoD) elChulgoD.value = chulgoD.toLocaleString() + " R/L";
    };

    // 포맷 변환기 바인딩
    App.bindInputFormatters = function() {
        App.headerApi.elements.wrapper.querySelectorAll('.target-calc, #sideWanA, #sideWanD, #statTotalUsage').forEach(input => {
            input.addEventListener('focus', function() {
                if(this.readOnly) return;
                let v = App.utils.parseNum(this.value);
                this.value = v === 0 ? "" : v;
            });
            input.addEventListener('input', function() {
                if (App.swapState && App.swapState.active) return;
                const type = this.dataset.type;
                const col = this.dataset.col;
                if (type === 'mid_bal_1') {
                    const uInp = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_usage_1"]`);
                    if (uInp) delete uInp.dataset.fixedUsage;
                } else if (type === 'mid_bal_2') {
                    const uInp = document.querySelector(`.f3i-input[data-col="${col}"][data-type="mid_usage_2"]`);
                    if (uInp) delete uInp.dataset.fixedUsage;
                }
            });
            input.addEventListener('blur', function() {
                if(this.readOnly) return;
                let v = App.utils.parseNum(this.value);
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
                App.calculateAutoFields();
            });
        });
    };

    // 키보드 이동 로직
    App.bindKeyboardNavigation = function() {
        App.headerApi.elements.wrapper.addEventListener('keydown', function(e) {
            const target = e.target;
            if (!target.classList.contains('f3i-input')) return;

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
                    const nextInput = App.headerApi.elements.wrapper.querySelector(`.f3i-input[data-row="${nextRow}"][data-col="${nextCol}"]`);
                    if (nextInput && !nextInput.readOnly) {
                        nextInput.focus(); nextInput.select();
                    }
                }
            }
        });
    };

    // 엑셀 출력 내보내기
    App.exportToExcel = function() {
        if (!window.XLSX) {
            alert("엑셀 모듈을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const excelBtn = App.headerApi.elements.excelBtn;
        const btnInner = excelBtn.innerHTML;
        excelBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">hourglass_empty</span>처리중...';
        excelBtn.disabled = true;

        setTimeout(() => {
            try {
                const val = (selector) => { const el = document.querySelector(selector); return el ? el.value : ""; };
                const currentDate = App.headerApi.getCurrentDate();

                const dateObj = new Date(currentDate);
                const dayNames = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
                const formattedExcelDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth()+1}월 ${dateObj.getDate()}일 ${dayNames[dateObj.getDay()]}`;

                const midLevel = App.getMidLevel();

                const ws_data = [
                    ["", "", "", "", "", "", "", formattedExcelDate, "", "", "", ""],
                    [],
                    ["", "788", "R51", "R52", "R53", "R54", "R55", "특집", "", "", "완롤 잔량", ""],
                    ["사용 전 잔량", val('[data-row="1"][data-col="B"]'), val('[data-row="1"][data-col="C"]'), val('[data-row="1"][data-col="D"]'), val('[data-row="1"][data-col="E"]'), val('[data-row="1"][data-col="F"]'), val('[data-row="1"][data-col="G"]'), val('[data-row="1"][data-col="H"]'), "", "", "A", "D"],
                    ["완 롤", val('[data-row="2"][data-col="B"]'), val('[data-row="2"][data-col="C"]'), val('[data-row="2"][data-col="D"]'), val('[data-row="2"][data-col="E"]'), val('[data-row="2"][data-col="F"]'), val('[data-row="2"][data-col="G"]'), "", "", "", val('#sideWanA'), val('#sideWanD')],
                    ["", val('[data-row="3"][data-col="B"]'), val('[data-row="3"][data-col="C"]'), val('[data-row="3"][data-col="D"]'), val('[data-row="3"][data-col="E"]'), val('[data-row="3"][data-col="F"]'), val('[data-row="3"][data-col="G"]'), "사용량 총계:", val('#statTotalUsage'), "", "", ""]
                ];

                const merges = [
                    { s: {r: 0, c: 7}, e: {r: 0, c: 11} },
                    { s: {r: 2, c: 7}, e: {r: 2, c: 8} },
                    { s: {r: 3, c: 7}, e: {r: 3, c: 8} },
                    { s: {r: 5, c: 7}, e: {r: 5, c: 8} },
                    { s: {r: 2, c: 10}, e: {r: 2, c: 11} },
                    { s: {r: 6, c: 10}, e: {r: 6, c: 11} },
                    { s: {r: 10, c: 10}, e: {r: 10, c: 11} }
                ];

                if (midLevel >= 1) {
                    ws_data.push(["1차 사용량", val('[data-type="mid_usage_1"][data-col="B"]'), val('[data-type="mid_usage_1"][data-col="C"]'), val('[data-type="mid_usage_1"][data-col="D"]'), val('[data-type="mid_usage_1"][data-col="E"]'), val('[data-type="mid_usage_1"][data-col="F"]'), val('[data-type="mid_usage_1"][data-col="G"]'), "", "", "", "", ""]);
                    ws_data.push(["1차 사용 후 잔량", val('[data-type="mid_bal_1"][data-col="B"]'), val('[data-type="mid_bal_1"][data-col="C"]'), val('[data-type="mid_bal_1"][data-col="D"]'), val('[data-type="mid_bal_1"][data-col="E"]'), val('[data-type="mid_bal_1"][data-col="F"]'), val('[data-type="mid_bal_1"][data-col="G"]'), "", "", "", "", ""]);
                    merges.push({ s: {r: 4, c: 0}, e: {r: 5, c: 0} });
                }

                const wan3RowIdx = ws_data.length;
                ws_data.push(["완 롤", val('[data-row="4"][data-col="B"]'), val('[data-row="4"][data-col="C"]'), val('[data-row="4"][data-col="D"]'), val('[data-row="4"][data-col="E"]'), val('[data-row="4"][data-col="F"]'), val('[data-row="4"][data-col="G"]'), "실사용량:", val('#statRealUsage'), "", "급지 재고", ""]);
                merges.push({ s: {r: wan3RowIdx, c: 7}, e: {r: wan3RowIdx, c: 8} });

                const wan4RowIdx = ws_data.length;
                ws_data.push(["", val('[data-row="5"][data-col="B"]'), val('[data-row="5"][data-col="C"]'), val('[data-row="5"][data-col="D"]'), val('[data-row="5"][data-col="E"]'), val('[data-row="5"][data-col="F"]'), val('[data-row="5"][data-col="G"]'), "증감:", val('#statDiff'), "", "A", "D"]);
                merges.push({ s: {r: wan4RowIdx, c: 7}, e: {r: wan4RowIdx, c: 8} });

                if (midLevel >= 2) {
                    ws_data.push(["2차 사용량", val('[data-type="mid_usage_2"][data-col="B"]'), val('[data-type="mid_usage_2"][data-col="C"]'), val('[data-type="mid_usage_2"][data-col="D"]'), val('[data-type="mid_usage_2"][data-col="E"]'), val('[data-type="mid_usage_2"][data-col="F"]'), val('[data-type="mid_usage_2"][data-col="G"]'), "", "", "", "", ""]);
                    ws_data.push(["2차 사용 후 잔량", val('[data-type="mid_bal_2"][data-col="B"]'), val('[data-type="mid_bal_2"][data-col="C"]'), val('[data-type="mid_bal_2"][data-col="D"]'), val('[data-type="mid_bal_2"][data-col="E"]'), val('[data-type="mid_bal_2"][data-col="F"]'), val('[data-type="mid_bal_2"][data-col="G"]'), "", "", "", "", ""]);
                    merges.push({ s: {r: wan3RowIdx, c: 0}, e: {r: wan4RowIdx, c: 0} });
                }

                const wan5RowIdx = ws_data.length;
                ws_data.push(["완 롤", val('[data-row="6"][data-col="B"]'), val('[data-row="6"][data-col="C"]'), val('[data-row="6"][data-col="D"]'), val('[data-row="6"][data-col="E"]'), val('[data-row="6"][data-col="F"]'), val('[data-row="6"][data-col="G"]'), "", "", "", val('#sideGeupA'), val('#sideGeupD')]);

                const wan6RowIdx = ws_data.length;
                ws_data.push(["", val('[data-row="7"][data-col="B"]'), val('[data-row="7"][data-col="C"]'), val('[data-row="7"][data-col="D"]'), val('[data-row="7"][data-col="E"]'), val('[data-row="7"][data-col="F"]'), val('[data-row="7"][data-col="G"]'), "", "", "", "", ""]);

                if (midLevel === 0) {
                    merges.push({ s: {r: 4, c: 0}, e: {r: wan6RowIdx, c: 0} });
                } else if (midLevel === 1) {
                    merges.push({ s: {r: wan3RowIdx, c: 0}, e: {r: wan6RowIdx, c: 0} });
                } else if (midLevel === 2) {
                    merges.push({ s: {r: wan5RowIdx, c: 0}, e: {r: wan6RowIdx, c: 0} });
                }

                const sumBeforeRowIdx = ws_data.length;
                ws_data.push(["사용 전 합계", val('[data-row="8"][data-col="B"]'), val('[data-row="8"][data-col="C"]'), val('[data-row="8"][data-col="D"]'), val('[data-row="8"][data-col="E"]'), val('[data-row="8"][data-col="F"]'), val('[data-row="8"][data-col="G"]'), "사용량 A (1576mm):", val('#statUsageA'), "", "급지 출고", ""]);
                merges.push({ s: {r: sumBeforeRowIdx, c: 7}, e: {r: sumBeforeRowIdx, c: 8} });

                const usageRowIdx = ws_data.length;
                ws_data.push(["사용량", val('[data-row="9"][data-col="B"]'), val('[data-row="9"][data-col="C"]'), val('[data-row="9"][data-col="D"]'), val('[data-row="9"][data-col="E"]'), val('[data-row="9"][data-col="F"]'), val('[data-row="9"][data-col="G"]'), "사용량 D (788mm):", val('#statUsageD'), "", "A", "D"]);
                merges.push({ s: {r: usageRowIdx, c: 7}, e: {r: usageRowIdx, c: 8} });

                const endBalRowIdx = ws_data.length;
                ws_data.push(["사용 후 잔량", val('[data-row="10"][data-col="B"]'), val('[data-row="10"][data-col="C"]'), val('[data-row="10"][data-col="D"]'), val('[data-row="10"][data-col="E"]'), val('[data-row="10"][data-col="F"]'), val('[data-row="10"][data-col="G"]'), "", "", "", val('#sideChulgoA'), val('#sideChulgoD')]);

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                ws['!merges'] = merges;

                ws['!cols'] = [
                    {wch: 15}, {wch: 9}, {wch: 9}, {wch: 9}, {wch: 9}, 
                    {wch: 9}, {wch: 9}, {wch: 20}, {wch: 17}, {wch: 1.3}, 
                    {wch: 10}, {wch: 10}
                ];

                ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 1, paperSize: 9, horizontalCentered: true };
                ws['!margins'] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

                XLSX.utils.book_append_sheet(wb, ws, "일지");
                XLSX.writeFile(wb, `3공장_급지일지_${currentDate}.xlsx`);
                
            } catch (err) {
                alert("엑셀 생성 중 오류가 발생했습니다: " + err.message);
            } finally {
                excelBtn.innerHTML = btnInner;
                excelBtn.disabled = false;
            }
        }, 100); 
    };

    // 위치 변경 (맞교환) 기능 구현
    App.swapState = {
        active: false,
        firstSelectedCell: null
    };

    App.disableSwapMode = function() {
        App.swapState.active = false;
        App.swapState.firstSelectedCell = null;
        
        const infoBar = document.getElementById('f3iSwapInfoBar');
        if (infoBar) {
            infoBar.style.display = 'none';
            infoBar.textContent = '';
        }
        
        document.querySelectorAll('.f3i-td.editable').forEach(td => {
            td.classList.remove('swap-candidate', 'swap-selected');
        });
        
        document.querySelectorAll('.f3i-swap-btn').forEach(btn => {
            btn.style.backgroundColor = '#007AFF';
            btn.textContent = '위치 변경';
        });
    };

    App.bindSwapFeature = function() {
        const infoBar = document.getElementById('f3iSwapInfoBar');
        const swapBtns = document.querySelectorAll('.f3i-swap-btn');
        
        if (!swapBtns || swapBtns.length === 0) return;
        
        swapBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (App.swapState.active) {
                    App.disableSwapMode();
                } else {
                    App.swapState.active = true;
                    App.swapState.firstSelectedCell = null;
                    
                    document.querySelectorAll('.f3i-swap-btn').forEach(b => {
                        b.style.backgroundColor = '#ff9500';
                        b.textContent = '변경 취소';
                    });
                    
                    if (infoBar) {
                        infoBar.textContent = '변경하려는 잔량을 선택해 주세요';
                        infoBar.style.display = 'block';
                    }
                    
                    // 1차/2차 사용 후 잔량 (data-type^="mid_bal") 및 사용 후 잔량 (data-row="10") 편집가능 셀을 후보로 지정
                    document.querySelectorAll('.f3i-td.editable').forEach(td => {
                        const inp = td.querySelector('input.target-calc[data-type^="mid_bal"], input.target-calc[data-row="10"]');
                        if (inp) {
                            td.classList.add('swap-candidate');
                        }
                    });
                }
            });
        });
        
        // 이벤트 위임을 통해 셀 클릭 제어
        const wrapper = document.querySelector('.f3i-wrapper');
        if (wrapper) {
            wrapper.addEventListener('click', function(e) {
                if (!App.swapState.active) return;
                
                const td = e.target.closest('td.swap-candidate');
                if (!td) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const input = td.querySelector('input');
                if (!input) return;
                
                if (!App.swapState.firstSelectedCell) {
                    // 1단계 선택
                    App.swapState.firstSelectedCell = td;
                    td.classList.add('swap-selected');
                    if (infoBar) {
                        infoBar.textContent = '변경할 잔량 대상을 선택해 주세요';
                    }
                } else {
                    // 2단계 선택 (동일 셀 선택 시 취소)
                    if (App.swapState.firstSelectedCell === td) {
                        td.classList.remove('swap-selected');
                        App.swapState.firstSelectedCell = null;
                        if (infoBar) {
                            infoBar.textContent = '변경하려는 잔량을 선택해 주세요';
                        }
                    } else {
                        // 잔량 값 맞교환
                        const input1 = App.swapState.firstSelectedCell.querySelector('input');
                        const input2 = input;
                        
                        const tempVal = input1.value;
                        input1.value = input2.value;
                        input2.value = tempVal;
                        
                        // 자동 연산 트리거
                        App.calculateAutoFields();
                        
                        // 스왑 모드 비활성화
                        App.disableSwapMode();
                    }
                }
            });
        }
        
        // 수정 모드가 꺼지거나 날짜가 변경될 때 스왑 모드 자동 초기화
        const editBtn = document.getElementById('f3iEditBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (App.headerApi && !App.headerApi.isEditMode()) {
                        App.disableSwapMode();
                    }
                }, 100);
            });
        }
        
        const saveBtn = document.getElementById('f3iSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                setTimeout(() => {
                    App.disableSwapMode();
                }, 100);
            });
        }
    };
})();