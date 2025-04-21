// 导入必要的配置
import { COMPLETE_APT_RATE, SETTLING_RATE, MOVING_RATE_BASE, TRANSITION_RATE, 
         TRANSITION_MONTHS_HOUSING, TRANSITION_MONTHS_CASH, RENTAL_SUBSIDY, 
         PUBLIC_HOUSING_FACTOR, MIN_MOVING_1, MIN_MOVING_2, 
         PUBLIC_AREA_DIFF_HOUSING, PUBLIC_AREA_DIFF_CASH, MONETARY_REWARD_RATE, MAX_PUBLIC_AREA } from './config.js';
import { BLOCK_RATES } from './blockRates.js';
import { REMOTE_PROPERTIES } from './relocationOptions.js';

// 工具函数
const round = (value, decimals) => { 
    if (typeof value !== 'number' || isNaN(value)) return 0; 
    const multiplier = Math.pow(10, decimals || 0); 
    return Math.round(value * multiplier + Number.EPSILON) / multiplier; 
};

const formatMoney = (amount) => { 
    if (typeof amount !== 'number' || isNaN(amount)) return '0'; 
    return Math.round(amount).toLocaleString('zh-CN'); 
};

const formatArea = (area) => { 
    if (typeof area !== 'number' || isNaN(area)) return '0.00'; 
    return area.toFixed(2); 
};

const formatPreciseArea = (area) => { 
    if (typeof area !== 'number' || isNaN(area)) return '0.00'; 
    return area.toString(); 
};

const formatRate = (rate) => { 
    if (typeof rate !== 'number' || isNaN(rate)) return '0'; 
    return Number(rate.toFixed(4)).toLocaleString('zh-CN'); 
};

// 获取区块的费率
const getRates = (blockType) => BLOCK_RATES[blockType] || BLOCK_RATES['B'];

// 计算搬迁奖励
const calculateRelocationReward = (confirmedArea) => { 
    if (confirmedArea >= 90) return 30000; 
    if (confirmedArea >= 60) return 25000; 
    return 20000; 
};

// 计算公房扣减
const calculatePublicDeduction = (isPublicHousing, confirmedAreaPrecise, resRates) => { 
    return isPublicHousing ? round(confirmedAreaPrecise * resRates.locationRate * PUBLIC_HOUSING_FACTOR, 0) : 0; 
};

// Calculate Housing Eligible Compensation and Structure Bonus (Replicated Logic)
const calculateHousingEligibleCompAndStructure_Remote = (inputs) => {
    const { resArea, storageInputs, resBlock } = inputs;
    const resRates = getRates(resBlock);

    let totalEffectiveStorageAreaRounded = 0;
    storageInputs.forEach(stor => {
        totalEffectiveStorageAreaRounded += round(stor.rawArea * 0.5, 2);
    });
    const confirmedAreaPrecise = resArea + totalEffectiveStorageAreaRounded;
    const publicCompAreaUncapped = round(confirmedAreaPrecise * 0.1, 2);
    const publicCompArea = Math.min(publicCompAreaUncapped, MAX_PUBLIC_AREA);

    let housingEligibleComp = 0;
    let totalStructureComp = 0;

    // Residence
    const resBaseValue = resArea * (resRates.locationRate + resRates.oldHouseRate);
    const resStructureComp = resArea * resRates.structureRate;
    housingEligibleComp += resBaseValue + resStructureComp;
    totalStructureComp += resStructureComp;

    // Storage
    storageInputs.forEach((stor) => {
        const storRates = getRates(stor.block);
        const preciseEffectiveArea = stor.rawArea * 0.5;
        const storBaseValue = preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate);
        const storStructureComp = preciseEffectiveArea * storRates.structureRate;
        housingEligibleComp += storBaseValue + storStructureComp;
        totalStructureComp += storStructureComp;
    });

    // Public Area Compensation (Value for Housing)
    const publicCompValue = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
    housingEligibleComp += publicCompValue;

    // Complete Apartment Compensation
    const completeAptComp = confirmedAreaPrecise * COMPLETE_APT_RATE;
    housingEligibleComp += completeAptComp;

    return {
        housingEligibleComp: round(housingEligibleComp, 2),
        totalStructureComp: round(totalStructureComp, 2),
        publicCompArea: publicCompArea, // Return calculated publicCompArea
        confirmedAreaPrecise: confirmedAreaPrecise // Return calculated confirmedAreaPrecise
    };
};

// Calculate ALL possible remote scenarios for a given input set
export function calculateRemoteRelocationScenarios(inputs) {
    const { remoteAreaType } = inputs;
    if (!remoteAreaType || !REMOTE_PROPERTIES[remoteAreaType]) {
        console.error("Invalid remote area type:", remoteAreaType);
        return [];
    }

    // 1. Calculate total HEC and other base values
    const { 
        housingEligibleComp,
        totalStructureComp,
        publicCompArea,
        confirmedAreaPrecise 
    } = calculateHousingEligibleCompAndStructure_Remote(inputs);
    
    const confirmedArea = round(confirmedAreaPrecise, 2);
    const relocationRewardTiered = calculateRelocationReward(confirmedArea);
    const publicHousingDeductionAmount = calculatePublicDeduction(inputs.isPublicHousing, confirmedAreaPrecise, getRates(inputs.resBlock));

    const baseInputs = {
        ...inputs,
        housingEligibleComp,
        totalStructureComp,
        publicCompArea,
        confirmedAreaPrecise,
        confirmedArea,
        relocationRewardTiered,
        publicHousingDeductionAmount
    };

    const properties = REMOTE_PROPERTIES[remoteAreaType];
    const scenarios = [];
    const tolerance = 1; // Allow HEC to be slightly less than cost

    properties.forEach(property => {
        if (!property.sizes || property.sizes.length === 0 || property.price <= 0) {
            return; // Skip property if no sizes or invalid price
        }

        // Iterate through ALL available sizes for this property
        property.sizes.forEach(size => {
            const housingCost = round(size * property.price, 0);

            // Affordability Check for THIS size
            if (housingEligibleComp >= housingCost - tolerance) {
                // If affordable, calculate the scenario for this specific size
                const scenario = calculateRemoteValueSplitScenario(
                    baseInputs, 
                    property, 
                    size 
                );
                // Add scenario if calculation was successful
                if (scenario) {
                    // Avoid adding duplicates if somehow multiple checks pass for the same size (unlikely)
                    if (!scenarios.some(s => s.propertyName === scenario.propertyName && s.selectedArea === scenario.selectedArea)) {
                        scenarios.push(scenario);
                    }
                }
            }
        });
    });

    // Sort final list
    scenarios.sort((a, b) => {
        if (a.propertyName !== b.propertyName) return a.propertyName.localeCompare(b.propertyName);
        return a.selectedArea - b.selectedArea;
    });

    return scenarios;
}

// Calculate a SINGLE remote scenario using VALUE SPLIT
function calculateRemoteValueSplitScenario(baseInputs, property, size) {
    const { 
        resArea, storageInputs, resBlock, isPublicHousing, decorationFee,
        housingEligibleComp, totalStructureComp, publicCompArea, confirmedAreaPrecise, 
        confirmedArea, relocationRewardTiered, publicHousingDeductionAmount
    } = baseInputs;
    
    const resRates = getRates(resBlock);
    const propertyPrice = property.price;
    const houseValue = round(size * propertyPrice, 0);

    // Determine Proportions
    let propHouse = 0;
    if (housingEligibleComp > 0) {
        propHouse = Math.min(houseValue / housingEligibleComp, 1);
    }
    // Handle floating point precision issues near 1
    if (propHouse > 1 && propHouse < 1.00001) propHouse = 1;
    const propCash = Math.max(0, 1 - propHouse);

    let breakdown_part1 = [], breakdown_part2 = [], totalPart1Value = 0, totalPart2Value = 0;

    // Calculate base values needed for splitting (some might be pre-calculated in HEC but needed for breakdown)
    const resLocOldValue_Total = resArea * (resRates.locationRate + resRates.oldHouseRate);
    let storLocOldValue_Total = 0;
    storageInputs.forEach(stor => {
        const storRates = getRates(stor.block);
        const preciseEffectiveArea = stor.rawArea * 0.5;
        storLocOldValue_Total += preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate);
    });
    const publicCompValue_H_Total = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
    const completeAptValue_Total = confirmedAreaPrecise * COMPLETE_APT_RATE;
    // totalStructureComp is already calculated

    // --- Part 1: Housing Compensation Breakdown ---
    const p1_resLocOld = resLocOldValue_Total * propHouse;
    breakdown_part1.push({ name: `住宅区位+旧房(房部分 ${resBlock})`, value: p1_resLocOld, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_resLocOld;

    const p1_storLocOld = storLocOldValue_Total * propHouse;
    breakdown_part1.push({ name: `杂物间区位+旧房(房部分 合计)`, value: p1_storLocOld, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_storLocOld;

    const p1_publicComp = publicCompValue_H_Total * propHouse;
    breakdown_part1.push({ name: "公摊补偿(房部分)", value: p1_publicComp, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_publicComp;

    const p1_structureComp = totalStructureComp * propHouse;
    breakdown_part1.push({ name: "房屋结构等级优惠(房部分)", value: p1_structureComp, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_structureComp;

    const p1_completeAptComp = completeAptValue_Total * propHouse;
    breakdown_part1.push({ name: "成套房补贴(房部分)", value: p1_completeAptComp, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_completeAptComp;
    
    // Transition fee (housing part)
    const transitionHousingTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING;
    const p1_transition = transitionHousingTotal * propHouse;
    breakdown_part1.push({ name: `过渡费+增发(房部分×${TRANSITION_MONTHS_HOUSING}月)`, value: p1_transition, formula: `房部分比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_transition;
    
    // Settling fee (housing part)
    const settlingTotal = confirmedAreaPrecise * SETTLING_RATE;
    const p1_settling = settlingTotal * propHouse;
    breakdown_part1.push({ name: "安家补贴(房部分)", value: p1_settling, formula: `房部分比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_settling;

    // --- Part 2: Cash Compensation Breakdown ---
    const p2_resLocOld = resLocOldValue_Total * propCash;
    breakdown_part2.push({ name: `住宅区位+旧房(币部分 ${resBlock})`, value: p2_resLocOld, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_resLocOld;

    const p2_storLocOld = storLocOldValue_Total * propCash;
    breakdown_part2.push({ name: `杂物间区位+旧房(币部分 合计)`, value: p2_storLocOld, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_storLocOld;

    const publicCompValue_C_Total = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH);
    const p2_publicComp = publicCompValue_C_Total * propCash;
    breakdown_part2.push({ name: "公摊补偿(币部分)", value: p2_publicComp, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_publicComp;

    // Monetary Reward (based on cash proportion area)
    const confirmedAreaPrecise_cash_prop = confirmedAreaPrecise * propCash;
    const p2_monetaryReward = confirmedAreaPrecise_cash_prop * MONETARY_REWARD_RATE;
    breakdown_part2.push({ name: "货币奖励(币部分)", value: p2_monetaryReward, formula: `${formatArea(confirmedAreaPrecise_cash_prop)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
    totalPart2Value += p2_monetaryReward;

    const p2_completeAptComp = completeAptValue_Total * propCash;
    breakdown_part2.push({ name: "成套房补贴(币部分)", value: p2_completeAptComp, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_completeAptComp;

    // Transition fee (cash part)
    const transitionCashTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_CASH;
    const p2_transition = transitionCashTotal * propCash;
    breakdown_part2.push({ name: `过渡费(币部分×${TRANSITION_MONTHS_CASH}月)`, value: p2_transition, formula: `货币部分比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_transition;
    
    // Settling fee (cash part)
    const p2_settling = settlingTotal * propCash;
    breakdown_part2.push({ name: "安家补贴(币部分)", value: p2_settling, formula: `货币部分比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_settling;

    // --- Combined Fees & Deductions ---
    
    // Moving Fee (Value split logic like Block A original)
    let finalFee_P1 = 0, finalFee_P2 = 0, formula_P1 = "", formula_P2 = "";
    const areaBasisP1 = confirmedArea * propHouse;
    const areaBasisP2 = confirmedArea * propCash;
    const fee_P1_calc = areaBasisP1 * MOVING_RATE_BASE * 2; // Assume 2 moves for housing part
    const fee_P2_calc = areaBasisP2 * MOVING_RATE_BASE * 1; // Assume 1 move for cash part
    
    if (fee_P1_calc + fee_P2_calc < MIN_MOVING_2) { // Use MIN_MOVING_2 as base if any housing involved
        finalFee_P1 = MIN_MOVING_2;
        finalFee_P2 = 0;
        formula_P1 = `补足最低 ${formatMoney(MIN_MOVING_2)} (原计算: ${formatMoney(round(fee_P1_calc,0))} + ${formatMoney(round(fee_P2_calc,0))} < ${formatMoney(MIN_MOVING_2)})`;
        formula_P2 = "已在房部分补足最低";
    } else {
        finalFee_P1 = fee_P1_calc;
        finalFee_P2 = fee_P2_calc;
        formula_P1 = `${formatArea(areaBasisP1)}㎡ × ${MOVING_RATE_BASE}/㎡ × 2`;
        formula_P2 = `${formatArea(areaBasisP2)}㎡ × ${MOVING_RATE_BASE}/㎡ × 1`;
    }
    if (finalFee_P1 !== 0) breakdown_part1.push({ name: "搬家费(房部分)", value: finalFee_P1, formula: formula_P1 });
    if (finalFee_P2 !== 0) breakdown_part2.push({ name: "搬家费(币部分)", value: finalFee_P2, formula: formula_P2 });
    totalPart1Value += finalFee_P1;
    totalPart2Value += finalFee_P2;

    // Relocation Reward (Goes entirely to cash part)
    breakdown_part2.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` });
    totalPart2Value += relocationRewardTiered;

    // Rental Subsidy (Goes entirely to cash part)
    breakdown_part2.push({ name: "租房补贴", value: RENTAL_SUBSIDY, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
    totalPart2Value += RENTAL_SUBSIDY;

    // Combine breakdowns
    let fullBreakdown = [...breakdown_part1, ...breakdown_part2];
    let combinedValue = totalPart1Value + totalPart2Value;

    // Decoration Fee (Add at the end, not split)
    if (decorationFee > 0) {
        fullBreakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" });
        combinedValue += decorationFee;
    }

    // Public Housing Deduction (Apply at the end, not split)
    if (isPublicHousing && publicHousingDeductionAmount !== 0) {
        fullBreakdown.push({ 
            name: "公房扣减", 
            value: publicHousingDeductionAmount, 
            formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, 
            isDeduction: true 
        });
        combinedValue += publicHousingDeductionAmount; // Deduction is negative
    }

    const totalCompensation = round(combinedValue, 0);
    const finalDifference = totalCompensation - houseValue; // Difference between total compensation and house cost

    // Determine type based on whether there was a cash portion
    const scenarioType = propCash > 0.0001 ? "Remote Housing + Cash" : "Remote Housing Exact"; 

    // --- Name Generation --- 
    const scenarioName = `${size}㎡${propCash > 0.0001 ? ' + 货币' : ''}`; // Simplified name

    return {
        id: `remote_${property.value}_${size}_${propCash > 0.0001 ? 'cash' : 'exact'}_${Date.now()}`,
        type: scenarioType,
        name: scenarioName, // Use the simplified name
        selectedArea: size,
        combo: [size], // Represent selected housing
        propertyName: property.label,
        propertyPrice: propertyPrice,
        totalCompensation: totalCompensation,
        housingCost: houseValue,
        finalDifference: finalDifference,
        breakdown: fullBreakdown,
        confirmedArea: confirmedArea,
        publicCompArea: publicCompArea, // Include for display consistency
        isPublicHousing: isPublicHousing,
        publicHousingDeductionAmount: publicHousingDeductionAmount,
        relocationReward: relocationRewardTiered,
        decorationFee: decorationFee,
        remoteAreaType: baseInputs.remoteAreaType,
        housingEligibleComp: housingEligibleComp, // Include for reference
        totalStructureComp: totalStructureComp, // Include for reference
        propHouse: propHouse, // Include for debugging/info
        propCash: propCash    // Include for debugging/info
    };
} 