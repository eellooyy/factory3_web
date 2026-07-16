/* factory3_header.js — 3공장 공통 헤더 (마스터 비밀번호 0000 연동 처리) */
window.Factory3Header = (function() {
    'use strict';

    const utils = window.Factory3Utils;

    function elementId(prefix, name) {
        if (prefix === 'f3i') {
            return `f3i${name}`;
        }
        return `gf3${prefix}${name}`;
    }

    function defaultExportExcel(elements) {
        const btnInner = elements.excelBtn.innerHTML;
        elements.excelBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">hourglass_empty</span>처리중...';
        elements.excelBtn.disabled = true;

        setTimeout(() => {
            elements.excelBtn.innerHTML = btnInner;
            elements.excelBtn.disabled = false;
            alert('엑셀 저장 기능은 준비 중입니다.');
        }, 400);
    }

    // [수정] 0000 마스터 비밀번호 로직 연동
    function authenticate() {
        const savedRole = sessionStorage.getItem('gf3_role');

        if (savedRole === 'master') return 'master';
        if (savedRole === 'admin') return 'admin';
        if (savedRole === 'readonly') return 'readonly';

        const pwInput = prompt('접속 비밀번호를 입력하세요:');
        
        if (pwInput === '0000') {
            sessionStorage.setItem('gf3_role', 'master');
            return 'master';
        }
        if (pwInput === 'edit0000') {
            sessionStorage.setItem('gf3_role', 'admin');
            return 'admin';
        }
        if (pwInput === 'mk1324') {
            sessionStorage.setItem('gf3_role', 'readonly');
            return 'readonly';
        }

        alert('비밀번호가 올바르지 않습니다.');
        location.href = 'about:blank';
        return null;
    }

    function init(config) {
        const prefix = config.idPrefix || '';
        const wrapperSelector = config.wrapperSelector || '.gf3-wrapper';
        const inputSelector = config.inputSelector || '.gf3-td.editable .gf3-input';
        const onDateChange = config.onDateChange || null;
        const onSave = config.onSave || (() => alert('저장 기능은 준비 중입니다.'));
        const onExportExcel = config.onExportExcel || (() => defaultExportExcel(elements));

        const state = {
            currentDate: null,
            isEditMode: false,
            fp: null,
            isAdmin: false,
            role: null
        };

        const elements = {
            wrapper: null,
            dateText: null,
            prevBtn: null,
            nextBtn: null,
            todayBtn: null,
            editBtn: null,
            saveBtn: null,
            excelBtn: null
        };

        function confirmLeaveEditMode() {
            if (state.isEditMode) {
                return confirm('저장되지 않은 변경사항이 있습니다. 나가시겠습니까?');
            }
            return true;
        }

        function setCurrentDate(dateStr, triggerChange) {
            state.currentDate = dateStr;
            elements.dateText.innerText = utils.formatKoDate(dateStr);
            if (state.fp) {
                state.fp.setDate(dateStr, false);
            }
            if (triggerChange !== false && onDateChange) {
                onDateChange(dateStr);
            }
        }

        // [수정] 수정 모드 토글 시 마스터 모드 연동 클래스 부여
        function toggleEditMode() {
            if (!state.isAdmin) return;
            state.isEditMode = !state.isEditMode;

            if (state.isEditMode) {
                elements.wrapper.classList.add('edit-mode');
                
                // 마스터 권한일 경우 공지사항 편집 모드 활성화
                if (state.role === 'master') {
                    elements.wrapper.classList.add('master-mode-active');
                    const infoLabel = document.getElementById('f3iMasterNoticeInfo');
                    if (infoLabel) infoLabel.style.display = 'block';
                }
                
                elements.editBtn.textContent = '보기';
                elements.saveBtn.disabled = false;
                elements.wrapper.querySelectorAll(inputSelector).forEach(input => {
                    input.readOnly = false;
                });
            } else {
                elements.wrapper.classList.remove('edit-mode');
                elements.wrapper.classList.remove('master-mode-active');
                
                const infoLabel = document.getElementById('f3iMasterNoticeInfo');
                if (infoLabel) infoLabel.style.display = 'none';

                elements.editBtn.textContent = '수정';
                elements.saveBtn.disabled = true;
                elements.wrapper.querySelectorAll(inputSelector).forEach(input => {
                    input.readOnly = true;
                });
                
                // 보기 모드로 전환 시 공지사항 목록 화면으로 리셋
                if (window.NoticeManager) {
                    window.NoticeManager.renderList();
                }
            }
        }

        const accessRole = authenticate();
        if (accessRole === null) return null;

        state.role = accessRole;
        // master나 admin일 경우 편집 권한을 true로 설정
        state.isAdmin = (accessRole === 'master' || accessRole === 'admin');

        window.addEventListener('beforeunload', function(e) {
            if (state.isEditMode) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        elements.wrapper = document.querySelector(wrapperSelector);
        if (!elements.wrapper) return null;

        elements.dateText = document.getElementById(elementId(prefix, 'DateText'));
        elements.prevBtn = document.getElementById(elementId(prefix, 'PrevBtn'));
        elements.nextBtn = document.getElementById(elementId(prefix, 'NextBtn'));
        elements.todayBtn = document.getElementById(elementId(prefix, 'TodayBtn'));
        elements.editBtn = document.getElementById(elementId(prefix, 'EditBtn'));
        elements.saveBtn = document.getElementById(elementId(prefix, 'SaveBtn'));
        elements.excelBtn = document.getElementById(elementId(prefix, 'ExcelBtn'));

        if (state.isAdmin) {
            elements.editBtn.disabled = false;
        }

        const today = utils.getTodayStr();
        state.currentDate = utils.addDays(today, -1);
        elements.dateText.innerText = utils.formatKoDate(state.currentDate);

        let justClosed = false;

        state.fp = flatpickr(`#${elementId(prefix, 'Flatpickr')}`, {
            locale: 'ko',
            dateFormat: 'Y-m-d',
            defaultDate: state.currentDate,
            positionElement: elements.dateText,
            position: 'auto center',
            clickOpens: false,
            onReady: function(selectedDates, dateStr, instance) {
                instance.calendarContainer.style.marginTop = '10px';
            },
            onChange: (dates, str) => {
                if (!confirmLeaveEditMode()) {
                    state.fp.setDate(state.currentDate, false);
                    return;
                }
                setCurrentDate(str);
            },
            onClose: () => {
                justClosed = true;
                setTimeout(() => { justClosed = false; }, 200);
            }
        });

        elements.dateText.addEventListener('click', (e) => {
            e.stopPropagation();
            if (justClosed) return;
            if (state.fp) state.fp.toggle();
        });

        elements.prevBtn.addEventListener('click', () => {
            if (!confirmLeaveEditMode()) return;
            setCurrentDate(utils.addDays(state.currentDate, -1));
        });

        elements.nextBtn.addEventListener('click', () => {
            if (!confirmLeaveEditMode()) return;
            setCurrentDate(utils.addDays(state.currentDate, 1));
        });

        elements.todayBtn.addEventListener('click', () => {
            const todayStr = utils.getTodayStr();
            if (state.currentDate !== todayStr) {
                if (!confirmLeaveEditMode()) return;
                setCurrentDate(todayStr);
            }
        });

        elements.editBtn.addEventListener('click', toggleEditMode);
        elements.excelBtn.addEventListener('click', () => onExportExcel());

        // [수정] 저장 버튼 클릭 시 마스터 권한일 경우 수정된 공지사항도 함께 반영하여 영구저장
        elements.saveBtn.addEventListener('click', () => {
            if (!state.isEditMode) return;
            
            if (state.role === 'master' && window.NoticeManager) {
                window.NoticeManager.saveChanges();
            }
            
            onSave();
        });

        return {
            state,
            elements,
            getCurrentDate: () => state.currentDate,
            isEditMode: () => state.isEditMode,
            confirmLeaveEditMode,
            toggleEditMode,
            setCurrentDate,
            destroy: () => {
                if (state.fp) {
                    state.fp.destroy();
                    state.fp = null;
                }
            }
        };
    }

    return { init };
})();