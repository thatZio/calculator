document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const residenceBlockTypeSelect = document.getElementById('residence-block-type');
    const residentialAreaInput = document.getElementById('residential-area');
    const storageInputsContainer = document.getElementById('storage-inputs-container');
    const addStorageButton = document.getElementById('add-storage-button');
    const publicHousingYesRadio = document.getElementById('public-housing-yes');
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
    const MIN_HOUSING_EQUIVALENT_AREA = 30; // New constant
    const MAX_PUBLIC_AREA = 10;
    const MONETARY_REWARD_RATE = 272;
    const PUBLIC_AREA_DIFF_HOUSING = 1900;
    const PUBLIC_AREA_DIFF_CASH = MONETARY_REWARD_RATE; // Public Comp uses this for cash part
    const COMPLETE_APT_RATE = 420;
    const SETTLING_RATE = 50;
    const MOVING_RATE_BASE = 15;
    const TRANSITION_RATE = 15;
    const TRANSITION_MONTHS_HOUSING = 39;
    const TRANSITION_MONTHS_CASH = 6;
    const RENTAL_SUBSIDY = 20000;
    const PUBLIC_HOUSING_FACTOR = -0.2;
    const MIN_MOVING_1 = 1000;
    const MIN_MOVING_2 = 2000;

    const BLOCK_RATES = {
        A: { locationRate: 15942, structureRate: 570, oldHouseRate: 2660 },
        B: { locationRate: 14864, structureRate: 1150, oldHouseRate: 1500 },
        C: { locationRate: 14864, structureRate: 1087.5, oldHouseRate: 1625 },
        D: { locationRate: 14864, structureRate: 1022, oldHouseRate: 1755 },
    };

    let currentScenarios = [];
    let currentInputs = {};

    // --- Helper Functions ---
     const round = (value, decimals) => {
         if (typeof value !== 'number' || isNaN(value)) return 0;
        const multiplier = Math.pow(10, decimals || 0);
        // Add epsilon for potentially fixing floating point issues before rounding
        return Math.round(value * multiplier + Number.EPSILON) / multiplier;
     }
    const formatMoney = (amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) return '0';
        return Math.round(amount).toLocaleString('zh-CN');
    }
    const formatArea = (area) => {
        if (typeof area !== 'number' || isNaN(area)) return '0.00';
        return area.toFixed(2);
    }
     const formatRate = (rate) => {
          if (typeof rate !== 'number' || isNaN(rate)) return '0';
          return Number(rate.toFixed(4)).toLocaleString('zh-CN');
     }
    const getRates = (blockType) => {
        return BLOCK_RATES[blockType] || BLOCK_RATES['B'];
    };
    const roundUpToTier = (area) => {
        // --- MODIFICATION: Return 0 if area is less than the minimum required ---
        if (area < MIN_HOUSING_EQUIVALENT_AREA) return 0;

        const potentialTiers = HOUSING_SIZES.filter(tier => tier > 0).sort((a, b) => a - b); // Exclude 180 for direct selection? Only use HOUSING_SIZES

        let previousTier = 0;
         // Special case: If area is exactly MIN_HOUSING_EQUIVALENT_AREA or slightly above, but below 45, round up to 45.
         if (area >= MIN_HOUSING_EQUIVALENT_AREA && area <= potentialTiers[0]) {
              return potentialTiers[0]; // Round up to 45
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
        // If area > largest tier (150), cap at 150 for direct rounding? Or allow 180 target? Let's allow 180 target conceptually.
        if (area > Math.max(...potentialTiers)) return 180; // Or Math.max(...potentialTiers) if 180 isn't a hard cap

        return Math.max(...potentialTiers); // Should theoretically not be reached if 180 is handled
    };

    // --- Dynamic Input Handling ---
    const createStorageInputRow = () => { /* ... unchanged ... */
        const row = document.createElement('div');
        row.className = 'storage-input-row';

        const areaInput = document.createElement('input');
        areaInput.type = 'number';
        areaInput.className = 'storage-area';
        areaInput.placeholder = '面积(㎡)';
        areaInput.step = '0.01';
        areaInput.min = '0'; // Allow 0

        const blockSelect = document.createElement('select');
        blockSelect.className = 'storage-block-type';
        blockSelect.innerHTML = `
            <option value="" disabled selected>选择地块 (默认同住宅)</option>
            <option value="A">A地块</option>
            <option value="B">B地块</option>
            <option value="C">C地块</option>
            <option value="D">D地块</option>
        `;

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

         const existingRows = storageInputsContainer.querySelectorAll('.storage-input-row');
         if (existingRows.length > 0) {
             removeButton.style.display = 'inline-block';
             const firstRemoveButton = existingRows[0].querySelector('.remove-storage-button');
             if (firstRemoveButton && firstRemoveButton.style.display === 'none') {
                 firstRemoveButton.style.display = 'inline-block';
             }
         } else {
              removeButton.style.display = 'none';
         }

        row.appendChild(areaInput);
        row.appendChild(blockSelect);
        row.appendChild(removeButton);
        return row;
    };

    addStorageButton.addEventListener('click', () => { /* ... unchanged ... */
        storageInputsContainer.appendChild(createStorageInputRow());
    });

    // --- Core Calculation Logic ---
    const calculateCompensation = (inputs) => {
        const { resArea, storageInputs, resBlock, isPublicHousing } = inputs;
        const resRates = getRates(resBlock);

        let totalEffectiveStorageArea = 0;
        storageInputs.forEach(stor => { totalEffectiveStorageArea += stor.effectiveArea; });
        const confirmedAreaPrecise = resArea + totalEffectiveStorageArea;
        const confirmedArea = round(confirmedAreaPrecise, 2);
        const publicCompAreaUncapped = round(confirmedAreaPrecise * 0.1, 2);
        const publicCompArea = Math.min(publicCompAreaUncapped, MAX_PUBLIC_AREA);

        inputs.confirmedArea = confirmedArea;
        inputs.confirmedAreaPrecise = confirmedAreaPrecise;
        inputs.publicCompArea = publicCompArea;
        inputs.resRates = resRates;

        let scenarios = [];

        // Calculate HEC and Total Structure Bonus
        const { housingEligibleComp, totalStructureComp } = calculateHousingEligibleCompAndStructure(inputs);
        inputs.housingEligibleComp = housingEligibleComp;
        inputs.totalStructureComp = totalStructureComp;

        // Calculate Equivalent Area (Block Dependent)
        let equivalentArea = 0;
        if (resBlock === 'A') {
            equivalentArea = housingEligibleComp > 0 ? round(housingEligibleComp / HOUSING_PRICE, 2) : 0;
        } else {
            equivalentArea = round(confirmedAreaPrecise + round(confirmedAreaPrecise * 0.1, 2), 2);
        }
        inputs.equivalentArea = equivalentArea; // Store calculated equivalent area

        // --- MODIFICATION: Check minimum equivalent area for housing ---
        if (equivalentArea < MIN_HOUSING_EQUIVALENT_AREA) {
            console.log(`Equivalent area ${equivalentArea} is less than ${MIN_HOUSING_EQUIVALENT_AREA}, only Pure Monetary allowed.`);
            // Only calculate and return the Pure Cash scenario
            inputs.relocationRewardTiered = calculateRelocationReward(confirmedArea); // Need these for cash calc
            inputs.publicHousingDeductionAmount = calculatePublicDeduction(isPublicHousing, confirmedAreaPrecise, resRates);
            scenarios.push(calculatePureCash(inputs));
            currentScenarios = scenarios; // Update global scenarios
            return scenarios; // Exit early
        }
        // --- End Modification ---


        // Calculate Resettlement Area (only if housing is possible)
        const resettlementArea = roundUpToTier(equivalentArea);
        inputs.resettlementArea = resettlementArea;

        // Calculate Tiered Relocation Reward
        inputs.relocationRewardTiered = calculateRelocationReward(confirmedArea);

        // Calculate Public Housing Deduction (Using new formula)
        inputs.publicHousingDeductionAmount = calculatePublicDeduction(isPublicHousing, confirmedAreaPrecise, resRates);


        // --- Generate Scenarios ---
        scenarios.push(calculatePureCash(inputs)); // Always add pure cash
        // Scenarios: Max Housing (if resettlementArea > 0)
        if (resettlementArea > 0) { // Should be true if eqArea >= MIN_HOUSING_EQUIVALENT_AREA
            const maxHousingCombinations = findHousingCombinations(resettlementArea);
            // Log ALL combinations found by the helper function
            console.log(`Target Resettlement Area: ${resettlementArea}, Found Combinations for Max Housing:`, maxHousingCombinations);

            if (maxHousingCombinations.length > 0) {
                 // --- MODIFICATION: Loop through ALL found combinations ---
                 for (const combo of maxHousingCombinations) {
                     // Create a Max Housing scenario for EACH valid combination
                     scenarios.push(calculateMaxHousing(inputs, resettlementArea, combo));
                 }
                 // --- End Modification ---
            } else {
                 // Keep the fallback for cases where the target area cannot be formed by combinations
                 console.warn(`Could not find specific combination(s) for target area ${resettlementArea}. Creating generic Max Housing.`);
                 // Add a generic Max Housing scenario if no specific combo works (e.g., target is 170)
                 scenarios.push(calculateMaxHousing(inputs, resettlementArea, [])); // Pass empty combo indicates generic
            }
         }

        // Scenarios: 1 House + Cash
        for (const size of HOUSING_SIZES) {
            const selectedHouseValue = size * HOUSING_PRICE;
             if (housingEligibleComp >= selectedHouseValue - 1) {
                 scenarios.push(calculateOneHousePlusCash(inputs, size));
            }
        }

        // Scenarios: 2 Houses + Cash
        const n_sizes = HOUSING_SIZES.length;
        for (let i = 0; i < n_sizes; i++) {
            for (let j = i; j < n_sizes; j++) {
                const combo = [HOUSING_SIZES[i], HOUSING_SIZES[j]];
                const selectedTotalArea = combo[0] + combo[1];
                const selectedHouseValue = selectedTotalArea * HOUSING_PRICE;

                 if (selectedTotalArea > resettlementArea + 1) continue;

                 if (housingEligibleComp >= selectedHouseValue - 1) {
                      // Skip if identical to Max Housing scenario area
                      if (scenarios.some(s => s.type === "Max Housing" && Math.abs(s.selectedArea - selectedTotalArea) < 0.01)) {
                          console.log(`Skipping 2H+C for ${combo.join('+')} as Max Housing exists for area ${selectedTotalArea}`);
                          continue;
                      }
                      scenarios.push(calculateTwoHousesPlusCash(inputs, combo));
                 }
            }
        }

        // Filter scenarios
         const uniqueScenarios = [];
         const seenSignatures = new Set();
         const maxHousingCombos = new Map();

         scenarios.filter(s => s.type === "Max Housing").forEach(s => {
              maxHousingCombos.set(round(s.selectedArea, 2), s.combo ? [...s.combo].sort((a, b) => a - b).join('-') : 'none');
         });

        for (const s of scenarios) {
             let comboString = s.combo && s.combo.length > 0 ? [...s.combo].sort((a, b) => a - b).join('-') : 'none';
             const signature = `${s.type}_${comboString}`;

             if ((s.type === "1 House + Cash" || s.type === "2 Houses + Cash") && maxHousingCombos.has(round(s.selectedArea, 2))) {
                 console.log(`Skipping ${s.name} because Max Housing exists for area ${s.selectedArea}`);
                 continue;
             }

            if (!seenSignatures.has(signature)) {
                uniqueScenarios.push(s);
                seenSignatures.add(signature);
            } else {
                 console.log(`Filtered out duplicate: ${s.name}, Signature: ${signature}`);
            }
        }

        // --- MODIFICATION: Sort based on new category requirements ---
        uniqueScenarios.sort((a, b) => {
             // Assign numeric order to categories
             const categoryOrder = { "Max Housing": 1, "1 House + Cash": 2, "2 Houses + Cash": 3, "Pure Monetary": 4 };
             const orderA = categoryOrder[a.type] || 99; // Assign high number for unknown types
             const orderB = categoryOrder[b.type] || 99;

             if (orderA !== orderB) {
                 return orderA - orderB; // Sort by category first (1, 2, 3, 4)
             }

             // Secondary sort within category
             if (a.type === 'Max Housing') {
                 // Sort Max Housing by total area descending (largest first)
                 return b.selectedArea - a.selectedArea;
             }
             if (a.type === '1 House + Cash') {
                 // Sort 1H+C by selected area descending (largest first)
                 return b.selectedArea - a.selectedArea;
             }
             if (a.type === '2 Houses + Cash') {
                  // Sort 2H+C by total selected area descending (largest first)
                  // Optional secondary: sort by largest house in combo if areas are equal
                  if (b.selectedArea !== a.selectedArea) {
                     return b.selectedArea - a.selectedArea;
                  } else {
                      return Math.max(...(b.combo || [0])) - Math.max(...(a.combo || [0]));
                  }
             }
             // Pure Monetary needs no secondary sort within its category

             return 0; // Should not be reached if all types covered
         });
        // --- End Sorting Modification ---

        console.log("Final Unique Scenarios:", uniqueScenarios.map(s => s.name));
        currentScenarios = uniqueScenarios; // Update global scenarios
        return uniqueScenarios;
    };

    // --- Helper: Calculate Relocation Reward ---
    const calculateRelocationReward = (confirmedArea) => {
        if (confirmedArea >= 90) return 30000;
        if (confirmedArea >= 60) return 25000;
        return 20000;
    };

    // --- Helper: Calculate Public Deduction ---
    const calculatePublicDeduction = (isPublicHousing, confirmedAreaPrecise, resRates) => {
         // --- MODIFICATION: Use new formula ---
         return isPublicHousing ? round(confirmedAreaPrecise * resRates.locationRate * PUBLIC_HOUSING_FACTOR, 0) : 0;
    };


    // --- Calculate Housing Eligible Comp & Structure Bonus Separately ---
    const calculateHousingEligibleCompAndStructure = (inputs) => {
        const { resArea, storageInputs, confirmedAreaPrecise, publicCompArea, resBlock, resRates } = inputs;

        let housingEligibleComp = 0;
        let totalStructureComp = 0;

        // --- MODIFICATION: Calculate structure per component ---
        // Residence Component Value (Loc + Old + Struct)
        const resBaseValue = resArea * (resRates.locationRate + resRates.oldHouseRate);
        const resStructureComp = resArea * resRates.structureRate;
        housingEligibleComp += resBaseValue + resStructureComp;
        totalStructureComp += resStructureComp;

        // Storage Components Value (Loc + Old + Struct) - Loop
        storageInputs.forEach((stor) => {
            const storRates = getRates(stor.block);
            const storBaseValue = stor.effectiveArea * (storRates.locationRate + storRates.oldHouseRate);
            const storStructureComp = stor.effectiveArea * storRates.structureRate;
            housingEligibleComp += storBaseValue + storStructureComp;
            totalStructureComp += storStructureComp;
        });

        // Public Area Component Value (Housing rate)
        const publicCompValue = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
        housingEligibleComp += publicCompValue;

        // Complete Apartment Component Value (Use precise confirmed area)
        const completeAptComp = confirmedAreaPrecise * COMPLETE_APT_RATE;
        housingEligibleComp += completeAptComp;

        // --- End Structure Modification ---

        return {
             housingEligibleComp: round(housingEligibleComp, 2),
             totalStructureComp: totalStructureComp // Keep precise structure total
        };
    };


    // --- Find Housing Combinations ---
    const findHousingCombinations = (targetArea) => { /* ... unchanged refinement from previous response ... */
        if (targetArea <= 0) return [];
        let combinations = [];
        const n = HOUSING_SIZES.length;
        const tolerance = 0.01;

         HOUSING_SIZES.forEach(size => {
             if (Math.abs(size - targetArea) < tolerance) {
                 if (!combinations.some(c => c.length === 1 && c[0] === size)) {
                      combinations.push([size]);
                 }
             }
         });

        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                const size1 = HOUSING_SIZES[i];
                const size2 = HOUSING_SIZES[j];
                const combo = [size1, size2].sort((a,b)=>a-b);
                const comboSum = size1 + size2;

                 if (Math.abs(comboSum - targetArea) < tolerance) {
                      if (combinations.some(c => c.length === 1 && Math.abs(c[0] - targetArea) < tolerance)) {
                          if (size1 !== size2 || !HOUSING_SIZES.includes(targetArea)) {
                               if (!combinations.some(existing => existing.length === 2 && existing[0] === combo[0] && existing[1] === combo[1])) {
                                   combinations.push(combo);
                               }
                          }
                      } else {
                           if (!combinations.some(existing => existing.length === 2 && existing[0] === combo[0] && existing[1] === combo[1])) {
                               combinations.push(combo);
                           }
                      }
                 }
            }
        }
         combinations.sort((a, b) => {
             if (a.length !== b.length) return a.length - b.length;
             return Math.max(...b) - Math.max(...a);
         });
        return combinations;
    };


    // --- Calculation Functions (Revised Structure & Splitting) ---

    const calculatePureCash = (inputs) => {
        const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, relocationRewardTiered, publicHousingDeductionAmount, housingEligibleComp } = inputs;
        let breakdown = [];
        let currentTotal = 0;

        // --- Uses precise confirmed area for rate-based calcs ---
        const comp1 = resArea * resRates.locationRate;
        breakdown.push({ name: `住宅区位补偿 (${resBlock}地块)`, value: comp1, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.locationRate)}/㎡` });
        currentTotal += comp1;
        const comp2 = resArea * resRates.oldHouseRate;
         breakdown.push({ name: `住宅旧房补偿 (${resBlock}地块)`, value: comp2, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.oldHouseRate)}/㎡` });
        currentTotal += comp2;

         storageInputs.forEach((stor, index) => { /* ... unchanged ... */
             const storRates = getRates(stor.block);
             const comp_stor_loc = stor.effectiveArea * storRates.locationRate;
             breakdown.push({ name: `杂物间${index + 1}区位 (${stor.block}地块)`, value: comp_stor_loc, formula: `${formatArea(stor.effectiveArea)}㎡ × ${formatRate(storRates.locationRate)}/㎡` });
             currentTotal += comp_stor_loc;
             const comp_stor_old = stor.effectiveArea * storRates.oldHouseRate;
             breakdown.push({ name: `杂物间${index + 1}旧房 (${stor.block}地块)`, value: comp_stor_old, formula: `${formatArea(stor.effectiveArea)}㎡ × ${formatRate(storRates.oldHouseRate)}/㎡` });
             currentTotal += comp_stor_old;
         });

        const comp5_cash = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH); // Use cash diff rate
        breakdown.push({ name: "公摊补偿(货币)", value: comp5_cash, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_CASH})/㎡` });
        currentTotal += comp5_cash;

        const comp6_cash = confirmedAreaPrecise * MONETARY_REWARD_RATE;
        breakdown.push({ name: "货币奖励", value: comp6_cash, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
        currentTotal += comp6_cash;

        const comp7 = confirmedAreaPrecise * COMPLETE_APT_RATE;
        breakdown.push({ name: "成套房补贴", value: comp7, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
        currentTotal += comp7;

        const movingFee1 = Math.max(confirmedArea * MOVING_RATE_BASE * 1, MIN_MOVING_1); // Use rounded confirmedArea for fee basis
        breakdown.push({ name: "搬家费(1次)", value: movingFee1, formula: `MAX(${formatArea(confirmedArea)}㎡ × ${MOVING_RATE_BASE}/㎡ × 1, ${formatMoney(MIN_MOVING_1)})` });
        currentTotal += movingFee1;

        const comp_transition = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_CASH;
         breakdown.push({ name: `过渡费(${TRANSITION_MONTHS_CASH}个月)`, value: comp_transition, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_CASH}月` });
        currentTotal += comp_transition;

         const comp_settling = confirmedAreaPrecise * SETTLING_RATE;
        breakdown.push({ name: "安家补贴", value: comp_settling, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${SETTLING_RATE}/㎡` });
        currentTotal += comp_settling;

         breakdown.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` });
         currentTotal += relocationRewardTiered;

        const comp_rental = RENTAL_SUBSIDY;
        breakdown.push({ name: "租房补贴", value: comp_rental, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
        currentTotal += comp_rental;

        if (isPublicHousing && publicHousingDeductionAmount !== 0) {
             // --- MODIFICATION: Use new formula string ---
             breakdown.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true });
             currentTotal += publicHousingDeductionAmount;
        }

        const finalTotal = round(currentTotal, 0);

        return { /* ... unchanged structure ... */
            id: `cash_${Date.now()}`,
            type: "Pure Monetary",
            name: "纯货币补偿", // Adjusted name
            selectedArea: 0,
            combo: [],
            totalCompensation: finalTotal,
            housingCost: 0,
            finalDifference: finalTotal,
            breakdown: breakdown,
            housingEligibleComp: housingEligibleComp,
            equivalentArea: equivalentArea,
            resettlementArea: 0,
            confirmedArea: confirmedArea,
            publicCompArea: publicCompArea,
            isPublicHousing: isPublicHousing,
            publicHousingDeductionAmount: publicHousingDeductionAmount,
            relocationReward: relocationRewardTiered,
            totalStructureComp: inputs.totalStructureComp,
        };
    };

     const calculateMaxHousing = (inputs, resettlementArea, combo) => {
         const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, housingEligibleComp, totalStructureComp, relocationRewardTiered, publicHousingDeductionAmount } = inputs;
         let breakdown = [];
         let currentTotal = 0;
         // Ensure combo is an array even if passed as empty
         const safeCombo = Array.isArray(combo) ? combo : [];
         safeCombo.sort((a, b) => b - a);

         // --- Uses precise confirmed area for rate-based calcs ---
         const resComp = resArea * (resRates.locationRate + resRates.oldHouseRate);
         breakdown.push({ name: `住宅区位+旧房 (${resBlock}地块)`, value: resComp, formula: `${formatArea(resArea)}㎡ × (${formatRate(resRates.locationRate)} + ${formatRate(resRates.oldHouseRate)})/㎡` });
         currentTotal += resComp;

         storageInputs.forEach((stor, index) => { // ... unchanged ...
            const storRates = getRates(stor.block);
            const storComp = stor.effectiveArea * (storRates.locationRate + storRates.oldHouseRate);
            breakdown.push({ name: `杂物间${index + 1}区位+旧房 (${stor.block}地块)`, value: storComp, formula: `${formatArea(stor.effectiveArea)}㎡ × (${formatRate(storRates.locationRate)} + ${formatRate(storRates.oldHouseRate)})/㎡` });
            currentTotal += storComp;
        });

        const publicCompValue = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
        breakdown.push({ name: "公摊补偿(拿房)", value: publicCompValue, formula: `${formatArea(publicCompArea)}㎡ × (${formatRate(resRates.locationRate)} + ${PUBLIC_AREA_DIFF_HOUSING})/㎡` });
        currentTotal += publicCompValue;

       // --- MODIFICATION: Add Structure bonus breakdown ---
       const resStructureComp = resArea * resRates.structureRate;
        breakdown.push({ name: `房屋结构等级优惠 (${resBlock}地块)`, value: resStructureComp, formula: `${formatArea(resArea)}㎡ × ${formatRate(resRates.structureRate)}/㎡` });
        storageInputs.forEach((stor, index) => {
            const storRates = getRates(stor.block);
            const storStructureComp = stor.effectiveArea * storRates.structureRate;
            breakdown.push({ name: `杂物间${index + 1}结构等级优惠 (${stor.block}地块)`, value: storStructureComp, formula: `${formatArea(stor.effectiveArea)}㎡ × ${formatRate(storRates.structureRate)}/㎡` });
        });
        currentTotal += totalStructureComp; // Add the pre-calculated total

        const completeAptComp = confirmedAreaPrecise * COMPLETE_APT_RATE;
        breakdown.push({ name: "成套房补贴", value: completeAptComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${COMPLETE_APT_RATE}/㎡` });
        currentTotal += completeAptComp;

        breakdown.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` });
        currentTotal += relocationRewardTiered;

        const movingFee2 = Math.max(confirmedArea * MOVING_RATE_BASE * 2, MIN_MOVING_2); // Use rounded confirmedArea
        breakdown.push({ name: "搬家费(2次)", value: movingFee2, formula: `MAX(${formatArea(confirmedArea)}㎡ × ${MOVING_RATE_BASE}/㎡ × 2, ${formatMoney(MIN_MOVING_2)})` });
        currentTotal += movingFee2;

        const transitionAddnlComp = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING;
        breakdown.push({ name: `过渡费+增发(${TRANSITION_MONTHS_HOUSING}月)`, value: transitionAddnlComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${TRANSITION_RATE}/㎡/月 × ${TRANSITION_MONTHS_HOUSING}月` });
        currentTotal += transitionAddnlComp;

        const settlingComp = confirmedAreaPrecise * SETTLING_RATE;
        breakdown.push({ name: "安家补贴", value: settlingComp, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${SETTLING_RATE}/㎡` });
        currentTotal += settlingComp;

        const rentalComp = RENTAL_SUBSIDY;
        breakdown.push({ name: "租房补贴", value: rentalComp, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
        currentTotal += rentalComp;

        if (isPublicHousing && publicHousingDeductionAmount !== 0) {
            // --- MODIFICATION: Use new formula string ---
            breakdown.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true });
            currentTotal += publicHousingDeductionAmount;
        }

        const totalCompensation = round(currentTotal, 0);
        const housingCost = round(resettlementArea * HOUSING_PRICE, 0);
        const finalDifference = totalCompensation - housingCost;

        // --- MODIFICATION: Adjust name based on combo ---
        let name;
        if (safeCombo && safeCombo.length > 0) {
             name = safeCombo.join('㎡ + ') + '㎡';
        } else {
             // Handle case where no specific combo could be found for the target area
             name = `极限拿房 (目标 ${formatArea(resettlementArea)}㎡)`;
        }

        return { /* ... unchanged structure ... */
            id: `max_${(safeCombo || []).sort((a,b)=>a-b).join('_')}_${Date.now()}`,
            type: "Max Housing",
            name: name,
            selectedArea: resettlementArea,
            combo: safeCombo || [],
            totalCompensation: totalCompensation,
            housingCost: housingCost,
            finalDifference: finalDifference,
            breakdown: breakdown,
            housingEligibleComp: housingEligibleComp,
            equivalentArea: equivalentArea,
            resettlementArea: resettlementArea,
            confirmedArea: confirmedArea,
            publicCompArea: publicCompArea,
            isPublicHousing: isPublicHousing,
            publicHousingDeductionAmount: publicHousingDeductionAmount,
            relocationReward: relocationRewardTiered,
            totalStructureComp: totalStructureComp,
        };
    };

    // --- Unified Function for 1 or 2 Houses + Cash (Using Value Splitting) ---
    const calculateXHousePlusCash = (inputs, combo) => {
        const { resArea, storageInputs, confirmedArea, confirmedAreaPrecise, publicCompArea, resBlock, resRates, isPublicHousing, equivalentArea, resettlementArea, housingEligibleComp, totalStructureComp, relocationRewardTiered, publicHousingDeductionAmount } = inputs;

        let breakdown_part1 = []; // Housing related compensation items
        let breakdown_part2 = []; // Cash related compensation items
        let totalPart1Value = 0; // Tracks value allocated to Part 1
        let totalPart2Value = 0; // Tracks value allocated to Part 2

        const selectedTotalArea = combo.reduce((sum, size) => sum + size, 0);
        const houseValue = selectedTotalArea * HOUSING_PRICE;

        // --- Value Proportion Calculation ---
        let propHouse = 0;
        // Prevent division by zero or negative HEC
        if (housingEligibleComp > 0) {
            propHouse = Math.min(houseValue / housingEligibleComp, 1);
        }
        if (propHouse > 1 && propHouse < 1.00001) propHouse = 1; // Fix potential float > 1 issue
        const propCash = Math.max(0, 1 - propHouse);

        // --- Calculate Base Values for Each Component (Housing Rates) ---
        // Residence
        const resLocOldValue_H = resArea * (resRates.locationRate + resRates.oldHouseRate);
        const resStructValue_H = resArea * resRates.structureRate;
        const resCompAptValue_H = resArea * COMPLETE_APT_RATE; // Base CompApt on resArea for proportion? Let's use confirmedArea later.

        // Storage (Sum across all storage rooms)
        let storLocOldValue_H_Total = 0;
        let storStructValue_H_Total = 0;
        storageInputs.forEach(stor => {
            const storRates = getRates(stor.block);
            storLocOldValue_H_Total += stor.effectiveArea * (storRates.locationRate + storRates.oldHouseRate);
            storStructValue_H_Total += stor.effectiveArea * storRates.structureRate;
        });

        // Public Area (Housing Rates)
        const publicCompValue_H = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);

        // Complete Apt (Based on TOTAL precise confirmed area)
        const completeAptValue_Total = confirmedAreaPrecise * COMPLETE_APT_RATE;

        // Structure Bonus (Total pre-calculated)
        const structureBonusValue_Total = totalStructureComp;


        // --- Allocate Value and Build Breakdown for Part 1 (Housing) ---
        // Allocate HEC components proportionally to Part 1
        const p1_resLocOld = resLocOldValue_H * propHouse;
        breakdown_part1.push({ name: `住宅区位+旧房(房部分 ${resBlock})`, value: p1_resLocOld, formula: `住宅价值按比例 ${formatArea(propHouse*100)}%`});
        totalPart1Value += p1_resLocOld;

        const p1_storLocOld = storLocOldValue_H_Total * propHouse;
        breakdown_part1.push({ name: `杂物间区位+旧房(房部分 合计)`, value: p1_storLocOld, formula: `杂物间价值按比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_storLocOld;

        const p1_publicComp = publicCompValue_H * propHouse;
        breakdown_part1.push({ name: "公摊补偿(房部分)", value: p1_publicComp, formula: `公摊价值按比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_publicComp;

        const p1_structureComp = structureBonusValue_Total * propHouse;
        breakdown_part1.push({ name: "房屋结构等级优惠(房部分)", value: p1_structureComp, formula: `结构总款按比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_structureComp;

        const p1_completeAptComp = completeAptValue_Total * propHouse;
        breakdown_part1.push({ name: "成套房补贴(房部分)", value: p1_completeAptComp, formula: `成套房总补贴按比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_completeAptComp;

        // Shared Fees (Proportioned to Part 1) - Use precise area for calculation basis
        const movingFee2Total = Math.max(confirmedArea * MOVING_RATE_BASE * 2, MIN_MOVING_2); // Use rounded area for fee basis
        const p1_moving = movingFee2Total * propHouse;
        breakdown_part1.push({ name: "搬家费(房部分)", value: p1_moving, formula: `2次总额 ${formatMoney(movingFee2Total)} × ${formatArea(propHouse * 100)}%` });
        totalPart1Value += p1_moving; // Moving fee adds to total compensation value

        const transitionHousingTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_HOUSING;
        const p1_transition = transitionHousingTotal * propHouse;
        breakdown_part1.push({ name: `过渡费+增发(房部分×${TRANSITION_MONTHS_HOUSING}月)`, value: p1_transition, formula: `房部分比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_transition; // Transition fee adds to total compensation value

        const settlingTotal = confirmedAreaPrecise * SETTLING_RATE;
        const p1_settling = settlingTotal * propHouse;
        breakdown_part1.push({ name: "安家补贴(房部分)", value: p1_settling, formula: `房部分比例 ${formatArea(propHouse*100)}%` });
        totalPart1Value += p1_settling; // Settling fee adds to total compensation value


        // --- Allocate Value and Build Breakdown for Part 2 (Cash) ---
        // Allocate HEC components proportionally to Part 2
        const p2_resLocOld = resLocOldValue_H * propCash; // Base value uses Housing rates, proportioned
        breakdown_part2.push({ name: `住宅区位+旧房(币部分 ${resBlock})`, value: p2_resLocOld, formula: `住宅价值按比例 ${formatArea(propCash*100)}%`});
        totalPart2Value += p2_resLocOld;

        const p2_storLocOld = storLocOldValue_H_Total * propCash; // Base value uses Housing rates, proportioned
        breakdown_part2.push({ name: `杂物间区位+旧房(币部分 合计)`, value: p2_storLocOld, formula: `杂物间价值按比例 ${formatArea(propCash*100)}%` });
        totalPart2Value += p2_storLocOld;

        // Public Area Comp (Cash Rate applied to proportioned area OR proportioned value?) Let's use proportioned value of CASH version
        const publicCompValue_C = publicCompArea * (resRates.locationRate + PUBLIC_AREA_DIFF_CASH);
        const p2_publicComp = publicCompValue_C * propCash;
        breakdown_part2.push({ name: "公摊补偿(币部分)", value: p2_publicComp, formula: `公摊货币价值按比例 ${formatArea(propCash*100)}%` });
        totalPart2Value += p2_publicComp;

        // Structure Bonus REPLACED by Monetary Reward (Applied to proportioned confirmed area)
        const confirmedAreaPrecise_c = confirmedAreaPrecise * propCash;
        const p2_monetaryReward = confirmedAreaPrecise_c * MONETARY_REWARD_RATE;
        breakdown_part2.push({ name: "货币奖励(币部分)", value: p2_monetaryReward, formula: `${formatArea(confirmedAreaPrecise_c)}㎡ × ${MONETARY_REWARD_RATE}/㎡` });
        totalPart2Value += p2_monetaryReward;

        // Complete Apt Comp (Proportioned)
        const p2_completeAptComp = completeAptValue_Total * propCash;
        breakdown_part2.push({ name: "成套房补贴(币部分)", value: p2_completeAptComp, formula: `成套房总补贴按比例 ${formatArea(propCash*100)}%` });
        totalPart2Value += p2_completeAptComp;

        // Shared Fees (Proportioned to Part 2)
        const movingFee1Total = Math.max(confirmedArea * MOVING_RATE_BASE * 1, MIN_MOVING_1); // Use rounded area
        const p2_moving = movingFee1Total * propCash;
        breakdown_part2.push({ name: "搬家费(币部分)", value: p2_moving, formula: `1次总额 ${formatMoney(movingFee1Total)} × ${formatArea(propCash * 100)}%` });
        totalPart2Value += p2_moving;

        const transitionCashTotal = confirmedAreaPrecise * TRANSITION_RATE * TRANSITION_MONTHS_CASH;
        const p2_transition = transitionCashTotal * propCash;
        breakdown_part2.push({ name: `过渡费(币部分×${TRANSITION_MONTHS_CASH}月)`, value: p2_transition, formula: `币部分比例 ${formatArea(propCash*100)}%` });
        totalPart2Value += p2_transition;

        const p2_settling = settlingTotal * propCash;
        breakdown_part2.push({ name: "安家补贴(币部分)", value: p2_settling, formula: `币部分比例 ${formatArea(propCash*100)}%` });
        totalPart2Value += p2_settling;

        // Add Full Fixed Rewards/Deductions to Part 2
        breakdown_part2.push({ name: "搬迁奖励", value: relocationRewardTiered, formula: `按确权面积 ${formatArea(confirmedArea)}㎡ 档` });
        totalPart2Value += relocationRewardTiered;

        breakdown_part2.push({ name: "租房补贴", value: RENTAL_SUBSIDY, formula: `固定 ${formatMoney(RENTAL_SUBSIDY)}` });
        totalPart2Value += RENTAL_SUBSIDY;

        if (isPublicHousing && publicHousingDeductionAmount !== 0) {
             // --- MODIFICATION: Use new formula string ---
            breakdown_part2.push({ name: "公房扣减", value: publicHousingDeductionAmount, formula: `${formatArea(confirmedAreaPrecise)}㎡ × ${formatRate(resRates.locationRate)}/㎡ × ${PUBLIC_HOUSING_FACTOR * 100}%`, isDeduction: true });
            totalPart2Value += publicHousingDeductionAmount; // Already negative
        }


        // Calculate Total Compensation
        const totalCompensation = round(totalPart1Value + totalPart2Value, 0); // Sum the allocated values

        // Verify against Max Housing total (should be very close before rounding)
        const maxHousingTotal = calculateMaxHousing(inputs, selectedTotalArea, []).totalCompensation; // Recalc MaxHousing total
        console.log(`XHC Total: ${totalCompensation}, MaxHousing Total: ${maxHousingTotal}, Diff: ${totalCompensation - maxHousingTotal}`);


        const finalDifference = totalCompensation - round(houseValue, 0);
        const fullBreakdown = [...breakdown_part1, ...breakdown_part2];

        const scenarioType = combo.length === 1 ? "1 House + Cash" : "2 Houses + Cash";
        const scenarioName = `${combo.sort((a, b) => b - a).join('㎡ + ')}㎡ + 货币`;
        const scenarioId = `xhc_${combo.sort((a, b) => a - b).join('_')}_${Date.now()}`;

        return { /* ... unchanged structure ... */
            id: scenarioId,
            type: scenarioType,
            name: scenarioName,
            selectedArea: selectedTotalArea,
            combo: combo.sort((a, b) => b - a),
            totalCompensation: totalCompensation,
            housingCost: round(houseValue, 0),
            finalDifference: finalDifference,
            breakdown: fullBreakdown,
            housingEligibleComp: housingEligibleComp,
            equivalentArea: equivalentArea,
            resettlementArea: resettlementArea,
            confirmedArea: confirmedArea,
            publicCompArea: publicCompArea,
            isPublicHousing: isPublicHousing,
            publicHousingDeductionAmount: publicHousingDeductionAmount,
            relocationReward: relocationRewardTiered,
            propHouse: propHouse,
            propCash: propCash,
            totalStructureComp: totalStructureComp,
        };
    };

   const calculateOneHousePlusCash = (inputs, size) => {
       return calculateXHousePlusCash(inputs, [size]);
   };
   const calculateTwoHousesPlusCash = (inputs, combo) => {
       return calculateXHousePlusCash(inputs, combo);
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

       // --- MODIFICATION: Group scenarios by category ---
       const groupedScenarios = {
           maxHousing: [],
           oneHouseCash: [],
           twoHousesCash: [],
           pureCash: []
       };

       scenarios.forEach(s => {
           if (s.type === "Max Housing") groupedScenarios.maxHousing.push(s);
           else if (s.type === "1 House + Cash") groupedScenarios.oneHouseCash.push(s);
           else if (s.type === "2 Houses + Cash") groupedScenarios.twoHousesCash.push(s);
           else if (s.type === "Pure Monetary") groupedScenarios.pureCash.push(s);
       });

       const addCategoryHeader = (title) => {
            const li = document.createElement('li');
            li.style.fontWeight = 'bold';
            li.style.marginTop = '15px';
            li.style.borderBottom = 'none'; // No separator for header
            li.style.color = '#0056b3'; // Theme color
            li.textContent = title;
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
           link.textContent = scenario.name;
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

       if (groupedScenarios.maxHousing.length > 0) {
            addCategoryHeader("尽可能拿房:");
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
       if (groupedScenarios.pureCash.length > 0) {
            addCategoryHeader("纯货币补偿:");
            groupedScenarios.pureCash.forEach(addScenarioToList);
       }
       // --- End Modification ---


       scenarioListSection.classList.remove('hidden');
       scenarioDetailSection.classList.add('hidden');
       comparisonSection.classList.add('hidden');
       compareSelectedButton.classList.remove('hidden');
       compareInstructions.textContent = '勾选 2 或 3 个方案进行比较';
       handleCompareCheckboxChange(); // Update button state initially
   };

   const handleCompareCheckboxChange = () => { /* ... unchanged ... */
       const checkedBoxes = scenarioListUl.querySelectorAll('.compare-checkbox:checked');
        const count = checkedBoxes.length;
        compareSelectedButton.disabled = count < 2 || count > 3;
        if (count === 0) compareInstructions.textContent = '勾选 2 或 3 个方案进行比较';
        else if (count === 1) compareInstructions.textContent = '请再勾选 1 或 2 个方案';
        else if (count === 2) compareInstructions.textContent = '已选 2 个，可再选 1 个或直接比较';
        else if (count === 3) compareInstructions.textContent = '已选 3 个，请点击比较';
        else compareInstructions.textContent = '最多只能选择 3 个方案进行比较';
   };

   const displayScenarioDetail = (scenarioId) => { /* ... mostly unchanged, verify rounding and formula display ... */
       const scenario = currentScenarios.find(s => s.id === scenarioId);
       if (!scenario) return;

       scenarioTitle.textContent = scenario.name;
       let summaryHtml = '';
       const diffSuffix = " <span class='diff-suffix'>+ 装修补偿、电梯评估款、管线补助等</span>";

       summaryHtml += `<p><strong>确权面积:</strong> ${formatArea(scenario.confirmedArea)} ㎡</p>`;
       summaryHtml += `<p><strong>公摊补偿面积:</strong> ${formatArea(scenario.publicCompArea)} ㎡</p>`;

       if (scenario.type !== "Pure Monetary") {
           summaryHtml += `<p><strong>等面积:</strong> ${formatArea(scenario.equivalentArea)} ㎡</p>`;
           if (scenario.type === "Max Housing") {
               const resettlementAreaDisplay = scenario.resettlementArea || 0;
                const surplusArea = Math.max(0, round(resettlementAreaDisplay - scenario.equivalentArea, 2)); // Round surplus
               summaryHtml += `<p><strong>安置面积(上靠后):</strong> ${formatArea(resettlementAreaDisplay)} ㎡</p>`;
               summaryHtml += `<p><strong>上靠面积:</strong> ${formatArea(surplusArea)} ㎡</p>`;
           }
       }
       summaryHtml += `<hr>`;

        if (scenario.combo && scenario.combo.length > 0) {
            let housingSelectionText = scenario.combo.join('㎡ + ') + '㎡';
            summaryHtml += `<p><strong>选择房型:</strong> ${housingSelectionText}</p>`;
            summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`;
        } else if (scenario.type !== "Pure Monetary") {
            if (scenario.type === "Max Housing") {
                 summaryHtml += `<p><strong>选择房型:</strong> 按最高安置面积 ${formatArea(scenario.selectedArea)}㎡ 选房</p>`;
            } else {
                 summaryHtml += `<p><strong>选择房型:</strong> (错误)</p>`;
            }
             summaryHtml += `<p><strong>购房款:</strong> ${formatMoney(scenario.housingCost)} 元</p>`;
        } else {
            summaryHtml += `<p><strong>选择房型:</strong> 无</p>`;
        }
       summaryHtml += `<p><strong>补偿款总计:</strong> ${formatMoney(scenario.totalCompensation)} 元</p>`;
        if(scenario.isPublicHousing && scenario.publicHousingDeductionAmount !== 0) {
            summaryHtml += `<p style="font-size:0.9em; color: #555;"><strong>(含公房扣减:</strong> ${formatMoney(scenario.publicHousingDeductionAmount)} 元)</p>`;
        }

       const diffValue = scenario.finalDifference;
       const diffColor = diffValue >= 0 ? 'red' : 'green';
       if (diffValue >= 0) {
            summaryHtml += `<p><strong>应退差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(diffValue)} 元</span>${diffSuffix}</p>`;
       } else {
            summaryHtml += `<p><strong>应补缴差价款:</strong> <span style="color: ${diffColor}; font-weight: bold;">${formatMoney(Math.abs(diffValue))} 元</span>${diffSuffix}</p>`;
       }
       scenarioSummary.innerHTML = summaryHtml;

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

       scenarioBreakdown.classList.add('hidden');
       toggleDetailsButton.textContent = '显示详细构成';
       storageAdviceContent.classList.add('hidden');

       scenarioListSection.classList.add('hidden');
       scenarioDetailSection.classList.remove('hidden');
       comparisonSection.classList.add('hidden');

       storageAdviceButton.dataset.scenarioId = scenarioId;
   };

   const displayComparison = (selectedIds) => { /* ... unchanged ... */
       const scenariosToCompare = currentScenarios.filter(s => selectedIds.includes(s.id));
        if (scenariosToCompare.length < 2) return;

        let tableHtml = '<table><thead><tr><th>指标</th>';
        scenariosToCompare.forEach(s => { tableHtml += `<th>${s.name}</th>`; });
        tableHtml += '</tr></thead><tbody>';

        const metrics = [
            { key: 'combo', label: '选择房型', formatter: (combo) => combo && combo.length > 0 ? combo.join('㎡ + ') + '㎡' : '无' }, // Already sorted desc
            { key: 'housingCost', label: '购房款 (元)', formatter: (val) => val > 0 ? formatMoney(val) : '无' },
            { key: 'totalCompensation', label: '补偿款总计 (元)', formatter: formatMoney },
            { key: 'finalDifference', label: '应交(-)/退(+)差价 (元)', formatter: (val) => {
                if (typeof val !== 'number' || isNaN(val)) return 'N/A';
                const color = val >= 0 ? 'red' : 'green';
                return `<span style="color:${color}; font-weight: bold;">${formatMoney(val)}</span>`;
                }
            },
            { key: 'relocationReward', label: '搬迁奖励 (元)', formatter: formatMoney },
             { key: 'publicHousingDeductionAmount', label: '公房扣减 (元)', formatter: (val, scenario) => scenario.isPublicHousing ? formatMoney(val) : '不适用' }
        ];

        metrics.forEach(metric => {
            tableHtml += `<tr><td><strong>${metric.label}</strong></td>`;
            scenariosToCompare.forEach(s => {
                const value = s[metric.key];
                const formattedValue = (metric.formatter) ? metric.formatter(value, s) : (value === undefined || value === null ? 'N/A' : value);
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


   // --- Event Listeners ---
   calculateButton.addEventListener('click', () => { /* ... unchanged input reading ... */
       inputError.textContent = '';
       scenarioListSection.classList.add('hidden');
       scenarioDetailSection.classList.add('hidden');
       comparisonSection.classList.add('hidden');
       scenarioListUl.innerHTML = '';
       currentScenarios = [];

       // Gather Inputs
       const resBlock = residenceBlockTypeSelect.value;
       const resArea = parseFloat(residentialAreaInput.value);
       const isPublicHousing = publicHousingYesRadio.checked;
       const storageInputsRaw = storageInputsContainer.querySelectorAll('.storage-input-row');
       let storageInputs = [];
       let validInputs = true;

       if (isNaN(resArea) || resArea <= 0) {
            inputError.textContent = '请输入有效的住宅产权面积 (>0)。';
            validInputs = false;
       }

       storageInputsRaw.forEach((row, index) => {
           const areaInput = row.querySelector('.storage-area');
           const blockSelect = row.querySelector('.storage-block-type');
           const area = parseFloat(areaInput.value);
           let block = blockSelect.value;

           if (!isNaN(area) && area >= 0) {
               if (!block) {
                   block = resBlock;
               }
               const effectiveArea = round(area * 0.5, 2);
               storageInputs.push({ rawArea: area, block: block, effectiveArea: effectiveArea });
            } else if (areaInput.value.trim() !== '') {
                inputError.textContent += ` 第 ${index + 1} 个杂物间面积无效。`;
                validInputs = false;
           }
       });

       if (!validInputs) return;

       currentInputs = { resArea, resBlock, storageInputs, isPublicHousing };
       try {
            // Calculate Compensation returns the final list or just cash if below threshold
           const scenarios = calculateCompensation(currentInputs);
            if (scenarios && scenarios.length > 0) {
                displayScenariosList(scenarios); // Display the returned scenarios
            } else {
                 inputError.textContent = '未能根据输入生成有效方案，请检查输入或规则。';
                 scenarioListSection.classList.remove('hidden');
                 scenarioListUl.innerHTML = '<li>未能根据输入生成有效方案。</li>';
            }
       } catch (error) {
           inputError.textContent = `计算出错: ${error.message}`;
           console.error("Calculation Error:", error);
       }
   });

   toggleDetailsButton.addEventListener('click', () => { /* ... unchanged ... */
       const isHidden = scenarioBreakdown.classList.contains('hidden');
       scenarioBreakdown.classList.toggle('hidden');
       toggleDetailsButton.textContent = isHidden ? '隐藏详细构成' : '显示详细构成';
   });
   backToListButton.addEventListener('click', () => { /* ... unchanged ... */
       scenarioDetailSection.classList.add('hidden');
       scenarioListSection.classList.remove('hidden');
        scenarioListUl.querySelectorAll('.compare-checkbox:checked').forEach(cb => cb.checked = false);
        handleCompareCheckboxChange();
   });
   compareSelectedButton.addEventListener('click', () => { /* ... unchanged ... */
       const checkedBoxes = scenarioListUl.querySelectorAll('.compare-checkbox:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
        if (selectedIds.length >= 2 && selectedIds.length <= 3) displayComparison(selectedIds);
   });
   closeComparisonButton.addEventListener('click', () => { /* ... unchanged ... */
       comparisonSection.classList.add('hidden');
        scenarioListSection.classList.remove('hidden');
        scenarioListUl.querySelectorAll('.compare-checkbox:checked').forEach(cb => cb.checked = false);
        handleCompareCheckboxChange();
   });
   storageAdviceButton.addEventListener('click', (e) => { /* ... unchanged ... */
       const scenarioId = e.target.dataset.scenarioId;
       const scenario = currentScenarios.find(s => s.id === scenarioId);
        if (!scenario || !currentInputs || Object.keys(currentInputs).length === 0) {
            adviceText.innerText = "无法生成建议，缺少信息。";
            storageAdviceContent.classList.remove('hidden'); return;
        }
        generateStorageAdvice(scenario, currentInputs);
        storageAdviceContent.classList.remove('hidden');
   });

   // --- Storage Advice Logic ---
   const generateStorageAdvice = (currentScenario, originalInputs) => {
       adviceText.innerText = "正在分析...";

       // 1. Recalculate metrics without any storage
       const inputsWithoutStorage = { /* ... unchanged ... */
           ...originalInputs,
            storageInputs: [],
            confirmedAreaPrecise: originalInputs.resArea,
            confirmedArea: round(originalInputs.resArea, 2),
            publicCompArea: Math.min(round(originalInputs.resArea * 0.1, 2), MAX_PUBLIC_AREA)
       };
        inputsWithoutStorage.resRates = getRates(inputsWithoutStorage.resBlock);
        const { housingEligibleComp: hecWithoutStorage } = calculateHousingEligibleCompAndStructure(inputsWithoutStorage);
        inputsWithoutStorage.housingEligibleComp = hecWithoutStorage;
        if (inputsWithoutStorage.resBlock === 'A') {
            inputsWithoutStorage.equivalentArea = hecWithoutStorage > 0 ? round(hecWithoutStorage / HOUSING_PRICE, 2) : 0;
        } else {
            inputsWithoutStorage.equivalentArea = round(inputsWithoutStorage.confirmedAreaPrecise + round(inputsWithoutStorage.confirmedAreaPrecise * 0.1, 2), 2);
        }
        inputsWithoutStorage.resettlementArea = roundUpToTier(inputsWithoutStorage.equivalentArea);
        inputsWithoutStorage.relocationRewardTiered = calculateRelocationReward(inputsWithoutStorage.confirmedArea);
        inputsWithoutStorage.publicHousingDeductionAmount = calculatePublicDeduction(inputsWithoutStorage.isPublicHousing, inputsWithoutStorage.confirmedAreaPrecise, inputsWithoutStorage.resRates);


       let adviceLines = [];
       let scenarioWithoutStorage = null;
       let diff = 0;
       let totalRawStorageArea = originalInputs.storageInputs.reduce((sum, stor) => sum + stor.rawArea, 0);
       const hasStorage = totalRawStorageArea > 0;

       // Try to calculate the same type of scenario without storage
       try { /* ... unchanged logic ... */
            if (currentScenario.type === "Pure Monetary") {
               scenarioWithoutStorage = calculatePureCash(inputsWithoutStorage);
                if (scenarioWithoutStorage) diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
           } else if (currentScenario.type === "Max Housing") {
                const comboWithoutStorage = findHousingCombinations(inputsWithoutStorage.resettlementArea);
                if (comboWithoutStorage.length > 0) {
                     scenarioWithoutStorage = calculateMaxHousing(inputsWithoutStorage, inputsWithoutStorage.resettlementArea, comboWithoutStorage[0]);
                     if (scenarioWithoutStorage) diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
                }
           } else if (currentScenario.type === "1 House + Cash" || currentScenario.type === "2 Houses + Cash") {
                const selectedTotalArea = currentScenario.selectedArea;
                const valueNeededForThisCombo = selectedTotalArea * HOUSING_PRICE;
                if (hecWithoutStorage >= valueNeededForThisCombo -1) {
                    scenarioWithoutStorage = calculateXHousePlusCash(inputsWithoutStorage, currentScenario.combo);
                    if (scenarioWithoutStorage) {
                        diff = currentScenario.finalDifference - scenarioWithoutStorage.finalDifference;
                    }
                } else {
                     scenarioWithoutStorage = null;
                }
           }
       } catch (e) {
            console.error("Error recalculating scenario without storage for advice:", e);
            scenarioWithoutStorage = null;
       }

       // 2. Construct Advice: Impact of current storage
       if (hasStorage) { /* ... unchanged logic ... */
           if (currentScenario.type === "Pure Monetary") {
                adviceLines.push(`当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间使您的总补偿款增加了约 ${formatMoney(diff)} 元。`);
            }
            else if (currentScenario.type === "Max Housing") {
                if (currentScenario.resettlementArea === inputsWithoutStorage.resettlementArea) {
                    adviceLines.push(`即使没有当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间，您也可以安置到 ${formatArea(currentScenario.resettlementArea)}㎡。`);
                    if (scenarioWithoutStorage) {
                         adviceLines.push(`若无此杂物间，选择同类方案，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
                    } else {
                         adviceLines.push(`若无此杂物间，具体差价影响计算失败或无对应方案。`);
                    }
                } else {
                    adviceLines.push(`当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间使您的理论最高安置面积从 ${formatArea(inputsWithoutStorage.resettlementArea)}㎡ 提升到了 ${formatArea(currentScenario.resettlementArea)}㎡。`);
                     if (scenarioWithoutStorage) {
                         adviceLines.push(`若无此杂物间，选择 ${formatArea(inputsWithoutStorage.resettlementArea)}㎡ 的方案，差价对比当前方案约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
                     } else {
                          adviceLines.push(`若无此杂物间，具体差价影响计算失败或无对应方案。`);
                     }
                }
            }
            else if (currentScenario.type === "1 House + Cash" || currentScenario.type === "2 Houses + Cash") {
                const selectedComboText = currentScenario.combo.join('㎡ + ') + '㎡';
                if (scenarioWithoutStorage) {
                     adviceLines.push(`即使没有当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间，您也可以选择 ${selectedComboText} 房型。`);
                     adviceLines.push(`若无此杂物间，选择 ${selectedComboText} 时，差价约 ${formatMoney(Math.abs(diff))} 元 (${diff >= 0 ? '少退/多补' : '多退/少补'})。`);
                } else {
                     adviceLines.push(`当前总计 ${formatArea(totalRawStorageArea)}㎡ 杂物间使您有资格选择 ${selectedComboText} 房型。若无杂物间则无法选择此方案。`);
                }
            }
       } else {
            adviceLines.push("您当前未输入杂物间信息。");
       }


        // 3. Construct Advice: Reaching the *next* housing tier
         if (currentScenario.type !== "Pure Monetary") {
             const currentEqArea = currentScenario.equivalentArea;
             const currentResettlementArea = currentScenario.resettlementArea;
             const potentialTiers = [...HOUSING_SIZES, 180].filter(t => t > 0).sort((a, b) => a - b);
             let nextTier = -1;
             let currentTierLowerBound = 0;

             for (let i = 0; i < potentialTiers.length; i++) {
                  const tier = potentialTiers[i];
                  if (tier > currentResettlementArea) {
                       nextTier = tier;
                      currentTierLowerBound = potentialTiers[i-1] || 0;
                       break;
                  }
             }

             if (nextTier !== -1) {
                  const eqAreaNeededForNext = currentTierLowerBound + 0.001;
                  const additionalEqAreaNeeded = Math.max(0, eqAreaNeededForNext - currentEqArea);

                  if (additionalEqAreaNeeded > 0) {
                      // --- MODIFICATION: Use Block B rates for estimation, remove block text ---
                      const estimationBlock = 'B'; // Force estimation using Block B rates
                      const estRates = getRates(estimationBlock);
                      let valuePerStorSqm = 0;

                      if (estimationBlock === 'A') { // Keep A logic if needed, but we're forcing B
                           let hecIncreasePerStorSqm = 0.5 * (estRates.locationRate + estRates.oldHouseRate + estRates.structureRate + COMPLETE_APT_RATE);
                           const currentConfirmedPrecise = originalInputs.confirmedAreaPrecise;
                           const currentPublicCompArea = originalInputs.publicCompArea;
                            if (currentPublicCompArea < MAX_PUBLIC_AREA) {
                                const potentialNewPublicCompArea = Math.min(round((currentConfirmedPrecise + 0.5) * 0.1, 2), MAX_PUBLIC_AREA);
                                const publicAreaIncrease = Math.max(0, potentialNewPublicCompArea - currentPublicCompArea);
                                hecIncreasePerStorSqm += publicAreaIncrease * (estRates.locationRate + PUBLIC_AREA_DIFF_HOUSING);
                            }
                            valuePerStorSqm = (hecIncreasePerStorSqm > 0) ? (hecIncreasePerStorSqm / HOUSING_PRICE) : 0;
                      } else { // Logic for B, C, D
                          let confirmedAreaIncreasePerStorSqm = 0.5;
                          valuePerStorSqm = confirmedAreaIncreasePerStorSqm + round(confirmedAreaIncreasePerStorSqm * 0.1, 2);
                      }

                      if (valuePerStorSqm > 0) {
                           const additionalStorNeeded = additionalEqAreaNeeded / valuePerStorSqm;
                           // Remove the block display part
                           adviceLines.push(`若要上靠一档至 ${nextTier}㎡ (对应等面积需 > ${formatArea(currentTierLowerBound)}㎡)，估算需要增加约 ${formatArea(additionalStorNeeded)}㎡ 杂物间面积。`);
                      } else {
                          adviceLines.push(`无法估算上靠至下一档 (${nextTier}㎡) 所需的杂物间面积 (计算出的单位价值为0)。`);
                      }
                      // --- End Modification ---
                  } else {
                       adviceLines.push(`您当前条件已满足或接近上靠至 ${nextTier}㎡ 的要求。`);
                  }
             } else if (currentResettlementArea > 0) {
                  adviceLines.push(`您已达到或超过最高安置档位 (${currentResettlementArea}㎡)，无法再上靠。`);
             }
         }


       adviceText.innerText = adviceLines.length > 0 ? adviceLines.join('\n\n') : "未能生成相关建议。";
   };


   // --- Initial Setup ---
    const firstRow = createStorageInputRow();
    storageInputsContainer.appendChild(firstRow);
    const firstRemoveBtn = firstRow.querySelector('.remove-storage-button');
    if (firstRemoveBtn) firstRemoveBtn.style.display = 'none';

}); // End DOMContentLoaded       
