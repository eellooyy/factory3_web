/* factory1_ft_constant.js */
window.Factory1Ft = window.Factory1Ft || {};

window.Factory1Ft.Constants = {
    TABLE_NAME: 'factory1_ft_real', // 1공장 Supabase 테이블명
    PREFIX: 'f1ft',
    // DB 컬럼과 매핑될 그룹 및 필드 정의 (필요 시 확장 가능)
    GROUPS: ['A', 'C', 'D'],
    FIELDS: ['diff', 'memo'] 
};