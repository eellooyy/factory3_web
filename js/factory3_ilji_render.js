/* factory3_ilji_render.js */
(function() {
    'use strict';
    
    const App = window.Factory3Ilji;
    if (!App) return;

    // 자동 수식 계산
    App.calculateAutoFields = function() {
        let usageD = 0; let usageA = 0; let endBalD = 0; let endBalA = 0; 
        let sumTodayRollD = 0; let sumTodayRollA = 0;

        ['B','C','D','E','F','G'].forEach(col => {
            const factor = (col === 'B') ? App.FACTOR_788 : App.FACTOR_1576;
            const startBal = App.utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="1"]`)?.value);
            
            let wanKgSum = 0;
            for(let r=2; r<=7; r++) {
                let cellVal = App.utils.parseNum(document.querySelector(`.target-calc[data-col="${col}"][data-row="${r}"]`)?.value);
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
            const beforeInput = document.querySelector(`.f3i-input[data-col="${col}"][data-row="8"]`);
            if (beforeInput) beforeInput.value = beforeSum > 0 ? beforeSum.toLocaleString() : "";

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

                const ws_data = [
                    ["", "", "", "", "", "", "", formattedExcelDate, "", "", "", ""],
                    [],
                    ["", "788", "R51", "R52", "R53", "R54", "R55", "특집", "", "", "완롤 잔량", ""],
                    ["사용 전 잔량", val('[data-row="1"][data-col="B"]'), val('[data-row="1"][data-col="C"]'), val('[data-row="1"][data-col="D"]'), val('[data-row="1"][data-col="E"]'), val('[data-row="1"][data-col="F"]'), val('[data-row="1"][data-col="G"]'), val('[data-row="1"][data-col="H"]'), "", "", "A", "D"],
                    ["완 롤", val('[data-row="2"][data-col="B"]'), val('[data-row="2"][data-col="C"]'), val('[data-row="2"][data-col="D"]'), val('[data-row="2"][data-col="E"]'), val('[data-row="2"][data-col="F"]'), val('[data-row="2"][data-col="G"]'), "", "", "", val('#sideWanA'), val('#sideWanD')],
                    ["", val('[data-row="3"][data-col="B"]'), val('[data-row="3"][data-col="C"]'), val('[data-row="3"][data-col="D"]'), val('[data-row="3"][data-col="E"]'), val('[data-row="3"][data-col="F"]'), val('[data-row="3"][data-col="G"]'), "사용량 총계:", val('#statTotalUsage'), "", "", ""],
                    ["", val('[data-row="4"][data-col="B"]'), val('[data-row="4"][data-col="C"]'), val('[data-row="4"][data-col="D"]'), val('[data-row="4"][data-col="E"]'), val('[data-row="4"][data-col="F"]'), val('[data-row="4"][data-col="G"]'), "실사용량:", val('#statRealUsage'), "", "급지 재고", ""],
                    ["", val('[data-row="5"][data-col="B"]'), val('[data-row="5"][data-col="C"]'), val('[data-row="5"][data-col="D"]'), val('[data-row="5"][data-col="E"]'), val('[data-row="5"][data-col="F"]'), val('[data-row="5"][data-col="G"]'), "증감:", val('#statDiff'), "", "A", "D"],
                    ["", val('[data-row="6"][data-col="B"]'), val('[data-row="6"][data-col="C"]'), val('[data-row="6"][data-col="D"]'), val('[data-row="6"][data-col="E"]'), val('[data-row="6"][data-col="F"]'), val('[data-row="6"][data-col="G"]'), "", "", "", val('#sideGeupA'), val('#sideGeupD')],
                    ["", val('[data-row="7"][data-col="B"]'), val('[data-row="7"][data-col="C"]'), val('[data-row="7"][data-col="D"]'), val('[data-row="7"][data-col="E"]'), val('[data-row="7"][data-col="F"]'), val('[data-row="7"][data-col="G"]'), "", "", "", "", ""],
                    ["사용 전 합계", val('[data-row="8"][data-col="B"]'), val('[data-row="8"][data-col="C"]'), val('[data-row="8"][data-col="D"]'), val('[data-row="8"][data-col="E"]'), val('[data-row="8"][data-col="F"]'), val('[data-row="8"][data-col="G"]'), "사용량 A (1576mm):", val('#statUsageA'), "", "급지 출고", ""],
                    ["사용량", val('[data-row="9"][data-col="B"]'), val('[data-row="9"][data-col="C"]'), val('[data-row="9"][data-col="D"]'), val('[data-row="9"][data-col="E"]'), val('[data-row="9"][data-col="F"]'), val('[data-row="9"][data-col="G"]'), "사용량 D (788mm):", val('#statUsageD'), "", "A", "D"],
                    ["사용 후 잔량", val('[data-row="10"][data-col="B"]'), val('[data-row="10"][data-col="C"]'), val('[data-row="10"][data-col="D"]'), val('[data-row="10"][data-col="E"]'), val('[data-row="10"][data-col="F"]'), val('[data-row="10"][data-col="G"]'), "", "", "", val('#sideChulgoA'), val('#sideChulgoD')]
                ];

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(ws_data);

                // 시트 병합 규칙 및 셀 스타일 코드 (기존과 동일 처리)
                ws['!merges'] = [
                    { s: {r: 0, c: 7}, e: {r: 0, c: 11} }, { s: {r: 2, c: 7}, e: {r: 2, c: 8} },
                    { s: {r: 3, c: 7}, e: {r: 3, c: 8} }, { s: {r: 4, c: 0}, e: {r: 9, c: 0} },
                    { s: {r: 4, c: 7}, e: {r: 4, c: 8} }, { s: {r: 8, c: 7}, e: {r: 8, c: 8} },
                    { s: {r: 9, c: 7}, e: {r: 9, c: 8} }, { s: {r: 12, c: 7}, e: {r: 12, c: 8} },
                    { s: {r: 2, c: 10}, e: {r: 2, c: 11} }, { s: {r: 6, c: 10}, e: {r: 6, c: 11} },
                    { s: {r: 10, c: 10}, e: {r: 10, c: 11} }
                ];

                ws['!cols'] = [
                    {wch: 13}, {wch: 9}, {wch: 9}, {wch: 9}, {wch: 9}, 
                    {wch: 9}, {wch: 9}, {wch: 20}, {wch: 17}, {wch: 1.3}, 
                    {wch: 10}, {wch: 10}
                ];

                ws['!rows'] = [
                    {hpt: 35}, {hpt: 15}, {hpt: 25}, {hpt: 25}, {hpt: 25}, {hpt: 25}, {hpt: 25},
                    {hpt: 25}, {hpt: 25}, {hpt: 25}, {hpt: 25}, {hpt: 25}, {hpt: 25}
                ];

                const thickBorder = { style: 'medium', color: {rgb: "000000"} };
                
                for (let R = 0; R <= 12; R++) {
                    for (let C = 0; C <= 11; C++) {
                        const cell_ref = XLSX.utils.encode_cell({c: C, r: R});
                        if (!ws[cell_ref]) ws[cell_ref] = {t: 's', v: ''};

                        let cell = ws[cell_ref];
                        let style = {
                            font: { name: "맑은 고딕", sz: 11, color: {rgb: "000000"} },
                            alignment: { vertical: "center", horizontal: "center" },
                            border: {},
                            fill: { fgColor: {rgb: "ffffff"} }
                        };

                        if (R === 0 && C >= 7 && C <= 11) {
                            style.font.sz = 14; style.font.bold = true; style.alignment.horizontal = "right";
                        }
                        if (R === 1 || C === 9) { cell.s = style; continue; }

                        if (C <= 8 && R >= 2) {
                            style.border = {
                                top: {style: 'thin', color: {rgb: "8e8e93"}}, bottom: {style: 'thin', color: {rgb: "8e8e93"}},
                                left: {style: 'thin', color: {rgb: "8e8e93"}}, right: {style: 'thin', color: {rgb: "8e8e93"}}
                            };
                            if (R === 2 || C === 0) style.fill = { fgColor: {rgb: "f5f5f7"} };
                            if (R === 10 || R === 11 || C === 0 || R === 2) style.font.bold = true;
                            if (R === 2) style.border.top = thickBorder;
                            if (R === 12) style.border.bottom = thickBorder;
                            if (C === 0) style.border.left = thickBorder;
                            if (C === 6 || C === 8) style.border.right = thickBorder;
                            if (R === 9 && C <= 6) style.border.bottom = thickBorder;

                            if (C >= 7 && C <= 8) {
                                if (R === 5) style.border.bottom = {};
                                if (R === 6) { style.border.top = {}; style.border.bottom = {}; }
                                if (R === 7) style.border.top = {};
                                if (R === 10) style.border.bottom = {};
                                if (R === 11) style.border.top = {};
                                if (C === 7 && R >= 5 && R <= 11) style.alignment.horizontal = "right";
                                if (C === 7 && [4, 8, 9, 12].includes(R)) style.border.right = {};
                                if (C === 8 && [4, 8, 9, 12].includes(R)) style.border.left = {};
                            }
                        }

                        if (C >= 10 && C <= 11) {
                            const inBlock1 = R >= 2 && R <= 4;
                            const inBlock2 = R >= 6 && R <= 8;
                            const inBlock3 = R >= 10 && R <= 12;

                            if (inBlock1 || inBlock2 || inBlock3) {
                                style.border = {
                                    top: {style: 'thin', color: {rgb: "8e8e93"}}, bottom: {style: 'thin', color: {rgb: "8e8e93"}},
                                    left: {style: 'thin', color: {rgb: "8e8e93"}}, right: {style: 'thin', color: {rgb: "8e8e93"}}
                                };
                                if (R === 2 || R === 6 || R === 10) { style.fill = { fgColor: {rgb: "f5f5f7"} }; style.font.bold = true; }
                                if (R === 3 || R === 7 || R === 11) { style.fill = { fgColor: {rgb: "fafafc"} }; }
                                if ((inBlock2 || inBlock3) && (R === 8 || R === 12)) { style.font.bold = true; }
                                if (R === 2 || R === 6 || R === 10) style.border.top = thickBorder;
                                if (R === 4 || R === 8 || R === 12) style.border.bottom = thickBorder;
                                if (C === 10) style.border.left = thickBorder;
                                if (C === 11) style.border.right = thickBorder;
                            }
                        }
                        cell.s = style;
                    }
                }

                const applyExportBorder = (cellRef, borderPatch) => {
                    const cell = ws[cellRef];
                    if (!cell || !cell.s) return;
                    cell.s.border = Object.assign({}, cell.s.border || {}, borderPatch);
                };

                const exportThinBorder = { style: 'thin', color: { rgb: "8e8e93" } };
                const exportThickBorder = { style: 'medium', color: { rgb: "000000" } };
                const setAllThin = (cellRef) => {
                    applyExportBorder(cellRef, { top: exportThinBorder, bottom: exportThinBorder, left: exportThinBorder, right: exportThinBorder });
                };

                for (let r = 2; r <= 12; r++) {
                    for (let c = 0; c <= 8; c++) { setAllThin(XLSX.utils.encode_cell({ c, r })); }
                }
                for (let c = 0; c <= 8; c++) {
                    applyExportBorder(XLSX.utils.encode_cell({ c, r: 2 }), { top: exportThickBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c, r: 12 }), { bottom: exportThickBorder });
                }
                for (let r = 2; r <= 12; r++) {
                    applyExportBorder(XLSX.utils.encode_cell({ c: 0, r }), { left: exportThickBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 8, r }), { right: exportThickBorder });
                }
                for (let c = 0; c <= 8; c++) { applyExportBorder(XLSX.utils.encode_cell({ c, r: 9 }), { bottom: exportThickBorder }); }
                for (let r = 3; r <= 12; r++) {
                    applyExportBorder(XLSX.utils.encode_cell({ c: 7, r }), { left: exportThinBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 8, r }), { right: exportThinBorder });
                }
                [3, 4, 5, 6, 7, 10, 11].forEach((r) => {
                    applyExportBorder(XLSX.utils.encode_cell({ c: 7, r }), { top: exportThinBorder, bottom: exportThinBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 8, r }), { top: exportThinBorder, bottom: exportThinBorder });
                });
                [8, 9].forEach((r) => {
                    applyExportBorder(XLSX.utils.encode_cell({ c: 7, r }), { top: {}, bottom: {} });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 8, r }), { top: {}, bottom: {} });
                });
                applyExportBorder(XLSX.utils.encode_cell({ c: 7, r: 12 }), { bottom: exportThickBorder });
                applyExportBorder(XLSX.utils.encode_cell({ c: 8, r: 12 }), { bottom: exportThickBorder });

                const miniRanges = [{ top: 2, bottom: 4 }, { top: 6, bottom: 8 }, { top: 10, bottom: 12 }];
                for (const range of miniRanges) {
                    for (let r = range.top; r <= range.bottom; r++) {
                        for (let c = 10; c <= 11; c++) { setAllThin(XLSX.utils.encode_cell({ c, r })); }
                    }
                    for (let c = 10; c <= 11; c++) {
                        applyExportBorder(XLSX.utils.encode_cell({ c, r: range.top }), { top: exportThickBorder });
                        applyExportBorder(XLSX.utils.encode_cell({ c, r: range.bottom }), { bottom: exportThickBorder });
                    }
                    for (let r = range.top; r <= range.bottom; r++) {
                        applyExportBorder(XLSX.utils.encode_cell({ c: 10, r }), { left: exportThickBorder });
                        applyExportBorder(XLSX.utils.encode_cell({ c: 11, r }), { right: exportThickBorder });
                    }
                }

                [2, 3].forEach((r) => {
                    for (let c = 0; c <= 8; c++) { applyExportBorder(XLSX.utils.encode_cell({ c, r }), { bottom: exportThickBorder }); }
                });
                [2, 6, 10].forEach((r) => {
                    for (let c = 10; c <= 11; c++) { applyExportBorder(XLSX.utils.encode_cell({ c, r }), { bottom: exportThickBorder }); }
                });
                for (let r = 2; r <= 12; r++) {
                    applyExportBorder(XLSX.utils.encode_cell({ c: 0, r }), { right: exportThickBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 6, r }), { right: exportThickBorder });
                    applyExportBorder(XLSX.utils.encode_cell({ c: 8, r }), { right: exportThickBorder });
                }

                const setNoBorder = (c, r, side) => {
                    const cellRef = XLSX.utils.encode_cell({ c, r });
                    if (ws[cellRef] && ws[cellRef].s && ws[cellRef].s.border) delete ws[cellRef].s.border[side];
                    if (side === 'bottom') {
                        const adjRef = XLSX.utils.encode_cell({ c, r: r + 1 });
                        if (ws[adjRef] && ws[adjRef].s && ws[adjRef].s.border) delete ws[adjRef].s.border.top;
                    } else if (side === 'right') {
                        const adjRef = XLSX.utils.encode_cell({ c: c + 1, r });
                        if (ws[adjRef] && ws[adjRef].s && ws[adjRef].s.border) delete ws[adjRef].s.border.left;
                    }
                };

                setNoBorder(7, 4, 'bottom'); setNoBorder(8, 4, 'bottom'); setNoBorder(7, 5, 'right'); setNoBorder(8, 5, 'bottom');
                setNoBorder(7, 6, 'bottom'); setNoBorder(7, 6, 'right'); setNoBorder(8, 6, 'bottom'); setNoBorder(7, 7, 'bottom');
                setNoBorder(7, 7, 'right'); setNoBorder(8, 7, 'bottom'); setNoBorder(7, 8, 'bottom'); setNoBorder(8, 8, 'bottom');
                setNoBorder(7, 10, 'bottom'); setNoBorder(7, 10, 'right'); setNoBorder(8, 10, 'bottom'); setNoBorder(7, 11, 'bottom');
                setNoBorder(7, 11, 'right'); setNoBorder(8, 11, 'bottom');

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
        
        const swapBtn = document.getElementById('f3iSwapBtn');
        if (swapBtn) {
            swapBtn.style.backgroundColor = '#007AFF';
            swapBtn.textContent = '위치 변경';
        }
    };

    App.bindSwapFeature = function() {
        const swapBtn = document.getElementById('f3iSwapBtn');
        const infoBar = document.getElementById('f3iSwapInfoBar');
        
        if (!swapBtn) return;
        
        swapBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (App.swapState.active) {
                App.disableSwapMode();
            } else {
                App.swapState.active = true;
                App.swapState.firstSelectedCell = null;
                
                swapBtn.style.backgroundColor = '#ff9500';
                swapBtn.textContent = '변경 취소';
                
                if (infoBar) {
                    infoBar.textContent = '변경하려는 잔량을 선택해 주세요';
                    infoBar.style.display = 'block';
                }
                
                // data-row="1" 인 (사용 전 잔량) 편집가능 셀들만 후보로 지정
                document.querySelectorAll('.f3i-td.editable').forEach(td => {
                    const inp = td.querySelector('input.target-calc[data-row="1"]');
                    if (inp) {
                        td.classList.add('swap-candidate');
                    }
                });
            }
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
                        // 스왑 진행
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