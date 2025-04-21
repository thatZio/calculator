// 地块选择列表
export const BLOCK_OPTIONS = [
    { value: "A", label: "欣泰3座" },
    { value: "B", label: "河南29、32、35座" },
    { value: "C", label: "河南33座" },
    { value: "D", label: "河南34座" }
];

// 生成地块选择下拉列表的HTML
export function generateBlockSelectOptions(defaultLabel = "选择地块 (默认同住宅)") {
    return `
        <option value="" disabled selected>${defaultLabel}</option>
        ${BLOCK_OPTIONS.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('')}
    `;
} 