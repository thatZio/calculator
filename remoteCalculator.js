// 导入必要的配置
import { COMPLETE_APT_RATE, SETTLING_RATE, MOVING_RATE_BASE, TRANSITION_RATE, 
         TRANSITION_MONTHS_HOUSING, TRANSITION_MONTHS_CASH, RENTAL_SUBSIDY, 
         PUBLIC_HOUSING_FACTOR, MIN_MOVING_1, MIN_MOVING_2, 
         PUBLIC_AREA_DIFF_HOUSING, PUBLIC_AREA_DIFF_CASH, MONETARY_REWARD_RATE, MAX_PUBLIC_AREA } from './config.js';
import { BLOCK_RATES } from './blockRates.js';
import { REMOTE_PROPERTIES, getAvailableSizes } from './relocationOptions.js';
import { roundUpToTier } from './script.js';

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
    const addedSignatures = new Set(); // To track added property/size combos
    const tolerance = 1; // Allow HEC to be slightly less than cost for direct affordability

    properties.forEach(property => {
        if (!property.sizes || property.sizes.length === 0 || property.price <= 0) {
            return; // Skip property if no sizes or invalid price
        }
        
        // Calculate equivalent area and round-up tier for THIS property
        let equivalentAreaForProperty = 0;
        if (property.price > 0) {
            equivalentAreaForProperty = round(housingEligibleComp / property.price, 2);
        }
        // Need roundUpToTier function available here
        // Let's assume it's imported or defined locally
        const roundedUpTier = roundUpToTier(equivalentAreaForProperty); 
        

        // Iterate through ALL available sizes for this property
        property.sizes.forEach(size => {
            const houseCost = round(size * property.price, 0);
            const signature = `${property.value}_${size}`; // Unique identifier for property+size
            let shouldAdd = false;

            // Condition 1: Direct Affordability
            if (housingEligibleComp >= houseCost - tolerance) {
                shouldAdd = true;
            }
            
            // Condition 2: Round-Up Tier Match (and not already affordable)
            if (!shouldAdd && size === roundedUpTier) {
                shouldAdd = true;
            }

            // Add scenario if conditions met and not already added
            if (shouldAdd && !addedSignatures.has(signature)) {
                 try {
                    // Calculate the scenario using the value split logic (to be implemented next)
                    const scenario = calculateRemoteValueSplitScenario(
                        baseInputs, 
                        property, 
                        size 
                    );
                    if (scenario) {
                        scenarios.push(scenario);
                        addedSignatures.add(signature);
                    } else {
                         console.warn(`Failed to calculate scenario for ${property.label} ${size}㎡`);
                    }
                 } catch (e) {
                     console.error(`Error calculating scenario for ${property.label} ${size}㎡:`, e);
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

// Calculate a SINGLE remote scenario using VALUE SPLIT (Reverted Logic)
function calculateRemoteValueSplitScenario(baseInputs, property, size) {
    const { 
        resArea, storageInputs, resBlock, isPublicHousing, decorationFee, remoteAreaType,
        housingEligibleComp, // Needed for value split
        // totalStructureComp, // Recalculate if needed based on split?
        publicCompArea: originalPublicCompArea, // Keep original for reference
        confirmedAreaPrecise, 
        confirmedArea, relocationRewardTiered, publicHousingDeductionAmount
    } = baseInputs;
    
    const resRates = getRates(resBlock);
    const propertyPrice = property.price;
    const selectedTotalArea = size;
    const houseValue = round(selectedTotalArea * propertyPrice, 0);

    // --- Determine Value Split Proportions ---
    let propHouse = 0;
    if (housingEligibleComp > 0.01) { // Avoid division by zero or near-zero
        // Option 1: Strict cap at 1
         propHouse = Math.min(1, houseValue / housingEligibleComp);
        // Option 2: Allow slight overshoot (e.g., up to 1.0002 for rounding)
        // propHouse = houseValue / housingEligibleComp;
        // if (propHouse > 1.0002) propHouse = 1; // Cap significant overshoot
        // if (propHouse > 1) propHouse = 1; // Or strict cap if preferred
    } else {
        // If HEC is zero/negative, cannot afford any housing part via value split
        if (houseValue > 0) return null; // Cannot select house if no HEC
        propHouse = 0; // Essentially pure cash, though this function might not be called
    }
    const propCash = Math.max(0, 1 - propHouse); // Ensure propCash is not negative

    // --- Initialize Breakdowns ---
    let breakdown_part1 = [], breakdown_part2 = [], totalPart1Value = 0, totalPart2Value = 0;

    // --- Recalculate Base Values Needed for Splitting ---
    // (Similar to calculateXHousePlusCash_ValueSplit in script.js)
    const resLocOldValue_Total = resArea * (resRates.locationRate + resRates.oldHouseRate);
    let storLocOldValue_Total = 0;
    let storStructureValue_Total = 0;
    storageInputs.forEach(stor => {
        const storRates = getRates(stor.block);
        const preciseEffectiveArea = stor.rawArea * 0.5;
        storLocOldValue_Total += preciseEffectiveArea * (storRates.locationRate + storRates.oldHouseRate);
        storStructureValue_Total += preciseEffectiveArea * storRates.structureRate;
    });
    const publicCompValue_H_Total = originalPublicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
    const publicCompValue_C_Total = originalPublicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH);
    const resStructureValue_Total = resArea * resRates.structureRate;
    const totalStructureComp_Calc = resStructureValue_Total + storStructureValue_Total;
    const completeAptValue_Total = confirmedAreaPrecise * COMPLETE_APT_RATE;
    const settlingTotal = confirmedAreaPrecise * SETTLING_RATE;

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

    const p1_structureComp = totalStructureComp_Calc * propHouse;
    breakdown_part1.push({ name: "房屋结构等级优惠(房部分)", value: p1_structureComp, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_structureComp;

    const p1_completeAptComp = completeAptValue_Total * propHouse;
    breakdown_part1.push({ name: "成套房补贴(房部分)", value: p1_completeAptComp, formula: `房产价值比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_completeAptComp;
    
    // --- Conditional Fees (Moving & Transition) Based on remoteAreaType AND Value Split ---
    const readyTypes = ["鼓楼（现房）", "鼓楼（一楼二楼现房）", "晋安仓山（现房）"];
    const futureTypes = ["鼓楼（期房）", "晋安仓山（期房）"];
    
    let times = 1;
    let transitionMonthsPart1 = TRANSITION_MONTHS_CASH; // Default to 6
    if (futureTypes.includes(remoteAreaType)) {
        times = 2;
        transitionMonthsPart1 = TRANSITION_MONTHS_HOUSING; // 39
    } else if (!readyTypes.includes(remoteAreaType)) {
        console.warn(`Unknown remoteAreaType: ${remoteAreaType}, defaulting to 现房 logic for fees.`);
    }

    // Moving Fee Logic (Split based on value prop)
    const totalMovingFeeRaw = confirmedArea * MOVING_RATE_BASE * times;
    const minMovingFee = (times === 1) ? MIN_MOVING_1 : MIN_MOVING_2;
    let movingFeeP1 = 0, movingFeeP2 = 0, movingFeeFormulaP1 = "", movingFeeFormulaP2 = "";

    if (totalMovingFeeRaw < minMovingFee) {
        movingFeeP1 = minMovingFee;
        movingFeeP2 = 0;
        movingFeeFormulaP1 = `补足最低 ${formatMoney(minMovingFee)} (原计算: ${formatMoney(round(totalMovingFeeRaw, 0))} < ${formatMoney(minMovingFee)})`;
        movingFeeFormulaP2 = "已在房部分补足最低";
    } else {
        movingFeeP1 = totalMovingFeeRaw * propHouse;
        movingFeeP2 = totalMovingFeeRaw * propCash;
        movingFeeFormulaP1 = `总额 ${formatMoney(round(totalMovingFeeRaw,0))} × 房比例 ${formatArea(propHouse*100)}%`;
        movingFeeFormulaP2 = `总额 ${formatMoney(round(totalMovingFeeRaw,0))} × 币比例 ${formatArea(propCash*100)}%`;
    }
    if (movingFeeP1 !== 0) breakdown_part1.push({ name: "搬家费(房部分)", value: movingFeeP1, formula: movingFeeFormulaP1 });
    if (movingFeeP2 !== 0) breakdown_part2.push({ name: "搬家费(币部分)", value: movingFeeP2, formula: movingFeeFormulaP2 });
    totalPart1Value += movingFeeP1;
    totalPart2Value += movingFeeP2;

    // Transition Fee Logic (Split based on value prop)
    const transitionMonthsPart2 = TRANSITION_MONTHS_CASH; // Always 6 for cash part
    const totalTransitionFeeP1 = confirmedAreaPrecise * TRANSITION_RATE * transitionMonthsPart1;
    const totalTransitionFeeP2 = confirmedAreaPrecise * TRANSITION_RATE * transitionMonthsPart2;

    const p1_transition = totalTransitionFeeP1 * propHouse;
    breakdown_part1.push({ name: `过渡费(房部分×${transitionMonthsPart1}月)`, value: p1_transition, formula: `房部分比例 ${formatArea(propHouse*100)}%` });
    totalPart1Value += p1_transition;

    const p2_transition = totalTransitionFeeP2 * propCash;
    breakdown_part2.push({ name: `过渡费(币部分×${transitionMonthsPart2}月)`, value: p2_transition, formula: `币部分比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_transition;
    
    // Settling fee (Split based on value prop)
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
    
    const p2_publicComp = publicCompValue_C_Total * propCash;
    breakdown_part2.push({ name: "公摊补偿(币部分)", value: p2_publicComp, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_publicComp;

    // Monetary Reward (Only for cash part area equivalent)
    const effectiveArea_CashPortion = confirmedAreaPrecise * propCash; // Or base on resArea*propCash + storage*propCash?
                                                                      // Let's stick to confirmedAreaPrecise * propCash for simplicity like Block A
    const p2_monetaryReward = effectiveArea_CashPortion * MONETARY_REWARD_RATE;
    breakdown_part2.push({ name: "货币奖励", value: p2_monetaryReward, formula: `${formatArea(effectiveArea_CashPortion)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
    totalPart2Value += p2_monetaryReward;

    // Complete Apt Bonus (Cash part)
    const p2_completeAptComp = completeAptValue_Total * propCash;
    breakdown_part2.push({ name: "成套房补贴(币部分)", value: p2_completeAptComp, formula: `货币价值比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_completeAptComp;

    // Settling Fee (Cash part)
    const p2_settling = settlingTotal * propCash;
    breakdown_part2.push({ name: "安家补贴(币部分)", value: p2_settling, formula: `币部分比例 ${formatArea(propCash*100)}%` });
    totalPart2Value += p2_settling;

    // Relocation Reward (Full amount in cash part)
    breakdown_part2.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` });
    totalPart2Value += relocationRewardTiered;

    // Rental Subsidy (Full amount in cash part)
    breakdown_part2.push({ name: "租房补贴", value: RENTAL_SUBSIDY, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
    totalPart2Value += RENTAL_SUBSIDY;

    // --- Combine Parts and Final Adjustments ---
    let fullBreakdown = [...breakdown_part1, ...breakdown_part2];
    let combinedValue = totalPart1Value + totalPart2Value;

    // Add Decoration Fee (if any)
    if (decorationFee > 0) {
        fullBreakdown.push({ name: "装修评估费", value: decorationFee, formula: "评估确定" });
        combinedValue += decorationFee; 
    }

    // Apply Public Housing Deduction (Single deduction at the end)
    if (isPublicHousing && publicHousingDeductionAmount !== 0) {
        // We need the original location rate here for the formula string
        const originalResRates = getRates(resBlock); // Get rates again just for formula
        fullBreakdown.push({ 
            name: "公房扣减", 
            value: publicHousingDeductionAmount, 
            formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(originalResRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, 
            isDeduction: true 
        });
        combinedValue += publicHousingDeductionAmount; // Deduction is negative
    }

    const totalCompensation = round(combinedValue, 0); 
    const finalDifference = totalCompensation - houseValue;

    // Determine scenario type (mostly for consistency, could be refined)
    const scenarioType = propCash > 0.0001 ? "Remote Housing + Cash" : "Remote Housing Exact"; 

    return {
        // Use property.value for a more stable ID component
        id: `remote_${property.value}_${size}_${Date.now()}`,
        type: scenarioType,
        name: `${property.label} ${size}㎡${propCash > 0.0001 ? ' + 货币' : ''}`,
        propertyName: property.label,
        propertyPrice: property.price, 
        selectedArea: size,
        combo: [size],
        totalCompensation: totalCompensation,
        housingCost: houseValue,
        finalDifference: finalDifference,
        breakdown: fullBreakdown,
        housingEligibleComp: housingEligibleComp, // Report original HEC for info
        confirmedArea: confirmedArea,
        publicCompArea: originalPublicCompArea,
        isPublicHousing: isPublicHousing,
        publicHousingDeductionAmount: publicHousingDeductionAmount,
        relocationReward: relocationRewardTiered,
        totalStructureComp: baseInputs.totalStructureComp, // Report original total structure comp
        decorationFee: decorationFee,
        propHouse: propHouse, // Include for debugging/info if needed
        propCash: propCash    // Include for debugging/info if needed
    };
} 