/* js/factory3_io_render.js */
window.Factory3Io = window.Factory3Io || {};

Factory3Io.Render = {
    /* ─────────────────────────────────────────
       숫자 및 텍스트 화면 포맷터
    ───────────────────────────────────────── */
    fmtNum: function (v, ds, allowToday = false) {
        const rowDate = new Date(ds + 'T00:00:00');
        const todayDate = new Date(Factory3Io.Utils.todayStr() + 'T00:00:00');

        if (rowDate > todayDate || (rowDate.getTime() === todayDate.getTime() && !allowToday)) {
            return '<span class="f3io-empty">-</span>';
        }

        const n = Number(v);
        if (isNaN(n) || n === 0) return '<span class="f3io-empty">0</span>';
        return `<span${n < 0 ? ' class="f3io-negative"' : ''}>${n.toLocaleString()}</span>`;
    },

    updateDateText: function (str) {
        const el = document.getElementById('gf3IoDateText');
        if (el) el.textContent = str ? Factory3Io.Utils.fmtKo(str) : '';
    },

    /* ─────────────────────────────────────────
       DOM 전체 리랜더링 및 합계 유효성 검증
    ───────────────────────────────────────── */
    rerenderAllRows: function (forceClear = false) {
        document.querySelectorAll('#f3ioBody1 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = Factory3Io.dataCache[ds] || {};
            tr.querySelectorAll('td[data-col]').forEach(td => {
                // 수정 취소 및 저장 시 인풋창을 완전히 비우고 일반 텍스트로 복귀시킵니다.
                if (!forceClear && td.querySelector('.f3io-in-input')) return;
                
                const col = td.getAttribute('data-col');
                if      (col === '1') td.innerHTML = this.fmtNum(d.in_a,    ds, true);
                else if (col === '2') td.innerHTML = this.fmtNum(d.in_d,    ds, true);
                else if (col === '3') td.innerHTML = this.fmtNum(d.out_a,   ds, false);
                else if (col === '4') td.innerHTML = this.fmtNum(d.out_d,   ds, false);
                else if (col === '5') td.innerHTML = this.fmtNum(d.stock_a, ds, false);
                else if (col === '6') td.innerHTML = this.fmtNum(d.stock_d, ds, false);
            });
        });

        document.querySelectorAll('#f3ioBody2 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = Factory3Io.dataCache[ds] || {};
            const usageMedia = d.usage_media || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            const usagePaper = d.usage_paper || { A: 0, D: 0 };
            
            let mediaSum = 0;
            const paperSum = (usagePaper.A || 0) + (usagePaper.D || 0);
            
            tr.querySelectorAll('td[data-col]').forEach(td => {
                const col = Number(td.getAttribute('data-col'));
                if (col >= 1 && col <= 6) {
                    const val = usageMedia[col] || 0;
                    td.innerHTML = this.fmtNum(val, ds, false);
                    mediaSum += val;
                } else if (col === 7) {
                    td.innerHTML = this.fmtNum(mediaSum, ds, false);
                    if (mediaSum !== paperSum && new Date(ds + 'T00:00:00') < new Date(Factory3Io.Utils.todayStr() + 'T00:00:00')) {
                        td.classList.add('f3io-sum-mismatch');
                    } else {
                        td.classList.remove('f3io-sum-mismatch');
                    }
                }
            });
        });

        document.querySelectorAll('#f3ioBody3 tr[data-date]').forEach(tr => {
            const ds = tr.getAttribute('data-date');
            const d  = Factory3Io.dataCache[ds] || {};
            const usagePaper = d.usage_paper || { A: 0, D: 0 };
            
            tr.querySelectorAll('td[data-col]').forEach(td => {
                const col = td.getAttribute('data-col');
                if (col === '1') td.innerHTML = this.fmtNum(usagePaper.A || 0, ds, false);
                if (col === '2') td.innerHTML = this.fmtNum(usagePaper.D || 0, ds, false);
            });
        });
    },

    buildRow: function (ds) {
        const d = Factory3Io.dataCache[ds] || {};
        return { 
            date:ds, 
            in_a:d.in_a||0, in_d:d.in_d||0, 
            out_a:d.out_a||0, out_d:d.out_d||0, 
            stock_a:d.stock_a||0, stock_d:d.stock_d||0,
            usage_media: d.usage_media || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            usage_paper: d.usage_paper || { A: 0, D: 0 }
        };
    },

    generateRowsHTML: function (rows) {
        let html1='', html2='', html3='';
        rows.forEach(row => {
            const d   = new Date(row.date + 'T00:00:00');
            const isT = row.date === Factory3Io.Utils.yesterdayStr();
            const trC = isT ? 'f3io-row-today' : '';
            const wd  = d.getDay();
            const wdC = wd === 6 ? 'f3io-sat' : wd === 0 ? 'f3io-sun' : '';
            const m   = Factory3Io.Utils.pad(d.getMonth()+1);
            const dy  = Factory3Io.Utils.pad(d.getDate());
            const wn  = Factory3Io.WD_KR[wd];

            const dateTd    = `<td class="f3io-date-td ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;
            const resDateTd = `<td class="f3io-date-td f3io-responsive-date ${wdC}" data-date="${row.date}">${m}/${dy} (${wn})</td>`;

            html1 += `<tr class="${trC}" data-date="${row.date}">
                ${dateTd}
                <td class="f3io-data-cell f3io-editable-cell" data-col="1">${this.fmtNum(row.in_a,    row.date, true)}</td>
                <td class="f3io-data-cell f3io-editable-cell" data-col="2">${this.fmtNum(row.in_d,    row.date, true)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="3">${this.fmtNum(row.out_a,   row.date, false)}</td>
                <td class="f3io-data-cell"                    data-col="4">${this.fmtNum(row.out_d,   row.date, false)}</td>
                <td class="f3io-data-cell f3io-sep"           data-col="5">${this.fmtNum(row.stock_a, row.date, false)}</td>
                <td class="f3io-data-cell"                    data-col="6">${this.fmtNum(row.stock_d, row.date, false)}</td>
            </tr>`;

            let mediaHtml = '';
            let mediaSum = 0;
            const usageMedia = row.usage_media;
            const usagePaper = row.usage_paper;
            const paperSum = (usagePaper.A || 0) + (usagePaper.D || 0);

            for (let col = 1; col <= 6; col++) {
                const val = usageMedia[col] || 0;
                mediaHtml += `<td class="f3io-data-cell" data-col="${col}">${this.fmtNum(val, row.date, false)}</td>`;
                mediaSum += val;
            }

            let mismatchClass = (mediaSum !== paperSum && d < new Date(Factory3Io.Utils.todayStr() + 'T00:00:00')) ? ' f3io-sum-mismatch' : '';
            html2 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                ${mediaHtml}
                <td class="f3io-data-cell f3io-sum-col${mismatchClass}" data-col="7">${this.fmtNum(mediaSum, row.date, false)}</td>
            </tr>`;

            html3 += `<tr class="${trC}" data-date="${row.date}">
                ${resDateTd}
                <td class="f3io-data-cell" data-col="1">${this.fmtNum(usagePaper.A, row.date, false)}</td>
                <td class="f3io-data-cell" data-col="2">${this.fmtNum(usagePaper.D, row.date, false)}</td>
            </tr>`;
        });
        return { html1, html2, html3 };
    },

    renderInitial: function (rows) {
        const b1 = document.getElementById('f3ioBody1');
        const b2 = document.getElementById('f3ioBody2');
        const b3 = document.getElementById('f3ioBody3');
        if (!b1||!b2||!b3) return;
        const h = this.generateRowsHTML(rows);
        b1.innerHTML = h.html1;
        b2.innerHTML = h.html2;
        b3.innerHTML = h.html3;
    },

    showLoading: function () {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }].forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#aeaeb2;font-size:13px;">불러오는 중...</td></tr>`;
        });
    },

    showError: function (msg) {
        [{ id:'f3ioBody1',cols:7 }, { id:'f3ioBody2',cols:8 }, { id:'f3ioBody3',cols:3 }].forEach(({ id, cols }) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="${cols}" style="padding:28px;text-align:center;color:#ff3b30;font-size:13px;">${msg}</td></tr>`;
        });
    }
};