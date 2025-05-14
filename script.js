// 导入配置和常量
import { HOUSING_PRICE, HOUSING_SIZES, MIN_HOUSING_EQUIVALENT_AREA, MAX_PUBLIC_AREA, MONETARY_REWARD_RATE, PUBLIC_AREA_DIFF_HOUSING, PUBLIC_AREA_DIFF_CASH, COMPLETE_APT_RATE, SETTLING_RATE, MOVING_RATE_BASE, TRANSITION_RATE, TRANSITION_MONTHS_HOUSING, TRANSITION_MONTHS_CASH, RENTAL_SUBSIDY, PUBLIC_HOUSING_FACTOR, MIN_MOVING_1, MIN_MOVING_2 } from './config.js';
import { BLOCK_RATES } from './blockRates.js';
import { BLOCK_OPTIONS, generateBlockSelectOptions } from './blockOptions.js';
import { generateRelocationTypeOptions, generateRemoteAreaOptions, generatePropertyOptions, getAvailableSizes, getPropertyPrice } from './relocationOptions.js';

// --- Exportable Helper Functions ---
export const roundUpToTier = (area) => { 
    // Use constants directly available in this scope if they were global/imported
    // Assuming HOUSING_SIZES and MIN_HOUSING_EQUIVALENT_AREA are available 
    // (Need to ensure they are imported or defined globally in script.js if not already)
    // For now, let's redefine them here for robustness in case script.js structure changes
    const LOCAL_HOUSING_SIZES = [45, 60, 75, 90, 105, 120, 135, 150, 180]; 
    const LOCAL_MIN_HOUSING_EQUIVALENT_AREA = 30;

    if (area < LOCAL_MIN_HOUSING_EQUIVALENT_AREA) return 0; 
    const potentialTiers = LOCAL_HOUSING_SIZES.filter(tier => tier > 0).sort((a, b) => a - b); 
    let previousTier = 0; 
    if (area >= LOCAL_MIN_HOUSING_EQUIVALENT_AREA && area <= potentialTiers[0]) { 
        return potentialTiers[0]; 
    } 
    for (const tier of potentialTiers) { 
        if (area === tier) return tier; 
        if (area > previousTier && area < tier) { 
            if (Math.abs(area - previousTier) < 0.001) return previousTier; 
            return tier; 
        } 
        if (area > tier) { 
            previousTier = tier; 
            continue; 
        } 
        if (area <= previousTier) { 
            if (Math.abs(area - previousTier) < 0.001) return previousTier; 
            return previousTier; 
        } 
    } 
    if (area > Math.max(...potentialTiers)) return 180; // Assuming 180 is always max tier
    return Math.max(...potentialTiers); 
};

document.addEventListener('DOMContentLoaded', () => {

    // --- Password Protection ---
    const correctPassword = "antai";
    let isAuthenticated = false;
    function checkPassword() { const enteredPassword = prompt("请输入访问口令:"); if (enteredPassword === correctPassword) { isAuthenticated = true; const mainContent = document.getElementById('main-content'); if (mainContent) { mainContent.style.display = 'block'; } initializeApp(); } else if (enteredPassword !== null) { alert("口令错误！请刷新页面重试。"); } else { alert("已取消访问。"); } }
    checkPassword();

    // --- Application Initialization ---
    function initializeApp() {
        if (!isAuthenticated) return;

        // --- DOM Elements ---
        const residenceBlockTypeSelect = document.getElementById('residence-block-type');
        const residentialAreaInput = document.getElementById('residential-area');
        const storageInputsContainer = document.getElementById('storage-inputs-container');
        const addStorageButton = document.getElementById('add-storage-button');
        const decorationFeeInput = document.getElementById('decoration-fee');
        const publicHousingYesRadio = document.getElementById('public-housing-yes');
        const calculateButton = document.getElementById('calculate-button');
        const inputError = document.getElementById('input-error');
        const relocationTypeSelect = document.getElementById('relocation-type');
        const remoteOptionsDiv = document.getElementById('remote-options');
        const remoteAreaTypeSelect = document.getElementById('remote-area-type');
        
        // 初始化地块选择下拉列表
        function initializeBlockSelects() {
            const blockSelects = document.querySelectorAll('.block-select');
            blockSelects.forEach(select => {
                select.innerHTML = generateBlockSelectOptions();
            });
        }
        
        // 初始化安置方式下拉列表
        function initializeRelocationTypeSelect() {
            relocationTypeSelect.innerHTML = generateRelocationTypeOptions();
        }
        
        // 初始化区域类型下拉列表
        function initializeRemoteAreaTypeSelect() {
            remoteAreaTypeSelect.innerHTML = generateRemoteAreaOptions();
        }
        
        // 安置方式改变时的处理
        function handleRelocationTypeChange() {
            const selectedValue = relocationTypeSelect.value;
            
            if (selectedValue === 'remote') {
                remoteOptionsDiv.classList.remove('hidden');
            } else {
                remoteOptionsDiv.classList.add('hidden');
            }
        }
        
        // 区域类型改变时的处理
        function handleRemoteAreaTypeChange() {
            // 当前不需要进一步显示楼盘选择
            // 这个在计算结果时再生成具体楼盘选项
        }
        
        // 初始化安置方式相关的下拉列表
        initializeRelocationTypeSelect();
        initializeRemoteAreaTypeSelect();
        
        // 添加事件监听器
        relocationTypeSelect.addEventListener('change', handleRelocationTypeChange);
        remoteAreaTypeSelect.addEventListener('change', handleRemoteAreaTypeChange);
        
        // 其他现有初始化
        initializeBlockSelects();

        // --- DOM Elements (for Scenario Display) ---
        const scenarioListSection = document.getElementById('scenario-list-section');
        const scenarioListUl = document.getElementById('scenario-list');
        const compareSelectedButton = document.getElementById('compare-selected-button');
        const compareInstructions = document.getElementById('compare-instructions');
        const scenarioDetailSection = document.getElementById('scenario-detail-section');
        const scenarioTitle = document.getElementById('scenario-title');
        const scenarioSummary = document.getElementById('scenario-summary');
        const toggleDetailsButton = document.getElementById('toggle-details-button');
        const scenarioBreakdown = document.getElementById('scenario-breakdown');
        const breakdownList = document.getElementById('breakdown-list');
        const storageAdviceButton = document.getElementById('storage-advice-button');
        const overDeadlineButton = document.getElementById('over-deadline-button');
        const storageAdviceContent = document.getElementById('storage-advice-content');
        const adviceText = document.getElementById('advice-text');
        const overDeadlineContent = document.getElementById('over-deadline-content');
        const overDeadlineComparison = document.getElementById('over-deadline-comparison');
        const overDeadlineLossSummary = document.getElementById('over-deadline-loss-summary');
        const overDeadlineLossDetails = document.getElementById('over-deadline-loss-details');
        const overDeadlineLossDetailsList = document.getElementById('over-deadline-loss-details-list');
        const overDeadlineShowLossDetailsButton = document.getElementById('over-deadline-show-loss-details-button');
        const backToListButton = document.getElementById('back-to-list-button');
        const comparisonSection = document.getElementById('comparison-section');
        const comparisonTableContainer = document.getElementById('comparison-table-container');
        const comparisonLossSummary = document.getElementById('comparison-loss-summary');
        const comparisonLossDetails = document.getElementById('comparison-loss-details');
        const lossDetailsList = document.getElementById('loss-details-list');
        const showLossDetailsButton = document.getElementById('show-loss-details-button');
        const closeComparisonButton = document.getElementById('close-comparison-button');

        // --- Constants & Rates ---
        const HOUSING_PRICE = 18664; const HOUSING_SIZES = [45, 60, 75, 90, 105, 120, 135, 150, 180]; const MIN_HOUSING_EQUIVALENT_AREA = 30; const MAX_PUBLIC_AREA = 10; const MONETARY_REWARD_RATE = 272; const PUBLIC_AREA_DIFF_HOUSING = 1900; const PUBLIC_AREA_DIFF_CASH = MONETARY_REWARD_RATE; const COMPLETE_APT_RATE = 420; const SETTLING_RATE = 50; const MOVING_RATE_BASE = 15; const TRANSITION_RATE = 15; const TRANSITION_MONTHS_HOUSING = 39; const TRANSITION_MONTHS_CASH = 6; const RENTAL_SUBSIDY = 20000; const PUBLIC_HOUSING_FACTOR = -0.2; const MIN_MOVING_1 = 1000; const MIN_MOVING_2 = 2000;
        const BLOCK_RATES = { A: { locationRate: 15942, structureRate: 570, oldHouseRate: 2660 }, B: { locationRate: 14864, structureRate: 1150, oldHouseRate: 1500 }, C: { locationRate: 14864, structureRate: 1087.5, oldHouseRate: 1625 }, D: { locationRate: 14864, structureRate: 1022, oldHouseRate: 1755 }, };

        let currentScenarios = [];
        let currentInputs = {};
        let currentLossDetails = [];

        // --- Helper Functions ---
        const round = (value, decimals) => { if (typeof value !== 'number' || isNaN(value)) return 0; const multiplier = Math.pow(10, decimals || 0); return Math.round(value * multiplier + Number.EPSILON) / multiplier; };
        const formatMoney = (amount) => { if (typeof amount !== 'number' || isNaN(amount)) return '0'; return Math.round(amount).toLocaleString('zh-CN'); };
        const formatArea = (area) => { if (typeof area !== 'number' || isNaN(area)) return '0.00'; return area.toFixed(2); };
        const formatPreciseArea = (area) => { if (typeof area !== 'number' || isNaN(area)) return '0.00'; return area.toString(); };
        const formatRate = (rate) => { if (typeof rate !== 'number' || isNaN(rate)) return '0'; return Number(rate.toFixed(4)).toLocaleString('zh-CN'); };
        const getRates = (blockType) => BLOCK_RATES[blockType] || BLOCK_RATES['B'];

        // --- Dynamic Input Handling ---
        const createStorageInputRow = () => { 
            const row = document.createElement('div'); 
            row.className = 'storage-input-row'; 
            
            const areaInput = document.createElement('input'); 
            areaInput.type = 'number'; 
            areaInput.className = 'storage-area'; 
            areaInput.placeholder = '面积(㎡)'; 
            areaInput.step = '0.01'; 
            areaInput.min = '0'; 
            
            const blockSelect = document.createElement('select'); 
            blockSelect.className = 'storage-block-type block-select'; 
            blockSelect.innerHTML = generateBlockSelectOptions('选择地块 (默认同住宅)'); 
            
            const removeButton = document.createElement('button'); 
            removeButton.type = 'button'; 
            removeButton.className = 'remove-storage-button'; 
            removeButton.textContent = '移除'; 
            removeButton.addEventListener('click', () => { 
                row.remove(); 
                const remainingRows = storageInputsContainer.querySelectorAll('.storage-input-row'); 
                if (remainingRows.length === 1) { 
                    const firstRemoveButton = remainingRows[0].querySelector('.remove-storage-button'); 
                    if (firstRemoveButton) firstRemoveButton.style.display = 'none'; 
                } 
            }); 
            
            const existingRowCount = storageInputsContainer.querySelectorAll('.storage-input-row').length; 
            if (existingRowCount > 0) { 
                removeButton.style.display = 'inline-block'; 
                const firstRow = storageInputsContainer.querySelector('.storage-input-row'); 
                if(firstRow){ 
                    const firstRemoveBtn = firstRow.querySelector('.remove-storage-button'); 
                    if(firstRemoveBtn && firstRemoveBtn.style.display === 'none'){ 
                        firstRemoveBtn.style.display = 'inline-block'; 
                    } 
                } 
            } else { 
                removeButton.style.display = 'none'; 
            } 
            
            row.appendChild(areaInput); 
            row.appendChild(blockSelect); 
            row.appendChild(removeButton); 
            
            return row; 
        };
        addStorageButton.addEventListener('click', () => { if (storageInputsContainer) { storageInputsContainer.appendChild(createStorageInputRow()); } else { console.error("Storage container not found"); } });

        // --- Core Calculation Logic ---
        const calculateCompensation = (inputs) => { 
            // ... (Initial setup: getRates, calculate confirmedAreaPrecise, publicCompArea etc.)
            const { resArea, storageInputs, resBlock, isPublicHousing, decorationFee } = inputs;
            const resRates = getRates(resBlock);
            let totalEffectiveStorageAreaRounded = 0;
            storageInputs.forEach(stor => { totalEffectiveStorageAreaRounded += round(stor.rawArea * 0.5, 2); });
            const confirmedAreaPrecise = resArea + totalEffectiveStorageAreaRounded;
            const confirmedArea = round(confirmedAreaPrecise, 2);
            const publicCompAreaUncapped = round(confirmedAreaPrecise * 0.1, 2);
            const publicCompArea = Math.min(publicCompAreaUncapped, MAX_PUBLIC_AREA);
            inputs.confirmedArea = confirmedArea;
            inputs.confirmedAreaPrecise = confirmedAreaPrecise;
            inputs.publicCompArea = publicCompArea;
            inputs.resRates = resRates;
            
            let scenarios = []; 
            const { housingEligibleComp, totalStructureComp } = calculateHousingEligibleCompAndStructure(inputs);
            inputs.housingEligibleComp = housingEligibleComp; 
            inputs.totalStructureComp = totalStructureComp;
             
            let equivalentArea = 0; 
            if (resBlock === 'A') { 
                equivalentArea = housingEligibleComp > 0 ? round(housingEligibleComp / HOUSING_PRICE, 2) : 0; 
            } else { 
                equivalentArea = round(confirmedAreaPrecise + round(confirmedAreaPrecise * 0.1, 2), 2); 
            } 
            inputs.equivalentArea = equivalentArea;
            inputs.relocationRewardTiered = calculateRelocationReward(confirmedArea);
            inputs.publicHousingDeductionAmount = calculatePublicDeduction(isPublicHousing, confirmedAreaPrecise, resRates);

            // --- REMOVE PURE CASH CALCULATION FROM HERE ---
            // // if (equivalentArea < MIN_HOUSING_EQUIVALENT_AREA) { 
            // //     console.log(`Equivalent area ${equivalentArea} is less than ${MIN_HOUSING_EQUIVALENT_AREA}, only Pure Monetary allowed.`); 
            // //     scenarios.push(calculatePureCash(inputs)); 
            // //     return scenarios; // Return only cash if below threshold
            // // }
            // scenarios.push(calculatePureCash(inputs)); // Don't add pure cash here anymore
            
            // --- Generate Housing Scenarios ---
            if (equivalentArea >= MIN_HOUSING_EQUIVALENT_AREA) {
                const resettlementArea = roundUpToTier(equivalentArea);
                inputs.resettlementArea = resettlementArea;
            
                if (resettlementArea > 0) { 
                    const maxHousingCombinations = findHousingCombinations(resettlementArea); 
                    // ... (generate Max Housing scenarios) ...
                    if (maxHousingCombinations.length > 0) { for (const combo of maxHousingCombinations) { scenarios.push(calculateMaxHousing(inputs, resettlementArea, combo)); } } else { scenarios.push(calculateMaxHousing(inputs, resettlementArea, [])); }
                } 
                for (const size of HOUSING_SIZES) { 
                    const selectedHouseValue = size * HOUSING_PRICE; 
                    if (housingEligibleComp >= selectedHouseValue - 1) { 
                        scenarios.push(calculateOneHousePlusCash(inputs, size)); 
                    } 
                } 
                const n_sizes = HOUSING_SIZES.length; 
                for (let i = 0; i < n_sizes; i++) { 
                    for (let j = i; j < n_sizes; j++) { 
                        const combo = [HOUSING_SIZES[i], HOUSING_SIZES[j]]; 
                        const selectedTotalArea = combo[0] + combo[1]; 
                        const selectedHouseValue = selectedTotalArea * HOUSING_PRICE; 
                        if (selectedTotalArea > resettlementArea + 1) continue; 
                        if (housingEligibleComp >= selectedHouseValue - 1) { 
                            if (scenarios.some(s => s.type === "Max Housing" && Math.abs(s.selectedArea - selectedTotalArea) < 0.01)) { continue; } 
                            scenarios.push(calculateTwoHousesPlusCash(inputs, combo)); 
                        } 
                    } 
                }
            } else {
                // If equivalent area is too low, NO housing options are possible for original relocation.
                // We might want to add a message here, but calculateCompensation should return an empty array.
                console.log(`Equivalent area ${equivalentArea} too low for any original housing options.`);
            }
            
            // --- Filter and Sort Housing Scenarios ---
            const uniqueScenarios = []; 
            const seenSignatures = new Set(); 
            const maxHousingCombos = new Map(); 
            scenarios.filter(s => s.type === "Max Housing").forEach(s => { maxHousingCombos.set(round(s.selectedArea, 2), s.combo ? [...s.combo].sort((a, b) => a - b).join('-') : 'none'); }); 
            for (const s of scenarios) { 
                let comboString = s.combo && s.combo.length > 0 ? [...s.combo].sort((a, b) => a - b).join('-') : 'none'; 
                const signature = `${s.type}_${comboString}`; 
                if ((s.type === "1 House + Cash" || s.type === "2 Houses + Cash") && maxHousingCombos.has(round(s.selectedArea, 2))) { continue; } 
                if (!seenSignatures.has(signature)) { 
                    uniqueScenarios.push(s); 
                    seenSignatures.add(signature); 
                } 
            } 
            uniqueScenarios.sort((a, b) => { 
                // ... (existing sorting logic) ... 
                const categoryOrder = { "Max Housing": 1, "1 House + Cash": 2, "2 Houses + Cash": 3 }; /* Removed Pure Monetary */
                 const orderA = categoryOrder[a.type] || 99; const orderB = categoryOrder[b.type] || 99; if (orderA !== orderB) return orderA - orderB; if (a.type === 'Max Housing') return b.selectedArea - a.selectedArea; if (a.type === '1 House + Cash') return b.selectedArea - a.selectedArea; if (a.type === '2 Houses + Cash') { if (b.selectedArea !== a.selectedArea) return b.selectedArea - a.selectedArea; return Math.max(...(b.combo || [0])) - Math.max(...(a.combo || [0])); } return 0; 
            }); 
            
            return uniqueScenarios; // Return only housing scenarios
        };

        const calculateRelocationReward = (confirmedArea) => { if (confirmedArea >= 90) return 30000; if (confirmedArea >= 60) return 25000; return 20000; };
        const calculatePublicDeduction = (isPublicHousing, confirmedAreaPrecise, resRates) => { return isPublicHousing ? round(confirmedAreaPrecise * resRates.locationRate * PUBLIC_HOUSING_FACTOR, 0) : 0; };
        const calculateHousingEligibleCompAndStructure = (inputs) => { const { resArea, storageInputs, confirmedAreaPrecise, publicCompArea, resBlock, resRates } = inputs; let housingEligibleComp = 0; let totalStructureComp = 0; const resBaseValue = resArea * (resRates.locationRate + resRates.oldHouseRate); const resStructureComp = resArea * resRates.structureRate; housingEligibleComp += resBaseValue + resStructureComp; totalStructureComp += resStructureComp; storageInputs.forEach((stor) => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; const storBaseValue = preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate); const storStructureComp = preciseEffectiveArea * storRates.structureRate; housingEligibleComp += storBaseValue + storStructureComp; totalStructureComp += storStructureComp; }); const publicCompValue = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING); housingEligibleComp += publicCompValue; const completeAptComp = confirmedAreaPrecise * COMPLETE_APT_RATE; housingEligibleComp += completeAptComp; return { housingEligibleComp: round(housingEligibleComp, 2), totalStructureComp: round(totalStructureComp, 2) }; };
        const findHousingCombinations = (targetArea) => { if (targetArea <= 0) return []; let combinations = []; const n = HOUSING_SIZES.length; const tolerance = 0.01; HOUSING_SIZES.forEach(size => { if (Math.abs(size - targetArea) < tolerance) { if (!combinations.some(c => c.length === 1 && c[0] === size)) { combinations.push([size]); } } }); for (let i = 0; i < n; i++) { for (let j = i; j < n; j++) { const size1 = HOUSING_SIZES[i]; const size2 = HOUSING_SIZES[j]; const combo = [size1, size2].sort((a,b)=>a-b); const comboSum = size1 + size2; if (Math.abs(comboSum - targetArea) < tolerance) { const alreadyAdded = combinations.some(existing => existing.length === 2 && existing[0] === combo[0] && existing[1] === combo[1] ); if (!alreadyAdded) { combinations.push(combo); } } } } combinations.sort((a, b) => { if (a.length !== b.length) return a.length - b.length; if (a.length === 1) return 0; const maxA = Math.max(...a); const maxB = Math.max(...b); if (maxB !== maxA) return maxB - maxA; return Math.min(...b) - Math.min(...a); }); return combinations; };
        const calculatePureCash = (inputs) => { const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, relocationRewardTiered, publicHousingDeductionAmount, housingEligibleComp, decorationFee } = inputs; let breakdown = []; let currentTotal = 0; const comp1 = resArea * resRates.locationRate; breakdown.push({ name: `住宅区位补偿 (${resBlock}地块)`, value: comp1, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.locationRate)}/㎡` }); currentTotal += comp1; const comp2 = resArea * resRates.oldHouseRate; breakdown.push({ name: `住宅旧房补偿 (${resBlock}地块)`, value: comp2, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.oldHouseRate)}/㎡` }); currentTotal += comp2; storageInputs.forEach((stor, index) => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; const comp_stor_loc = preciseEffectiveArea * storRates.locationRate; breakdown.push({ name: `杂物间${index + 1}区位 (${stor.block}地块)`, value: comp_stor_loc, formula: `${formatPreciseArea(stor.rawArea)}㎡ × 50% × ${formatRate(storRates.locationRate)}/㎡` }); currentTotal += comp_stor_loc; const comp_stor_old = preciseEffectiveArea * storRates.oldHouseRate; breakdown.push({ name: `杂物间${index + 1}旧房 (${stor.block}地块)`, value: comp_stor_old, formula: `${formatPreciseArea(stor.rawArea)}㎡ × 50% × ${formatRate(storRates.oldHouseRate)}/㎡` }); currentTotal += comp_stor_old; }); const comp5_cash = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH); breakdown.push({ name: "公摊补偿(货币)", value: comp5_cash, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_CASH})/㎡` }); currentTotal += comp5_cash; const comp6_cash = confirmedAreaPrecise * MONETARY_REWARD_RATE; breakdown.push({ name: "货币奖励", value: comp6_cash, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${MONETARY_REWARD_RATE}/㎡` }); currentTotal += comp6_cash; const comp7 = confirmedAreaPrecise * COMPLETE_APT_RATE; breakdown.push({ name: "成套房补贴", value: comp7, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${COMPLETE_APT_RATE}/㎡` }); currentTotal += comp7; const movingFee1 = Math.max(confirmedArea * MOVING_RATE_BASE * 1, MIN_MOVING_1); breakdown.push({ name: "搬家费(1次)", value: movingFee1, formula: `MAX(${formatArea(confirmedArea)}㎡ × ${MOVING_RATE_BASE}/㎡ × 1, ${formatMoney(MIN_MOVING_1)})` }); currentTotal += movingFee1; const comp_transition = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_CASH; breakdown.push({ name: `过渡费(${TRANSITION_MONTHS_CASH}个月)`, value: comp_transition, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_CASH}月` }); currentTotal += comp_transition; const comp_settling = confirmedAreaPrecise * SETTLING_RATE; breakdown.push({ name: "安家补贴", value: comp_settling, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${SETTLING_RATE}/㎡` }); currentTotal += comp_settling; breakdown.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` }); currentTotal += relocationRewardTiered; const comp_rental = RENTAL_SUBSIDY; breakdown.push({ name: "租房补贴", value: comp_rental, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` }); currentTotal += comp_rental; if (decorationFee > 0) { breakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" }); currentTotal += decorationFee; } if (isPublicHousing && publicHousingDeductionAmount !== 0) { breakdown.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true }); currentTotal += publicHousingDeductionAmount; } const finalTotal = round(currentTotal, 0); return { id: `cash_${Date.now()}`, type: "Pure Monetary", name: "纯货币补偿", selectedArea: 0, combo: [], totalCompensation: finalTotal, housingCost: 0, finalDifference: finalTotal, breakdown: breakdown, housingEligibleComp: housingEligibleComp, equivalentArea: equivalentArea, resettlementArea: 0, confirmedArea: confirmedArea, publicCompArea: publicCompArea, isPublicHousing: isPublicHousing, publicHousingDeductionAmount: publicHousingDeductionAmount, relocationReward: relocationRewardTiered, totalStructureComp: inputs.totalStructureComp, decorationFee: decorationFee }; };
        const calculateMaxHousing = (inputs, resettlementArea, combo) => { const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, housingEligibleComp, totalStructureComp, relocationRewardTiered, publicHousingDeductionAmount, decorationFee } = inputs; let breakdown = []; let currentTotal = 0; const safeCombo = Array.isArray(combo) ? combo : []; safeCombo.sort((a, b) => b - a); const resComp = resArea * (resRates.locationRate + resRates.oldHouseRate); breakdown.push({ name: `住宅区位+旧房 (${resBlock}地块)`, value: resComp, formula: `${formatArea(resArea)}㎡ × (${formatRate(resRates.locationRate)} + ${formatRate(resRates.oldHouseRate)})/㎡` }); currentTotal += resComp; storageInputs.forEach((stor, index) => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; const storComp = preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate); breakdown.push({ name: `杂物间${index + 1}区位+旧房 (${stor.block}地块)`, value: storComp, formula: `${formatPreciseArea(stor.rawArea)}㎡ × 50% × (${formatRate(storRates.locationRate)} + ${formatRate(storRates.oldHouseRate)})/㎡` }); currentTotal += storComp; }); const publicCompValue = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING); breakdown.push({ name: "公摊补偿(拿房)", value: publicCompValue, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_HOUSING})/㎡` }); currentTotal += publicCompValue; const resStructureComp = resArea * resRates.structureRate; breakdown.push({ name: `房屋结构等级优惠 (${resBlock}地块)`, value: resStructureComp, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.structureRate)}/㎡` }); storageInputs.forEach((stor, index) => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; const storStructureComp = preciseEffectiveArea * storRates.structureRate; breakdown.push({ name: `杂物间${index + 1}结构等级优惠 (${stor.block}地块)`, value: storStructureComp, formula: `${formatPreciseArea(stor.rawArea)}㎡ × 50% × ${formatRate(storRates.structureRate)}/㎡` }); }); currentTotal += totalStructureComp; const completeAptComp = confirmedAreaPrecise * COMPLETE_APT_RATE; breakdown.push({ name: "成套房补贴", value: completeAptComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${COMPLETE_APT_RATE}/㎡` }); currentTotal += completeAptComp; breakdown.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` }); currentTotal += relocationRewardTiered; const movingFee2 = Math.max(confirmedArea * MOVING_RATE_BASE * 2, MIN_MOVING_2); breakdown.push({ name: "搬家费(2次)", value: movingFee2, formula: `MAX(${formatArea(confirmedArea)}㎡ × ${MOVING_RATE_BASE}/㎡ × 2, ${formatMoney(MIN_MOVING_2)})` }); currentTotal += movingFee2; const transitionAddnlComp = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING; breakdown.push({ name: `过渡费+增发(${TRANSITION_MONTHS_HOUSING}月)`, value: transitionAddnlComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_HOUSING}月` }); currentTotal += transitionAddnlComp; const settlingComp = confirmedAreaPrecise * SETTLING_RATE; breakdown.push({ name: "安家补贴", value: settlingComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${SETTLING_RATE}/㎡` }); currentTotal += settlingComp; const rentalComp = RENTAL_SUBSIDY; breakdown.push({ name: "租房补贴", value: rentalComp, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` }); currentTotal += rentalComp; if (decorationFee > 0) { breakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" }); currentTotal += decorationFee; } if (isPublicHousing && publicHousingDeductionAmount !== 0) { breakdown.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true }); currentTotal += publicHousingDeductionAmount; } const totalCompensation = round(currentTotal, 0); const housingCost = round(resettlementArea * HOUSING_PRICE, 0); const finalDifference = totalCompensation - housingCost; let name; if (safeCombo && safeCombo.length > 0) { name = safeCombo.join('㎡ + ') + '㎡'; } else { name = `极限拿房 (目标 ${formatArea(resettlementArea)}㎡)`; } return { id: `max_${(safeCombo || []).sort((a,b)=>a-b).join('_')}_${Date.now()}`, type: "Max Housing", name: name, selectedArea: resettlementArea, combo: safeCombo || [], totalCompensation: totalCompensation, housingCost: housingCost, finalDifference: finalDifference, breakdown: breakdown, housingEligibleComp: housingEligibleComp, equivalentArea: equivalentArea, resettlementArea: resettlementArea, confirmedArea: confirmedArea, publicCompArea: publicCompArea, isPublicHousing: isPublicHousing, publicHousingDeductionAmount: publicHousingDeductionAmount, relocationReward: relocationRewardTiered, totalStructureComp: totalStructureComp, decorationFee: decorationFee }; };
        const calculateXHousePlusCash = (inputs, combo) => { const { resBlock } = inputs; if (resBlock === 'A') { return calculateXHousePlusCash_ValueSplit(inputs, combo); } else if (['B', 'C', 'D'].includes(resBlock)) { return calculateXHousePlusCash_AreaSplit(inputs, combo); } else { console.error("Invalid block type for XHousePlusCash:", resBlock); return calculateXHousePlusCash_ValueSplit(inputs, combo); } };
        const calculateXHousePlusCash_ValueSplit = (inputs, combo) => { const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, resettlementArea, housingEligibleComp, totalStructureComp, relocationRewardTiered, publicHousingDeductionAmount, decorationFee } = inputs; let breakdown_part1 = [], breakdown_part2 = [], totalPart1Value = 0, totalPart2Value = 0; const selectedTotalArea = combo.reduce((sum, size) => sum + size, 0); const houseValue = selectedTotalArea * HOUSING_PRICE; let propHouse = 0; if (housingEligibleComp > 0) { propHouse = Math.min(houseValue / housingEligibleComp, 1); } if (propHouse > 1 && propHouse < 1.00001) propHouse = 1; const propCash = Math.max(0, 1 - propHouse); const resLocOldValue_H = resArea * (resRates.locationRate + resRates.oldHouseRate); let storLocOldValue_H_Total = 0; storageInputs.forEach(stor => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; storLocOldValue_H_Total += preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate); }); const publicCompValue_H = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING); const completeAptValue_Total = confirmedAreaPrecise * COMPLETE_APT_RATE; const structureBonusValue_Total = totalStructureComp; const transitionHousingTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING; const settlingTotal = confirmedAreaPrecise * SETTLING_RATE; const transitionCashTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_CASH; const publicCompValue_C = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH); const p1_resLocOld = resLocOldValue_H * propHouse; breakdown_part1.push({ name: `住宅区位+旧房(房部分 ${resBlock})`, value: p1_resLocOld, formula: `住宅价值按比例 ${formatArea(propHouse*100)}%`}); totalPart1Value += p1_resLocOld; const p1_storLocOld = storLocOldValue_H_Total * propHouse; breakdown_part1.push({ name: `杂物间区位+旧房(房部分 合计)`, value: p1_storLocOld, formula: `杂物间价值按比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_storLocOld; const p1_publicComp = publicCompValue_H * propHouse; breakdown_part1.push({ name: "公摊补偿(房部分)", value: p1_publicComp, formula: `公摊价值按比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_publicComp; const p1_structureComp = structureBonusValue_Total * propHouse; breakdown_part1.push({ name: "房屋结构等级优惠(房部分)", value: p1_structureComp, formula: `结构总款按比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_structureComp; const p1_completeAptComp = completeAptValue_Total * propHouse; breakdown_part1.push({ name: "成套房补贴(房部分)", value: p1_completeAptComp, formula: `成套房总补贴按比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_completeAptComp; const p1_transition = transitionHousingTotal * propHouse; breakdown_part1.push({ name: `过渡费+增发(房部分×${TRANSITION_MONTHS_HOUSING}月)`, value: p1_transition, formula: `房部分比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_transition; const p1_settling = settlingTotal * propHouse; breakdown_part1.push({ name: "安家补贴(房部分)", value: p1_settling, formula: `房部分比例 ${formatArea(propHouse*100)}%` }); totalPart1Value += p1_settling; const p2_resLocOld = resLocOldValue_H * propCash; breakdown_part2.push({ name: `住宅区位+旧房(币部分 ${resBlock})`, value: p2_resLocOld, formula: `住宅价值按比例 ${formatArea(propCash*100)}%`}); totalPart2Value += p2_resLocOld; const p2_storLocOld = storLocOldValue_H_Total * propCash; breakdown_part2.push({ name: `杂物间区位+旧房(币部分 合计)`, value: p2_storLocOld, formula: `杂物间价值按比例 ${formatArea(propCash*100)}%` }); totalPart2Value += p2_storLocOld; const p2_publicComp = publicCompValue_C * propCash; breakdown_part2.push({ name: "公摊补偿(币部分)", value: p2_publicComp, formula: `公摊货币价值按比例 ${formatArea(propCash*100)}%` }); totalPart2Value += p2_publicComp; const confirmedAreaPrecise_based_on_cash_prop = confirmedAreaPrecise * propCash; const p2_monetaryReward = confirmedAreaPrecise_based_on_cash_prop * MONETARY_REWARD_RATE; breakdown_part2.push({ name: "货币奖励(币部分)", value: p2_monetaryReward, formula: `${formatArea(confirmedAreaPrecise_based_on_cash_prop)}㎡ × ${MONETARY_REWARD_RATE}/㎡` }); totalPart2Value += p2_monetaryReward; const p2_completeAptComp = completeAptValue_Total * propCash; breakdown_part2.push({ name: "成套房补贴(币部分)", value: p2_completeAptComp, formula: `成套房总补贴按比例 ${formatArea(propCash*100)}%` }); totalPart2Value += p2_completeAptComp; const p2_transition = transitionCashTotal * propCash; breakdown_part2.push({ name: `过渡费(币部分×${TRANSITION_MONTHS_CASH}月)`, value: p2_transition, formula: `币部分比例 ${formatArea(propCash*100)}%` }); totalPart2Value += p2_transition; const p2_settling = settlingTotal * propCash; breakdown_part2.push({ name: "安家补贴(币部分)", value: p2_settling, formula: `币部分比例 ${formatArea(propCash*100)}%` }); totalPart2Value += p2_settling; let finalFee_P1 = 0, finalFee_P2 = 0, formula_P1 = "", formula_P2 = ""; const areaBasisP1 = confirmedArea * propHouse; const areaBasisP2 = confirmedArea * propCash; const fee_P1_calc = areaBasisP1 * MOVING_RATE_BASE * 2; const fee_P2_calc = areaBasisP2 * MOVING_RATE_BASE * 1; if (fee_P1_calc + fee_P2_calc < MIN_MOVING_2) { finalFee_P1 = MIN_MOVING_2; finalFee_P2 = 0; formula_P1 = `补足最低 ${formatMoney(MIN_MOVING_2)} (原计算: ${formatMoney(round(fee_P1_calc,0))} + ${formatMoney(round(fee_P2_calc,0))} < ${formatMoney(MIN_MOVING_2)})`; formula_P2 = "已在房部分补足最低"; } else { finalFee_P1 = fee_P1_calc; finalFee_P2 = fee_P2_calc; formula_P1 = `${formatArea(areaBasisP1)}㎡ × ${MOVING_RATE_BASE}/㎡ × 2`; formula_P2 = `${formatArea(areaBasisP2)}㎡ × ${MOVING_RATE_BASE}/㎡ × 1`; } if (finalFee_P1 !== 0) breakdown_part1.push({ name: "搬家费(房部分)", value: finalFee_P1, formula: formula_P1 }); if (finalFee_P2 !== 0) breakdown_part2.push({ name: "搬家费(币部分)", value: finalFee_P2, formula: formula_P2 }); totalPart1Value += finalFee_P1; totalPart2Value += finalFee_P2; breakdown_part2.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` }); totalPart2Value += relocationRewardTiered; breakdown_part2.push({ name: "租房补贴", value: RENTAL_SUBSIDY, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` }); totalPart2Value += RENTAL_SUBSIDY; let fullBreakdown = [...breakdown_part1, ...breakdown_part2]; let combinedValue = totalPart1Value + totalPart2Value; if (decorationFee > 0) { fullBreakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" }); combinedValue += decorationFee; } if (isPublicHousing && publicHousingDeductionAmount !== 0) { fullBreakdown.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true }); combinedValue += publicHousingDeductionAmount; } const totalCompensation = round(combinedValue, 0); const finalDifference = totalCompensation - round(houseValue, 0); const scenarioType = combo.length === 1 ? "1 House + Cash" : "2 Houses + Cash"; const scenarioName = `${combo.sort((a, b) => b - a).join('㎡ + ')}㎡ + 货币`; const scenarioId = `xhc_${combo.sort((a, b) => a - b).join('_')}_${Date.now()}`; return { id: scenarioId, type: scenarioType, name: scenarioName, selectedArea: selectedTotalArea, combo: combo.sort((a, b) => b - a), totalCompensation: totalCompensation, housingCost: round(houseValue, 0), finalDifference: finalDifference, breakdown: fullBreakdown, housingEligibleComp: housingEligibleComp, equivalentArea: equivalentArea, resettlementArea: resettlementArea, confirmedArea: confirmedArea, publicCompArea: publicCompArea, isPublicHousing: isPublicHousing, publicHousingDeductionAmount: publicHousingDeductionAmount, relocationReward: relocationRewardTiered, propHouse: propHouse, propCash: propCash, totalStructureComp: totalStructureComp, decorationFee: decorationFee }; };
        const calculateXHousePlusCash_AreaSplit = (inputs, combo) => { const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, resettlementArea, relocationRewardTiered, publicHousingDeductionAmount, decorationFee } = inputs; const selectedTotalArea = combo.reduce((sum, size) => sum + size, 0); const houseValue = round(selectedTotalArea * HOUSING_PRICE, 0); let breakdown_part1 = [], breakdown_part2 = [], totalPart1Comp = 0, totalPart2Comp = 0; let resArea_P1 = round(selectedTotalArea / 1.1, 2); resArea_P1 = Math.min(resArea_P1, resArea); const resArea_P2 = round(resArea - resArea_P1, 2); const publicCompArea_P1 = round(Math.min(resArea_P1 * 0.1, MAX_PUBLIC_AREA), 2); const publicCompArea_P2 = round(publicCompArea - publicCompArea_P1, 2); const storageEffectiveAreaRounded_P2 = storageInputs.reduce((sum, stor) => sum + round(stor.rawArea * 0.5, 2), 0); const effectiveArea_P2 = round(resArea_P2 + storageEffectiveAreaRounded_P2, 2); const comp1_loc_old = resArea_P1 * (resRates.locationRate + resRates.oldHouseRate); breakdown_part1.push({ name: `住宅区位+旧房(房部分 ${resBlock})`, value: comp1_loc_old, formula: `${formatArea(resArea_P1)}㎡ × (${formatRate(resRates.locationRate)} + ${formatRate(resRates.oldHouseRate)})/㎡` }); totalPart1Comp += comp1_loc_old; const comp1_pub = publicCompArea_P1 * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING); breakdown_part1.push({ name: "公摊补偿(房部分)", value: comp1_pub, formula: `${formatArea(publicCompArea_P1)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_HOUSING})/㎡` }); totalPart1Comp += comp1_pub; const comp1_struct = resArea_P1 * resRates.structureRate; breakdown_part1.push({ name: `房屋结构等级优惠(房部分)`, value: comp1_struct, formula: `${formatArea(resArea_P1)}㎡ × ${formatRate(resRates.structureRate)}/㎡` }); totalPart1Comp += comp1_struct; const comp1_compapt = resArea_P1 * COMPLETE_APT_RATE; breakdown_part1.push({ name: "成套房补贴(房部分)", value: comp1_compapt, formula: `${formatArea(resArea_P1)}㎡ × ${COMPLETE_APT_RATE}/㎡` }); totalPart1Comp += comp1_compapt; const transition_P1 = resArea_P1 * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING; breakdown_part1.push({ name: `过渡费+增发(房部分×${TRANSITION_MONTHS_HOUSING}月)`, value: transition_P1, formula: `${formatArea(resArea_P1)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_HOUSING}月` }); totalPart1Comp += transition_P1; const settling_P1 = resArea_P1 * SETTLING_RATE; breakdown_part1.push({ name: "安家补贴(房部分)", value: settling_P1, formula: `${formatArea(resArea_P1)}㎡ × ${SETTLING_RATE}/㎡` }); totalPart1Comp += settling_P1; const comp2_res_loc_old = resArea_P2 * (resRates.locationRate + resRates.oldHouseRate); breakdown_part2.push({ name: `住宅区位+旧房(币部分 ${resBlock})`, value: comp2_res_loc_old, formula: `${formatArea(resArea_P2)}㎡ × (${formatRate(resRates.locationRate)} + ${formatRate(resRates.oldHouseRate)})/㎡` }); totalPart2Comp += comp2_res_loc_old; let comp2_stor_loc_old_total = 0; storageInputs.forEach((stor, index) => { const storRates = getRates(stor.block); const preciseEffectiveArea = stor.rawArea * 0.5; const storComp = preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate); breakdown_part2.push({ name: `杂物间${index + 1}区位+旧房 (${stor.block}地块)`, value: storComp, formula: `${formatPreciseArea(stor.rawArea)}㎡ × 50% × (${formatRate(storRates.locationRate)} + ${formatRate(storRates.oldHouseRate)})/㎡` }); comp2_stor_loc_old_total += storComp; }); totalPart2Comp += comp2_stor_loc_old_total; const comp2_pub = publicCompArea_P2 * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH); breakdown_part2.push({ name: "公摊补偿(币部分)", value: comp2_pub, formula: `${formatArea(publicCompArea_P2)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_CASH})/㎡` }); totalPart2Comp += comp2_pub; const comp2_monetary = effectiveArea_P2 * MONETARY_REWARD_RATE; breakdown_part2.push({ name: "货币奖励(币部分)", value: comp2_monetary, formula: `${formatArea(effectiveArea_P2)}㎡ × ${MONETARY_REWARD_RATE}/㎡` }); totalPart2Comp += comp2_monetary; const comp2_compapt = effectiveArea_P2 * COMPLETE_APT_RATE; breakdown_part2.push({ name: "成套房补贴(币部分)", value: comp2_compapt, formula: `${formatArea(effectiveArea_P2)}㎡ × ${COMPLETE_APT_RATE}/㎡` }); totalPart2Comp += comp2_compapt; const transition_P2 = effectiveArea_P2 * TRANSITION_RATE * TRANSITION_MONTHS_CASH; breakdown_part2.push({ name: `过渡费(币部分×${TRANSITION_MONTHS_CASH}月)`, value: transition_P2, formula: `${formatArea(effectiveArea_P2)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_CASH}月` }); totalPart2Comp += transition_P2; const settling_P2 = effectiveArea_P2 * SETTLING_RATE; breakdown_part2.push({ name: "安家补贴(币部分)", value: settling_P2, formula: `${formatArea(effectiveArea_P2)}㎡ × ${SETTLING_RATE}/㎡` }); totalPart2Comp += settling_P2; let finalFee_P1 = 0, finalFee_P2 = 0, formula_P1 = "", formula_P2 = ""; const areaBasisP1 = resArea_P1; const areaBasisP2 = effectiveArea_P2; const fee_P1_calc = areaBasisP1 * MOVING_RATE_BASE * 2; const fee_P2_calc = areaBasisP2 * MOVING_RATE_BASE * 1; if (fee_P1_calc + fee_P2_calc < MIN_MOVING_2) { finalFee_P1 = MIN_MOVING_2; finalFee_P2 = 0; formula_P1 = `补足最低 ${formatMoney(MIN_MOVING_2)} (原计算: ${formatMoney(round(fee_P1_calc,0))} + ${formatMoney(round(fee_P2_calc,0))} < ${formatMoney(MIN_MOVING_2)})`; formula_P2 = "已在房部分补足最低"; } else { finalFee_P1 = fee_P1_calc; finalFee_P2 = fee_P2_calc; formula_P1 = `${formatArea(areaBasisP1)}㎡ × ${MOVING_RATE_BASE}/㎡ × 2`; formula_P2 = `${formatArea(areaBasisP2)}㎡ × ${MOVING_RATE_BASE}/㎡ × 1`; } if (finalFee_P1 !== 0) breakdown_part1.push({ name: "搬家费(房部分)", value: finalFee_P1, formula: formula_P1 }); if (finalFee_P2 !== 0) breakdown_part2.push({ name: "搬家费(币部分)", value: finalFee_P2, formula: formula_P2 }); totalPart1Comp += finalFee_P1; totalPart2Comp += finalFee_P2; breakdown_part2.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` }); totalPart2Comp += relocationRewardTiered; breakdown_part2.push({ name: "租房补贴", value: RENTAL_SUBSIDY, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` }); totalPart2Comp += RENTAL_SUBSIDY; let fullBreakdown = [...breakdown_part1, ...breakdown_part2]; let combinedValue = totalPart1Comp + totalPart2Comp; if (decorationFee > 0) { fullBreakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" }); combinedValue += decorationFee; } if (isPublicHousing && publicHousingDeductionAmount !== 0) { breakdown_part2.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true }); combinedValue += publicHousingDeductionAmount; } const totalCompensation = round(combinedValue, 0); const finalDifference = totalCompensation - houseValue; const scenarioType = combo.length === 1 ? "1 House + Cash" : "2 Houses + Cash"; const scenarioName = `${combo.sort((a, b) => b - a).join('㎡ + ')}㎡ + 货币`; const scenarioId = `xhc_${combo.sort((a, b) => a - b).join('_')}_${Date.now()}`; return { id: scenarioId, type: scenarioType, name: scenarioName, selectedArea: selectedTotalArea, combo: combo.sort((a, b) => b - a), totalCompensation: totalCompensation, housingCost: houseValue, finalDifference: finalDifference, breakdown: fullBreakdown, housingEligibleComp: inputs.housingEligibleComp, equivalentArea: equivalentArea, resettlementArea: resettlementArea, confirmedArea: confirmedArea, publicCompArea: publicCompArea, isPublicHousing: isPublicHousing, publicHousingDeductionAmount: publicHousingDeductionAmount, relocationReward: relocationRewardTiered, propHouse: null, propCash: null, totalStructureComp: inputs.totalStructureComp, decorationFee: decorationFee }; };
        const calculateOneHousePlusCash = (inputs, size) => { return calculateXHousePlusCash(inputs, [size]); };
        const calculateTwoHousesPlusCash = (inputs, combo) => { return calculateXHousePlusCash(inputs, combo); };

        // --- Display Functions ---
        let currentScenarioId = null; // Add this line to track the currently displayed scenario ID

        const displayScenariosList = (scenarios) => {
            scenarioListUl.innerHTML = '';
            if (!scenarios || scenarios.length === 0) {
                scenarioListUl.innerHTML = '<li>未找到符合条件的方案。</li>';
                compareSelectedButton.classList.add('hidden');
                compareInstructions.textContent = '';
                 // Ensure sections are correctly shown/hidden
                 scenarioListSection.classList.remove('hidden');
                 scenarioDetailSection.classList.add('hidden');
                 comparisonSection.classList.add('hidden');
                return;
            }

            // Group scenarios by type AND property for remote
            const groupedScenarios = {
                maxHousing: [],
                oneHouseCash: [],
                twoHousesCash: [],
                pureCash: [],
                remote: {} // Use an object to group by property name
            };

            scenarios.forEach(s => {
                if (s.type === "Max Housing") groupedScenarios.maxHousing.push(s);
                else if (s.type === "1 House + Cash") groupedScenarios.oneHouseCash.push(s);
                else if (s.type === "2 Houses + Cash") groupedScenarios.twoHousesCash.push(s);
                else if (s.type === "Pure Monetary") groupedScenarios.pureCash.push(s);
                else if (s.type === "Remote Housing Exact" || s.type === "Remote Housing + Cash") {
                    if (!groupedScenarios.remote[s.propertyName]) {
                        groupedScenarios.remote[s.propertyName] = [];
                    }
                    groupedScenarios.remote[s.propertyName].push(s);
                }
            });

            const addCategoryHeader = (title) => {
                const li = document.createElement('li');
                li.style.fontWeight = 'bold';
                li.style.marginTop = '15px';
                li.style.borderBottom = 'none';
                li.style.color = '#0056b3';
                li.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${title}`; // Indent header
                scenarioListUl.appendChild(li);
            };

            const addScenarioToList = (scenario) => {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = scenario.id;
                checkbox.id = `compare_${scenario.id}`;
                checkbox.classList.add('compare-checkbox');
                checkbox.addEventListener('change', handleCompareCheckboxChange);

                const link = document.createElement('a');
                link.href = '#';
                link.textContent = scenario.name; // Use the generated name
                link.dataset.scenarioId = scenario.id;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    displayScenarioDetail(scenario.id);
                });

                const label = document.createElement('label');
                label.htmlFor = `compare_${scenario.id}`;
                label.appendChild(link);
                label.style.flexGrow = '1';
                label.style.cursor = 'pointer';

                li.appendChild(checkbox);
                li.appendChild(label);
                scenarioListUl.appendChild(li);
            };

            // Display Original Relocation Scenarios
            if (groupedScenarios.maxHousing.length > 0) {
                addCategoryHeader("尽可能上靠拿房:");
                groupedScenarios.maxHousing.forEach(addScenarioToList);
            }
            if (groupedScenarios.oneHouseCash.length > 0) {
                addCategoryHeader("拿一套房 + 货币:");
                groupedScenarios.oneHouseCash.forEach(addScenarioToList);
            }
            if (groupedScenarios.twoHousesCash.length > 0) {
                addCategoryHeader("拿两套房 + 货币:");
                groupedScenarios.twoHousesCash.forEach(addScenarioToList);
            }

            // Display Remote Relocation Scenarios (Grouped by Property)
            const remoteProperties = Object.keys(groupedScenarios.remote).sort();
            if (remoteProperties.length > 0) {
                addCategoryHeader("异地安置:");
                remoteProperties.forEach(propertyName => {
                    const subHeaderLi = document.createElement('li');
                    subHeaderLi.style.fontWeight = 'normal'; // Less emphasis than main category
                    subHeaderLi.style.marginTop = '10px';
                    subHeaderLi.style.marginLeft = '20px'; // Indent property name
                    subHeaderLi.style.borderBottom = 'none';
                    subHeaderLi.style.color = '#333';
                    // Only display the property name, not with a colon, as the scenario name includes it.
                    subHeaderLi.textContent = propertyName; 
                    scenarioListUl.appendChild(subHeaderLi);

                    // Sort scenarios within the property group (e.g., by size)
                    const propertyScenarios = groupedScenarios.remote[propertyName];
                    propertyScenarios.sort((a,b) => a.selectedArea - b.selectedArea);
                    propertyScenarios.forEach(addScenarioToList);
                });
            }

            // Display Pure Monetary Scenario (only if NOT monetary mode)
            if (currentInputs.relocationType !== 'monetary' && groupedScenarios.pureCash.length > 0) {
                 addCategoryHeader("纯货币补偿:");
                 groupedScenarios.pureCash.forEach(addScenarioToList);
            }

            // Show the list section and compare button
             scenarioListSection.classList.remove('hidden');
             scenarioDetailSection.classList.add('hidden');
             comparisonSection.classList.add('hidden');
             compareSelectedButton.classList.remove('hidden');
             handleCompareCheckboxChange();
        };
        const handleCompareCheckboxChange = () => { const checkedBoxes = scenarioListUl.querySelectorAll('.compare-checkbox:checked'); const count = checkedBoxes.length; compareSelectedButton.disabled = count < 1 || count > 3; if (count === 0) compareInstructions.textContent = '勾选 1 个方案比较签约期内外差异，或勾选 2-3 个方案进行横向比较。'; else if (count === 1) compareInstructions.textContent = '已选 1 个，可点击比较查看签约期内外差异。'; else if (count === 2) compareInstructions.textContent = '已选 2 个，可再选 1 个或直接比较。'; else if (count === 3) compareInstructions.textContent = '已选 3 个，请点击比较。'; else compareInstructions.textContent = '最多只能选择 3 个方案进行比较。'; };
        const displayScenarioDetail = (scenarioId) => {
            currentScenarioId = scenarioId; // Store the ID
            const scenario = currentScenarios.find(s => s.id === scenarioId);
            if (!scenario) return;

            scenarioTitle.textContent = scenario.name;
            
            // Reset visibility
            scenarioBreakdown.classList.add('hidden');
            storageAdviceContent.classList.add('hidden');
            overDeadlineContent.classList.add('hidden');
            toggleDetailsButton.textContent = '显示详细构成';

            // --- Populate Summary (Existing code, ensure it handles all types) ---
            let summaryHtml = '';
            // ... (rest of the summary generation code remains the same)
            // ... make sure it correctly accesses scenario properties like
            // scenario.confirmedArea, scenario.publicCompArea, scenario.equivalentArea, etc.
            // which should be present in both original and remote scenarios.
            summaryHtml += `<p><strong>确权面积:</strong> ${formatArea(scenario.confirmedArea)} ㎡</p>`;
            if (scenario.publicCompArea !== undefined) { // Check if publicCompArea exists
                summaryHtml += `<p><strong>公摊补偿面积:</strong> ${formatArea(scenario.publicCompArea)} ㎡</p>`;
            }

            if (scenario.type !== "Pure Monetary" && scenario.equivalentArea !== undefined) { // Original relocation specific
                summaryHtml += `<p><strong>等面积:</strong> ${formatArea(scenario.equivalentArea)} ㎡</p>`;
                if (scenario.type === "Max Housing") {
                    const resettlementAreaDisplay = scenario.resettlementArea || 0;
                    const surplusArea = Math.max(0, round(resettlementAreaDisplay - scenario.equivalentArea, 2));
                    summaryHtml += `<p><strong>安置面积(上靠后):</strong> ${formatArea(resettlementAreaDisplay)} ㎡</p>`;
                    summaryHtml += `<p><strong>上靠面积:</strong> ${formatArea(surplusArea)} ㎡</p>`;
                }
            }
            summaryHtml += `<hr>`;
            // ... (rest of summary generation for housing cost, total comp, difference etc.)
            if (scenario.combo && scenario.combo.length > 0) {
                let housingSelectionText = scenario.combo.join('㎡ + ') + '㎡';
                summaryHtml += `<p><strong>选择房型:</strong> ${housingSelectionText}</p>`;
                summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`;
            } else if (scenario.type === "Max Housing") {
                 summaryHtml += `<p><strong>选择房型:</strong> 按最高安置面积 ${formatArea(scenario.selectedArea)}㎡ 选房</p>`;
                 summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`;
            } else if (scenario.type === "Remote Housing Exact" || scenario.type === "Remote Housing + Cash") {
                 summaryHtml += `<p><strong>选择房型:</strong> ${scenario.propertyName} ${scenario.selectedArea}㎡</p>`;
                 summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元 (对接价: ${formatMoney(scenario.propertyPrice)}/㎡)</p>`;
            } else if (scenario.type === "Pure Monetary") {
                 summaryHtml += `<p><strong>选择房型:</strong> 无</p>`;
            }
            summaryHtml += `<p><strong>补偿款总计:</strong> ${formatMoney(scenario.totalCompensation)} 元</p>`;
             // ... (rest of summary for public housing, decoration fee, difference)
            const diffValue = scenario.finalDifference;
            const diffColor = diffValue >= 0 ? 'red' : 'green';
            let diffSuffix = scenario.decorationFee > 0 ? " <span class='diff-suffix'>+ 电梯评估款、管线补助等</span>" : " <span class='diff-suffix'>+ 装修补偿、电梯评估款、管线补助等</span>";
            if (diffValue >= 0) {
                 summaryHtml += `<p><strong>应退差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(diffValue)} 元</span>${diffSuffix}</p>`;
             } else {
                 summaryHtml += `<p><strong>应补缴差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(Math.abs(diffValue))} 元</span>${diffSuffix}</p>`;
             }
            
            scenarioSummary.innerHTML = summaryHtml;

            // --- Populate Breakdown (Existing code, should work if breakdown structure is consistent) ---
            breakdownList.innerHTML = '';
             if (scenario.breakdown && scenario.breakdown.length > 0) {
                 scenario.breakdown.forEach(item => {
                     const li = document.createElement('li');
                     const valueClass = item.isDeduction ? 'deduction-value' : 'item-value';
                     li.innerHTML = `<span class="item-name">${item.name}:</span> <span class="${valueClass}">${formatMoney(item.value)} 元</span>`;
                     if (item.formula) {
                         let formulaDisplay = item.formula.replace(/approx/g, '约').replace(/× NaN\/㎡/g,'');
                         li.innerHTML += `<span class="item-formula">计算: ${formulaDisplay}</span>`;
                     }
                     breakdownList.appendChild(li);
                 });
             } else {
                 breakdownList.innerHTML = '<li>详细构成信息不可用。</li>';
             }

            // --- Show/Hide Buttons based on Scenario Type ---
            if (scenario.type === "Remote Housing Exact" || 
                scenario.type === "Remote Housing + Cash" || 
                scenario.type === "Pure Monetary") { // Also hide for Pure Monetary
                storageAdviceButton.classList.add('hidden'); 
            } else {
                storageAdviceButton.classList.remove('hidden'); // Show for others (Original)
            }
            
            // Over Deadline button should always be visible if a scenario is shown
            overDeadlineButton.classList.remove('hidden');

            // --- Display Sections ---
            scenarioListSection.classList.add('hidden');
            scenarioDetailSection.classList.remove('hidden');
            comparisonSection.classList.add('hidden');

            // --- Update Button Data --- (No longer needed as currentScenarioId is stored globally in scope)
            // storageAdviceButton.dataset.scenarioId = scenarioId;
            // overDeadlineButton.dataset.scenarioId = scenarioId;
        };
        const displayComparison = (selectedIds) => { comparisonLossSummary.classList.add('hidden'); comparisonLossDetails.classList.add('hidden'); showLossDetailsButton.classList.add('hidden'); currentLossDetails = []; if (selectedIds.length === 1) { const scenarioId = selectedIds[0]; const originalScenario = currentScenarios.find(s => s.id === scenarioId); if (!originalScenario) return; const lossScenarioResult = calculateLossScenario(originalScenario, currentInputs); displaySingleComparison(originalScenario, lossScenarioResult); } else if (selectedIds.length === 2 || selectedIds.length === 3) { const scenariosToCompare = currentScenarios.filter(s => selectedIds.includes(s.id)); if (scenariosToCompare.length < 2) return; displayMultiComparison(scenariosToCompare); } scenarioListSection.classList.add('hidden'); scenarioDetailSection.classList.add('hidden'); comparisonSection.classList.remove('hidden'); };

        // --- MODIFIED: Calculate Loss Scenario (Handles Original and Remote) ---
        const calculateLossScenario = (originalScenario, inputs) => {
            const tolerance = 1; // Define tolerance here for affordability check
            const lossInputs = JSON.parse(JSON.stringify(inputs)); // Deep copy
            let lostItems = [];
            let totalLossAmount = 0;
            
            // --- Identify Lost Compensation Items (Common to all types) ---
            let structureLoss = 0, publicCompLossHousingDiff = 0, completeAptLoss = 0, settlingLoss = 0;
            let monetaryRewardLoss = 0; // For cash-based part of original scenarios

            // Find these values from the original breakdown
            originalScenario.breakdown.forEach(item => {
                // Structure Bonus (can be housing or cash part in original, housing part in remote)
                if (item.name.includes('结构等级优惠')) { structureLoss += item.value; }
                // Public Comp Housing Diff (Housing part in original & remote)
                else if (item.name.includes('公摊补偿') && item.formula.includes(PUBLIC_AREA_DIFF_HOUSING.toString())) { publicCompLossHousingDiff += item.value; }
                // Complete Apt Bonus (can be split in original, housing part in remote)
                else if (item.name.includes('成套房补贴')) { completeAptLoss += item.value; }
                // Settling Fee (can be split in original, housing part in remote)
                else if (item.name.includes('安家补贴')) { settlingLoss += item.value; }
                // Monetary Reward (only in cash parts of original/pure cash)
                else if (item.name.includes('货币奖励')) { monetaryRewardLoss += item.value; }
            });

            // Relocation Reward (always lost if > deadline)
            const rewardLoss = originalScenario.relocationReward || 0;
            // Rental Subsidy (always lost if > deadline)
            const rentalLoss = RENTAL_SUBSIDY;

            // --- Add lost items to list and calculate total loss ---
            if (structureLoss !== 0) { lostItems.push({ name: "结构等级优惠", value: structureLoss }); totalLossAmount += structureLoss; }
            // The 'Public Comp Housing Diff' represents the extra value for taking housing. Losing this means reverting to cash value.
            // Calculate the difference: Housing Value - Cash Value
            const publicCompCashValue = originalScenario.publicCompArea * (getRates(lossInputs.resBlock).locationRate + PUBLIC_AREA_DIFF_CASH);
            const publicCompHousingValue = originalScenario.publicCompArea * (getRates(lossInputs.resBlock).locationRate + PUBLIC_AREA_DIFF_HOUSING);
            const effectivePublicCompLoss = round(publicCompHousingValue, 0); // 直接使用房屋价值作为差额
            if (effectivePublicCompLoss > 0) { lostItems.push({ name: "公摊补偿房屋差额", value: effectivePublicCompLoss }); totalLossAmount += effectivePublicCompLoss; }
            
            if (completeAptLoss !== 0) { lostItems.push({ name: "成套房补贴", value: completeAptLoss }); totalLossAmount += completeAptLoss; }
            if (settlingLoss !== 0) { lostItems.push({ name: "安家补贴", value: settlingLoss }); totalLossAmount += settlingLoss; }
            if (monetaryRewardLoss !== 0) { lostItems.push({ name: "货币奖励", value: monetaryRewardLoss }); totalLossAmount += monetaryRewardLoss; }
            if (rewardLoss !== 0) { lostItems.push({ name: "搬迁奖励", value: rewardLoss }); totalLossAmount += rewardLoss; }
            if (rentalLoss !== 0) { lostItems.push({ name: "租房补贴", value: rentalLoss }); totalLossAmount += rentalLoss; }

            // Calculate the new total compensation after losses
            const lossTotalCompensation = round(originalScenario.totalCompensation - totalLossAmount, 0);
            
            // --- Check Affordability for Housing Scenarios ---
            let canAffordHousing = true;
            let lossHousingEligibleComp = 0; // HEC after losses
            let lossFinalDifference = lossTotalCompensation; // Default for pure cash
            
            if (originalScenario.type !== "Pure Monetary") {
                 // Calculate a hypothetical HEC *without* the lost bonuses 
                 // to see if the chosen housing is still affordable.
                 // This is complex as HEC depends on the split logic. 
                 // Simpler approach: Check if the *new total compensation* covers the housing cost.
                 // This isn't strictly HEC vs cost, but reflects if they have enough *total money* left.
                
                 if (originalScenario.housingCost && lossTotalCompensation < originalScenario.housingCost - tolerance) {
                     canAffordHousing = false;
                 }
                 
                 // If still affordable, calculate the new difference
                 if (canAffordHousing && originalScenario.housingCost !== undefined) {
                     lossFinalDifference = lossTotalCompensation - originalScenario.housingCost;
                 } else if (!canAffordHousing) {
                     // If cannot afford, they are forced into pure cash equivalent of the loss scenario
                     lossFinalDifference = lossTotalCompensation; // No housing cost subtracted
                 }
            }
            
            return {
                name: "超过签约期",
                type: originalScenario.type, // Keep original type for context
                combo: originalScenario.combo,
                selectedArea: originalScenario.selectedArea,
                propertyName: originalScenario.propertyName, // Keep property name if remote
                propertyPrice: originalScenario.propertyPrice, // Keep property price if remote
                totalCompensation: lossTotalCompensation,
                housingCost: canAffordHousing ? originalScenario.housingCost : 0,
                finalDifference: lossFinalDifference,
                canAffordHousing: canAffordHousing,
                lostItems: lostItems
            };
        };
        const displaySingleComparison = (originalScenario, lossScenario) => { let tableHtml = '<table><thead><tr><th>指标</th>'; tableHtml += `<th>签约期内 (${originalScenario.name})</th>`; tableHtml += `<th>超过签约期</th>`; tableHtml += '</tr></thead><tbody>'; const metrics = [ { key: 'combo', label: '选择房型' }, { key: 'totalCompensation', label: '补偿款总计 (元)', formatter: formatMoney }, { key: 'finalDifference', label: '应交(-)/退(+)差价 (元)' }, ]; metrics.forEach(metric => { tableHtml += `<tr><td><strong>${metric.label}</strong></td>`; let originalValue = originalScenario[metric.key]; let lossValue = lossScenario[metric.key]; let formattedOriginalValue = 'N/A'; let formattedLossValue = 'N/A'; if (metric.key === 'combo') { formattedOriginalValue = originalScenario.combo && originalScenario.combo.length > 0 ? originalScenario.combo.join('㎡ + ') + '㎡' : '无'; if (lossScenario.type !== 'Pure Monetary' && !lossScenario.canAffordHousing) { formattedLossValue = `<span style="color:red; font-style:italic;">补偿面积不足，无法选择此房型</span>`; } else { formattedLossValue = formattedOriginalValue; } } else if (metric.key === 'finalDifference') { const diffValueOrig = originalScenario.finalDifference; const diffColorOrig = diffValueOrig >= 0 ? 'red' : 'green'; formattedOriginalValue = `<span style="color:${diffColorOrig}; font-weight: bold;">${formatMoney(diffValueOrig)}</span>`; if (lossScenario.type !== 'Pure Monetary' && !lossScenario.canAffordHousing) { formattedLossValue = 'N/A'; } else { const diffValueLoss = lossScenario.finalDifference; const diffColorLoss = diffValueLoss >= 0 ? 'red' : 'green'; formattedLossValue = `<span style="color:${diffColorLoss}; font-weight: bold;">${formatMoney(diffValueLoss)}</span>`; } } else if (metric.formatter) { formattedOriginalValue = metric.formatter(originalValue); formattedLossValue = metric.formatter(lossValue); } else { formattedOriginalValue = (originalValue === undefined || originalValue === null) ? 'N/A' : originalValue; formattedLossValue = (lossValue === undefined || lossValue === null) ? 'N/A' : lossValue; } tableHtml += `<td>${formattedOriginalValue}</td>`; tableHtml += `<td>${formattedLossValue}</td>`; tableHtml += '</tr>'; }); tableHtml += '</tbody></table>'; comparisonTableContainer.innerHTML = tableHtml; if (lossScenario.type === 'Pure Monetary' || lossScenario.canAffordHousing) { const totalLoss = originalScenario.totalCompensation - lossScenario.totalCompensation; comparisonLossSummary.innerHTML = `超过签约期配合征迁手续，总补偿款损失 <span>${formatMoney(totalLoss)}</span> 元。`; comparisonLossSummary.classList.remove('hidden'); showLossDetailsButton.classList.remove('hidden'); currentLossDetails = lossScenario.lostItems; } else { comparisonLossSummary.classList.add('hidden'); showLossDetailsButton.classList.add('hidden'); currentLossDetails = []; } comparisonLossDetails.classList.add('hidden'); };
        const displayMultiComparison = (scenariosToCompare) => { let tableHtml = '<table><thead><tr><th>指标</th>'; scenariosToCompare.forEach(s => { tableHtml += `<th>${s.name}</th>`; }); tableHtml += '</tr></thead><tbody>'; const metrics = [ { key: 'combo', label: '选择房型', formatter: (combo) => combo && combo.length > 0 ? combo.join('㎡ + ') + '㎡' : '无' }, { key: 'totalCompensation', label: '补偿款总计 (元)', formatter: formatMoney }, { key: 'finalDifference', label: '应交(-)/退(+)差价 (元)', formatter: (val) => { if (typeof val !== 'number' || isNaN(val)) return 'N/A'; const color = val >= 0 ? 'red' : 'green'; return `<span style="color:${color}; font-weight: bold;">${formatMoney(val)}</span>`; } }, ]; metrics.forEach(metric => { tableHtml += `<tr><td><strong>${metric.label}</strong></td>`; scenariosToCompare.forEach(s => { const value = s[metric.key]; const formattedValue = (metric.formatter) ? metric.formatter(value, s) : (value === undefined || value === null ? 'N/A' : value); tableHtml += `<td>${formattedValue}</td>`; }); tableHtml += '</tr>'; }); tableHtml += '</tbody></table>'; comparisonTableContainer.innerHTML = tableHtml; comparisonLossSummary.classList.add('hidden'); comparisonLossDetails.classList.add('hidden'); showLossDetailsButton.classList.add('hidden'); currentLossDetails = []; };

        // --- Event Listeners ---
        calculateButton.addEventListener('click', function() {
            // 清空错误提示
            inputError.textContent = '';
            
            // 获取住宅信息
            const resBlock = residenceBlockTypeSelect.value;
            const resArea = parseFloat(residentialAreaInput.value);
            
            // 验证输入
            if (!resBlock) {
                inputError.textContent = '请选择住宅地块';
                return;
            }
            
            if (isNaN(resArea) || resArea <= 0) {
                inputError.textContent = '请输入有效的住宅面积';
                return;
            }
            
            // 获取杂物间信息
            const storageInputs = [];
            const storageAreas = document.querySelectorAll('.storage-area');
            const storageBlocks = document.querySelectorAll('.storage-block-type');
            
            for (let i = 0; i < storageAreas.length; i++) {
                const storageArea = parseFloat(storageAreas[i].value);
                const storageBlock = storageBlocks[i].value || resBlock;
                
                if (!isNaN(storageArea) && storageArea > 0) {
                    storageInputs.push({
                        rawArea: storageArea,
                        block: storageBlock
                    });
                }
            }
            
            // 获取装修评估费
            const decorationFee = parseFloat(decorationFeeInput.value) || 0;
            
            // 获取是否公房
            const isPublicHousing = publicHousingYesRadio.checked;
            
            // 获取安置方式
            const relocationType = relocationTypeSelect.value;
            
            // 组合输入
            const inputs = {
                resArea: resArea,
                storageInputs: storageInputs,
                resBlock: resBlock,
                isPublicHousing: isPublicHousing,
                decorationFee: decorationFee,
                relocationType: relocationType
            };
            
            // 如果是异地安置，获取区域类型
            if (relocationType === 'remote') {
                const remoteAreaType = remoteAreaTypeSelect.value;
                
                if (!remoteAreaType) {
                    inputError.textContent = '请选择异地安置区域类型';
                    return;
                }
                
                inputs.remoteAreaType = remoteAreaType;
            }
            
            // 保存当前输入，以便后续使用
            currentInputs = inputs;
            currentScenarios = []; // Clear previous scenarios
            
            // 计算方案
            if (relocationType === 'original') {
                currentScenarios = calculateCompensation(inputs);
                // If calculateCompensation returns empty (e.g., low equivalent area), show message
                if (currentScenarios.length === 0) {
                    scenarioListUl.innerHTML = '<li>根据当前输入，没有符合条件的原拆原迁住房方案。</li>';
                    compareSelectedButton.classList.add('hidden');
                    compareInstructions.textContent = '';
                    scenarioListSection.classList.remove('hidden');
                    scenarioDetailSection.classList.add('hidden');
                    comparisonSection.classList.add('hidden');
                } else {
                    displayScenariosList(currentScenarios); 
                }
            } else if (relocationType === 'monetary') {
                // Replicate necessary pre-calculations for calculatePureCash
                const resRates = getRates(inputs.resBlock);
                let totalEffectiveStorageAreaRounded = 0;
                inputs.storageInputs.forEach(stor => { totalEffectiveStorageAreaRounded += round(stor.rawArea * 0.5, 2); });
                const confirmedAreaPrecise = inputs.resArea + totalEffectiveStorageAreaRounded;
                const confirmedArea = round(confirmedAreaPrecise, 2);
                const publicCompAreaUncapped = round(confirmedAreaPrecise * 0.1, 2);
                const publicCompArea = Math.min(publicCompAreaUncapped, MAX_PUBLIC_AREA);
                // Create a temporary input object for calculatePureCash
                const cashInputs = {
                    ...inputs,
                    confirmedAreaPrecise: confirmedAreaPrecise,
                    confirmedArea: confirmedArea,
                    publicCompArea: publicCompArea,
                    resRates: resRates,
                    relocationRewardTiered: calculateRelocationReward(confirmedArea),
                    publicHousingDeductionAmount: calculatePublicDeduction(inputs.isPublicHousing, confirmedAreaPrecise, resRates),
                    // HEC/equivalentArea might be needed by calculatePureCash for its breakdown?
                    // If so, call calculateHousingEligibleCompAndStructure here too.
                     housingEligibleComp: 0, // Placeholder, recalculate if needed by calculatePureCash
                     equivalentArea: 0 // Placeholder
                };
                 const { housingEligibleComp, totalStructureComp } = calculateHousingEligibleCompAndStructure(cashInputs);
                 cashInputs.housingEligibleComp = housingEligibleComp;
                 cashInputs.totalStructureComp = totalStructureComp; // Needed?
                 if (inputs.resBlock === 'A') { 
                     cashInputs.equivalentArea = housingEligibleComp > 0 ? round(housingEligibleComp / HOUSING_PRICE, 2) : 0; 
                 } else { 
                     cashInputs.equivalentArea = round(confirmedAreaPrecise + round(confirmedAreaPrecise * 0.1, 2), 2); 
                 }

                const cashScenario = calculatePureCash(cashInputs); 
                if (cashScenario) {
                    currentScenarios = [cashScenario];
                    displayScenarioDetail(cashScenario.id); 
                } else { /* handle error */ }
            } else if (relocationType === 'remote') {
                // 异地安置 (Asynchronous calculation)
                import('./remoteCalculator.js').then(module => {
                    currentScenarios = module.calculateRemoteRelocationScenarios(inputs);
                    // Now that currentScenarios is populated, display the list
                    displayScenariosList(currentScenarios); 
                }).catch(error => {
                    console.error("Error loading or calculating remote scenarios:", error);
                    inputError.textContent = '计算异地安置方案失败: ' + error.message;
                    displayScenariosList([]); // Display empty list on error
                });
                // No displayScenariosList call here, it's inside the .then()
            }
            
            // // Display Scenarios List - MOVED inside specific handlers above
            // displayScenariosList(currentScenarios);
        });
        if (toggleDetailsButton) toggleDetailsButton.addEventListener('click', () => { scenarioBreakdown.classList.toggle('hidden'); toggleDetailsButton.textContent = scenarioBreakdown.classList.contains('hidden') ? '显示详细构成' : '隐藏详细构成'; });
        if (backToListButton) backToListButton.addEventListener('click', () => { scenarioDetailSection.classList.add('hidden'); scenarioListSection.classList.remove('hidden'); if(scenarioListUl) scenarioListUl.querySelectorAll('.compare-checkbox:checked').forEach(cb => cb.checked = false); handleCompareCheckboxChange(); });
        if (storageAdviceButton) {
            storageAdviceButton.addEventListener('click', () => {
                const scenario = currentScenarios.find(s => s.id === currentScenarioId);
                // ... (rest of the listener code)
                if (scenario && scenario.type !== "Remote Housing Exact" && scenario.type !== "Remote Housing + Cash") {
                    if (currentInputs && Object.keys(currentInputs).length > 0) {
                        generateStorageAdvice(scenario, currentInputs); // Call the function defined above
                        storageAdviceContent.classList.remove('hidden');
                    } else { /* handle missing inputs */ }
                } else { /* handle non-applicable scenario or no selection */ }
            });
        }
        if (compareSelectedButton) compareSelectedButton.addEventListener('click', () => { const selectedBoxes = document.querySelectorAll('.compare-checkbox:checked'); const selectedIds = Array.from(selectedBoxes).map(checkbox => checkbox.value); if (selectedIds.length > 0) { displayComparison(selectedIds); } });
        if (showLossDetailsButton) showLossDetailsButton.addEventListener('click', () => { comparisonLossDetails.classList.toggle('hidden'); showLossDetailsButton.textContent = comparisonLossDetails.classList.contains('hidden') ? '显示损失详情' : '隐藏损失详情'; });
        if (closeComparisonButton) closeComparisonButton.addEventListener('click', () => { comparisonSection.classList.add('hidden'); scenarioListSection.classList.remove('hidden'); });

        // 初始化添加第一个杂物间输入行
        if (storageInputsContainer) {
            storageInputsContainer.appendChild(createStorageInputRow());
        }

        // ... existing calculateLossScenario function (ensure it handles different scenario types if needed) ...
        // ... existing displaySingleComparison function ...
        // ... existing displayMultiComparison function ...

        // Modify the overDeadlineButton listener to use the global ID
        if (overDeadlineButton) {
            overDeadlineButton.addEventListener('click', () => {
                // Use the globally stored currentScenarioId
                if (!currentScenarioId) {
                    console.error("No scenario selected for over deadline comparison.");
                    return;
                }
                displayOverDeadlineComparison(currentScenarioId);
                overDeadlineContent.classList.remove('hidden');
                // Ensure other details are hidden
                scenarioBreakdown.classList.add('hidden');
                storageAdviceContent.classList.add('hidden');
                toggleDetailsButton.textContent = '显示详细构成';
            });
        }
        
        // Modify overDeadlineShowLossDetailsButton if it relies on dataset
        if (overDeadlineShowLossDetailsButton) {
            overDeadlineShowLossDetailsButton.addEventListener('click', () => {
                overDeadlineLossDetailsList.innerHTML = '';
                // Retrieve details directly from the comparison function's result or store globally
                const lostItems = JSON.parse(overDeadlineShowLossDetailsButton.dataset.lossDetails || '[]'); // Keep using dataset for now, ensure it's set in displayOverDeadlineComparison
                
                if (lostItems && lostItems.length > 0) {
                    lostItems.forEach(item => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span class="item-name">${item.name}:</span> <span class="item-value">${formatMoney(item.value)} 元</span>`;
                        overDeadlineLossDetailsList.appendChild(li);
                    });
                } else {
                    overDeadlineLossDetailsList.innerHTML = '<li>无具体损失项信息。</li>';
                }

                overDeadlineLossDetails.classList.toggle('hidden');
                overDeadlineShowLossDetailsButton.textContent = overDeadlineLossDetails.classList.contains('hidden') ? 
                    '显示损失详情' : '隐藏损失详情';
            });
        }
        
        // --- Over Deadline Comparison Logic ---
        // Ensure displayOverDeadlineComparison sets the dataset for the button
        const displayOverDeadlineComparison = (scenarioId) => {
            console.log(`displayOverDeadlineComparison called for ID: ${scenarioId}`);
            try {
                const originalScenario = currentScenarios.find(s => s.id === scenarioId);
                if (!originalScenario) {
                    console.error("Original scenario not found for Over Deadline comparison:", scenarioId);
                    // Optionally display an error message to the user
                    // overDeadlineComparison.innerHTML = '<p class="error-message">无法加载原始方案进行比较。</p>';
                    // overDeadlineContent.classList.remove('hidden'); 
                    return;
                }
                console.log("Found original scenario:", originalScenario);

                const lossScenarioResult = calculateLossScenario(originalScenario, currentInputs);
                console.log("Calculated loss scenario:", lossScenarioResult);

                // --- Generate Table HTML --- (Existing logic)
                let tableHtml = '<table><thead><tr><th>指标</th>';
                tableHtml += `<th>签约期内 (${originalScenario.name})</th>`;
                tableHtml += `<th>超过签约期</th>`;
                tableHtml += '</tr></thead><tbody>';
                const metrics = [
                     { key: 'combo', label: '选择房型' }, // Needs careful handling for different types
                     { key: 'totalCompensation', label: '补偿款总计 (元)', formatter: formatMoney },
                     { key: 'finalDifference', label: '应交(-)/退(+)差价 (元)' },
                 ];
                metrics.forEach(metric => {
                     tableHtml += `<tr><td><strong>${metric.label}</strong></td>`;
                     let originalValue = originalScenario[metric.key];
                     let lossValue = lossScenarioResult[metric.key];
                     let formattedOriginalValue = 'N/A';
                     let formattedLossValue = 'N/A';
                     
                     // Special handling for combo/房型 based on type
                     if (metric.key === 'combo') {
                         if (originalScenario.type.includes("Remote")) {
                            formattedOriginalValue = `${originalScenario.propertyName || ''} ${originalScenario.selectedArea}㎡`;
                         } else if (originalScenario.combo && originalScenario.combo.length > 0) {
                            formattedOriginalValue = originalScenario.combo.join('㎡ + ') + '㎡';
                         } else {
                             formattedOriginalValue = '无'; // Pure Monetary or Max Housing without specific combo
                         }
                         
                         if (lossScenarioResult.type !== 'Pure Monetary' && !lossScenarioResult.canAffordHousing) {
                            formattedLossValue = `<span style="color:red; font-style:italic;">补偿款不足，无法选此房</span>`;
                         } else {
                             // Loss scenario keeps the same housing selection if affordable
                             formattedLossValue = formattedOriginalValue;
                         }
                     } else if (metric.key === 'finalDifference') {
                         const diffValueOrig = originalScenario.finalDifference;
                         const diffColorOrig = diffValueOrig >= 0 ? 'red' : 'green';
                         formattedOriginalValue = `<span style="color:${diffColorOrig}; font-weight: bold;">${formatMoney(diffValueOrig)}</span>`;
                         if (!lossScenarioResult.canAffordHousing && originalScenario.type !== "Pure Monetary") {
                            formattedLossValue = 'N/A (无法承担购房款)';
                         } else {
                             const diffValueLoss = lossScenarioResult.finalDifference;
                             const diffColorLoss = diffValueLoss >= 0 ? 'red' : 'green';
                             formattedLossValue = `<span style="color:${diffColorLoss}; font-weight: bold;">${formatMoney(diffValueLoss)}</span>`;
                         }
                     } else if (metric.formatter) {
                         formattedOriginalValue = metric.formatter(originalValue);
                         // Only format loss value if housing is affordable or it's pure monetary
                         formattedLossValue = (!lossScenarioResult.canAffordHousing && originalScenario.type !== "Pure Monetary") ? 'N/A' : metric.formatter(lossValue);
                     } else { 
                         formattedOriginalValue = (originalValue === undefined || originalValue === null) ? 'N/A' : originalValue;
                         formattedLossValue = (!lossScenarioResult.canAffordHousing && originalScenario.type !== "Pure Monetary") ? 'N/A' : ((lossValue === undefined || lossValue === null) ? 'N/A' : lossValue);
                     }
                     tableHtml += `<td>${formattedOriginalValue}</td>`;
                     tableHtml += `<td>${formattedLossValue}</td>`;
                     tableHtml += '</tr>';
                 });
                tableHtml += '</tbody></table>';
                overDeadlineComparison.innerHTML = tableHtml;

                // --- Update Summary and Loss Details --- 
                if (lossScenarioResult.lostItems && lossScenarioResult.lostItems.length > 0) {
                    const totalLoss = lossScenarioResult.lostItems.reduce((sum, item) => sum + item.value, 0);
                    overDeadlineLossSummary.innerHTML = `超过签约期配合征迁手续，总补偿款损失 <span style="color:red;">${formatMoney(totalLoss)}</span> 元。`;
                    overDeadlineLossSummary.classList.remove('hidden');
                    overDeadlineShowLossDetailsButton.classList.remove('hidden');
                    overDeadlineShowLossDetailsButton.dataset.lossDetails = JSON.stringify(lossScenarioResult.lostItems);
                } else {
                     overDeadlineLossSummary.classList.add('hidden');
                     overDeadlineShowLossDetailsButton.classList.add('hidden');
                     overDeadlineShowLossDetailsButton.dataset.lossDetails = '[]'; // Clear dataset
                }
            
                overDeadlineLossDetails.classList.add('hidden'); // Keep details hidden initially
                overDeadlineContent.classList.remove('hidden'); // **Ensure this is called**
                console.log("Over deadline content should now be visible.");
                
            } catch (error) {
                console.error("Error in displayOverDeadlineComparison:", error);
                // Display error to user
                overDeadlineComparison.innerHTML = `<p class="error-message">比较时出错: ${error.message}</p>`;
                overDeadlineContent.classList.remove('hidden'); // Still show the section with the error
            }
        };

        // --- Storage Advice Logic (Inside initializeApp) ---
        const generateStorageAdvice = (currentScenario, originalInputs) => {
            adviceText.innerText = "正在分析..."; 
            let adviceLines = []; 
            
            // Check if core calculation functions exist
            if (typeof calculateCompensation !== 'function' || 
                typeof calculatePureCash !== 'function' ||
                typeof calculateMaxHousing !== 'function' ||
                typeof calculateOneHousePlusCash !== 'function' ||
                typeof calculateTwoHousesPlusCash !== 'function' ||
                typeof calculateHousingEligibleCompAndStructure !== 'function' ||
                typeof calculateRelocationReward !== 'function' ||
                typeof calculatePublicDeduction !== 'function' ||
                typeof roundUpToTier !== 'function' ||
                typeof findHousingCombinations !== 'function') {
                    console.error("Storage Advice - Missing core calculation function dependency!");
                    adviceText.innerText = "计算建议所需的功能缺失。";
                    return;
            }
            
            const hasOriginalStorage = originalInputs.storageInputs && originalInputs.storageInputs.length > 0 && originalInputs.storageInputs.reduce((sum, s) => sum + s.rawArea, 0) > 0;
            const totalRawStorageArea = hasOriginalStorage ? originalInputs.storageInputs.reduce((sum, s) => sum + s.rawArea, 0) : 0;
            
            // Helper to calculate EqArea needed outside main calculations
            const calculateEquivalentAreaDirectly = (inputs) => {
                 const { resArea, storageInputs, resBlock } = inputs;
                 const resRates = getRates(resBlock);
                 let effStorArea = 0;
                 storageInputs.forEach(stor => { effStorArea += round(stor.rawArea * 0.5, 2); });
                 const confAreaPrecise = resArea + effStorArea;
                 let eqArea = 0;
                 if (resBlock === 'A') { 
                    // Need to replicate HEC calc minimally for this specific purpose
                    const tempInputsForHEC = {
                        ...inputs,
                        confirmedAreaPrecise: confAreaPrecise, // Pass calculated precise area
                        publicCompArea: Math.min(round(confAreaPrecise * 0.1, 2), MAX_PUBLIC_AREA) // Pass calculated public area
                    }
                    const { housingEligibleComp: hec } = calculateHousingEligibleCompAndStructure(tempInputsForHEC);
                    eqArea = hec > 0 ? round(hec / HOUSING_PRICE, 2) : 0; 
                 } else { 
                    eqArea = round(confAreaPrecise + round(confAreaPrecise * 0.1, 2), 2); 
                 }
                 return eqArea;
            };

            if (hasOriginalStorage) {
                // 1. Create inputs for the scenario *without* storage
                const inputsWithoutStorage = {
                    ...originalInputs,
                    storageInputs: [] // Remove storage
                    // Recalculate derived values needed by core functions
                    // Let the core functions handle confirmedArea, publicCompArea etc.
                };

                // 2. Recalculate the comparison scenario without storage
                let scenarioWithoutStorage = null;
                let diff = 0;
                
                try {
                    if (currentScenario.type === "Pure Monetary") {
                        // Need to run precalcs for pure cash
                        const resRates = getRates(inputsWithoutStorage.resBlock);
                        const confirmedAreaPrecise = inputsWithoutStorage.resArea; // No storage
                        const confirmedArea = round(confirmedAreaPrecise, 2);
                        const publicCompArea = Math.min(round(confirmedAreaPrecise * 0.1, 2), MAX_PUBLIC_AREA);
                        const cashInputs = {
                            ...inputsWithoutStorage,
                            confirmedAreaPrecise, confirmedArea, publicCompArea, resRates,
                            relocationRewardTiered: calculateRelocationReward(confirmedArea),
                            publicHousingDeductionAmount: calculatePublicDeduction(inputsWithoutStorage.isPublicHousing, confirmedAreaPrecise, resRates)
                        };
                        const { housingEligibleComp, totalStructureComp } = calculateHousingEligibleCompAndStructure(cashInputs);
                        cashInputs.housingEligibleComp = housingEligibleComp;
                        cashInputs.totalStructureComp = totalStructureComp;
                        cashInputs.equivalentArea = calculateEquivalentAreaDirectly(cashInputs);
                        scenarioWithoutStorage = calculatePureCash(cashInputs);
                        
                    } else if (currentScenario.type === "Max Housing") {
                         // Use the main calculateCompensation and filter for Max Housing
                         const potentialScenarios = calculateCompensation(inputsWithoutStorage);
                         // Find the Max Housing scenario corresponding to the new (lower) resettlement area
                         const eqAreaWithoutStorage = calculateEquivalentAreaDirectly(inputsWithoutStorage);
                         const resAreaWithoutStorage = roundUpToTier(eqAreaWithoutStorage);
                         scenarioWithoutStorage = potentialScenarios.find(s => s.type === "Max Housing" && Math.abs(s.selectedArea - resAreaWithoutStorage) < 0.01);

                    } else if (currentScenario.type === "1 House + Cash" || currentScenario.type === "2 Houses + Cash") {
                        // Use the main calculateCompensation and filter for the specific combo
                        const potentialScenarios = calculateCompensation(inputsWithoutStorage);
                        const currentComboStr = [...currentScenario.combo].sort((a,b)=>a-b).join('-');
                        scenarioWithoutStorage = potentialScenarios.find(s => {
                           if (s.type !== currentScenario.type || !s.combo) return false;
                           const scenarioComboStr = [...s.combo].sort((a,b)=>a-b).join('-');
                           return scenarioComboStr === currentComboStr;
                        });
                    }

                    // 3. Calculate difference if comparison scenario found
                    if (scenarioWithoutStorage) {
                        diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
                    } else {
                        console.warn("Could not find matching scenario without storage for comparison.");
                    }

                } catch (e) {
                    console.error("Error recalculating scenario without storage for advice:", e);
                    scenarioWithoutStorage = null;
                }
                
                // 4. Generate advice text based on comparison
                // ... (This part of the logic seems okay, relies on diff and scenario types)
                if (currentScenario.type === "Pure Monetary") { 
                    adviceLines.push(`当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间使您的总补偿款(未计装修费)增加了约 ${formatMoney(diff)} 元。`); 
                 } else if (currentScenario.type === "Max Housing") { 
                     const eqAreaWithoutStorage = calculateEquivalentAreaDirectly(inputsWithoutStorage);
                     const resAreaWithoutStorage = roundUpToTier(eqAreaWithoutStorage);
                     if (Math.abs(currentScenario.resettlementArea - resAreaWithoutStorage) < 0.01) { 
                         adviceLines.push(`即使没有当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间，您也可以安置到 ${formatArea(currentScenario.resettlementArea)}㎡。`); 
                         if (scenarioWithoutStorage) { 
                             adviceLines.push(`若无此杂物间，选择 ${scenarioWithoutStorage.name} 方案，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`); 
                         } else { 
                             adviceLines.push(`若无此杂物间，可能无法选择 ${currentScenario.name} 这个具体组合，或差价计算失败。`); 
                         } 
                     } else { 
                         adviceLines.push(`当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间使您的理论最高安置面积从 ${formatArea(resAreaWithoutStorage)}㎡ 提升到了 ${formatArea(currentScenario.resettlementArea)}㎡。`); 
                         if (scenarioWithoutStorage) { 
                             adviceLines.push(`若无此杂物间，选择 ${scenarioWithoutStorage.name || formatArea(resAreaWithoutStorage)+'㎡对应方案'}，差价对比当前方案约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`); 
                         } else { 
                             adviceLines.push(`若无此杂物间，您可能需要选择 ${formatArea(resAreaWithoutStorage)}㎡ 的方案，具体差价影响计算失败。`); 
                         } 
                     } 
                 } else if (currentScenario.type === "1 House + Cash" || currentScenario.type === "2 Houses + Cash") { 
                     const selectedComboText = currentScenario.name.replace(" + 货币", ""); 
                     if (scenarioWithoutStorage) { 
                         adviceLines.push(`即使没有当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间，您通常也可以选择 ${selectedComboText} 房型。`); 
                         adviceLines.push(`若无此杂物间，选择此方案时，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`); 
                     } else { 
                         adviceLines.push(`若无此杂物间，您的补偿款可能不足以选择 ${selectedComboText} 房型。`); 
                     } 
                 }

            } else {
                adviceLines.push("您当前未输入杂物间信息。");
            }

            adviceLines.push("---");
            // 5. Add advice about adding storage (up-tiering potential)
            // ... (This part seems okay, relies on calculateEquivalentAreaDirectly)
            if (currentScenario.type !== "Pure Monetary") {
                 const currentEqArea = calculateEquivalentAreaDirectly(originalInputs);
                 const currentResettlementArea = currentScenario.resettlementArea; // Assumes original scenario has this
                 const potentialTiers = [...HOUSING_SIZES, 180].filter(t => t > 0).sort((a, b) => a - b);
                 let nextTier = -1, currentTierLowerBound = 0;
                 // ... (Existing logic to find next tier) ...
                 for (let i = 0; i < potentialTiers.length; i++) { const tier = potentialTiers[i]; if (tier > currentResettlementArea) { nextTier = tier; currentTierLowerBound = potentialTiers[i-1] || MIN_HOUSING_EQUIVALENT_AREA; break; } /* ... rest of tier logic ... */ }
                 
                 if (nextTier !== -1 && currentEqArea <= currentTierLowerBound) {
                     const eqAreaNeededForNext = currentTierLowerBound + 0.001;
                     let addedRawStorage = 0, foundStorageNeeded = -1;
                     const increment = 0.01, maxIterations = 10000;
                     console.log(`Advice: Current EqArea=${currentEqArea}, Target EqArea=${eqAreaNeededForNext} (for tier ${nextTier})`);
                     for (let i = 0; i < maxIterations; i++) {
                         addedRawStorage = round(addedRawStorage + increment, 2);
                         const tempInputs = JSON.parse(JSON.stringify(originalInputs)); 
                         // Ensure storageInputs exists before pushing
                         if (!tempInputs.storageInputs) tempInputs.storageInputs = [];
                         const hypotheticalStorage = { rawArea: addedRawStorage, block: 'B' }; 
                         tempInputs.storageInputs.push(hypotheticalStorage); 
                         const newEquivalentArea = calculateEquivalentAreaDirectly(tempInputs); 
                         if (newEquivalentArea >= eqAreaNeededForNext) { 
                             foundStorageNeeded = addedRawStorage; 
                             console.log(`Advice: Target reached at Added Raw=${foundStorageNeeded}`); 
                             break; 
                         }
                     }
                     if (foundStorageNeeded > 0) { 
                         adviceLines.push(`若要上靠一档至 ${nextTier}㎡ (对应等面积需 > ${formatArea(currentTierLowerBound)}㎡)，通过模拟计算，需要增加约 ${formatArea(foundStorageNeeded)}㎡ 杂物间面积 (按河南新村35座杂物间价格)。`); 
                     } else { 
                         adviceLines.push(`未能通过模拟计算找到上靠至下一档 (${nextTier}㎡) 所需的杂物间面积 (可能需求过大或计算问题)。`); 
                     } 
                 } else if (nextTier !== -1 && currentEqArea > currentTierLowerBound) { 
                     adviceLines.push(`您当前条件已满足或接近上靠至 ${nextTier}㎡ 的要求。`); 
                 } else if (currentScenario.resettlementArea !== undefined) { 
                     adviceLines.push(`您已达到或超过最高安置档位 (${currentScenario.resettlementArea}㎡)，通常无法再上靠。`); 
                 }
             }
            adviceText.innerText = adviceLines.length > 0 ? adviceLines.join('\n\n') : "未能生成相关建议。";
        };

    } // End initializeApp function

    // --- REMOVE generateStorageAdvice from global scope if it was there ---
    // // const generateStorageAdvice = (...) => { ... }; 

    // --- Over Deadline Comparison Logic (Keep outside initializeApp if it doesn't depend on internal functions) ---
    // const displayOverDeadlineComparison = (scenarioId) => { ... }; 

}); // End DOMContentLoaded
