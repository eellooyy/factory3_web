/* factory1_ft_render.js */
window.Factory1Ft = window.Factory1Ft || {};

window.Factory1Ft.Render = (function() {
    'use strict';

    // 숫자 변환 (콤마 제거)
    function parseNum(val) {
        if (!val) return 0;
        const parsed = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    }

    // 숫자 포맷팅 (콤마 추가)
    function formatNum(num) {
        if (num === 0 || !num) return '';
        return num.toLocaleString('ko-KR');
    }

    // UI 입력창 초기화
    function clearUI() {
        document.querySelectorAll('.f1ft-wrapper .f1ft-input').forEach(input => {
            input.value = '';
        });
        document.querySelectorAll('.f1ft-wrapper .delta-input').forEach(input => {
            input.classList.remove('delta-positive', 'delta-negative');
        });
    }

    // DB에서 불러온 데이터를 화면에 매핑
    function updateUI(data) {
        clearUI();
        if (!data) return;

        document.querySelectorAll('.f1ft-wrapper .f1ft-input').forEach(input => {
            const field = input.dataset.field;
            const group = input.dataset.group;
            
            if (field) {
                // DOM의 data-group과 data-field 조합으로 DB 컬럼명 유추 (예: 'A', 'diff' -> 'a_diff')
                // 기존 1공장 DB 구조에 맞게 이 부분은 조정될 수 있습니다.
                const column = group ? `${group.toLowerCase()}_${field}` : field;
                
                if (data[column] !== undefined && data[column] !== null) {
                    // 메모 셀은 콤마 없이 텍스트 그대로, 숫자는 포맷팅
                    if (input.classList.contains('memo-input') || typeof data[column] === 'string') {
                        input.value = data[column];
                    } else {
                        input.value = formatNum(data[column]);
                    }
                }
            }
        });
    }

    // 입력 필드 포맷터 이벤트 등록 (Focus 시 콤마 제거, Blur 시 콤마 추가)
    function bindInputFormatters(wrapper) {
        wrapper.querySelectorAll('.f1ft-td.editable .f1ft-input').forEach(input => {
            input.addEventListener('focus', function() {
                if (this.value && !this.classList.contains('memo-input')) {
                    this.value = this.value.replace(/,/g, '');
                }
            });
            input.addEventListener('blur', function() {
                if (!this.classList.contains('memo-input')) {
                    const val = parseNum(this.value);
                    this.value = val === 0 ? '' : formatNum(val);
                }
            });
        });
    }

    // 키보드 네비게이션 (엔터/방향키 이동)
    function bindKeyboardNavigation(wrapper) {
        const inputs = Array.from(wrapper.querySelectorAll('.f1ft-td.editable .f1ft-input'));
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (index < inputs.length - 1) inputs[index + 1].focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (index > 0) inputs[index - 1].focus();
                }
            });
        });
    }

    return {
        parseNum, 
        formatNum, 
        clearUI, 
        updateUI, 
        bindInputFormatters, 
        bindKeyboardNavigation
    };
})();