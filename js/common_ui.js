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

    document.addEventListener('click', () => {
        document.querySelectorAll('.gf3-dropdown.show, .f3i-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
});
