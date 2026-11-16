import {calculateCraft, calculateListings} from "./profit-core.js";
import {mountProfitWorkbook} from "./profit-workbook.js?v=1.2";

const root = document.getElementById("tab-profit");
if (root) {
  const KEY = "ombre-profit-v1";
  const fresh = () => ({
    mode: "craft", product: "Mijoté Récréatif", quantity: 2544, saleUnit: 1350, taxPercent: 2,
    ingredients: [
      {name: "Viande Fraîche", perCraft: 1, costUnit: 210, resaleUnit: ""},
      {name: "Chanvre", perCraft: 2, costUnit: 400, resaleUnit: ""},
      {name: "Eau Potable", perCraft: 1, costUnit: 50, resaleUnit: ""},
      ...Array.from({length: 5}, () => ({name: "", perCraft: 0, costUnit: "", resaleUnit: ""}))
    ],
    listings: Array.from({length: 8}, () =>
      ({name: "", lotSize: 100, lotPrice: "", units: 0, costUnit: ""}))
  });
  const text = value => String(value ?? "").replace(/[&<>"']/g, character =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const format = number => Number.isFinite(number)
    ? Math.round(number).toLocaleString("fr-FR") + " K" : "—";
  const formatAmount = number => Number.isFinite(number)
    ? number.toLocaleString("fr-FR", {maximumFractionDigits:2}) : "—";
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { saved = null; }
  let state = fresh();
  if (saved && typeof saved === "object") {
    state = {...state, ...saved,
      ingredients: Array.from({length: 8}, (_, i) =>
        ({name: "", perCraft: 0, costUnit: "", resaleUnit: "", ...saved.ingredients?.[i]})),
      listings: Array.from({length: 8}, (_, i) =>
        ({name: "", lotSize: 100, lotPrice: "", units: 0, costUnit: "", ...saved.listings?.[i]}))};
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const numberInput = (label, value, kind, index, property, step = "1") =>
    '<label><span>' + label + '</span><input type="number" min="0" step="' + step +
    '" inputmode="decimal" data-kind="' + kind + '" data-index="' + index +
    '" data-property="' + property + '" value="' + text(value) + '"></label>';
  const nameInput = (value, kind, index) =>
    '<label class="profit-name"><span>Nom de l’objet</span><input maxlength="90" type="text" placeholder="Nom de l’objet" data-kind="' +
    kind + '" data-index="' + index + '" data-property="name" value="' + text(value) + '"></label>';

  function renderRows() {
    document.getElementById("profit-ingredient-rows").innerHTML = state.ingredients.map((item, i) =>
      '<div class="profit-item-row"><span class="profit-index">' + (i + 1) + '</span>' +
      nameInput(item.name, "ingredient", i) +
      numberInput("Qté / craft", item.perCraft, "ingredient", i, "perCraft") +
      numberInput("Prix HDV / unité (K)", item.costUnit, "ingredient", i, "costUnit", "0.01") +
      numberInput("Revente brute / unité (K, facultatif)", item.resaleUnit, "ingredient", i, "resaleUnit", "0.01") +
      '<output class="profit-row-result" id="profit-material-' + i + '">—</output></div>').join("");
    document.getElementById("profit-listing-rows").innerHTML = state.listings.map((item, i) =>
      '<div class="profit-item-row profit-listing-row"><span class="profit-index">' + (i + 1) + '</span>' +
      nameInput(item.name, "listing", i) +
      '<label><span>Prix affiché du lot (K)</span><input type="number" min="0" step="0.01" data-kind="listing" data-index="' + i +
      '" data-property="lotPrice" value="' + text(item.lotPrice) + '"></label>' +
      '<label><span>Taille du lot</span><select data-kind="listing" data-index="' + i + '" data-property="lotSize">' +
      [1, 10, 100, 1000].map(n => '<option value="' + n + '"' + (Number(item.lotSize) === n ? ' selected' : '') + '>' + n + '</option>').join("") +
      '</select></label>' +
      numberInput("Unités à vendre", item.units, "listing", i, "units") +
      numberInput("Coût / unité (K)", item.costUnit, "listing", i, "costUnit", "0.01") +
      '<output class="profit-row-result" id="profit-listing-result-' + i + '">—</output></div>').join("");
  }
  const show = (id, value) => {document.getElementById(id).textContent = value;};
  function refresh() {
    const craft = calculateCraft(state);
    show("profit-craft-unit-cost", format(craft.costPerCraft));
    show("profit-craft-revenue", format(craft.gross));
    show("profit-craft-fees", format(craft.fees));
    show("profit-craft-total-cost", format(craft.costs));
    show("profit-craft-net", format(craft.netRevenue));
    show("profit-craft-break-even", format(craft.breakEven));
    show("profit-craft-result", format(craft.profit));
    show("profit-craft-unit-margin", format(craft.profitPerItem) + " / unité");
    const result = document.getElementById("profit-craft-result");
    result.classList.toggle("is-negative", craft.profit < 0);
    const raw = document.getElementById("profit-craft-raw");
    raw.textContent = craft.rawSaleNet === null
      ? "Renseigne la revente/unité de chaque ressource utilisée pour comparer avec leur vente brute."
      : "Revente brute des ressources après frais : " + format(craft.rawSaleNet) +
        " · Fabriquer plutôt que revendre : " + format(craft.differenceVsRawSale);
    craft.rows.forEach((item, i) =>
      show("profit-material-" + i, item.perCraft ? format(item.costPerCraft) + " / craft" : "—"));
    const all = calculateListings(state.listings, state.taxPercent);
    all.rows.forEach((item, i) => {
      const el = document.getElementById("profit-listing-result-" + i);
      el.textContent = item.name || item.lotPrice || item.units
        ? formatAmount(item.saleUnit) + " K/u · " + format(item.profitUnit) +
          "/u · " + format(item.profit) + " total"
        : "—";
      el.classList.toggle("is-negative", item.profit < 0);
    });
    show("profit-listing-gross", format(all.gross));
    show("profit-listing-fees", format(all.fees));
    show("profit-listing-cost", format(all.costs));
    show("profit-listing-result", format(all.profit));
    document.getElementById("profit-listing-result").classList.toggle("is-negative", all.profit < 0);
    show("profit-listing-units", formatAmount(all.units) + " unités");
  }
  function updateMode() {
    const mode = ["craft", "listings", "sheet"].includes(state.mode) ? state.mode : "craft";
    document.getElementById("profit-view-craft").hidden = mode !== "craft";
    document.getElementById("profit-view-listings").hidden = mode !== "listings";
    document.getElementById("profit-view-sheet").hidden = mode !== "sheet";
    root.querySelectorAll("[data-profit-mode]").forEach(button => {
      const active = button.dataset.profitMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  root.addEventListener("click", event => {
    const modeButton = event.target.closest("[data-profit-mode]");
    if (modeButton) {state.mode = modeButton.dataset.profitMode; persist(); updateMode(); return;}
    if (event.target.closest("#profit-reset")) {
      if (!window.confirm("Effacer les données du simulateur de bénéfices et rétablir l’exemple ?")) return;
      state = fresh();
      renderRows();
      for (const [key, id] of [["product","profit-product"],["quantity","profit-quantity"],
        ["saleUnit","profit-sale-unit"],["taxPercent","profit-tax"]]) document.getElementById(id).value = state[key];
      persist(); updateMode(); refresh();
    }
  });
  const update = event => {
    const input = event.target;
    if (!input.matches("input, select")) return;
    const {kind, index, property} = input.dataset;
    if (kind === "ingredient" || kind === "listing") {
      const row = state[kind === "ingredient" ? "ingredients" : "listings"]?.[Number(index)];
      if (!row || !["name","perCraft","costUnit","resaleUnit","lotPrice","lotSize","units"].includes(property)) return;
      row[property] = input.value;
    } else {
      const globals = {"profit-product":"product", "profit-quantity":"quantity",
        "profit-sale-unit":"saleUnit", "profit-tax":"taxPercent"};
      const name = globals[input.id];
      if (!name) return;
      state[name] = input.value;
    }
    persist(); refresh();
  };
  root.addEventListener("input", update);
  root.addEventListener("change", update);
  renderRows();
  for (const [key, id] of [["product","profit-product"],["quantity","profit-quantity"],
    ["saleUnit","profit-sale-unit"],["taxPercent","profit-tax"]]) {
    document.getElementById(id).value = state[key] ?? "";
  }
  updateMode();
  refresh();
  mountProfitWorkbook({
    root,
    getCraft: () => JSON.parse(JSON.stringify(state)),
    setCraft: data => {
      if (!data || typeof data !== "object") return;
      state = {
        ...state, mode: "craft",
        product: String(data.product ?? state.product).slice(0, 90),
        quantity: data.quantity ?? state.quantity,
        saleUnit: data.saleUnit ?? state.saleUnit,
        taxPercent: data.taxPercent ?? state.taxPercent,
        ingredients: Array.from({length: 8}, (_, i) =>
          ({name: "", perCraft: 0, costUnit: "", resaleUnit: "",
            ...(data.ingredients?.[i] && typeof data.ingredients[i] === "object"
              ? Object.fromEntries(["name","perCraft","costUnit","resaleUnit"]
                .filter(key => data.ingredients[i][key] !== undefined)
                .map(key => [key, data.ingredients[i][key]])) : {})})),
        listings: Array.from({length: 8}, (_, i) =>
          ({name: "", lotSize: 100, lotPrice: "", units: 0, costUnit: "",
            ...(data.listings?.[i] && typeof data.listings[i] === "object"
              ? Object.fromEntries(["name","lotSize","lotPrice","units","costUnit"]
                .filter(key => data.listings[i][key] !== undefined)
                .map(key => [key, data.listings[i][key]])) : state.listings[i])}))
      };
      renderRows();
      for (const [key, id] of [["product","profit-product"],["quantity","profit-quantity"],
        ["saleUnit","profit-sale-unit"],["taxPercent","profit-tax"]])
        document.getElementById(id).value = state[key] ?? "";
      persist(); updateMode(); refresh();
    }
  });
}
