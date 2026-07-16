/* common_ui.js */
document.addEventListener('DOMContentLoaded', () => {
    // 1. 기존 상단 메뉴 드롭다운 관리자 로직
    const titleWraps = document.querySelectorAll('.gf3-title-wrap, .f3i-title-wrap');

    titleWraps.forEach(wrap => {
        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = wrap.querySelector('.gf3-dropdown, .f3i-dropdown');

            if (dropdown) {
                document.querySelectorAll('.gf3-dropdown.show, .f3i-dropdown.show').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('show');
                    }
                });

                dropdown.classList.toggle('show');
            }
        });
    });

    document.querySelectorAll('.gf3-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.gf3-dropdown.show, .f3i-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });

    // 2. 공지사항 롤링 바 및 상세 모달 인터랙션 관리 모듈
    const NoticeManager = {
        // 초기 샘플용 공지 정의 (마스터가 UI에서 수정 가능)
        defaultNotices: [
            { title: "📢 [공지] 3공장 정기 안전 점검 안내 (금주 금요일)", content: "이번주 금요일 생산 설비 전체 라인 대상 정기 소방 및 안전 점검이 진행됩니다. 작업자분들께서는 사전 정리정돈 부탁드립니다." },
            { title: "🔗 [링크] 자재 실재고 실시간 대조 가이드라인 확인", content: "자재 대조 시 오차가 발생하는 경우 <a href='factory3_contrast.html'>실재고 및 ERP대조</a> 페이지에서 ERP 업로드 수치를 재점검하세요." },
            { title: "🖼️ [참조] 배관 밸브 표준 개폐 현황 이미지 링크", content: "설비실 주 배관 표준 밸브 세팅 예시입니다.<br><br><img src='https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80' alt='밸브 이미지'>" }
        ],
        notices: [],
        currentIdx: 0,
        tickerInterval: null,
        activeDetailIdx: null,

        init: function() {
            // 브라우저 보관함 확인 또는 기본 데이터 저장
            const saved = localStorage.getItem('f3_static_notices');
            if (saved) {
                this.notices = JSON.parse(saved);
            } else {
                this.notices = [...this.defaultNotices];
                localStorage.setItem('f3_static_notices', JSON.stringify(this.notices));
            }

            this.renderTicker();
            this.startTicker();
            this.bindEvents();
            this.renderList();
        },

        // 한줄 공지 목록 생성
        renderTicker: function() {
            const wrapper = document.getElementById('f3iTickerWrapper');
            if (!wrapper) return;
            
            if (this.notices.length === 0) {
                wrapper.innerHTML = `<div class="f3i-ticker-item active" style="color: #8e8e93;">📢 등록된 공지사항이 없습니다.</div>`;
                return;
            }

            wrapper.innerHTML = this.notices.map((n, idx) => `
                <div class="f3i-ticker-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">${n.title}</div>
            `).join('');
            this.currentIdx = 0;
        },

        // 3.5초마다 순차 회전 표출 애니메이션 가동
        startTicker: function() {
            if (this.tickerInterval) clearInterval(this.tickerInterval);
            
            const items = document.querySelectorAll('.f3i-ticker-item');
            if (items.length <= 1) return;

            this.tickerInterval = setInterval(() => {
                if (items.length === 0) return;
                items[this.currentIdx].classList.remove('active');
                this.currentIdx = (this.currentIdx + 1) % items.length;
                items[this.currentIdx].classList.add('active');
            }, 3500);
        },

        // 이벤트 바인딩 처리
        bindEvents: function() {
            const tickerBar = document.getElementById('f3iNoticeTicker');
            const modal = document.getElementById('f3iNoticeModal');
            const closeBtn = document.getElementById('f3iNoticeCloseBtn');
            const backBtn = document.getElementById('f3iNoticeBackBtn');

            if (tickerBar) {
                tickerBar.addEventListener('click', () => {
                    modal.classList.add('show');
                    this.renderList();
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('show');
                });
            }

            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.renderList();
                });
            }
        },

        // 목록형 화면 렌더링 (추가/삭제 동적 처리 포함)
        renderList: function() {
            const body = document.getElementById('f3iNoticeModalBody');
            const title = document.getElementById('f3iNoticeModalTitle');
            const backBtn = document.getElementById('f3iNoticeBackBtn');
            if (!body) return;

            title.innerText = "전체 공지사항 목록";
            if (backBtn) backBtn.style.display = "none";
            this.activeDetailIdx = null;

            // 마스터 권한 및 모드 확인
            const wrapper = document.querySelector('.f3i-wrapper');
            const isMasterMode = wrapper && wrapper.classList.contains('master-mode-active');

            let html = '<div class="f3i-nlist-container" style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
            
            // 공지 목록 리스트 바디 영역 (스크롤 설정)
            html += '<div style="flex: 1; overflow-y: auto;">';
            if (this.notices.length === 0) {
                html += '<div style="text-align: center; color: #8e8e93; padding: 40px 0; font-size: 13px;">등록된 공지사항이 없습니다.</div>';
            } else {
                this.notices.forEach((n, idx) => {
                    html += `
                        <div class="f3i-nlist-item" data-idx="${idx}">
                            <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px;">${n.title}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${isMasterMode ? `<span class="material-symbols-outlined f3i-ndelete-btn" data-delete-idx="${idx}">delete</span>` : ''}
                                <span class="material-symbols-outlined arrow">chevron_right</span>
                            </div>
                        </div>
                    `;
                });
            }
            html += '</div>';

            // 마스터 모드일 경우 하단에 '새 공지사항 추가' 바 렌더링
            if (isMasterMode) {
                html += `
                    <div class="f3i-nadd-wrap">
                        <button type="button" id="f3iNoticeAddBtn" class="f3i-nbtn f3i-nbtn-add">
                            <span class="material-symbols-outlined" style="font-size: 16px;">add</span> 새 공지사항 추가
                        </button>
                    </div>
                `;
            }

            html += '</div>';
            body.innerHTML = html;

            // 상세 보기 전환 이벤트 연결
            body.querySelectorAll('.f3i-nlist-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // 삭제 버튼 클릭이 전파되어 상세보기로 넘어가지 않도록 방지
                    if (e.target.classList.contains('f3i-ndelete-btn')) return;
                    
                    const idx = parseInt(item.getAttribute('data-idx'));
                    this.renderDetail(idx);
                });
            });

            // 마스터 모드 조작 이벤트 리스너 연결
            if (isMasterMode) {
                // 개별 공지 삭제 처리
                body.querySelectorAll('.f3i-ndelete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 목록 클릭 버블링 방지
                        const idx = parseInt(btn.getAttribute('data-delete-idx'));
                        if (confirm('이 공지사항을 정말로 삭제하시겠습니까?')) {
                            this.deleteNotice(idx);
                        }
                    });
                });

                // 새 공지사항 추가 처리
                const addBtn = document.getElementById('f3iNoticeAddBtn');
                if (addBtn) {
                    addBtn.addEventListener('click', () => {
                        this.addNotice();
                    });
                }
            }
        },

        // 새 공지사항 데이터 추가 로직
        addNotice: function() {
            const newNotice = {
                title: "📢 [새 공지] 공지사항 제목을 입력하세요",
                content: "여기에 새로운 공지사항 세부 내용을 입력하세요."
            };
            this.notices.push(newNotice);
            localStorage.setItem('f3_static_notices', JSON.stringify(this.notices));
            
            this.renderTicker();
            this.startTicker();
            
            // 추가 완료 직후 새로 만든 공지사항의 상세 편집 화면으로 즉시 전환하여 편의성 증대
            this.renderDetail(this.notices.length - 1);
        },

        // 공지사항 삭제 로직
        deleteNotice: function(idx) {
            this.notices.splice(idx, 1);
            localStorage.setItem('f3_static_notices', JSON.stringify(this.notices));
            
            // 삭제 후 현재 롤링 중인 인덱스가 범위 밖을 벗어나지 않도록 보정
            if (this.currentIdx >= this.notices.length) {
                this.currentIdx = 0;
            }
            
            this.renderTicker();
            this.startTicker();
            this.renderList(); // 목록 갱신
        },

        // 상세 화면 렌더링 및 에디팅 기능 연결
        renderDetail: function(idx) {
            const body = document.getElementById('f3iNoticeModalBody');
            const title = document.getElementById('f3iNoticeModalTitle');
            const backBtn = document.getElementById('f3iNoticeBackBtn');
            if (!body) return;

            this.activeDetailIdx = idx;
            const targetNotice = this.notices[idx];
            title.innerText = "공지사항 상세 내용";
            if (backBtn) backBtn.style.display = "flex";

            // 마스터 비밀번호로 들어온 경우 contenteditable 속성 부여 여부 검사
            const isMasterMode = document.querySelector('.f3i-wrapper').classList.contains('master-mode-active');
            
            // 마스터 모드일 때에만 하단 이미지 삽입 및 개별 공지 저장 액션바를 표시함
            let editActionsHtml = '';
            if (isMasterMode) {
                editActionsHtml = `
                    <div class="f3i-nedit-actions">
                        <button type="button" id="f3iNoticeImgBtn" class="f3i-nbtn f3i-nbtn-secondary">
                            <span class="material-symbols-outlined" style="font-size: 16px;">image</span> 이미지 링크 삽입
                        </button>
                        <button type="button" id="f3iNoticeSaveBtn" class="f3i-nbtn f3i-nbtn-primary">
                            <span class="material-symbols-outlined" style="font-size: 16px;">save</span> 이 공지만 저장
                        </button>
                    </div>
                `;
            }

            body.innerHTML = `
                <div class="f3i-ndetail-wrapper" style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                    <div style="flex: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column;">
                        <h3 id="f3iEditTitle" class="${isMasterMode ? 'f3i-nedit-target' : ''}" 
                            contenteditable="${isMasterMode}" style="margin: 0; padding: 4px 0;">${targetNotice.title}</h3>
                        <hr style="border:0; border-top:1px solid #e5e5ea; margin:12px 0;">
                        <div id="f3iEditContent" class="f3i-ndetail-content ${isMasterMode ? 'f3i-nedit-target' : ''}" 
                             contenteditable="${isMasterMode}" style="flex: 1; min-height: 180px; outline: none;">${targetNotice.content}</div>
                    </div>
                    ${editActionsHtml}
                </div>
            `;

            // 마스터 모드 전용 액션바 스크립트 연결
            if (isMasterMode) {
                const imgBtn = document.getElementById('f3iNoticeImgBtn');
                const saveBtn = document.getElementById('f3iNoticeSaveBtn');

                // 이미지 삽입 팝업 처리
                if (imgBtn) {
                    imgBtn.addEventListener('click', () => {
                        const url = prompt("삽입할 이미지 링크(URL)를 입력해주세요:");
                        if (url && url.trim() !== "") {
                            const editContent = document.getElementById('f3iEditContent');
                            if (editContent) {
                                editContent.focus();
                                const imgHtml = `<br><img src="${url.trim()}" alt="첨부 이미지"><br>`;
                                try {
                                    // 사용자가 지정한 텍스트 입력 창 내부 커서 포지션에 맞추어 태그 자동 주입
                                    if (!document.execCommand('insertHTML', false, imgHtml)) {
                                        editContent.innerHTML += imgHtml;
                                    }
                                } catch (e) {
                                    // 호환성 이슈 대비 예외 처리: 커서 정보 손실 시 본문 끝단에 추가
                                    editContent.innerHTML += imgHtml;
                                }
                            }
                        }
                    });
                }

                // 개별 공지만 즉시 단독 저장
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        this.saveChanges();
                    });
                }
            }
        },

        // 입력된 공지 정보를 취합하여 단독 영구 저장 처리 진행
        saveChanges: function() {
            if (this.activeDetailIdx === null) return;
            
            const editTitle = document.getElementById('f3iEditTitle');
            const editContent = document.getElementById('f3iEditContent');

            if (editTitle && editContent) {
                this.notices[this.activeDetailIdx].title = editTitle.innerText.trim();
                this.notices[this.activeDetailIdx].content = editContent.innerHTML.trim();
                
                localStorage.setItem('f3_static_notices', JSON.stringify(this.notices));
                this.renderTicker();
                this.startTicker();
                alert('공지사항 변경 사항이 성공적으로 독립 저장되었습니다.');
            }
        }
    };

    window.NoticeManager = NoticeManager;
    NoticeManager.init();
});