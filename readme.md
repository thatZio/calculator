## 拆迁补偿计算工具规则手册

**版本:** 2.2 (基于当前代码)

**目录**

1.  [引言](#引言)
    *   [工具目的](#工具目的)
    *   [目标用户](#目标用户)
2.  [用户使用指南](#用户使用指南)
    *   [访问与验证](#访问与验证)
    *   [输入界面说明](#输入界面说明)
    *   [计算与结果展示](#计算与结果展示)
        *   [计算方案按钮](#计算方案按钮)
        *   [可选方案列表](#可选方案列表)
        *   [方案详情](#方案详情)
        *   [详细构成](#详细构成)
        *   [杂物间建议](#杂物间建议) (仅原拆原迁)
        *   [超过签约期分析](#超过签约期分析)
        *   [方案比较](#方案比较)
3.  [计算规则与核心定义 (维护者参考)](#计算规则与核心定义-维护者参考)
    *   [I. 核心常量与费率定义](#i-核心常量与费率定义)
    *   [II. 安置方式选项与数据](#ii-安置方式选项与数据)
    *   [III. 输入数据处理与基础面积计算](#iii-输入数据处理与基础面积计算)
    *   [IV. 核心补偿项计算规则](#iv-核心补偿项计算规则)
        *   [签约期内补偿项](#签约期内补偿项)
        *   [超过签约期损失项](#超过签约期损失项)
    *   [V. 关键衍生值计算](#v-关键衍生值计算)
    *   [VI. 方案生成逻辑 (重要更新)](#vi-方案生成逻辑-重要更新)
        *   [原拆原迁](#原拆原迁)
        *   [纯货币](#纯货币)
        *   [异地安置](#异地安置)
    *   [VII. 房屋选择与组合规则 (原拆原迁)](#vii-房屋选择与组合规则-原拆原迁)
    *   [VIII. "X房+货币"方案拆分规则 (原拆原迁)](#viii-x房货币方案拆分规则-原拆原迁)
        *   [A地块: 价值比例拆分](#a地块-价值比例拆分)
        *   [B/C/D地块: 面积拆分](#bcd地块-面积拆分)
    *   [IX. 异地安置方案计算规则 (价值比例拆分 - 重要更新)](#ix-异地安置方案计算规则-价值比例拆分---重要更新)
    *   [X. 超过签约期比较计算](#x-超过签约期比较计算-calculatelossscenario)
    *   [XI. 输出显示规则](#xi-输出显示规则)
4.  [运行环境](#运行环境)
5.  [维护与更新建议](#维护与更新建议)
6.  [术语解释](#术语解释)

---

### 引言

#### 工具目的

本工具旨在根据既定的拆迁补偿政策和计算规则，通过输入产权人的住宅及杂物间信息（包括装修评估费），快速、准确地计算出在不同 **安置方式**（原拆原迁、纯货币、异地安置）下的可选补偿方案、各项补偿金额、可选安置房面积、最终应补缴或应退还的差价款。工具还提供签约期内外补偿差异分析、多方案横向对比、以及原拆原迁模式下的杂物间购买建议，提高拆迁补偿工作的效率和透明度。

#### 目标用户

*   **主要用户:** 拆迁办公室工作人员，用于为拆迁对象测算补偿方案及签约期影响。
*   **维护人员:** 负责更新、修正工具计算逻辑、费率和密码的技术人员。

### 用户使用指南

#### 访问与验证

*   **运行环境:** **由于使用了 ES6 模块 (`import`/`export`)，不能直接双击 `index.html` 打开。** 需要使用本地服务器运行。推荐方法：
    *   在项目根目录打开终端，运行 `npx http-server -o`。服务器启动后会自动在浏览器打开。
    *   或使用 VS Code / Cursor 的 `Live Server` 插件启动。
*   **访问口令:** 打开工具页面时，会要求输入访问口令（当前为 `antai`）。正确输入后方可使用。

#### 输入界面说明

1.  **住宅地块:** 选择被拆迁住宅所属的地块 (A/B/C/D 对应不同费率)。
2.  **住宅产权面积 (㎡):** 必须大于 0。
3.  **杂物间信息:** 可添加多个，不选地块则默认同住宅。
4.  **安置方式:** 选择补偿方式，默认为"原拆原迁"。
    *   `原拆原迁`: 按本地块对接价和规则计算住房方案。
    *   `纯货币`: 仅计算并显示纯货币补偿方案详情。
    *   `异地安置`: 选择后，需进一步选择"区域类型"。
5.  **区域类型 (异地安置):** 当安置方式为"异地安置"时显示，选择异地房源的区域和性质 (如"鼓楼（现房）", "晋安仓山（期房）")。
6.  **装修评估费 (元):** 选填，按 0 计算若不填。
7.  **是否公房:** 默认为"否"。选择"是"会触发公房扣减计算。

#### 计算与结果展示

##### 计算方案按钮

点击 `计算方案` 按钮，根据所选安置方式生成结果。

##### 可选方案列表

*   **原拆原迁:** 按类别分组展示（尽可能上靠拿房、1房+货币、2房+货币）。
*   **异地安置:** 按 **楼盘名称** 分组展示所有 **可负担** 的房型方案。可负担包括：
    *   房款 <= 可对接补偿款 (`housingEligibleComp`)
    *   或 该房型面积 == 根据 (可对接补偿款 / 楼盘对接价) 计算出的等面积上靠后的档位面积。
*   **纯货币:** 不显示列表，直接跳转到纯货币方案详情页。
*   **交互:** 点击方案名称链接查看详情，勾选复选框用于比较。

##### 方案详情

展示方案核心数据：确权面积、公摊面积、选择房型（异地安置显示楼盘名+面积）、购房款（异地安置显示对接价）、补偿款总计、应退/补缴差价等。

##### 详细构成

点击"显示详细构成"按钮展开/隐藏补偿款计算明细。

##### 杂物间建议 (仅原拆原迁)

*   点击"杂物间建议"按钮（**仅在原拆原迁方案详情页显示**）查看分析。
*   分析当前杂物间对安置面积和差价的影响，并估算增加多少杂物间可上靠至下一档房型。

##### 超过签约期分析

*   点击"超过签约期"按钮（**在所有方案详情页均显示**）进行比较。
*   显示签约期内外的补偿款总计和差价对比。
*   下方显示损失总额，并可通过"显示损失详情"按钮查看具体损失项。

##### 方案比较

*   在方案列表勾选 1-3 个方案后，点击"比较选中方案"按钮。
*   **单方案:** 自动进行签约期内外比较 (同"超过签约期分析")。
*   **2-3 方案:** 进行横向对比，比较选择房型、补偿款总计、应交/退差价。
*   点击"关闭比较"返回列表。

### 计算规则与核心定义 (维护者参考)

#### I. 核心常量与费率定义 (`config.js`, `blockRates.js`)

*   **`config.js`:** 包含 `HOUSING_PRICE` (原拆原迁对接价 18664), `HOUSING_SIZES` (原拆原迁房型), 各种补贴率 (`MONETARY_REWARD_RATE`, `COMPLETE_APT_RATE`, etc.), 期限 (`TRANSITION_MONTHS_HOUSING`/`CASH`), 门槛值 (`MIN_MOVING_1`/`2`) 等。
*   **`blockRates.js`:** 包含各地块 (A/B/C/D) 的 `locationRate`, `structureRate`, `oldHouseRate`。
*   **密码:** `correctPassword = "antai"` (位于 `script.js` 开头)。

#### II. 安置方式选项与数据 (`relocationOptions.js`)

*   `RELOCATION_TYPES`: 定义"原拆原迁"、"纯货币"、"异地安置"选项。
*   `REMOTE_AREA_TYPES`: 定义异地安置的区域类型选项 (用于区分现房/期房)。
*   `REMOTE_PROPERTIES`: 核心数据结构，按区域类型组织，包含各楼盘的 `label` (名称), `price` (对接价), `sizes` (可用房型数组)。

#### III. 输入数据处理与基础面积计算 (`script.js`, `remoteCalculator.js`)

*   **确权面积 (`confirmedAreaPrecise`, `confirmedArea`)**: 住宅面积 + SUM(杂物间面积 * 50%)。
*   **公摊补偿面积 (`publicCompArea`, `originalPublicCompArea`)**: `min(confirmedAreaPrecise * 0.1, MAX_PUBLIC_AREA)`。

#### IV. 核心补偿项计算规则 (`script.js`, `remoteCalculator.js`)

*   各项补偿计算逻辑分散在对应计算函数中。
*   **签约期内:** 按照政策计算各项基础补偿、奖励、补贴、搬家费、过渡费、公房扣减、装修费等。
*   **超过签约期损失项:** 在 `calculateLossScenario` (`script.js`) 中定义。主要损失：结构/货币奖励、公摊补偿房屋差额、成套房补贴、安家补贴、搬迁奖励、租房补贴。

#### V. 关键衍生值计算

*   **可对接购买补偿款 (`housingEligibleComp` - HEC)**: 用于判断购房资格。分别在 `script.js` 和 `remoteCalculator.js` 中计算。
*   **等面积 (`equivalentArea`)**: 原拆原迁用于确定 `resettlementArea`。异地安置中 **临时用于** 判断是否符合上靠档位。
*   **安置面积 (`resettlementArea`)**: 仅原拆原迁，根据 `equivalentArea` 上靠 `HOUSING_SIZES` (`roundUpToTier` in `script.js`)。

#### VI. 方案生成逻辑 (重要更新) (`script.js` -> `calculateButton` listener, `remoteCalculator.js`)

*   **原拆原迁 (`calculateCompensation` in `script.js`):**
    *   计算 HEC 和 Equivalent Area。
    *   若 Eq Area < 30，不生成住房方案。
    *   生成 Max Housing, 1 House + Cash, 2 Houses + Cash 方案 (需满足 HEC >= 房款)。
*   **纯货币 (`calculatePureCash` in `script.js`):**
    *   直接调用 `calculatePureCash` 计算并显示详情。
*   **异地安置 (`calculateRemoteRelocationScenarios` in `remoteCalculator.js`):**
    *   计算 HEC。
    *   遍历所选区域类型下的所有楼盘。
    *   对每个楼盘，计算基于 HEC 和该楼盘对接价的 `equivalentAreaForProperty`。
    *   使用 `roundUpToTier` 计算该楼盘对应的 `roundedUpTier`。
    *   遍历该楼盘的所有可用房型 `size`：
        *   计算 `houseCost = size * property.price`。
        *   **生成条件:** 如果 (`houseCost <= HEC` 允许1元容差) **或者** (`size == roundedUpTier`)，则生成该 `size` 的方案。
        *   调用 `calculateRemoteValueSplitScenario` 计算方案详情。

#### VII. 房屋选择与组合规则 (原拆原迁 - `script.js`)

*   使用 `HOUSING_SIZES` = `[45, 60, 75, 90, 105, 120, 135, 150, 180]`。
*   `findHousingCombinations`: 查找能精确组合成 `resettlementArea` 的单套或两套房型。

#### VIII. "X房+货币"方案拆分规则 (原拆原迁 - `script.js`)

*   **A地块:** `calculateXHousePlusCash_ValueSplit` - 按 `房款 / HEC` 比例拆分各项补偿。
*   **B/C/D地块:** `calculateXHousePlusCash_AreaSplit` - 按 `目标房型面积 / 1.1` 计算房部分面积，剩余面积按货币计算。

#### IX. 异地安置方案计算规则 (价值比例拆分 - `remoteCalculator.js` - 重要更新)

*   `calculateRemoteValueSplitScenario`: **始终采用价值比例拆分**。
*   比例 (`propHouse`) = `min(选择的房款 / HEC, 1)`。
*   根据 `propHouse` 和 `propCash` 拆分各项补偿到房部分和币部分。
*   **搬家费:** 根据区域类型 (`现房`=1次/`期房`=2次) 计算总额。若低于下限 (1000/2000)，则 **全部计入房部分** 并补足下限；否则，按 `propHouse`/`propCash` **比例拆分** 到两部分。
*   **过渡费:** 根据区域类型 (`现房`=6月/`期房`=39月) 确定房部分计算月数 (`T1`)，币部分月数始终为6 (`T2`)。按 `总过渡费(T1) * propHouse` 计入房部分，按 `总过渡费(T2) * propCash` 计入币部分。
*   **结构等级优惠:** **仅房部分按比例计算** (`总优惠 * propHouse`)。
*   其他补偿项 (区位旧房、杂物间、公摊、成套房、安家) 均按 `propHouse`/`propCash` 比例拆分。
*   货币奖励仅币部分计算；搬迁奖励、租房补贴仅币部分显示。
*   公房扣减 **最后统一扣除**。

#### X. 超过签约期比较计算 (`calculateLossScenario` in `script.js`)

*   计算损失总额 `totalLossAmount` (见 IV)。
*   计算损失后总补偿 `lossTotalCompensation = originalScenario.totalCompensation - totalLossAmount`。
*   **检查负担能力:** 判断 `lossTotalCompensation` 是否仍 >= `originalScenario.housingCost` (允许 `tolerance` 容差)。
*   若仍可负担，`lossFinalDifference = lossTotalCompensation - originalScenario.housingCost`。
*   若不可负担，`canAffordHousing = false`, `housingCost = 0`, `lossFinalDifference = lossTotalCompensation`。

#### XI. 输出显示规则 (`script.js` -> display functions)

*   **列表 (`displayScenariosList`):** 按安置方式组织，异地安置按楼盘名分组（楼盘名作为子标题，下方列出该楼盘的方案）。
*   **详情 (`displayScenarioDetail`):** 显示核心数据，根据类型隐藏/显示"杂物间建议"按钮。
*   **比较 (`displayComparison`, `displaySingleComparison`, `displayMultiComparison`):** 生成对比表格，处理签约期内外差异显示。

#### XI. 逾期签约损失计算

逾期签约损失包含以下项目：
1. 结构等级优惠：确权面积 × 结构费率
2. 公摊补偿房屋差额：公摊面积 × (区位价 + 房屋差额费率)
3. 成套房补贴：确权面积 × 420
4. 安家补贴：确权面积 × 50
5. 搬迁奖励：根据确权面积分档（≥90㎡:30000, ≥60㎡:25000, <60㎡:20000）
6. 租房补贴：固定20000元

##### Excel计算公式

对于批量计算逾期签约损失，可以使用以下Excel公式（假设A列为住宅面积，B列为杂物间面积）：

```
=LET(
    confirmedArea, A2 + IF(B2="",0,B2)*0.5,
    publicCompArea, MIN(confirmedArea*0.1, 10),
    structureLoss, confirmedArea*570,
    publicCompLoss, publicCompArea*(15942+1900),
    completeAptLoss, confirmedArea*420,
    settlingLoss, confirmedArea*50,
    rewardLoss, IF(confirmedArea>=90, 30000, IF(confirmedArea>=60, 25000, 20000)),
    rentalLoss, 20000,
    structureLoss + publicCompLoss + completeAptLoss + settlingLoss + rewardLoss + rentalLoss
)
```

公式说明：
- `confirmedArea`: 确权面积 = 住宅面积 + 杂物间面积×0.5
- `publicCompArea`: 公摊补偿面积 = MIN(确权面积×0.1, 10)
- `structureLoss`: 结构等级优惠 = 确权面积×570（A地块）
- `publicCompLoss`: 公摊补偿房屋差额 = 公摊面积×(15942+1900)
- `completeAptLoss`: 成套房补贴 = 确权面积×420
- `settlingLoss`: 安家补贴 = 确权面积×50
- `rewardLoss`: 搬迁奖励（根据确权面积分档）
- `rentalLoss`: 租房补贴 = 20000

将公式复制到Excel单元格后，向下拖动即可批量计算。公式会自动处理杂物间为空的情况（默认为0）。

### 运行环境

*   需要 **Node.js** 环境 (用于 `npx`) 或支持运行本地服务器的工具 (如 Live Server)。
*   在现代浏览器 (Chrome, Firefox, Safari, Edge) 中访问。

### 维护与更新建议

*   **费率/常量更新:** 主要修改 `config.js`, `blockRates.js`, `relocationOptions.js`。
*   **计算逻辑:** 修改 `script.js` (原拆原迁/核心逻辑) 和 `remoteCalculator.js` (异地安置)。
*   **密码:** 修改 `script.js` 文件开头的 `correctPassword` 变量。
*   **新增地块/异地楼盘:** 更新 `blockRates.js` 或 `relocationOptions.js`。
*   **建议:** 将共享的计算函数 (如 HEC 计算, 格式化函数) 提取到单独的 `utils.js` 文件中，以减少代码重复 (`roundUpToTier` 已移出 `initializeApp` 并导出)。

### 术语解释

*(基本同前)*
*   **HEC (Housing Eligible Compensation):** 可对接购买安置型商品房的补偿款，用于判断购房资格。
*   **等面积 (Equivalent Area):** HEC / 对接价，用于判断上靠档位。
*   **现房/期房:** 影响异地安置的搬家费次数和过渡费（房部分）月份数。

---