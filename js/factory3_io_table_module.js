/* js/factory3_io_table_module.js */
const Factory3IoTableModule = (function() {
    'use strict';

    const WD_KR = ['일', '월', '화', '수', '목', '금', '토'];
    let scrollAreas = [];
    let isSyncing = false;
    let activeCell = null;

    // 초기화 함수
    function init() {
        scrollAreas = [
            document.getElementById('scrollAreaLeft'),
            document.getElementById('scrollAreaMid'),
            document.getElementById('scrollAreaRight')
        ].filter(el => el !== null);

        setupScrollSync();
        renderMockData(); // 추후 Supabase 연동 시 이 함수를 실제 데이터 패치 로직으로 교체
        setupInteractions();
    }

    // 1. 패널 3개 스크롤 동기화 로직
    function setupScrollSync() {
        scrollAreas.forEach(area => {
            area.addEventListener('scroll', function(e) {
                if (isSyncing) return;
                isSyncing = true;
                
                const scrollTop = e.target.scrollTop;
                scrollAreas.forEach(otherArea => {
                    if (otherArea !== e.target) {
                        otherArea.scrollTop = scrollTop;
                    }
                });
                
                window.requestAnimationFrame(() => {
                    isSyncing = false;
                    updateCursorPosition();
                });
            });
        });
    }

    // 2. 가상의 테이블 데이터 렌더링
    function renderMockData() {
        const tbodyLeft = document.getElementById('tbodyLeft');
        const tbodyMid = document.getElementById('tbodyMid');
        const tbodyRight = document.getElementById('tbodyRight');

        if(!tbodyLeft || !tbodyMid || !tbodyRight) return;

        let leftHTML = '';
        let midHTML = '';
        let rightHTML = '';

        const today = new Date().getDate();
        
        // 임의로 31일까지의 행을 생성
        for (let i = 1; i <= 31; i++) {
            const isToday = i === today;
            const rowClass = isToday ? 'gf3-row-today' : '';
            const dayOfWeek = new Date(2023, 9, i).getDay(); // 테스트용 요일
            let dateColorClass = '';
            
            if(dayOfWeek === 0) dateColorClass = 'gf3-sun';
            else if(dayOfWeek === 6) dateColorClass = 'gf3-sat';

            const mm = '10';
            const dd = String(i).padStart(2, '0');
            const dateStrFormatted = `${mm}/${dd} (${WD_KR[dayOfWeek]})`; // MM/DD (요일) 포맷

            // 왼쪽 패널 (입출고 내역)
            leftHTML += `<tr class="${rowClass}" data-date="2023-10-${dd}">
                <td class="gf3-date-td ${dateColorClass}">${dateStrFormatted}</td>
                <td class="gf3-data-cell">100</td>
                <td class="gf3-data-cell">50</td>
                <td class="gf3-data-cell">50</td>
            </tr>`;

            const mediaSum = 120 + i;
            const paperSum = (i % 5 === 0) ? mediaSum + 10 : mediaSum; 
            const mismatchClass = (mediaSum !== paperSum) ? 'gf3-sum-mismatch' : '';

            // 중앙 패널 (매체별 사용량)
            midHTML += `<tr class="${rowClass}" data-date="2023-10-${dd}">
                <td class="gf3-date-td gf3-responsive-date ${dateColorClass}">${dateStrFormatted}</td>
                <td class="gf3-data-cell">30</td>
                <td class="gf3-data-cell">40</td>
                <td class="gf3-data-cell">25</td>
                <td class="gf3-data-cell">25</td>
                <td class="gf3-data-cell gf3-sum-col ${mismatchClass}">${mediaSum}</td>
            </tr>`;

            // 오른쪽 패널 (용지별 사용량)
            rightHTML += `<tr class="${rowClass}" data-date="2023-10-${dd}">
                <td class="gf3-date-td gf3-responsive-date ${dateColorClass}">${dateStrFormatted}</td>
                <td class="gf3-data-cell gf3-sum-col ${mismatchClass}">${paperSum}</td>
            </tr>`;
        }

        tbodyLeft.innerHTML = leftHTML;
        tbodyMid.innerHTML = midHTML;
        tbodyRight.innerHTML = rightHTML;
    }

    // 3. 클릭 시 줄 하이라이트 및 글래스 커서 이동 로직
    function setupInteractions() {
        const panelsOuter = document.querySelector('.gf3-panels-outer');
        if (!panelsOuter) return;

        panelsOuter.addEventListener('click', function(e) {
            const cell = e.target.closest('td.gf3-data-cell');
            if (cell) {
                if(activeCell) activeCell.classList.remove('gf3-selected-cell');
                document.querySelectorAll('.gf3-selected-row').forEach(row => row.classList.remove('gf3-selected-row'));

                activeCell = cell;
                activeCell.classList.add('gf3-selected-cell');
                
                const tr = cell.closest('tr');
                const dateVal = tr.getAttribute('data-date');
                if(dateVal) {
                    document.querySelectorAll(`tr[data-date="${dateVal}"]`).forEach(r => r.classList.add('gf3-selected-row'));
                }

                moveCursorToCell(cell);
            }
        });

        window.addEventListener('resize', updateCursorPosition);
    }

    function moveCursorToCell(cell) {
        const cursor = document.getElementById('gf3Cursor');
        const panelsOuter = document.querySelector('.gf3-panels-outer');
        // 커서 이동 세부 로직 (기존 유지)
    }

    function updateCursorPosition() {
        if(activeCell) moveCursorToCell(activeCell);
    }

    return {
        init: init
    };
})();