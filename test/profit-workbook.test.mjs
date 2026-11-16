import test from "node:test";
import assert from "node:assert/strict";
import {calculateWorkbookRow, calculateWorkbook, calculateRecipeCost} from "../src/profit-workbook.js";

test("une ligne du tableau calcule le bénéfice net après frais HDV", () => {
  const result = calculateWorkbookRow({quantity:100,costUnit:100,saleUnit:150,taxPercent:2});
  assert.equal(result.costs,10000);
  assert.equal(result.gross,15000);
  assert.equal(result.fees,300);
  assert.equal(result.profit,4700);
  assert.equal(result.profitUnit,47);
});

test("une vente non rentable s'affiche avec une perte", () => {
  const result = calculateWorkbookRow({quantity:1,costUnit:200,saleUnit:150,taxPercent:2});
  assert.equal(result.profit,-53);
});

test("le total inclut tous les objets et pas seulement les huit premières lignes", () => {
  const items=Array.from({length:12}, (_, i) => ({
    reference:"RESS-"+i,name:"Objet "+i,type:"vente",
    quantity:10,costUnit:5,saleUnit:10,taxPercent:0
  }));
  const total=calculateWorkbook(items);
  assert.equal(total.values.length,12);
  assert.equal(total.quantity,120);
  assert.equal(total.costs,600);
  assert.equal(total.gross,1200);
  assert.equal(total.profit,600);
});

test("les cases vides ne créent pas de chiffres inventés", () => {
  const result=calculateWorkbookRow({quantity:"",costUnit:"",saleUnit:"",taxPercent:""});
  assert.equal(result.profit,0);
  assert.equal(result.quantity,0);
});

test("la taxe est plafonnée à 100 % et les chiffres négatifs ignorés", () => {
  const result=calculateWorkbookRow({quantity:2,costUnit:5,saleUnit:100,taxPercent:150});
  assert.equal(result.profit,-10);
  assert.equal(calculateWorkbookRow({quantity:-10,costUnit:-5,saleUnit:-3}).profit,0);
});

test("le bilan calcule plusieurs lignes de catégories différentes", () => {
  const summary=calculateWorkbook([
    {type:"craft",quantity:2,costUnit:5,saleUnit:10,taxPercent:0},
    {type:"vente",quantity:3,costUnit:10,saleUnit:20,taxPercent:10}
  ]);
  assert.equal(summary.costs,40);
  assert.equal(summary.gross,80);
  assert.equal(summary.fees,6);
  assert.equal(summary.profit,34);
});

test("8 ingrédients saisis : quantités multipliées par prix d'achat unitaire", () => {
  const items = [
    {name:"Chanvre",perCraft:2,costUnit:400},
    {name:"Viande fraîche",perCraft:1,costUnit:210},
    {name:"Eau potable",perCraft:1,costUnit:50},
    ...Array.from({length:5},()=>({name:"",perCraft:"",costUnit:""}))
  ];
  const recipe = calculateRecipeCost(items);
  assert.equal(recipe.rows.length,8);
  assert.equal(recipe.costUnit,1060);
  assert.equal(recipe.missing,0);
  const result = calculateWorkbookRow({
    name:"Mijoté Récréatif",type:"craft",recipeEnabled:true,ingredients:items,
    quantity:2544,costUnit:999999,saleUnit:1350,taxPercent:2
  });
  assert.equal(result.costUnit,1060, "le coût de la recette remplace le coût manuel");
  assert.equal(result.costs,2696640);
  assert.equal(result.profit,669072);
});

test("une recette vide et un prix absent restent détectables", () => {
  const empty = calculateRecipeCost([]);
  assert.equal(empty.rows.length,8);
  assert.equal(empty.used,0);
  assert.equal(empty.costUnit,0);
  const incomplete = calculateRecipeCost([{name:"Chanvre",perCraft:2,costUnit:""}]);
  assert.equal(incomplete.missing,1);
});

test("désactiver le calcul par recette redonne le coût manuel", () => {
  const item = {costUnit:80,quantity:10,saleUnit:100,taxPercent:0,
    recipeEnabled:false,ingredients:[{name:"Chanvre",perCraft:2,costUnit:20}]};
  assert.equal(calculateWorkbookRow(item).costUnit,80);
  assert.equal(calculateWorkbookRow({...item,recipeEnabled:true}).costUnit,40);
  assert.equal(calculateWorkbookRow(item).profit,200);
  assert.equal(calculateWorkbookRow({...item,recipeEnabled:true}).profit,600);
});

test("les ingrédients au-delà de la huitième case sont ignorés", () => {
  const values=Array.from({length:9},()=>({name:"Ressource",perCraft:1,costUnit:7}));
  assert.equal(calculateRecipeCost(values).costUnit,56);
});

test("plusieurs recettes indépendantes sont sommées sans confondre leurs prix", () => {
  const rows=[
    {recipeEnabled:true,ingredients:[{name:"Bois",perCraft:2,costUnit:5}],quantity:10,saleUnit:20,taxPercent:0},
    {recipeEnabled:true,ingredients:[{name:"Minerai",perCraft:3,costUnit:4}],quantity:20,saleUnit:30,taxPercent:0}
  ];
  const total=calculateWorkbook(rows);
  assert.equal(total.costs,340);
  assert.equal(total.gross,800);
  assert.equal(total.profit,460);
});
