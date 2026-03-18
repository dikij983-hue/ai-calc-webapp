// ============================================================
// ИНИЦИАЛИЗАЦИЯ TELEGRAM
// ============================================================

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ============================================================
// ДАННЫЕ О ЦЕНАХ
// ============================================================

const PRICES = {
    higgsfield: {
        models: {
            nano_banana_pro: {
                name: "Nano Banana Pro",
                qualities: {
                    "1K": 4,
                    "2K": 8,
                    "4K": 16
                }
            },
            helios: {
                name: "Helios",
                qualities: {
                    "1K": 6,
                    "2K": 12,
                    "4K": 24
                }
            },
            apollo: {
                name: "Apollo",
                qualities: {
                    "1K": 8,
                    "2K": 16,
                    "4K": 32
                }
            }
        },
        rate: 0.012
    },
    syntx: {
        models: {
            wan_pro: {
                name: "Wan Pro",
                qualities: {
                    "1K": 100,
                    "2K": 200,
                    "4K": 400
                }
            },
            wan_standard: {
                name: "Wan Standard",
                qualities: {
                    "1K": 60,
                    "2K": 120,
                    "4K": 240
                }
            }
        },
        rate: 0.001
    }
};

const CURRENCY_SYMBOLS = {
    USD: "$",
    EUR: "€",
    RUB: "₽",
    GBP: "£",
    AED: "AED",
    CHF: "CHF"
};

const CURRENCY_RATES = {
    USD: 1.0,
    EUR: 0.92,
    RUB: 90.0,
    GBP: 0.79,
    AED: 3.67,
    CHF: 0.90
};

// ============================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================

let state = {
    aggregator: null,
    model: null,
    quality: null,
    quantity: 0,
    laborCost: 0,
    projectName: "",
    currency: "USD",
    history: []
};

// ============================================================
// НАВИГАЦИЯ
// ============================================================

let screenHistory = [];

function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => {
        s.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
}

function goBack() {
    if (screenHistory.length > 0) {
        const prev = screenHistory.pop();
        showScreen(prev);
    }
}

function navigateTo(screenId) {
    const current = document.querySelector(".screen.active");
    if (current) {
        screenHistory.push(current.id);
    }
    showScreen(screenId);
}

// ============================================================
// ШАГ 1: ВЫБОР АГРЕГАТОРА
// ============================================================

function selectAggregator(aggregator) {
    state.aggregator = aggregator;
    state.model = null;
    state.quality = null;

    const aggregatorNames = {
        higgsfield: "Higgsfield.ai",
        syntx: "Syntx.ai"
    };

    document.getElementById("model-title").textContent =
        aggregatorNames[aggregator];

    renderModelCards(aggregator);
    navigateTo("screen-model");
}

// ============================================================
// ШАГ 2: ВЫБОР МОДЕЛИ
// ============================================================

function renderModelCards(aggregator) {
    const container = document.getElementById("model-cards");
    container.innerHTML = "";

    const models = PRICES[aggregator].models;

    Object.keys(models).forEach(modelKey => {
        const model = models[modelKey];

        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => selectModel(modelKey);

        card.innerHTML =
            '<div class="card-icon">🎬</div>' +
            '<div>' +
                '<div class="card-title">' + model.name + '</div>' +
                '<div class="card-subtitle">Выбрать модель</div>' +
            '</div>';

        container.appendChild(card);
    });
}

function selectModel(modelKey) {
    state.model = modelKey;
    state.quality = null;

    renderQualityCards(state.aggregator, modelKey);
    navigateTo("screen-quality");
}

// ============================================================
// ШАГ 3: ВЫБОР КАЧЕСТВА
// ============================================================

function renderQualityCards(aggregator, modelKey) {
    const container = document.getElementById("quality-cards");
    container.innerHTML = "";

    const model = PRICES[aggregator].models[modelKey];
    const qualities = model.qualities;

    document.getElementById("quality-subtitle").textContent =
        model.name;

    const qualityIcons = {
        "1K": "📱",
        "2K": "🖥",
        "4K": "📺",
        "standard": "🖼"
    };

    Object.keys(qualities).forEach(qualityKey => {
        const units = qualities[qualityKey];
        const unitName = aggregator === "higgsfield"
            ? "кредитов"
            : "токенов";

        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => selectQuality(qualityKey);

        card.innerHTML =
            '<div class="card-icon">' +
                (qualityIcons[qualityKey] || "🎯") +
            '</div>' +
            '<div>' +
                '<div class="card-title">' + qualityKey + '</div>' +
                '<div class="card-subtitle">' +
                    units + ' ' + unitName + ' за генерацию' +
                '</div>' +
            '</div>';

        container.appendChild(card);
    });
}

function selectQuality(qualityKey) {
    state.quality = qualityKey;
    navigateTo("screen-quantity");
    updatePreview();
}

// ============================================================
// ШАГ 4: КОЛИЧЕСТВО И СТОИМОСТЬ
// ============================================================

function updatePreview() {
    const quantityInput = document.getElementById("quantity-input");
    const laborInput = document.getElementById("labor-input");

    const quantity = parseInt(quantityInput.value) || 0;
    const laborCost = parseFloat(laborInput.value) || 0;

    if (quantity <= 0 || !state.quality) {
        document.getElementById("preview-ai").textContent = "—";
        document.getElementById("preview-labor").textContent = "—";
        document.getElementById("preview-total").textContent = "—";
        return;
    }

    const unitsPerGen = PRICES[state.aggregator]
        .models[state.model]
        .qualities[state.quality];

    const totalUnits = quantity * unitsPerGen;
    const rate = PRICES[state.aggregator].rate;
    const aiCostUSD = totalUnits * rate;

    const currencyRate = CURRENCY_RATES[state.currency];
    const aiCostConverted = aiCostUSD * currencyRate;
    const totalCost = aiCostConverted + laborCost;

    const symbol = CURRENCY_SYMBOLS[state.currency];

    document.getElementById("preview-ai").textContent =
        symbol + aiCostConverted.toFixed(2);
    document.getElementById("preview-labor").textContent =
        symbol + laborCost.toFixed(2);
    document.getElementById("preview-total").textContent =
        symbol + totalCost.toFixed(2);
}

// ============================================================
// ШАГ 5: РАСЧЁТ И РЕЗУЛЬТАТ
// ============================================================

function calculate() {
    const quantity = parseInt(
        document.getElementById("quantity-input").value
    );
    const laborCost = parseFloat(
        document.getElementById("labor-input").value
    ) || 0;
    const projectName =
        document.getElementById("name-input").value.trim()
        || "Без названия";

    if (!quantity || quantity <= 0) {
        tg.showAlert("Введи количество генераций");
        return;
    }

    state.quantity = quantity;
    state.laborCost = laborCost;
    state.projectName = projectName;

    const unitsPerGen = PRICES[state.aggregator]
        .models[state.model]
        .qualities[state.quality];

    const totalUnits = quantity * unitsPerGen;
    const rate = PRICES[state.aggregator].rate;
    const aiCostUSD = totalUnits * rate;

    const currencyRate = CURRENCY_RATES[state.currency];
    const aiCostConverted = aiCostUSD * currencyRate;
    const totalCost = aiCostConverted + laborCost;

    const symbol = CURRENCY_SYMBOLS[state.currency];

    const aggregatorNames = {
        higgsfield: "Higgsfield.ai",
        syntx: "Syntx.ai"
    };

    const modelName = PRICES[state.aggregator]
        .models[state.model].name;

    document.getElementById("result-project-name").textContent =
        projectName;
    document.getElementById("result-aggregator").textContent =
        aggregatorNames[state.aggregator];
    document.getElementById("result-model").textContent =
        modelName;
    document.getElementById("result-quality").textContent =
        state.quality;
    document.getElementById("result-quantity").textContent =
        quantity + " шт";
    document.getElementById("result-ai-cost").textContent =
        symbol + aiCostConverted.toFixed(2);
    document.getElementById("result-labor").textContent =
        symbol + laborCost.toFixed(2);
    document.getElementById("result-total").textContent =
        symbol + totalCost.toFixed(2) + " " + state.currency;

    // Отправляем данные боту
    const resultData = {
        project_name: projectName,
        aggregator: state.aggregator,
        model: state.model,
        quality: state.quality,
        quantity: quantity,
        ai_cost: aiCostConverted,
        labor_cost: laborCost,
        total_cost: totalCost,
        currency: state.currency
    };

    tg.sendData(JSON.stringify(resultData));

    navigateTo("screen-result");
}

// ============================================================
// ДЕЙСТВИЯ
// ============================================================

function startOver() {
    state.aggregator = null;
    state.model = null;
    state.quality = null;
    state.quantity = 0;
    state.laborCost = 0;
    state.projectName = "";

    document.getElementById("quantity-input").value = "";
    document.getElementById("labor-input").value = "";
    document.getElementById("name-input").value = "";

    screenHistory = [];
    showScreen("screen-aggregator");
}

function closeApp() {
    tg.close();
}

// ============================================================
// ЗАГРУЗКА — получаем валюту пользователя из бота
// ============================================================

tg.onEvent("themeChanged", function() {
    document.body.style.backgroundColor =
        tg.themeParams.bg_color || "#1a1a1a";
});

// Получаем данные от бота при открытии
const initData = tg.initDataUnsafe;
if (initData && initData.start_param) {
    const currency = initData.start_param;
    if (CURRENCY_SYMBOLS[currency]) {
        state.currency = currency;
    }
}