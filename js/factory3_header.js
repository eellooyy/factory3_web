/* factory3_header.js */
window.Factory3Header = (function() {
    'use strict';
    const utils = window.Factory3Utils;

    let isInitialized = false;
    let activeConfig = null; // 현재 띄워진 화면(1공장 or 3공장)의 설정값

    const state = {
        currentDate: null,
        isEditMode: false,
        isAdmin: false,
        fp: null
    };

    const elements = {};

    function authenticate() {
        const savedRole = sessionStorage.getItem('gf3_role');
        if (savedRole === 'admin') return true;
        if (savedRole === 'readonly') return false;

        const pwInput = prompt('접속 비밀번호를 입력하세요:');
        if (pwInput === 'edit0000') {
            sessionStorage.setItem('gf3_role', 'admin');
            return true;
        }
        if (pwInput === 'mk1324') {
            sessionStorage.setItem('gf3_role', 'readonly');
            return false;
        }
        alert('비밀번호가 올바르지 않습니다.');
        location.href = 'about:blank';
        return null;
    }

    // 활성화된 화면의 읽기/쓰기 모드를 동기화
    function syncEditMode() {
        if (!activeConfig) return;
        const wrapper = document.querySelector(activeConfig.wrapperSelector);
        if (!wrapper) return;

        if (state.isEditMode) {
            wrapper.classList.add('edit-mode');
            wrapper.querySelectorAll(activeConfig.inputSelector).forEach(inp => inp.readOnly = false);
        } else {
            wrapper.classList.remove('edit-mode');
            wrapper.querySelectorAll(activeConfig.inputSelector).forEach(inp => inp.readOnly = true);
        }
    }

    function toggleEditMode() {
        if (!state.isAdmin) return;
        state.isEditMode = !state.isEditMode;
        elements.editBtn.textContent = state.isEditMode ? '보기' : '수정';
        elements.saveBtn.disabled = !state.isEditMode;
        syncEditMode();
    }

    function confirmLeaveEditMode() {
        if (state.isEditMode) {
            return confirm('저장되지 않은 변경사항이 있습니다. 날짜를 변경하시겠습니까?');
        }
        return true;
    }

    // 모듈 초기화 및 교체
    function init(config) {
        activeConfig = config;

        // 최초 1회만 DOM 이벤트 바인딩
        if (!isInitialized) {
            const isAdmin = authenticate();
            if (isAdmin === null) return null;
            state.isAdmin = isAdmin;

            elements.dateText = document.getElementById('gf3DateText');
            elements.prevBtn = document.getElementById('gf3PrevBtn');
            elements.nextBtn = document.getElementById('gf3NextBtn');
            elements.todayBtn = document.getElementById('gf3TodayBtn');
            elements.editBtn = document.getElementById('gf3EditBtn');
            elements.saveBtn = document.getElementById('gf3SaveBtn');
            elements.excelBtn = document.getElementById('gf3ExcelBtn');

            if (state.isAdmin) elements.editBtn.disabled = false;

            const today = utils.getTodayStr();
            state.currentDate = utils.addDays(today, -1); // 3공장 기본값 어제
            elements.dateText.innerText = utils.formatKoDate(state.currentDate);

            state.fp = flatpickr('#gf3Flatpickr', {
                locale: 'ko',
                dateFormat: 'Y-m-d',
                defaultDate: state.currentDate,
                positionElement: elements.dateText,
                position: 'auto center',
                clickOpens: false,
                onChange: (dates, str) => {
                    if (!confirmLeaveEditMode()) {
                        state.fp.setDate(state.currentDate, false);
                        return;
                    }
                    state.currentDate = str;
                    elements.dateText.innerText = utils.formatKoDate(str);
                    if (activeConfig.onDateChange) activeConfig.onDateChange(str);
                }
            });

            elements.dateText.addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.fp) state.fp.toggle();
            });

            elements.prevBtn.addEventListener('click', () => {
                if (!confirmLeaveEditMode()) return;
                state.fp.setDate(utils.addDays(state.currentDate, -1), true);
            });

            elements.nextBtn.addEventListener('click', () => {
                if (!confirmLeaveEditMode()) return;
                state.fp.setDate(utils.addDays(state.currentDate, 1), true);
            });

            elements.todayBtn.addEventListener('click', () => {
                const todayStr = utils.getTodayStr();
                if (state.currentDate !== todayStr) {
                    if (!confirmLeaveEditMode()) return;
                    state.fp.setDate(todayStr, true);
                }
            });

            elements.editBtn.addEventListener('click', toggleEditMode);
            
            elements.saveBtn.addEventListener('click', () => {
                if (state.isEditMode && activeConfig.onSave) activeConfig.onSave();
            });

            elements.excelBtn.addEventListener('click', () => {
                if (activeConfig.onExportExcel) activeConfig.onExportExcel();
            });

            isInitialized = true;
        } else {
            // 탭 교체 시 발생: 새로 들어온 화면에 현재 헤더의 모드/날짜 적용
            syncEditMode();
            if (activeConfig.onDateChange) activeConfig.onDateChange(state.currentDate);
        }

        return {
            getCurrentDate: () => state.currentDate,
            isEditMode: () => state.isEditMode,
            toggleEditMode
        };
    }

    return { init, isEditMode: () => state.isEditMode, toggleEditMode };
})();