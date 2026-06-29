/* common_ui.js */
document.addEventListener('DOMContentLoaded', () => {
    // 모든 타이틀(햄버거 메뉴 포함 영역)을 찾습니다.
    const titleWraps = document.querySelectorAll('.gf3-title-wrap');
    
    titleWraps.forEach(wrap => {
        wrap.addEventListener('click', (e) => {
            e.stopPropagation(); // 이벤트 버블링 방지
            const dropdown = wrap.querySelector('.gf3-dropdown');
            
            if (dropdown) {
                // 현재 클릭한 메뉴 외에 다른 메뉴가 열려있다면 닫아줍니다.
                document.querySelectorAll('.gf3-dropdown.show').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('show');
                    }
                });
                
                // 클릭한 메뉴 토글
                dropdown.classList.toggle('show');
            }
        });
    });

    // 화면의 빈 공간을 클릭하면 열려있는 모든 드롭다운 메뉴를 닫습니다.
    document.addEventListener('click', () => {
        document.querySelectorAll('.gf3-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
});