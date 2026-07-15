/* common_ui.js */
document.addEventListener('DOMContentLoaded', () => {
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

    // 서브메뉴(.gf3-submenu) 클릭 시 드롭다운이 닫히지 않도록 이벤트 전파 차단
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
});
