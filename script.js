const LEVAIN_TYPES = {
  liquid: { label: "리퀴드 르방", hydration: 1.0 },
  stiff: { label: "르방 뒤흐", hydration: 0.5 },
};

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

function clampNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return numeric;
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function formatWeight(value) {
  const rounded = Math.abs(value) < 0.05 ? 0 : roundToTenth(value);
  return `${numberFormatter.format(rounded)} g`;
}

function formatSignedWeight(value) {
  const rounded = Math.abs(value) < 0.05 ? 0 : roundToTenth(value);
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${numberFormatter.format(rounded)} g`;
}

function formatPercent(value) {
  const rounded = Math.abs(value) < 0.05 ? 0 : roundToTenth(value);
  return `${percentFormatter.format(rounded)}%`;
}

function toPercent(weight, totalFlour) {
  if (!totalFlour) {
    return 0;
  }
  return (weight / totalFlour) * 100;
}

function getLevainBreakdown(weight, type) {
  const recipe = LEVAIN_TYPES[type] || LEVAIN_TYPES.liquid;
  const flour = weight / (1 + recipe.hydration);
  const water = weight - flour;

  return {
    label: recipe.label,
    hydration: recipe.hydration,
    flour,
    water,
    weight,
  };
}

function createExtraRow(containerId) {
  const template = document.getElementById("extraTemplate");
  const row = template.content.firstElementChild.cloneNode(true);
  row.dataset.container = containerId;
  return row;
}

function ensureExtraRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container.children.length) {
    container.appendChild(createExtraRow(containerId));
  }
}

function setExtras(containerId, extras) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!extras.length) {
    ensureExtraRow(containerId);
    return;
  }

  extras.forEach((item) => {
    const row = createExtraRow(containerId);
    row.querySelector(".extra-name").value = item.name;
    row.querySelector(".extra-weight").value = roundToTenth(item.weight);
    container.appendChild(row);
  });
}

function getExtras(containerId) {
  const rows = Array.from(document.querySelectorAll(`#${containerId} .extra-row`));
  return rows
    .map((row, index) => {
      const nameField = row.querySelector(".extra-name");
      const weightField = row.querySelector(".extra-weight");
      return {
        name: nameField.value.trim() || `기타 부재료 ${index + 1}`,
        weight: clampNumber(weightField.value),
      };
    })
    .filter((item) => item.weight > 0);
}

function updateText(id, value) {
  document.getElementById(id).textContent = value;
}

function buildRow(label, weight, percent, strong = false) {
  const tr = document.createElement("tr");
  if (strong) {
    tr.className = "strong-row";
  }

  const labelCell = document.createElement("td");
  labelCell.textContent = label;

  const weightCell = document.createElement("td");
  weightCell.textContent = formatWeight(weight);

  const percentCell = document.createElement("td");
  percentCell.textContent = formatPercent(percent);

  tr.append(labelCell, weightCell, percentCell);
  return tr;
}

function renderMixCalculator() {
  const flour = clampNumber(document.getElementById("mixFlour").value);
  const waterA = clampNumber(document.getElementById("mixWaterA").value);
  const bassinage = clampNumber(document.getElementById("mixBassinage").value);
  const salt = clampNumber(document.getElementById("mixSalt").value);
  const levainWeight = clampNumber(document.getElementById("mixLevain").value);
  const levainType = document.getElementById("mixLevainType").value;
  const extras = getExtras("mixExtras");

  const levain = getLevainBreakdown(levainWeight, levainType);
  const extrasTotal = extras.reduce((sum, item) => sum + item.weight, 0);
  const totalFlour = flour + levain.flour;
  const totalWater = waterA + bassinage + levain.water;
  const hydration = totalFlour ? (totalWater / totalFlour) * 100 : 0;
  const totalWeight = flour + waterA + bassinage + salt + levainWeight + extrasTotal;

  updateText("mixTotalWeight", formatWeight(totalWeight));
  updateText("mixHydration", formatPercent(hydration));
  updateText("mixTotalWater", formatWeight(totalWater));
  updateText("mixTotalFlour", formatWeight(totalFlour));
  updateText("mixLevainFlour", formatWeight(levain.flour));
  updateText("mixLevainWater", formatWeight(levain.water));
  updateText("mixLevainTypeLabel", levain.label);
  updateText(
    "mixLevainNote",
    `${levain.label} ${formatWeight(levain.weight)} = 밀가루 ${formatWeight(levain.flour)} + 물 ${formatWeight(levain.water)}`
  );

  const tbody = document.getElementById("mixBreakdown");
  tbody.innerHTML = "";

  const rows = [
    buildRow("총 밀가루", totalFlour, totalFlour ? 100 : 0, true),
    buildRow("직접 넣는 밀가루", flour, toPercent(flour, totalFlour)),
    buildRow("물 A", waterA, toPercent(waterA, totalFlour)),
    buildRow("바시나쥬 물", bassinage, toPercent(bassinage, totalFlour)),
    buildRow("소금", salt, toPercent(salt, totalFlour)),
    buildRow(`${levain.label}`, levain.weight, toPercent(levain.weight, totalFlour)),
  ];

  extras.forEach((item) => {
    rows.push(buildRow(item.name, item.weight, toPercent(item.weight, totalFlour)));
  });

  rows.forEach((row) => tbody.appendChild(row));
}

function renderTargetCalculator() {
  const flour = clampNumber(document.getElementById("targetFlour").value);
  const salt = clampNumber(document.getElementById("targetSalt").value);
  const levainWeight = clampNumber(document.getElementById("targetLevain").value);
  const levainType = document.getElementById("targetLevainType").value;
  const hydrationTarget = clampNumber(document.getElementById("targetHydration").value);
  const extras = getExtras("targetExtras");

  const levain = getLevainBreakdown(levainWeight, levainType);
  const extrasTotal = extras.reduce((sum, item) => sum + item.weight, 0);
  const totalFlour = flour + levain.flour;
  const targetTotalWater = totalFlour * (hydrationTarget / 100);
  const directWater = targetTotalWater - levain.water;

  updateText("targetTotalWater", formatWeight(targetTotalWater));
  updateText("targetDirectWater", formatWeight(directWater));
  updateText("targetLevainWater", formatWeight(levain.water));
  updateText("targetTotalFlour", formatWeight(totalFlour));
  updateText("targetLevainTypeLabel", levain.label);
  updateText(
    "targetFormula",
    `직접 넣을 물 = 목표 총 물 ${formatWeight(targetTotalWater)} - 르방 속 물 ${formatWeight(levain.water)}`
  );

  const message = document.getElementById("targetMessage");
  message.classList.remove("warning");

  if (!totalFlour) {
    message.textContent = "밀가루 또는 르방을 입력하면 필요한 물의 양을 바로 계산합니다.";
    return;
  }

  if (directWater < 0) {
    const overBy = Math.abs(directWater);
    message.textContent = `현재 설정에서는 르방만으로도 목표 수분율을 넘어섭니다. ${formatWeight(overBy)} 만큼 초과하므로 르방량을 줄이거나 르방 뒤흐를 선택해 주세요.`;
    message.classList.add("warning");
    return;
  }

  const projectedWeight = flour + salt + levainWeight + extrasTotal + directWater;
  message.textContent = `직접 넣을 물은 ${formatWeight(directWater)}이며, 예상 총 반죽 중량은 ${formatWeight(projectedWeight)}입니다.`;
}

function distributeDirectWater(totalDirectWater, waterA, bassinage) {
  const currentDirectWater = waterA + bassinage;

  if (totalDirectWater < 0) {
    return null;
  }

  if (!currentDirectWater) {
    return {
      waterA: totalDirectWater,
      bassinage: 0,
    };
  }

  const waterARatio = waterA / currentDirectWater;
  const recommendedWaterA = totalDirectWater * waterARatio;

  return {
    waterA: recommendedWaterA,
    bassinage: totalDirectWater - recommendedWaterA,
  };
}

function getOppositeLevainType(type) {
  return type === "stiff" ? "liquid" : "stiff";
}

function copyMixIntoConverter() {
  document.getElementById("convertFlour").value = document.getElementById("mixFlour").value;
  document.getElementById("convertWaterA").value = document.getElementById("mixWaterA").value;
  document.getElementById("convertBassinage").value = document.getElementById("mixBassinage").value;
  document.getElementById("convertSalt").value = document.getElementById("mixSalt").value;
  document.getElementById("convertLevain").value = document.getElementById("mixLevain").value;

  const sourceType = document.getElementById("mixLevainType").value;
  document.getElementById("convertSourceLevainType").value = sourceType;
  document.getElementById("convertTargetLevainType").value = getOppositeLevainType(sourceType);
  setExtras("convertExtras", getExtras("mixExtras"));
  renderAll();
}

function renderConverter() {
  const flour = clampNumber(document.getElementById("convertFlour").value);
  const waterA = clampNumber(document.getElementById("convertWaterA").value);
  const bassinage = clampNumber(document.getElementById("convertBassinage").value);
  const salt = clampNumber(document.getElementById("convertSalt").value);
  const levainWeight = clampNumber(document.getElementById("convertLevain").value);
  const sourceType = document.getElementById("convertSourceLevainType").value;
  const targetType = document.getElementById("convertTargetLevainType").value;
  const extras = getExtras("convertExtras");

  const sourceLevain = getLevainBreakdown(levainWeight, sourceType);
  const targetLevainFlour = sourceLevain.flour;
  const targetLevain = getLevainBreakdown(
    targetLevainFlour * (1 + (LEVAIN_TYPES[targetType] || LEVAIN_TYPES.liquid).hydration),
    targetType
  );

  const extrasTotal = extras.reduce((sum, item) => sum + item.weight, 0);
  const totalFlour = flour + sourceLevain.flour;
  const totalWater = waterA + bassinage + sourceLevain.water;
  const hydration = totalFlour ? (totalWater / totalFlour) * 100 : 0;
  const currentDirectWater = waterA + bassinage;
  const convertedDirectWater = totalWater - targetLevain.water;
  const waterDelta = convertedDirectWater - currentDirectWater;
  const recommendedSplit = distributeDirectWater(convertedDirectWater, waterA, bassinage);
  const totalWeight = flour + currentDirectWater + salt + levainWeight + extrasTotal;

  updateText("convertHydration", formatPercent(hydration));
  updateText("convertTargetLevainWeight", formatWeight(targetLevain.weight));
  updateText("convertDirectWater", formatWeight(convertedDirectWater));
  updateText("convertWaterDelta", formatSignedWeight(waterDelta));
  updateText("convertModeLabel", `${sourceLevain.label} → ${targetLevain.label}`);
  updateText("convertSourceLevainFlour", formatWeight(sourceLevain.flour));
  updateText("convertSourceLevainWater", formatWeight(sourceLevain.water));
  updateText("convertTargetLevainFlour", formatWeight(targetLevain.flour));
  updateText("convertTargetLevainWater", formatWeight(targetLevain.water));
  updateText(
    "convertFormula",
    `르방 속 밀가루 ${formatWeight(sourceLevain.flour)}는 유지하고, 르방 속 물 차이만큼 직접 물을 ${formatSignedWeight(waterDelta)} 보정합니다.`
  );

  const message = document.getElementById("convertMessage");
  message.classList.remove("warning");

  if (!totalFlour) {
    updateText("convertRecommendedWaterA", "0 g");
    updateText("convertRecommendedBassinage", "0 g");
    message.textContent = "기준 배합을 입력하면 르방 타입 변환값을 계산합니다.";
    return;
  }

  if (sourceType === targetType) {
    updateText("convertRecommendedWaterA", formatWeight(waterA));
    updateText("convertRecommendedBassinage", formatWeight(bassinage));
    message.textContent = `같은 르방 타입이 선택되어 있어 현재 배합과 같습니다. 총 반죽 중량은 ${formatWeight(totalWeight)}로 유지됩니다.`;
    return;
  }

  if (!recommendedSplit) {
    updateText("convertRecommendedWaterA", "계산 불가");
    updateText("convertRecommendedBassinage", "계산 불가");
    message.textContent = `이 배합은 ${targetLevain.label}로 바꾸면 직접 넣을 물이 음수가 됩니다. 르방 비율을 줄이거나 전체 수분율을 높여야 합니다.`;
    message.classList.add("warning");
    return;
  }

  updateText("convertRecommendedWaterA", formatWeight(recommendedSplit.waterA));
  updateText("convertRecommendedBassinage", formatWeight(recommendedSplit.bassinage));
  message.textContent = `변환 후 르방은 ${formatWeight(targetLevain.weight)}, 직접 넣는 물은 ${formatWeight(convertedDirectWater)}입니다. 물 A와 바시나쥬 비율은 기존과 같게 유지했고, 총 반죽 중량 ${formatWeight(totalWeight)}도 변하지 않습니다.`;
}

function renderAll() {
  renderMixCalculator();
  renderTargetCalculator();
  renderConverter();
}

function setupExtras() {
  ["mixExtras", "targetExtras", "convertExtras"].forEach((containerId) => ensureExtraRow(containerId));

  document.addEventListener("click", (event) => {
    if (event.target.closest("#copyFromMix")) {
      copyMixIntoConverter();
      return;
    }

    const addButton = event.target.closest("[data-add-extra]");
    if (addButton) {
      const containerId = addButton.dataset.addExtra;
      document.getElementById(containerId).appendChild(createExtraRow(containerId));
      renderAll();
      return;
    }

    const removeButton = event.target.closest(".remove-extra");
    if (removeButton) {
      const row = removeButton.closest(".extra-row");
      const containerId = row.dataset.container;
      row.remove();
      ensureExtraRow(containerId);
      renderAll();
    }
  });
}

function setupRecalculation() {
  document.addEventListener("input", renderAll);
  document.addEventListener("change", renderAll);
}

setupExtras();
setupRecalculation();
renderAll();
