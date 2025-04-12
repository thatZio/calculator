document.addEventListener('DOMContentLoaded', () => {
        // --- Password Check ---
        const correctPassword = "antai"; // 设置正确的口令
        const enteredPassword = prompt("请输入口令：");
    
        // 检查口令是否正确 (同时处理用户点击取消或输入空的情况)
        if (enteredPassword !== correctPassword) {
            alert("口令错误！访问被拒绝。");
    
            // 阻止页面加载或显示内容 (这里选择清空body并显示拒绝信息)
            document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">口令错误，访问被拒绝</h1>';
            document.body.style.backgroundColor = "#fff"; // Set background to white for clarity
    
            // 停止执行后续的计算器脚本代码
            return;
        }
        // --- End Password Check ---
    
        // 如果口令正确，代码会继续执行下面的计算器逻辑...
    // --- DOM Elements ---
    const blockTypeSelect = document.getElementById('block-type');
    const residentialAreaInput = document.getElementById('residential-area');
    const storageAreaInput = document.getElementById('storage-area');
    const calculateButton = document.getElementById('calculate-button');
    const inputError = document.getElementById('input-error');

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
    const storageAdviceContent = document.getElementById('storage-advice-content');
    const adviceText = document.getElementById('advice-text');
    const backToListButton = document.getElementById('back-to-list-button');

    const comparisonSection = document.getElementById('comparison-section');
    const comparisonTableContainer = document.getElementById('comparison-table-container');
    const closeComparisonButton = document.getElementById('close-comparison-button');

    // --- Constants & Rates ---
    const HOUSING_PRICE = 18664;
    const HOUSING_SIZES = [45, 60, 75, 90, 105, 120, 135, 150];
    const MAX_PUBLIC_AREA = 10;
    const STRUCTURE_RATE_A = 570;
    const STRUCTURE_RATE_B = 1150;
    const MONETARY_REWARD_RATE = 272;
    const LOCATION_RATE_A = 15942;
    const LOCATION_RATE_B = 14864;
    const OLD_HOUSE_RATE_A = 3800 * 0.7; // 2660
    const OLD_HOUSE_RATE_B = 2500 * 0.6; // 1500
    const PUBLIC_AREA_DIFF_HOUSING = 1900;
    const COMPLETE_APT_RATE = 420;
    const SETTLING_RATE = 50;
    const MOVING_RATE = 15;
    const TRANSITION_RATE = 15; // Per month base rate
    const ADDNL_TEMP_RATE = 15; // Per month base rate (only for housing)
    const TRANSITION_MONTHS_HOUSING = 36;
    const ADDNL_MONTHS_HOUSING = 3;
    const TOTAL_MONTHS_HOUSING = TRANSITION_MONTHS_HOUSING + ADDNL_MONTHS_HOUSING; // 39
    const TRANSITION_MONTHS_CASH = 6;
    const RELOCATION_REWARD = 30000;
    const RENTAL_SUBSIDY = 20000;

    let currentScenarios = [];
    let currentInputs = {};

    // --- Helper Functions ---
    const formatMoney = (amount) => {
        // Round to nearest integer, then format with commas
        if (typeof amount !== 'number' || isNaN(amount)) {
             return '0'; // Or return 'N/A'
        }
        return Math.round(amount).toLocaleString('zh-CN');
    }
    const formatArea = (area) => {
         if (typeof area !== 'number' || isNaN(area)) {
            return '0.00';
        }
        return area.toFixed(2);
    }
     // Format rate for display (optional, keeps decimals for rates)
     const formatRate = (rate) => {
          if (typeof rate !== 'number' || isNaN(rate)) {
             return '0';
         }
         // Keep decimals for rates if needed, e.g., rate.toFixed(2) or just rate
         return rate.toLocaleString('zh-CN'); // Format with commas if large
     }


    const getRates = (blockType) => {
        return {
            locationRate: blockType === 'A' ? LOCATION_RATE_A : LOCATION_RATE_B,
            structureRate: blockType === 'A' ? STRUCTURE_RATE_A : STRUCTURE_RATE_B,
            oldHouseRate: blockType === 'A' ? OLD_HOUSE_RATE_A : OLD_HOUSE_RATE_B,
        };
    };

    // Up-rounding rule implementation
    const roundUpToTier = (area) => {
        if (area <= 0) return 0;
        const potentialTiers = [...HOUSING_SIZES, 180]; // Include potential max target
        potentialTiers.sort((a, b) => a - b);

        let previousTier = 0;
        for (const tier of potentialTiers) {
            if (area > previousTier) {
                 if (area > tier) {
                     previousTier = tier;
                     continue;
                 } else {
                     return tier; // Round up to current tier if area > previous
                 }
            } else {
                return previousTier; // Area did not exceed previous tier
            }
        }
        return Math.max(...potentialTiers); // Exceeded highest defined tier
    };


    // --- Core Calculation Logic ---
    const calculateCompensation = (inputs) => {
        const { resArea, storArea, blockType } = inputs;
        const rates = getRates(blockType);

        const confirmedArea = resArea + storArea * 0.5;
        const publicCompArea = Math.min(confirmedArea * 0.1, MAX_PUBLIC_AREA);

        inputs.confirmedArea = confirmedArea;
        inputs.publicCompArea = publicCompArea;
        inputs.rates = rates;

        let scenarios = [];

        const housingEligibleComp = calculateHousingEligibleComp(inputs);
        const equivalentArea = housingEligibleComp > 0 ? housingEligibleComp / HOUSING_PRICE : 0;
        inputs.equivalentArea = equivalentArea; // Store equivalentArea first

        // --- Apply B-Block specific rule for resettlementArea ---
        let resettlementArea = 0; // Default to 0
        if (blockType === 'B' && equivalentArea <= 30) {
            // For B block, if equivalent area is 30 or less, no resettlement area entitlement via rounding up
            resettlementArea = 0;
        } else if (equivalentArea > 0) {
            // For A block OR B block with area > 30 OR non-zero equivalent area, apply standard rounding
             resettlementArea = roundUpToTier(equivalentArea);
        }
        // --- End B-Block rule ---

        inputs.resettlementArea = resettlementArea; // Store the final resettlementArea

        // Scenario: Pure Monetary
        scenarios.push(calculatePureCash(inputs));

        // Scenarios: Max Housing (if resettlementArea > 0)
         if (resettlementArea > 0) {
            const maxHousingCombinations = findHousingCombinations(resettlementArea, confirmedArea, blockType);
            console.log(`Target Resettlement Area: ${resettlementArea}, Found Combinations:`, maxHousingCombinations);
            for (const combo of maxHousingCombinations) {
                 scenarios.push(calculateMaxHousing(inputs, resettlementArea, combo, housingEligibleComp, equivalentArea));
            }
         }


        // Scenarios: 1 House + Cash
        for (const size of HOUSING_SIZES) {
            let ruleViolation = false;
            if (confirmedArea > 60 && size < 60) ruleViolation = true;
            if (blockType === 'A' && size < 105) ruleViolation = true;

            if (ruleViolation) continue;

            const selectedHouseValue = size * HOUSING_PRICE;
            // Allow selection if eligible comp is sufficient (with tolerance)
            if (housingEligibleComp >= selectedHouseValue * 0.99) { // Use 0.99 tolerance
                 scenarios.push(calculateHousePlusCash(inputs, size, housingEligibleComp));
            }
        }

        // Filter scenarios
        const uniqueScenarios = [];
        const seenSignatures = new Set();
        const maxHousingSignatures = new Set();

         scenarios.filter(s => s.type === "Max Housing").forEach(s => {
             let comboString = s.combo.sort((a, b) => a - b).join('-');
             maxHousingSignatures.add(`Max Housing_${comboString}`);
         });

        for (const s of scenarios) {
            let comboString = s.combo && s.combo.length > 0 ? s.combo.sort((a, b) => a - b).join('-') : 'none';
            const signature = `${s.type}_${comboString}`;

            if (s.type === "1 House + Cash") {
                 const potentialMaxHousingSignature = `Max Housing_${comboString}`;
                 if (maxHousingSignatures.has(potentialMaxHousingSignature)) {
                     console.log(`Skipping redundant 1H+C: ${s.name}`);
                     continue;
                 }
            }

            if (!seenSignatures.has(signature)) {
                uniqueScenarios.push(s);
                seenSignatures.add(signature);
            } else {
                 console.log(`Filtered out duplicate: ${s.name}, Signature: ${signature}`);
            }
        }

        // Sort scenarios
         uniqueScenarios.sort((a, b) => {
            if (a.type === 'Max Housing' && b.type !== 'Max Housing') return -1;
            if (a.type !== 'Max Housing' && b.type === 'Max Housing') return 1;
            if (a.type === 'Pure Monetary' && b.type !== 'Pure Monetary') return 1;
            if (a.type !== 'Pure Monetary' && b.type === 'Pure Monetary') return -1;
            if (a.type === 'Max Housing' && b.type === 'Max Housing') {
                 if (a.combo.length !== b.combo.length) return a.combo.length - b.combo.length;
                 return Math.max(...b.combo) - Math.max(...a.combo);
            }
            if (a.type === '1 House + Cash' && b.type === '1 House + Cash') {
                return a.selectedArea - b.selectedArea;
            }
            return 0;
        });

        console.log("Final Unique Scenarios:", uniqueScenarios.map(s => s.name));
        return uniqueScenarios;
    };

    const calculateHousingEligibleComp = (inputs) => {
        const { resArea, storArea, confirmedArea, publicCompArea, blockType, rates } = inputs;
        const comp1 = resArea * rates.locationRate;
        const comp2 = resArea * rates.oldHouseRate;
        const comp3_adj = (storArea * 0.5) * rates.locationRate;
        const comp4_adj = (storArea * 0.5) * rates.oldHouseRate;
        const comp5 = publicCompArea * (rates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
        const comp6 = confirmedArea * rates.structureRate;
        const comp7 = confirmedArea * COMPLETE_APT_RATE;
        return comp1 + comp2 + comp3_adj + comp4_adj + comp5 + comp6 + comp7;
    };

    const findHousingCombinations = (targetArea, confirmedArea, blockType) => {
         if (targetArea <= 0) return [];
        let combinations = [];
        const n = HOUSING_SIZES.length;

        // Single house
        if (HOUSING_SIZES.includes(targetArea)) {
             if (checkRules([targetArea], confirmedArea, blockType)) {
                combinations.push([targetArea]);
            }
        }
        // Two houses
        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                const size1 = HOUSING_SIZES[i];
                const size2 = HOUSING_SIZES[j];
                const combo = [size1, size2];
                if (i === j && size1 === targetArea) continue; // Skip single size check
                if (size1 + size2 === targetArea) {
                    if (checkRules(combo, confirmedArea, blockType)) {
                         combo.sort((a, b) => a - b); // Sort internally
                         if (!combinations.some(existing => existing.length === 2 && existing[0] === combo[0] && existing[1] === combo[1])) {
                            combinations.push(combo);
                         }
                    }
                }
            }
        }
         // Remove duplicates (e.g., if single check added [120] and double check added [60, 60] if target was 120) - This shouldn't be needed with current logic but safer.
        // combinations = combinations.filter((combo, index, self) =>
        //      index === self.findIndex(c => c.length === combo.length && c.every((val, i) => val === combo[i]))
        //  );
        return combinations;
    };

    const checkRules = (combo, confirmedArea, blockType) => {
        if (!combo || combo.length === 0 || combo.length > 2) return false;
        if (confirmedArea > 60 && !combo.some(size => size >= 60)) return false;
        if (blockType === 'A' && !combo.some(size => size >= 105)) return false;
        return true;
    };

    // Calculation Functions (with added publicCompArea and adjusted naming/formulas)

    const calculatePureCash = (inputs) => {
        const { resArea, storArea, confirmedArea, publicCompArea, blockType, rates, equivalentArea } = inputs; // Removed resettlementArea
        let breakdown = [];

        const comp1 = resArea * rates.locationRate;
        breakdown.push({ name: "住宅区位补偿款", value: comp1, formula: `${formatArea(resArea)}㎡ × ${formatRate(rates.locationRate)}/㎡` });
        const comp2 = resArea * rates.oldHouseRate;
         breakdown.push({ name: "住宅旧房补偿费", value: comp2, formula: `${formatArea(resArea)}㎡ × ${formatRate(rates.oldHouseRate)}/㎡` });
        const comp3_adj = (storArea * 0.5) * rates.locationRate;
        breakdown.push({ name: "杂物间区位补偿款", value: comp3_adj, formula: `${formatArea(storArea)}㎡ × 50% × ${formatRate(rates.locationRate)}/㎡` });
        const comp4_adj = (storArea * 0.5) * rates.oldHouseRate;
        breakdown.push({ name: "杂物间旧房补偿费", value: comp4_adj, formula: `${formatArea(storArea)}㎡ × 50% × ${formatRate(rates.oldHouseRate)}/㎡` });
        const comp5_cash = publicCompArea * (rates.locationRate + MONETARY_REWARD_RATE);
        breakdown.push({ name: "公摊补偿(货币)", value: comp5_cash, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(rates.locationRate)} + ${MONETARY_REWARD_RATE})/㎡` });
        const comp6_cash = confirmedArea * MONETARY_REWARD_RATE;
        breakdown.push({ name: "货币奖励", value: comp6_cash, formula: `${formatArea(confirmedArea)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
        const comp7 = confirmedArea * COMPLETE_APT_RATE;
        breakdown.push({ name: "成套房补贴", value: comp7, formula: `${formatArea(confirmedArea)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
        const comp_moving = confirmedArea * MOVING_RATE * 1;
        breakdown.push({ name: "搬家费(1次)", value: comp_moving, formula: `${formatArea(confirmedArea)}㎡ × ${MOVING_RATE}/㎡ × 1次` });
        const comp_transition = confirmedArea * TRANSITION_RATE * TRANSITION_MONTHS_CASH;
         breakdown.push({ name: `过渡费(${TRANSITION_MONTHS_CASH}个月)`, value: comp_transition, formula: `${formatArea(confirmedArea)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_CASH}月` });
        const comp_addnl_temp = 0;
        breakdown.push({ name: "增发临时安置费", value: comp_addnl_temp, formula: `无` });
         const comp_settling = confirmedArea * SETTLING_RATE;
        breakdown.push({ name: "安家补贴", value: comp_settling, formula: `${formatArea(confirmedArea)}㎡ × ${SETTLING_RATE}/㎡` });
        const comp_relocation = RELOCATION_REWARD;
         breakdown.push({ name: "搬迁奖励", value: comp_relocation, formula: `固定 ${formatMoney(RELOCATION_REWARD)}` });
        const comp_rental = RENTAL_SUBSIDY;
        breakdown.push({ name: "租房补贴", value: comp_rental, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });

        const total = comp1 + comp2 + comp3_adj + comp4_adj + comp5_cash + comp6_cash + comp7 + comp_moving + comp_transition + comp_addnl_temp + comp_settling + comp_relocation + comp_rental;

        return {
            id: `cash_${Date.now()}`,
            type: "Pure Monetary",
            name: "纯货币补偿", // Adjusted name
            selectedArea: 0,
             combo: [],
            totalCompensation: total,
            housingCost: 0,
            finalDifference: total,
            breakdown: breakdown,
            housingEligibleComp: calculateHousingEligibleComp(inputs),
             equivalentArea: equivalentArea || 0,
             resettlementArea: 0, // Explicitly 0
             confirmedArea: confirmedArea,
             publicCompArea: publicCompArea, // Add publicCompArea
        };
    };

     const calculateMaxHousing = (inputs, resettlementArea, combo, housingEligibleComp, equivalentArea) => {
         const { resArea, storArea, confirmedArea, publicCompArea, blockType, rates } = inputs;
         let breakdown = [];
         combo.sort((a, b) => b - a); // Sort combo descending for display name

        const term1 = resArea * (rates.locationRate + rates.oldHouseRate);
        const term2 = storArea * 0.5 * (rates.locationRate + rates.oldHouseRate);
        const term3 = publicCompArea * (rates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
        const term4 = confirmedArea * rates.structureRate;
        const term5 = confirmedArea * COMPLETE_APT_RATE;
        const term6 = RELOCATION_REWARD;
        const term7 = confirmedArea * MOVING_RATE * 2;
        // Use TOTAL_MONTHS_HOUSING for calculation, but display base rate and total months in formula
        const term8 = confirmedArea * TRANSITION_RATE * TOTAL_MONTHS_HOUSING;
        const term9 = confirmedArea * SETTLING_RATE;
        const term10 = RENTAL_SUBSIDY;
        const total_ex1 = term1 + term2 + term3 + term4 + term5 + term6 + term7 + term8 + term9 + term10;

        breakdown.push({ name: "住宅区位+旧房补偿", value: term1, formula: `${formatArea(resArea)}㎡ × (${formatRate(rates.locationRate)} + ${formatRate(rates.oldHouseRate)})/㎡` });
        breakdown.push({ name: "杂物间区位+旧房补偿", value: term2, formula: `${formatArea(storArea)}㎡ × 50% × (${formatRate(rates.locationRate)} + ${formatRate(rates.oldHouseRate)})/㎡` });
        breakdown.push({ name: "公摊补偿(拿房)", value: term3, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(rates.locationRate)} + ${PUBLIC_AREA_DIFF_HOUSING})/㎡` });
        breakdown.push({ name: "房屋结构等级优惠补差款", value: term4, formula: `${formatArea(confirmedArea)}㎡ × ${formatRate(rates.structureRate)}/㎡` });
        breakdown.push({ name: "成套房补贴", value: term5, formula: `${formatArea(confirmedArea)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
        breakdown.push({ name: "搬迁奖励", value: term6, formula: `固定 ${formatMoney(RELOCATION_REWARD)}` });
        breakdown.push({ name: "搬家费(2次)", value: term7, formula: `${formatArea(confirmedArea)}㎡ × ${MOVING_RATE}/㎡ × 2次` });
        // Corrected formula display for transition+additional
        breakdown.push({ name: `过渡费+增发(${TOTAL_MONTHS_HOUSING}月)`, value: term8, formula: `${formatArea(confirmedArea)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TOTAL_MONTHS_HOUSING}月` });
        breakdown.push({ name: "安家补贴", value: term9, formula: `${formatArea(confirmedArea)}㎡ × ${SETTLING_RATE}/㎡` });
        breakdown.push({ name: "租房补贴", value: term10, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });

         const housingCost = resettlementArea * HOUSING_PRICE;
         const finalDifference = total_ex1 - housingCost;

         // Adjusted name: Just the combo, largest first
         let name = (combo && combo.length > 0) ? combo.join('㎡ + ') + '㎡' : '(组合错误)';

         return {
             id: `max_${(combo || []).join('_')}_${Date.now()}`,
             type: "Max Housing",
             name: name, // Use the adjusted name
             selectedArea: resettlementArea,
             combo: combo || [],
             totalCompensation: total_ex1,
             housingCost: housingCost,
             finalDifference: finalDifference,
             breakdown: breakdown,
             housingEligibleComp: housingEligibleComp,
             equivalentArea: equivalentArea,
             resettlementArea: resettlementArea,
             confirmedArea: confirmedArea,
             publicCompArea: publicCompArea, // Add publicCompArea
         };
     };

     const calculateHousePlusCash = (inputs, selectedSize, housingEligibleCompTotal) => {
         const { resArea, storArea, confirmedArea, publicCompArea, blockType, rates, equivalentArea, resettlementArea } = inputs;
         let breakdown_part1 = [];
         let breakdown_part2 = [];
         const houseValue = selectedSize * HOUSING_PRICE;
         let propHouse = 0;
         if (housingEligibleCompTotal > 0) {
            propHouse = Math.min(houseValue / housingEligibleCompTotal, 1);
         }
         const propCash = 1 - propHouse;

         const confirmedArea_h = confirmedArea * propHouse;
         const confirmedArea_c = confirmedArea * propCash;
         const publicCompArea_h = publicCompArea * propHouse;
         const publicCompArea_c = publicCompArea * propCash;
         const resArea_h = resArea * propHouse;
         const resArea_c = resArea * propCash;
         const storArea_eff_h = (storArea * 0.5) * propHouse;
         const storArea_eff_c = (storArea * 0.5) * propCash;

         // Part 1 Items
         const p1_comp1 = resArea_h * rates.locationRate;
         const p1_comp2 = resArea_h * rates.oldHouseRate;
         const p1_comp3_adj = storArea_eff_h * rates.locationRate;
         const p1_comp4_adj = storArea_eff_h * rates.oldHouseRate;
         breakdown_part1.push({ name: `住宅区位+旧房(就地)`, value: p1_comp1 + p1_comp2, formula: `${formatArea(resArea_h)}㎡ approx` });
         breakdown_part1.push({ name: `杂物间区位+旧房(就地)`, value: p1_comp3_adj + p1_comp4_adj, formula: `${formatArea(storArea_eff_h)}㎡ eff. approx` });
         const p1_comp5 = publicCompArea_h * (rates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
         breakdown_part1.push({ name: "公摊补偿(就地)", value: p1_comp5, formula: `${formatArea(publicCompArea_h)}㎡ × (${formatRate(rates.locationRate)} + ${PUBLIC_AREA_DIFF_HOUSING})/㎡` });
         const p1_comp6 = confirmedArea_h * rates.structureRate;
         breakdown_part1.push({ name: "房屋结构等级优惠补差款(就地)", value: p1_comp6, formula: `${formatArea(confirmedArea_h)}㎡ × ${formatRate(rates.structureRate)}/㎡` });
         const p1_comp7 = confirmedArea_h * COMPLETE_APT_RATE;
         breakdown_part1.push({ name: "成套房补贴(就地)", value: p1_comp7, formula: `${formatArea(confirmedArea_h)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
         const p1_moving = confirmedArea_h * MOVING_RATE * 2;
         breakdown_part1.push({ name: "搬家费(就地)", value: p1_moving, formula: `${formatArea(confirmedArea_h)}㎡ × ${MOVING_RATE}/㎡ × 2次` });
         // Corrected formula display for transition+additional
         const p1_transition_addnl = confirmedArea_h * TRANSITION_RATE * TOTAL_MONTHS_HOUSING;
         breakdown_part1.push({ name: `过渡费+增发(就地)`, value: p1_transition_addnl, formula: `${formatArea(confirmedArea_h)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TOTAL_MONTHS_HOUSING}月` });
         const p1_settling = confirmedArea_h * SETTLING_RATE;
         breakdown_part1.push({ name: "安家补贴(就地)", value: p1_settling, formula: `${formatArea(confirmedArea_h)}㎡ × ${SETTLING_RATE}/㎡` });
         const part1Total = (p1_comp1 + p1_comp2 + p1_comp3_adj + p1_comp4_adj + p1_comp5 + p1_comp6 + p1_comp7 + p1_moving + p1_transition_addnl + p1_settling);

         // Part 2 Items
         const p2_comp1 = resArea_c * rates.locationRate;
         const p2_comp2 = resArea_c * rates.oldHouseRate;
         const p2_comp3_adj = storArea_eff_c * rates.locationRate;
         const p2_comp4_adj = storArea_eff_c * rates.oldHouseRate;
         breakdown_part2.push({ name: "住宅区位+旧房(货币)", value: p2_comp1 + p2_comp2, formula: `${formatArea(resArea_c)}㎡ approx`});
         breakdown_part2.push({ name: "杂物间区位+旧房(货币)", value: p2_comp3_adj + p2_comp4_adj, formula: `${formatArea(storArea_eff_c)}㎡ eff. approx`});
         const p2_comp5_cash = publicCompArea_c * (rates.locationRate + MONETARY_REWARD_RATE);
         breakdown_part2.push({ name: "公摊补偿(货币)", value: p2_comp5_cash, formula: `${formatArea(publicCompArea_c)}㎡ × (${formatRate(rates.locationRate)} + ${MONETARY_REWARD_RATE})/㎡` });
         const p2_comp6_cash = confirmedArea_c * MONETARY_REWARD_RATE;
         breakdown_part2.push({ name: "货币奖励(货币)", value: p2_comp6_cash, formula: `${formatArea(confirmedArea_c)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
         const p2_comp7_cash = confirmedArea_c * COMPLETE_APT_RATE;
         breakdown_part2.push({ name: "成套房补贴(货币)", value: p2_comp7_cash, formula: `${formatArea(confirmedArea_c)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
         const p2_moving = confirmedArea_c * MOVING_RATE * 1;
         breakdown_part2.push({ name: "搬家费(货币)", value: p2_moving, formula: `${formatArea(confirmedArea_c)}㎡ × ${MOVING_RATE}/㎡ × 1次` });
         const p2_transition = confirmedArea_c * TRANSITION_RATE * TRANSITION_MONTHS_CASH;
         breakdown_part2.push({ name: `过渡费(货币)`, value: p2_transition, formula: `${formatArea(confirmedArea_c)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_CASH}月` });
         const p2_settling = confirmedArea_c * SETTLING_RATE;
         breakdown_part2.push({ name: "安家补贴(货币)", value: p2_settling, formula: `${formatArea(confirmedArea_c)}㎡ × ${SETTLING_RATE}/㎡` });
         const p2_relocation = RELOCATION_REWARD;
         breakdown_part2.push({ name: "搬迁奖励", value: p2_relocation, formula: `固定 ${formatMoney(RELOCATION_REWARD)}` });
         const p2_rental = RENTAL_SUBSIDY;
         breakdown_part2.push({ name: "租房补贴", value: p2_rental, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
         const part2Total = (p2_comp1 + p2_comp2 + p2_comp3_adj + p2_comp4_adj + p2_comp5_cash + p2_comp6_cash + p2_comp7_cash + p2_moving + p2_transition + p2_settling + p2_relocation + p2_rental);

         const totalCompensation = part1Total + part2Total;
         const finalDifference = totalCompensation - houseValue;
         const fullBreakdown = [...breakdown_part1, ...breakdown_part2];

         return {
             id: `h_c_${selectedSize}_${Date.now()}`,
             type: "1 House + Cash",
             name: `${selectedSize}㎡ + 货币`,
             selectedArea: selectedSize,
             combo: [selectedSize],
             totalCompensation: totalCompensation,
             housingCost: houseValue,
             finalDifference: finalDifference,
             breakdown: fullBreakdown,
             housingEligibleComp: housingEligibleCompTotal,
             equivalentArea: equivalentArea,
             resettlementArea: resettlementArea, // Keep theoretical max for context if needed internally
             confirmedArea: confirmedArea,
             publicCompArea: publicCompArea, // Add publicCompArea
             propHouse: propHouse, // Keep for potential internal use
             propCash: propCash,
         };
     };

    // --- Display Functions ---
    const displayScenariosList = (scenarios) => {
        scenarioListUl.innerHTML = '';
        if (!scenarios || scenarios.length === 0) {
             scenarioListUl.innerHTML = '<li>未找到符合条件的方案。</li>';
             compareSelectedButton.classList.add('hidden');
             compareInstructions.textContent = '';
             return;
        }
        scenarios.forEach(scenario => {
            const li = document.createElement('li');
             const checkbox = document.createElement('input');
             checkbox.type = 'checkbox';
             checkbox.value = scenario.id;
             checkbox.id = `compare_${scenario.id}`;
             checkbox.classList.add('compare-checkbox');
             checkbox.addEventListener('change', handleCompareCheckboxChange);

             const link = document.createElement('a');
            link.href = '#';
            link.textContent = scenario.name; // Uses adjusted names now
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
        });
        scenarioListSection.classList.remove('hidden');
        scenarioDetailSection.classList.add('hidden');
        comparisonSection.classList.add('hidden');
        compareSelectedButton.classList.remove('hidden');
        compareInstructions.textContent = '勾选 2 或 3 个方案进行比较';
        handleCompareCheckboxChange();
    };

     const handleCompareCheckboxChange = () => {
         const checkedBoxes = scenarioListUl.querySelectorAll('.compare-checkbox:checked');
         const count = checkedBoxes.length;
         compareSelectedButton.disabled = count < 2 || count > 3;
         if (count === 0) compareInstructions.textContent = '勾选 2 或 3 个方案进行比较';
         else if (count === 1) compareInstructions.textContent = '请再勾选 1 或 2 个方案';
         else if (count === 2) compareInstructions.textContent = '已选 2 个，可再选 1 个或直接比较';
         else if (count === 3) compareInstructions.textContent = '已选 3 个，请点击比较';
         else compareInstructions.textContent = '最多只能选择 3 个方案进行比较';
     };

    // Display Scenario Detail (Revised conditional display logic)
    const displayScenarioDetail = (scenarioId) => {
        const scenario = currentScenarios.find(s => s.id === scenarioId);
        if (!scenario) return;

        scenarioTitle.textContent = scenario.name;
        let summaryHtml = '';
        const diffSuffix = " <span class='diff-suffix'>+ 装修补偿、电梯评估款（按出资比例）、车库补偿（确权面积x10369/㎡）、管线补助等</span>"; // Suffix text

        // Always show Confirmed Area and Public Comp Area
        summaryHtml += `<p><strong>确权面积:</strong> ${formatArea(scenario.confirmedArea)} ㎡</p>`;
        summaryHtml += `<p><strong>公摊补偿面积:</strong> ${formatArea(scenario.publicCompArea)} ㎡</p>`; // Added Item 5

        // Conditional display based on scenario type
        if (scenario.type !== "Pure Monetary") {
            summaryHtml += `<p><strong>等面积:</strong> ${formatArea(scenario.equivalentArea)} ㎡</p>`; // Item 4: Hide for Pure Monetary
             // Item 4: Only show Resettlement/Surplus for Max Housing
             if (scenario.type === "Max Housing") {
                const resettlementAreaDisplay = scenario.resettlementArea || 0;
                const surplusArea = resettlementAreaDisplay - scenario.equivalentArea;
                summaryHtml += `<p><strong>安置面积(上靠后):</strong> ${formatArea(resettlementAreaDisplay)} ㎡</p>`;
                summaryHtml += `<p><strong>上靠面积:</strong> ${formatArea(Math.max(0, surplusArea))} ㎡</p>`;
            }
        }
        summaryHtml += `<hr>`;

        // Housing Selection & Costs
         if (scenario.selectedArea > 0 && scenario.combo && scenario.combo.length > 0) {
             let housingSelectionText = scenario.combo.join('㎡ + ') + '㎡';
             summaryHtml += `<p><strong>选择房型:</strong> ${housingSelectionText}</p>`;
             summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`; // Integer format
         } else if (scenario.type !== "Pure Monetary") {
             summaryHtml += `<p><strong>选择房型:</strong> (未指定/无法组合)</p>`;
             summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`; // Integer format
         } else {
             summaryHtml += `<p><strong>选择房型:</strong> 无</p>`;
         }
        summaryHtml += `<p><strong>补偿款总计:</strong> ${formatMoney(scenario.totalCompensation)} 元</p>`; // Integer format

        // Final Difference with suffix and integer format
        const diffValue = scenario.finalDifference;
        const diffColor = diffValue >= 0 ? 'red' : 'green';
        if (diffValue >= 0) {
             summaryHtml += `<p><strong>应退差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(diffValue)} 元</span>${diffSuffix}</p>`; // Added suffix
        } else {
             summaryHtml += `<p><strong>应补缴差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(Math.abs(diffValue))} 元</span>${diffSuffix}</p>`; // Added suffix
        }
        scenarioSummary.innerHTML = summaryHtml;

        // Breakdown display (using integer format for values)
        breakdownList.innerHTML = '';
        if (scenario.breakdown && scenario.breakdown.length > 0) {
            scenario.breakdown.forEach(item => {
                const li = document.createElement('li');
                 // Format item.value as integer using formatMoney
                 li.innerHTML = `<span class="item-name">${item.name}:</span> <span class="item-value">${formatMoney(item.value)} 元</span>`;
                 if (item.formula) {
                     li.innerHTML += `<span class="item-formula">计算: ${item.formula}</span>`;
                 }
                breakdownList.appendChild(li);
            });
        } else {
             breakdownList.innerHTML = '<li>详细构成信息不可用。</li>';
        }

        // Reset details visibility & advice
        scenarioBreakdown.classList.add('hidden');
        toggleDetailsButton.textContent = '显示详细构成';
         storageAdviceContent.classList.add('hidden');

        // Hide/Show sections
        scenarioListSection.classList.add('hidden');
        scenarioDetailSection.classList.remove('hidden');
        comparisonSection.classList.add('hidden');

        storageAdviceButton.dataset.scenarioId = scenarioId;
    };

    // Display Comparison Table (Using integer format)
    const displayComparison = (selectedIds) => {
         const scenariosToCompare = currentScenarios.filter(s => selectedIds.includes(s.id));
         if (scenariosToCompare.length < 2) return;

         let tableHtml = '<table><thead><tr><th>指标</th>';
         scenariosToCompare.forEach(s => { tableHtml += `<th>${s.name}</th>`; });
         tableHtml += '</tr></thead><tbody>';

         const metrics = [
             { key: 'combo', label: '选择房型', formatter: (combo) => combo && combo.length > 0 ? combo.join('㎡ + ') + '㎡' : '无' },
             { key: 'housingCost', label: '购房款 (元)', formatter: (val) => val > 0 ? formatMoney(val) : '无' },
             { key: 'totalCompensation', label: '补偿款总计 (元)', formatter: formatMoney },
             { key: 'finalDifference', label: '应交(-)/退(+)差价 (元)', formatter: (val) => {
                 if (typeof val !== 'number' || isNaN(val)) return 'N/A';
                 const color = val >= 0 ? 'red' : 'green';
                 return `<span style="color:${color}; font-weight: bold;">${formatMoney(val)}</span>`; // Format as integer
                 }
             },
         ];

         metrics.forEach(metric => {
             tableHtml += `<tr><td><strong>${metric.label}</strong></td>`;
             scenariosToCompare.forEach(s => {
                 const value = s[metric.key];
                 const formattedValue = (value !== undefined && value !== null && metric.formatter) ? metric.formatter(value) : (value === undefined || value === null ? 'N/A' : value);
                 tableHtml += `<td>${formattedValue}</td>`;
             });
             tableHtml += '</tr>';
         });

         tableHtml += '</tbody></table>';
         comparisonTableContainer.innerHTML = tableHtml;

         scenarioListSection.classList.add('hidden');
         scenarioDetailSection.classList.add('hidden');
         comparisonSection.classList.remove('hidden');
     };


    // --- Event Listeners (Mostly unchanged, but ensure they call updated display functions) ---
    calculateButton.addEventListener('click', () => {
        inputError.textContent = '';
        scenarioListSection.classList.add('hidden');
        scenarioDetailSection.classList.add('hidden');
        comparisonSection.classList.add('hidden');
        scenarioListUl.innerHTML = '';

        const resArea = parseFloat(residentialAreaInput.value);
        let storArea = parseFloat(storageAreaInput.value); // Don't default to 0 yet
        const blockType = blockTypeSelect.value;

        if (isNaN(resArea) || resArea <= 0) {
            inputError.textContent = '请输入有效的住宅产权面积。'; return;
        }
         if (isNaN(storArea) || storArea < 0) {
             // Allow calculation with 0, but inform user if input was invalid
            if (storageAreaInput.value !== '' && storageAreaInput.value !== '0') {
                inputError.textContent = '杂物间面积无效，已按 0 计算。';
            }
            storageAreaInput.value = 0;
            storArea = 0;
         }

        currentInputs = { resArea, storArea, blockType };
        try {
            currentScenarios = calculateCompensation(currentInputs);
             if (currentScenarios && currentScenarios.length > 0) {
                 displayScenariosList(currentScenarios);
             } else {
                  inputError.textContent = '未能根据输入生成有效方案。';
                  scenarioListSection.classList.remove('hidden');
                  scenarioListUl.innerHTML = '<li>未能根据输入生成有效方案。</li>';
             }
        } catch (error) {
            inputError.textContent = `计算出错: ${error.message}`;
            console.error("Calculation Error:", error);
        }
    });

    toggleDetailsButton.addEventListener('click', () => {
        const isHidden = scenarioBreakdown.classList.contains('hidden');
        scenarioBreakdown.classList.toggle('hidden');
        toggleDetailsButton.textContent = isHidden ? '隐藏详细构成' : '显示详细构成';
    });

     backToListButton.addEventListener('click', () => {
        scenarioDetailSection.classList.add('hidden');
        scenarioListSection.classList.remove('hidden');
         scenarioListUl.querySelectorAll('.compare-checkbox:checked').forEach(cb => cb.checked = false);
         handleCompareCheckboxChange();
     });

     compareSelectedButton.addEventListener('click', () => {
         const checkedBoxes = scenarioListUl.querySelectorAll('.compare-checkbox:checked');
         const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
         if (selectedIds.length >= 2 && selectedIds.length <= 3) displayComparison(selectedIds);
     });

     closeComparisonButton.addEventListener('click', () => {
         comparisonSection.classList.add('hidden');
         scenarioListSection.classList.remove('hidden');
         scenarioListUl.querySelectorAll('.compare-checkbox:checked').forEach(cb => cb.checked = false);
         handleCompareCheckboxChange();
     });

    storageAdviceButton.addEventListener('click', (e) => {
        const scenarioId = e.target.dataset.scenarioId;
        const scenario = currentScenarios.find(s => s.id === scenarioId);
         if (!scenario || !currentInputs || Object.keys(currentInputs).length === 0) {
             adviceText.innerText = "无法生成建议，缺少信息。";
             storageAdviceContent.classList.remove('hidden'); return;
         }
         generateStorageAdvice(scenario, currentInputs);
         storageAdviceContent.classList.remove('hidden');
    });

    // --- Storage Advice Logic (Revised Wording) ---
    const generateStorageAdvice = (currentScenario, originalInputs) => {
        adviceText.innerText = "正在分析..."; // Placeholder

        // Recalculate key metrics without storage
        const inputsWithoutStorage = { ...originalInputs, storArea: 0 };
        inputsWithoutStorage.confirmedArea = inputsWithoutStorage.resArea;
        inputsWithoutStorage.publicCompArea = Math.min(inputsWithoutStorage.confirmedArea * 0.1, MAX_PUBLIC_AREA);
        const housingEligibleCompWithoutStorage = calculateHousingEligibleComp(inputsWithoutStorage);
        const equivalentAreaWithoutStorage = housingEligibleCompWithoutStorage > 0 ? housingEligibleCompWithoutStorage / HOUSING_PRICE : 0;
        const resettlementAreaWithoutStorage = roundUpToTier(equivalentAreaWithoutStorage);

        let adviceLines = [];
        let scenarioWithoutStorage = null; // To store the recalculated scenario without storage
        let diff = 0; // To store difference in final outcome

        // Calculate the corresponding scenario without storage for comparison
        try {
            if (currentScenario.type === "Pure Monetary") {
                scenarioWithoutStorage = calculatePureCash(inputsWithoutStorage);
                if (scenarioWithoutStorage) {
                     diff = currentScenario.totalCompensation - scenarioWithoutStorage.totalCompensation;
                }
            } else if (currentScenario.type === "Max Housing") {
                 const comboWithoutStorage = findHousingCombinations(resettlementAreaWithoutStorage, inputsWithoutStorage.confirmedArea, inputsWithoutStorage.blockType);
                 if (comboWithoutStorage.length > 0) {
                     scenarioWithoutStorage = calculateMaxHousing(inputsWithoutStorage, resettlementAreaWithoutStorage, comboWithoutStorage[0], housingEligibleCompWithoutStorage, equivalentAreaWithoutStorage);
                     if (scenarioWithoutStorage) {
                          diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
                     }
                 }
            } else if (currentScenario.type === "1 House + Cash") {
                 const selectedSize = currentScenario.selectedArea;
                 const valueNeededForThisHouse = selectedSize * HOUSING_PRICE;
                 // Check if still possible within tolerance
                 if (housingEligibleCompWithoutStorage >= valueNeededForThisHouse * 0.99) {
                    scenarioWithoutStorage = calculateHousePlusCash(inputsWithoutStorage, selectedSize, housingEligibleCompWithoutStorage);
                     if (scenarioWithoutStorage) {
                         diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
                     }
                 }
            }
        } catch (e) {
             console.error("Error recalculating scenario without storage for advice:", e);
        }

        // Construct advice based on comparison
        if (currentScenario.type === "Pure Monetary") {
             adviceLines.push(`当前 ${originalInputs.storArea}㎡ 杂物间使您的总补偿款增加了约 ${formatMoney(diff)} 元。`);
        }
        else if (currentScenario.type === "Max Housing") {
             if (currentScenario.resettlementArea === resettlementAreaWithoutStorage) {
                 adviceLines.push(`即使没有当前 ${originalInputs.storArea}㎡ 杂物间，您也可以安置到 ${formatArea(currentScenario.resettlementArea)}㎡。`);
                 if (scenarioWithoutStorage) {
                     adviceLines.push(`若无此杂物间，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
                 } else {
                      adviceLines.push(`若无此杂物间，具体差价影响计算失败。`);
                 }
             } else {
                 adviceLines.push(`当前 ${originalInputs.storArea}㎡ 杂物间使您的安置面积从 ${formatArea(resettlementAreaWithoutStorage)}㎡ 提升到了 ${formatArea(currentScenario.resettlementArea)}㎡。`);
                  if (scenarioWithoutStorage) {
                      adviceLines.push(`若无此杂物间，选择 ${resettlementAreaWithoutStorage}㎡ 的方案，差价对比当前方案约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
                  } else {
                       adviceLines.push(`若无此杂物间，具体差价影响计算失败。`);
                  }
             }
        }
        else if (currentScenario.type === "1 House + Cash") {
            const selectedSize = currentScenario.selectedArea;
            if (scenarioWithoutStorage) { // Means it was possible to select this size even without storage
                 adviceLines.push(`即使没有当前 ${originalInputs.storArea}㎡ 杂物间，您也可以选择 ${selectedSize}㎡ 房型。`);
                 adviceLines.push(`若无此杂物间，选择 ${selectedSize}㎡ 时，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
            } else { // Not possible without storage
                 adviceLines.push(`当前 ${originalInputs.storArea}㎡ 杂物间使您有资格选择 ${selectedSize}㎡ 房型。若无杂物间则无法选择此方案。`);
            }
        }

         // Advice on reaching the *next* housing tier (if applicable)
         if (currentScenario.type !== "Pure Monetary") {
             const currentMaxArea = currentScenario.resettlementArea; // Use theoretical max from current scenario
             const potentialTiers = [...HOUSING_SIZES, 180].sort((a, b) => a - b);
             let nextTier = -1;
             for (const tier of potentialTiers) {
                 if (tier > currentMaxArea) { nextTier = tier; break; }
             }

             if (nextTier !== -1) {
                 const tierBelowNextIndex = potentialTiers.indexOf(nextTier) - 1;
                 const thresholdTier = tierBelowNextIndex >= 0 ? potentialTiers[tierBelowNextIndex] : 0;
                 const eqAreaNeededForNext = thresholdTier + 0.01;
                 const compNeededForNext = eqAreaNeededForNext * HOUSING_PRICE;
                 const currentComp = currentScenario.housingEligibleComp;

                 if (compNeededForNext > currentComp) {
                     const additionalCompNeeded = compNeededForNext - currentComp;
                      const rates = getRates(originalInputs.blockType);
                       let valuePerStorSqm = 0.5 * (rates.locationRate + rates.oldHouseRate + rates.structureRate + COMPLETE_APT_RATE);
                       const marginalPublicFactor = (originalInputs.publicCompArea < MAX_PUBLIC_AREA) ? (0.5 * 0.1 * (rates.locationRate + PUBLIC_AREA_DIFF_HOUSING)) : 0;
                       valuePerStorSqm += marginalPublicFactor;

                      if (valuePerStorSqm > 0) {
                          const additionalStorNeeded = additionalCompNeeded / valuePerStorSqm;
                          // Only add this line if additional storage is needed
                          adviceLines.push(`若要上靠一档至 ${nextTier}㎡，估算需要购买 ${formatArea(additionalStorNeeded)}㎡ 以上的杂物间面积。`);
                      }
                 } else {
                      // Already eligible for next tier or higher
                      adviceLines.push(`您当前条件已满足上靠至 ${nextTier}㎡ (或更高) 的要求。`);
                 }
             } else if (currentMaxArea > 0) { // Only show if already at max tier AND not pure cash
                  adviceLines.push(`您已达到最高安置档位 (${currentMaxArea}㎡)，无法再上靠。`);
             }
         }

        // Display advice
        adviceText.innerText = adviceLines.length > 0 ? adviceLines.join('\n\n') : "未能生成相关建议。";
    };

}); // End DOMContentLoaded