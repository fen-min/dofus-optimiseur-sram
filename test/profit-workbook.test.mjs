import test from "node:test";
import assert from "node:assert/strict";
import {calculateWorkbookRow, calculateWorkbook} from "../src/profit-workbook.js";

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
