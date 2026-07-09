/* factory1_ft_main.js */
(function() {
    'use strict';
    
    const Api = window.Factory1Ft.Api;
    const Render = window.Factory1Ft.Render;

    const Factory1FtModule = {
        headerApi: null,
        
        // 모듈 초기화 (화면 전환 시 호출됨)
        init: function() {
            // 3공장 헤더 API 연동 (날짜 변경, 저장, 엑셀 콜백 바인딩)
            this.headerApi = window.Factory3Header.init({
                idPrefix: 'f1ft', // 1공장 컨트롤 ID 접두사
                wrapperSelector: '.f1ft-wrapper',
                inputSelector: '.f1ft-td.editable .f1ft-input',
                onDateChange: this.loadData.bind(this),
                onSave: this.handleSave.bind(this),
                onExportExcel: this.exportToExcel.bind(this)
            });
            
            if (!this.headerApi) return;

            const wrapper = document.querySelector('.f1ft-wrapper');
            if (wrapper) {
                Render.bindInputFormatters(wrapper);
                Render.bindKeyboardNavigation(wrapper);
            }

            // 초기 데이터 조회
            this.loadData(this.headerApi.getCurrentDate());
        },

        // 데이터 불러오기 로직
        loadData: async function(dateStr) {
            const data = await Api.fetchData(dateStr);
            Render.updateUI(data);
        },

        // 저장 버튼 클릭 시 실행
        handleSave: async function() {
            const dateStr = this.headerApi.getCurrentDate();
            const payload = { date: dateStr };
            
            // 화면의 인풋 데이터를 DB 컬럼 형태로 수집
            document.querySelectorAll('.f1ft-wrapper .f1ft-input').forEach(input => {
                const field = input.dataset.field;
                const group = input.dataset.group;
                
                if (field) {
                    const column = group ? `${group.toLowerCase()}_${field}` : field;
                    // 메모는 텍스트 그대로, 숫자는 parseNum 처리
                    payload[column] = input.classList.contains('memo-input') 
                        ? input.value 
                        : Render.parseNum(input.value);
                }
            });

            try {
                await Api.saveData(payload);
                alert('1공장 FT 일지가 저장되었습니다.');
                this.headerApi.toggleEditMode(); // 저장 후 읽기 모드로 복귀
                this.loadData(dateStr);
            } catch(e) {
                alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        },

        // 엑셀 출력 로직
        exportToExcel: function() {
            alert('1공장 엑셀 출력 기능은 준비 중입니다.');
        },

        // 화면 전환 시 모듈 파괴 (이벤트 및 달력 해제용)
        destroy: function() {
            if (this.headerApi) {
                this.headerApi.destroy();
                this.headerApi = null;
            }
        }
    };

    // 전역 변수 등록 (3공장 통합 HTML에서 스위칭할 때 호출하기 위함)
    window.Factory1FtModule = Factory1FtModule;
})();