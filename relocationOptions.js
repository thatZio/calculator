// 安置方式选项
export const RELOCATION_TYPES = [
    { value: "original", label: "原拆原迁" },
    { value: "monetary", label: "纯货币" },
    { value: "remote", label: "异地安置" }
];

// 异地安置区域类型
export const REMOTE_AREA_TYPES = [
    { value: "gulou_existing", label: "鼓楼（现房）" },
    { value: "gulou_1st2nd_existing", label: "鼓楼（一楼二楼现房）" },
    { value: "gulou_future", label: "鼓楼（期房）" },
    { value: "jinan_cangshan_existing", label: "晋安仓山（现房）" },
    { value: "jinan_cangshan_future", label: "晋安仓山（期房）" }
];

// 楼盘信息：名称、对接价、可选房型
export const REMOTE_PROPERTIES = {
    "gulou_existing": [
        { value: "poly_tianyue", label: "保利天悦花园", price: 16300, sizes: [105] },
        { value: "hengli_bona", label: "恒力博纳广场", price: 12538, sizes: [60, 75, 105] },
        { value: "chengxiang_fang", label: "丞相坊小区", price: 8878, sizes: [120, 135] },
        { value: "huilu_xinyuan", label: "灰炉新苑", price: 14882, sizes: [105] },
        { value: "fenghu_xc_3", label: "凤湖新城三区", price: 11886, sizes: [120] },
        { value: "fenghu_xc_2", label: "凤湖新城二区", price: 11886, sizes: [90, 105] },
        { value: "fenghu_xc_1", label: "凤湖新城一区", price: 11886, sizes: [120, 135] },
        { value: "yangqiao_xinyuan", label: "杨桥新苑", price: 14541, sizes: [105] },
        { value: "fengwu_jiayuan", label: "风舞家园", price: 10086, sizes: [135] },
        { value: "lanwei_jingju", label: "兰尾景居", price: 18618, sizes: [60, 135] },
        { value: "qunsheng_shanyue", label: "群升山悦居", price: 18527, sizes: [75, 90, 120] },
        { value: "zhengxiang_xijiang", label: "正祥西江月", price: 18618, sizes: [120] },
        { value: "longting_jiayuan", label: "龙庭嘉园", price: 18727, sizes: [120, 135] },
        { value: "yunju_gongguan", label: "云巨盛公馆", price: 19218, sizes: [45, 60, 75] },
        { value: "hengyu_zunxi", label: "恒宇尊禧", price: 17600, sizes: [45, 75] },
        { value: "puchen_gongguan", label: "璞宸公馆", price: 18527, sizes: [] }
    ],
    "gulou_1st2nd_existing": [
        { value: "chengxiang_fang", label: "丞相坊小区", price: 6342, sizes: [120, 135] },
        { value: "fenghu_xc_3", label: "凤湖新城三区", price: 8915, sizes: [120] },
        { value: "fenghu_xc_2", label: "凤湖新城二区", price: 8915, sizes: [90, 105] },
        { value: "fenghu_xc_1", label: "凤湖新城一区", price: 8915, sizes: [120, 135] },
        { value: "yangqiao_xinyuan", label: "杨桥新苑", price: 10906, sizes: [105] },
        { value: "fengwu_jiayuan", label: "风舞家园", price: 7565, sizes: [135] }
    ],
    "gulou_future": [
        { value: "xingcheng_huayuan", label: "兴城花园", price: 18618, sizes: [45, 60, 75, 90, 105, 120, 135] },
        { value: "haichao_jiayuan", label: "海潮佳苑", price: 18727, sizes: [45, 60, 75, 90, 105, 120] },
        { value: "dongda_yayuan", label: "东大雅苑", price: 19218, sizes: [45, 60, 105] },
        { value: "pinxi_huayuan", label: "屏西花园", price: 17600, sizes: [120, 135] }
    ],
    "jinan_cangshan_existing": [
        { value: "shimao_qt_1", label: "世茂泉头新苑一区", price: 12182, sizes: [105, 135] },
        { value: "shimao_qt_2", label: "世茂泉头新苑二区", price: 12182, sizes: [105, 120] },
        { value: "yingfu_yihao", label: "盈福壹号", price: 12009, sizes: [90, 105, 120, 135] },
        { value: "xinrong_jiangjun", label: "新榕金江郡", price: 12382, sizes: [75, 120, 135] }
    ],
    "jinan_cangshan_future": [
        { value: "yunjin_gongguan", label: "云锦公馆", price: 10525, sizes: [120, 135] },
        { value: "gaozhai_huayuan", label: "高宅花园", price: 14600, sizes: [45, 60, 90] },
        { value: "hualin_xinyuan", label: "华林新苑", price: 15055, sizes: [45, 60, 90] }
    ]
};

// 生成安置方式选择的HTML
export function generateRelocationTypeOptions() {
    return `
        <option value="${RELOCATION_TYPES[0].value}" selected>${RELOCATION_TYPES[0].label}</option>
        ${RELOCATION_TYPES.slice(1).map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('')}
    `;
}

// 生成区域类型选择的HTML
export function generateRemoteAreaOptions(defaultLabel = "请选择区域类型") {
    return `
        <option value="" disabled selected>${defaultLabel}</option>
        ${REMOTE_AREA_TYPES.map(option => 
            `<option value="${option.value}">${option.label}</option>`
        ).join('')}
    `;
}

// 根据区域类型生成楼盘选择的HTML
export function generatePropertyOptions(areaType, defaultLabel = "请选择楼盘") {
    if (!REMOTE_PROPERTIES[areaType]) {
        return `<option value="" disabled selected>${defaultLabel}</option>`;
    }
    
    return `
        <option value="" disabled selected>${defaultLabel}</option>
        ${REMOTE_PROPERTIES[areaType].map(property => 
            `<option value="${property.value}" data-price="${property.price}">${property.label}</option>`
        ).join('')}
    `;
}

// 获取指定楼盘的可用房型
export function getAvailableSizes(areaType, propertyValue) {
    if (!REMOTE_PROPERTIES[areaType]) return [];
    
    const property = REMOTE_PROPERTIES[areaType].find(p => p.value === propertyValue);
    return property ? property.sizes : [];
}

// 获取指定楼盘的价格
export function getPropertyPrice(areaType, propertyValue) {
    if (!REMOTE_PROPERTIES[areaType]) return 0;
    
    const property = REMOTE_PROPERTIES[areaType].find(p => p.value === propertyValue);
    return property ? property.price : 0;
} 