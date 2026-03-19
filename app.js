const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const PRICES = {
    higgsfield: {
        name: "Higgsfield.ai", icon: "⚡", unit: "кредитов",
        models: {
            nano_banana_pro: { name: "Nano Banana Pro", qualities: { "1K": 4, "2K": 8, "4K": 16 } },
            helios: { name: "Helios", qualities: { "1K": 6, "2K": 12, "4K": 24 } },
            apollo: { name: "Apollo", qualities: { "1K": 8, "2K": 16, "4K": 32 } }
        },
        rate: 0.012
    },
    syntx: {
        name: "Syntx.ai", icon: "🔷", unit: "токенов",
        models: {
            wan_pro: { name: "Wan Pro", qualities: { "1K": 100, "2K": 200, "4K": 400 } },
            wan_standard: { name: "Wan Standard", qualities: { "1K": 60, "2K": 120, "4K": 240 } }
        },
        rate: 0.001
    }
};

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", RUB: "₽", GBP: "£", AED: "AED", CHF: "CHF" };
const CURRENCY_RATES = { USD: 1.0, EUR: 0.92, RUB: 90.0, GBP: 0.79, AED: 3.67, CHF: 0.90 };

let state = {
    aggregator: null, model: null, quality: null,
    quantity: 0, laborCost: 0,
    currency: "USD",
    projectType: null,
    projectData: null,
    isFreeCalc: false
};

let screenHistory = [];
const FREE_LIMIT = 3;

function hasSubscription() {
    return localStorage.getItem("has_subscription") === "true";
}

function getFreeCount() {
    return parseInt(localStorage.getItem("free_count") ?? FREE_LIMIT);
}

function decrementFreeCount() {
    localStorage.setItem("free_count", Math.max(0, getFreeCount() - 1));
}

function updateHomeScreen() {
    const block = document.getElementById("free-calc-block");
    const btn = document.getElementById("free-calc-btn");
    const badge = document.getElementById("free-count");

    if (hasSubscription()) { block.style.display = "none"; return; }

    const count = getFreeCount();
    badge.textContent = count;

    if (count === 0) {
        btn.classList.add("disabled");
        btn.onclick = showSubscribePrompt;
    } else {
        btn.classList.remove("disabled");
        btn.onclick = startFreeCalc;
    }
}

function showSubscribePrompt() {
    tg.showAlert(
        "У тебя закончились бесплатные расчёты 😔\n\n" +
        "Подключи подписку и получи:\n" +
        "✅ Неограниченные расчёты\n" +
        "✅ История всех проектов\n" +
        "✅ Красивые PDF сметы\n" +
        "✅ Аналитика и статистика\n\n" +
        "Открой профиль чтобы подключить подписку."
    );
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo(0, 0);
}

function navigateTo(id) {
    const cur = document.querySelector(".screen.active");
    if (cur) screenHistory.push(cur.id);
    showScreen(id);
}

function goBack() {
    if (screenHistory.length > 0) showScreen(screenHistory.pop());
}

function goHome() {
    screenHistory = [];
    state = { aggregator: null, model: null, quality: null, quantity: 0, laborCost: 0, currency: state.currency, projectType: null, projectData: null, isFreeCalc: false };
    updateHomeScreen();
    showScreen("screen-home");
}

function startFreeCalc() {
    const count = getFreeCount();
    if (count === 0) { showSubscribePrompt(); return; }

    tg.showConfirm(
        "⚠️ Бесплатный расчёт\n\n" +
        "Без подписки история не сохраняется и PDF смета недоступна.\n\n" +
        "Осталось бесплатных расчётов: " + count + "\n\nПродолжить?",
        function(ok) {
            if (ok) {
                state.isFreeCalc = true;
                renderAggregatorCards();
                navigateTo("screen-aggregator");
            }
        }
    );
}

function selectProjectType(type) {
    state.projectType = type;
    const title = type === "single" ? "Одиночный креатив" : "Серия креативов";
    document.getElementById("form-title").textContent = title;
    document.getElementById("series-count-group").style.display = type === "series" ? "block" : "none";
    navigateTo("screen-project-form");
}

function saveProject() {
    const name = document.getElementById("proj-name").value.trim();
    const client = document.getElementById("proj-client").value.trim();
    const budget = parseFloat(document.getElementById("proj-budget").value) || 0;
    const currency = document.getElementById("proj-currency").value;
    const deadline = document.getElementById("proj-deadline").value;
    const comment = document.getElementById("proj-comment").value.trim();
    const aggHighs = document.getElementById("agg-higgsfield").checked;
    const aggSyntx = document.getElementById("agg-syntx").checked;

    if (!name) { tg.showAlert("Введи название проекта"); return; }
    if (!client) { tg.showAlert("Введи имя заказчика"); return; }
    if (!aggHighs && !aggSyntx) { tg.showAlert("Выбери хотя бы один агрегатор"); return; }

    const aggregators = [];
    if (aggHighs) aggregators.push("higgsfield");
    if (aggSyntx) aggregators.push("syntx");

    state.projectData = { name, client, budget, currency, deadline, comment, aggregators, type: state.projectType };
    state.currency = currency;

    renderAggregatorCards();
    navigateTo("screen-aggregator");
}

function renderAggregatorCards() {
    const container = document.getElementById("aggregator-cards");
    container.innerHTML = "";

    const available = state.projectData
        ? state.projectData.aggregators
        : Object.keys(PRICES);

    available.forEach(key => {
        const agg = PRICES[key];
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => selectAggregator(key);
        card.innerHTML =
            '<div class="card-icon">' + agg.icon + '</div>' +
            '<div><div class="card-title">' + agg.name + '</div>' +
            '<div class="card-subtitle">' + agg.unit + '</div></div>';
        container.appendChild(card);
    });
}

function selectAggregator(key) {
    state.aggregator = key;
    state.model = null;
    state.quality = null;
    document.getElementById("model-title").textContent = PRICES[key].name;
    renderModelCards(key);
    navigateTo("screen-model");
}

function renderModelCards(aggKey) {
    const container = document.getElementById("model-cards");
    container.innerHTML = "";
    Object.keys(PRICES[aggKey].models).forEach(modelKey => {
        const model = PRICES[aggKey].models[modelKey];
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => selectModel(modelKey);
        card.innerHTML =
            '<div class="card-icon">🎬</div>' +
            '<div><div class="card-title">' + model.name + '</div>' +
            '<div class="card-subtitle">Выбрать модель</div></div>';
        container.appendChild(card);
    });
}

function selectModel(modelKey) {
    state.model = modelKey;
    state.quality = null;
    renderQualityCards(state.aggregator, modelKey);
    navigateTo("screen-quality");
}

function renderQualityCards(aggKey, modelKey) {
    const container = document.getElementById("quality-cards");
    container.innerHTML = "";
    const model = PRICES[aggKey].models[modelKey];
    const icons = { "1K": "📱", "2K": "🖥", "4K": "📺" };

    Object.keys(model.qualities).forEach(qKey => {
        const units = model.qualities[qKey];
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => selectQuality(qKey);
        card.innerHTML =
            '<div class="card-icon">' + (icons[qKey] || "🎯") + '</div>' +
            '<div><div class="card-title">' + qKey + '</div>' +
            '<div class="card-subtitle">' + units + ' ' + PRICES[aggKey].unit + ' за генерацию</div></div>';
        container.appendChild(card);
    });
}

function selectQuality(qKey) {
    state.quality = qKey;
    document.getElementById("quantity-input").value = "";
    document.getElementById("labor-input").value = "";
    updatePreview();
    navigateTo("screen-quantity");
}

function updatePreview() {
    const qty = parseInt(document.getElementById("quantity-input").value) || 0;
    const labor = parseFloat(document.getElementById("labor-input").value) || 0;

    if (qty <= 0 || !state.quality) {
        document.getElementById("preview-ai").textContent = "—";
        document.getElementById("preview-labor").textContent = "—";
        document.getElementById("preview-total").textContent = "—";
        return;
    }

    const units = PRICES[state.aggregator].models[state.model].qualities[state.quality];
    const aiUSD = qty * units * PRICES[state.aggregator].rate;
    const rate = CURRENCY_RATES[state.currency];
    const aiConverted = aiUSD * rate;
    const total = aiConverted + labor;
    const sym = CURRENCY_SYMBOLS[state.currency];

    document.getElementById("preview-ai").textContent = sym + aiConverted.toFixed(2);
    document.getElementById("preview-labor").textContent = sym + labor.toFixed(2);
    document.getElementById("preview-total").textContent = sym + total.toFixed(2);
}

function calculate() {
    const qty = parseInt(document.getElementById("quantity-input").value);
    const labor = parseFloat(document.getElementById("labor-input").value) || 0;

    if (!qty || qty <= 0) { tg.showAlert("Введи количество генераций"); return; }

    const units = PRICES[state.aggregator].models[state.model].qualities[state.quality];
    const aiUSD = qty * units * PRICES[state.aggregator].rate;
    const rate = CURRENCY_RATES[state.currency];
    const aiConverted = aiUSD * rate;
    const total = aiConverted + labor;
    const sym = CURRENCY_SYMBOLS[state.currency];
    const projectName = state.projectData ? state.projectData.name : "Быстрый расчёт";

    document.getElementById("result-project-name").textContent = projectName;
    document.getElementById("result-aggregator").textContent = PRICES[state.aggregator].name;
    document.getElementById("result-model").textContent = PRICES[state.aggregator].models[state.model].name;
    document.getElementById("result-quality").textContent = state.quality;
    document.getElementById("result-quantity").textContent = qty + " шт";
    document.getElementById("result-ai-cost").textContent = sym + aiConverted.toFixed(2);
    document.getElementById("result-labor").textContent = sym + labor.toFixed(2);
    document.getElementById("result-total").textContent = sym + total.toFixed(2) + " " + state.currency;

    if (state.isFreeCalc) decrementFreeCount();

    tg.sendData(JSON.stringify({
        project_name: projectName,
        aggregator: state.aggregator,
        model: state.model,
        quality: state.quality,
        quantity: qty,
        ai_cost: aiConverted,
        labor_cost: labor,
        total_cost: total,
        currency: state.currency,
        is_free: state.isFreeCalc
    }));

    navigateTo("screen-result");
}

function closeApp() { tg.close(); }

// Инициализация
const initData = tg.initDataUnsafe;
if (initData && initData.start_param && CURRENCY_SYMBOLS[initData.start_param]) {
    state.currency = initData.start_param;
}

updateHomeScreen();
