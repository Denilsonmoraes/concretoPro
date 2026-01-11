// --- STATE & CONFIG ---
let currentMode = 'engineer'; // 'engineer', 'custom', 'store'

// --- DOM ELEMENTS ---
const tabs = document.querySelectorAll('.nav-tab');
const reportBtn = document.getElementById('btn-report');

// Inputs
const inputs = {
    // Geometria
    comp: document.getElementById('comprimento'),
    larg: document.getElementById('largura'),
    esp: document.getElementById('espessura'),
    espUnit: document.getElementById('unidade-espessura'),

    // Engineer Mode
    fck: document.getElementById('fck'),
    engineerName: document.getElementById('engineer-name'),

    // Custom Mode
    customSand: document.getElementById('custom-sand'),
    customSandUnit: document.getElementById('custom-sand-unit'),
    customGravel: document.getElementById('custom-gravel'),
    customGravelUnit: document.getElementById('custom-gravel-unit'),
    volCarrinho: document.getElementById('vol-carrinho'),
    volPa: document.getElementById('vol-pa'),

    // Tech Params
    sandSwell: document.getElementById('sand-swell'),
    lossFactor: document.getElementById('loss-factor'),

    // Store Mode
    storeName: document.getElementById('store-name'),

    // Global
    clientName: document.getElementById('client-name'),

    // Prices (New Dynamic System)
    priceCimento: document.getElementById('preco-cimento'),

    // Sand Pricing
    unitAreia: document.getElementById('unit-areia'),
    priceAreia: document.getElementById('preco-areia'),
    volCarradaAreia: document.getElementById('vol-carrada-areia'),

    // Gravel Pricing
    unitBrita: document.getElementById('unit-brita'),
    priceBrita: document.getElementById('preco-brita'),
    volCarradaBrita: document.getElementById('vol-carrada-brita'),
};

const outputs = {
    volTeorico: document.getElementById('volume-teorico'),

    resCimReal: document.getElementById('res-cim-real'),
    resCimCompra: document.getElementById('res-cim-compra'),
    resCimCusto: document.getElementById('res-cim-custo'),

    resAreiaReal: document.getElementById('res-areia-real'),
    resAreiaCompra: document.getElementById('res-areia-compra'),
    resAreiaCusto: document.getElementById('res-areia-custo'),
    lblAreia: document.getElementById('lbl-areia-tipo'),

    resBritaReal: document.getElementById('res-brita-real'),
    resBritaCompra: document.getElementById('res-brita-compra'),
    resBritaCusto: document.getElementById('res-brita-custo'),
    lblBrita: document.getElementById('lbl-brita-tipo'),

    resTotalCusto: document.getElementById('res-total-custo')
};

// Print Elements
const printEls = {
    client: document.getElementById('print-client'),
    provider: document.getElementById('print-provider'),
    date: document.getElementById('print-date')
};

// --- DATA ---
const DOSAGES = {
    '20': { cementKg: 300, sandRatio: 2.7, gravelRatio: 3.3 },
    '25': { cementKg: 350, sandRatio: 2.4, gravelRatio: 3.0 },
    '30': { cementKg: 400, sandRatio: 2.1, gravelRatio: 2.8 },
    '35': { cementKg: 450, sandRatio: 1.8, gravelRatio: 2.6 }
};

// --- INITIALIZATION ---
function init() {
    setupTabs();
    setupListeners();
    updatePriceUI(); // Initial check for inputs visibility
    calculate();
}

function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`tab-${currentMode}`).style.display = 'block';
            calculate();
        });
    });
    // Ensure default display
    if (document.getElementById('tab-engineer')) {
        document.getElementById('tab-engineer').style.display = 'block';
    }
}

function setupListeners() {
    Object.values(inputs).forEach(inp => {
        if (inp) inp.addEventListener('input', calculate);
    });

    // Special listener for Unit Selects to toggle Carrada Input
    if (inputs.unitAreia) inputs.unitAreia.addEventListener('change', updatePriceUI);
    if (inputs.unitBrita) inputs.unitBrita.addEventListener('change', updatePriceUI);

    if (reportBtn) reportBtn.addEventListener('click', handlePrint);
}

function handlePrint() {
    // Populate Print Header
    if (printEls.client) printEls.client.textContent = inputs.clientName.value || "N/A";

    let provider = "";
    if (currentMode === 'engineer') provider = inputs.engineerName.value || "Engenheiro";
    else if (currentMode === 'store') provider = inputs.storeName.value || "Loja";
    else provider = "ConcretoPro";

    if (printEls.provider) printEls.provider.textContent = provider;

    const now = new Date();
    if (printEls.date) printEls.date.textContent = now.toLocaleDateString() + " " + now.toLocaleTimeString();

    window.print();
}

function updatePriceUI() {
    // Show/Hide Carrada Volume Input based on selection
    if (inputs.unitAreia && inputs.unitAreia.value === 'carrada') {
        inputs.volCarradaAreia.style.display = 'block';
    } else if (inputs.volCarradaAreia) {
        inputs.volCarradaAreia.style.display = 'none';
    }

    if (inputs.unitBrita && inputs.unitBrita.value === 'carrada') {
        inputs.volCarradaBrita.style.display = 'block';
    } else if (inputs.volCarradaBrita) {
        inputs.volCarradaBrita.style.display = 'none';
    }
    calculate();
}

// --- LOGIC ---

function calculate() {
    // 1. Geometry
    const len = parseFloat(inputs.comp.value) || 0;
    const wid = parseFloat(inputs.larg.value) || 0;
    let thick = parseFloat(inputs.esp.value) || 0;
    if (inputs.espUnit.value === 'cm') thick /= 100;

    const volumeM3 = len * wid * thick;
    outputs.volTeorico.textContent = volumeM3.toFixed(2) + " m³";

    if (volumeM3 <= 0) {
        resetResults();
        return;
    }

    // 2. Determine Ratios
    let cementBags = 0;
    let sandVolM3_Real = 0;
    let gravelVolM3_Real = 0;

    if (currentMode === 'custom') {
        const sandQtd = parseFloat(inputs.customSand.value) || 0;
        const gravelQtd = parseFloat(inputs.customGravel.value) || 0;

        const volCarrinhoL = parseFloat(inputs.volCarrinho.value) || 50;
        const volPaL = parseFloat(inputs.volPa.value) || 5;

        const getUnitVolL = (unit) => {
            if (unit === 'lata') return 18;
            if (unit === 'carrinho') return volCarrinhoL;
            if (unit === 'pa') return volPaL;
            return 18;
        };

        const sandUnitL = getUnitVolL(inputs.customSandUnit.value);
        const gravelUnitL = getUnitVolL(inputs.customGravelUnit.value);

        const batchSandL = sandQtd * sandUnitL;
        const batchGravelL = gravelQtd * gravelUnitL;
        const batchCementL = 36;

        // Yield estimation
        const totalLooseL = batchCementL + batchSandL + batchGravelL;
        const yieldM3 = (totalLooseL * 0.7) / 1000;

        const numBatches = volumeM3 / yieldM3;

        cementBags = numBatches;
        sandVolM3_Real = (batchSandL * numBatches) / 1000;
        gravelVolM3_Real = (batchGravelL * numBatches) / 1000;

    } else {
        const fck = inputs.fck.value;
        const dosage = DOSAGES[fck];

        const cementTotalKg = volumeM3 * dosage.cementKg;
        cementBags = cementTotalKg / 50;
        sandVolM3_Real = cementBags * 0.036 * dosage.sandRatio;
        gravelVolM3_Real = cementBags * 0.036 * dosage.gravelRatio;
    }

    // 3. Technical Adjustments
    const swellPct = parseFloat(inputs.sandSwell.value) || 0;
    const lossPct = parseFloat(inputs.lossFactor.value) || 0;

    // Sand purchase volume (Swollen)
    const sandVolM3_Purchase = sandVolM3_Real * (1 + swellPct / 100) * (1 + lossPct / 100);
    const gravelVolM3_Purchase = gravelVolM3_Real * (1 + lossPct / 100);
    const cementBags_Purchase = cementBags * (1 + lossPct / 100);

    // 4. Cost Calculation (Normalize everything to Cost/m3)
    const pCimento = parseFloat(inputs.priceCimento.value) || 0;

    // Helper: Get Cost Per M3 based on Unit Selection
    // UPDATED: Now returns specific logic for Carrada rounding
    const calculateComponentCost = (priceInput, unitSelect, volCarradaInput, volumeM3) => {
        const price = parseFloat(priceInput.value) || 0;
        const unit = unitSelect ? unitSelect.value : 'm3';

        if (unit === 'm3') return volumeM3 * price;

        if (unit === 'lata') {
            // Price per 18L. 1m3 = 1000/18 = 55.55 latas
            // Cost based on pure volume converted to latas
            const latas = volumeM3 * (1000 / 18);
            return latas * price;
        }

        if (unit === 'carrada') {
            // Special Rounding Logic for Carrada
            // "Round to next 0.5"
            const volCarrada = parseFloat(volCarradaInput.value) || 1;
            const preciseCarradas = volumeM3 / volCarrada;

            // Logic: Ceil to nearest 0.5
            // Steps: x -> x*2 -> ceil -> /2
            const roundedCarradas = Math.ceil(preciseCarradas * 2) / 2;

            return roundedCarradas * price;
        }
        return 0;
    };

    const finalBags = Math.ceil(cementBags_Purchase);
    const costCement = finalBags * pCimento;

    // Recalculate component costs properly handling rounding for Carradas
    const costSand = calculateComponentCost(inputs.priceAreia, inputs.unitAreia, inputs.volCarradaAreia, sandVolM3_Purchase);
    const costGravel = calculateComponentCost(inputs.priceBrita, inputs.unitBrita, inputs.volCarradaBrita, gravelVolM3_Purchase);

    let totalCost = costCement + costSand + costGravel;

    // 5. Store Mode (Profit Removed as per request)
    // "a loja é apenas para demostrar"

    // --- HELPER FOR DISPLAY UNITS ---
    const getCarradaCount = (volM3, carradaVolInput) => {
        const cVol = parseFloat(carradaVolInput.value) || 1;
        const precise = volM3 / cVol;
        // Apply rounding for Display logic too
        return Math.ceil(precise * 2) / 2;
    };

    const sandCarradas = getCarradaCount(sandVolM3_Purchase, inputs.volCarradaAreia);
    const gravelCarradas = getCarradaCount(gravelVolM3_Purchase, inputs.volCarradaBrita);


    // --- UPDATE UI ---
    outputs.resCimReal.textContent = cementBags.toFixed(1) + " sacos";
    outputs.resCimCompra.textContent = finalBags + " sacos";
    outputs.resCimCusto.textContent = fmtMoney(costCement);

    outputs.resAreiaReal.textContent = sandVolM3_Real.toFixed(2) + " m³";
    // Show m3 AND Carradas
    outputs.resAreiaCompra.innerHTML = `${sandVolM3_Purchase.toFixed(2)} m³<br><span class="dim">(${sandCarradas.toFixed(1)} Carradas)</span>`;
    outputs.resAreiaCusto.textContent = fmtMoney(costSand);

    outputs.lblAreia.textContent = `m³ / Carradas`;

    outputs.resBritaReal.textContent = gravelVolM3_Real.toFixed(2) + " m³";
    // Show m3 AND Carradas
    outputs.resBritaCompra.innerHTML = `${gravelVolM3_Purchase.toFixed(2)} m³<br><span class="dim">(${gravelCarradas.toFixed(1)} Carradas)</span>`;
    outputs.resBritaCusto.textContent = fmtMoney(costGravel);
    outputs.lblBrita.textContent = `m³ / Carradas`;

    outputs.resTotalCusto.textContent = fmtMoney(totalCost);

    // Update Report Summary Text
    const area = len * wid;
    if (area > 0 && thick > 0) {
        const thickCm = (thick * 100).toFixed(1);
        const areaStr = area.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const summaryEl = document.getElementById('report-summary-text');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <p><strong>Resumo de Aplicação:</strong></p>
                <p>Com os materiais listados acima, é possível executar uma área de aproximadamente <strong>${areaStr} m²</strong> (Ex: Pisos, Calçadas, Lajes) considerando uma espessura média de <strong>${thickCm} cm</strong>.</p>
            `;
            summaryEl.style.display = 'block';
        }
    } else {
        const summaryEl = document.getElementById('report-summary-text');
        if (summaryEl) summaryEl.style.display = 'none';
    }
}

function resetResults() {
    outputs.resCimCusto.textContent = "R$ 0,00";
    outputs.resTotalCusto.textContent = "R$ 0,00";
}

function fmtMoney(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

init();
