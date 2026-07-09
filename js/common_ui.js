/* common_ui.js */
document.addEventListener('DOMContentLoaded', () => {
    // 1. 드롭다운 토글 기능
    const titleWraps = document.querySelectorAll('.gf3-title-wrap');
    titleWraps.forEach(wrap => {
        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = wrap.querySelector('.gf3-dropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.gf3-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });

    // 2. 화면 스위칭 (라우팅) 기능
    document.querySelectorAll('.gf3-dropdown .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 수정 모드일 때 탭 이동 방지
            if (window.Factory3Header && window.Factory3Header.isEditMode()) {
                if (!confirm('수정 모드입니다. 저장하지 않고 다른 일지로 이동하시겠습니까?')) return;
                window.Factory3Header.toggleEditMode(); // 강제 보기모드 전환
            }

            const targetId = link.getAttribute('data-target');
            const title = link.innerText;

            // UI 텍스트 및 활성화 변경
            document.getElementById('globalMainTitle').innerText = title;
            document.querySelectorAll('.gf3-dropdown .nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 컨테이너 교체
            document.querySelectorAll('.page-container').forEach(c => {
                c.classList.remove('active');
                setTimeout(() => c.style.display = 'none', 0); // 화면 깜빡임 방지
            });
            document.getElementById(targetId).style.display = 'block';
            document.getElementById(targetId).classList.add('active');

            // 각 모듈 재초기화 및 데이터 바인딩
            if(targetId === 'f3i-container') {
                window.Factory3IljiModule.init();
            } else if(targetId === 'f1ft-container') {
                window.Factory1FtModule.init();
            }
        });
    });
});