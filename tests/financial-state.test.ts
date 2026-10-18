import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyFinancialState, mergeFinancialState, moneytreeReadPaths, toEconEvents, totalsByCurrency } from "../integrations/financial-state";
import type { FinancialSnapshot } from "../integrations/financial-state";
const t="2026-10-19T00:00:00.000Z";
const snapshot:FinancialSnapshot={
  accounts:[
    {id:"bank:1",source:"csv",kind:"bank",institution:"Bank",label:"Deposit",balance:100000,currency:"JPY",asOf:t},
    {id:"broker:1",source:"csv",kind:"securities",institution:"Broker",label:"Taxable",balance:250000,currency:"JPY",asOf:t}
  ],
  positions:[{accountId:"broker:1",securityId:"7203",name:"Example stock",quantity:100,marketValue:250000,currency:"JPY",asOf:t}],
  transactions:[{id:"tx-1",accountId:"bank:1",source:"csv",date:"2026-10-18",description:"Salary",amount:50000,currency:"JPY"}]
};
test("bank and securities combine without double counting positions",()=>{
  const state=mergeFinancialState(emptyFinancialState(),snapshot,t);
  assert.deepEqual(totalsByCurrency(state),{JPY:{bank:100000,securities:250000,total:350000}});
  assert.equal(state.positions.length,1);
});
test("reimport is idempotent for events and replaces account snapshot",()=>{
  const first=mergeFinancialState(emptyFinancialState(),snapshot,t);
  const next=mergeFinancialState(first,{...snapshot,accounts:snapshot.accounts.map(a=>({...a,balance:a.kind==="bank"?120000:260000})),positions:[{...snapshot.positions[0],marketValue:260000}]},t);
  assert.equal(next.transactions.length,1);
  assert.equal(next.positions.length,1);
  assert.equal(totalsByCurrency(next).JPY.total,380000);
});
test("identical IDs with different transactions rejected",()=>{
  const first=mergeFinancialState(emptyFinancialState(),snapshot,t);
  assert.throws(()=>mergeFinancialState(first,{...snapshot,transactions:[{...snapshot.transactions[0],amount:999}]},t),/Conflicting/);
});
test("account positions cannot be assigned to bank deposits",()=>{
  assert.throws(()=>mergeFinancialState(emptyFinancialState(),{...snapshot,positions:[{...snapshot.positions[0],accountId:"bank:1"}]},t),/securities/);
});
test("report only actual transaction events, not balance or holding snapshots",()=>{
  const events=toEconEvents(snapshot.transactions);
  assert.equal(events.length,1);
  assert.equal(events[0].amount,50000);
  assert.equal(events[0].metadata.settlementNotAuthorized,true);
});
test("mixed currencies are never summed without FX",()=>{
  const changed={...snapshot,accounts:[...snapshot.accounts,{...snapshot.accounts[0],id:"bank:usd",balance:50,currency:"USD"}]};
  const state=mergeFinancialState(emptyFinancialState(),changed,t);
  assert.equal(totalsByCurrency(state).JPY.total,350000);
  assert.equal(totalsByCurrency(state).USD.total,50);
});
test("moneytree endpoints limited to known read-only routes",()=>{
  const paths=moneytreeReadPaths("1234");
  assert.equal(paths.securityPositions,"/link/investments/accounts/1234/positions.json");
  assert.throws(()=>moneytreeReadPaths("../1234"),/Invalid/);
});

test("older snapshots must not erase newer brokerage positions",()=>{
  const initial=mergeFinancialState(emptyFinancialState(),snapshot,"2026-10-19T00:00:00.000Z");
  const older={...snapshot,accounts:snapshot.accounts.map(a=>({...a,asOf:"2026-10-18T00:00:00.000Z"})),positions:[{...snapshot.positions[0],asOf:"2026-10-18T00:00:00.000Z",marketValue:100}]};
  const result=mergeFinancialState(initial,older,"2026-10-19T01:00:00.000Z");
  assert.equal(result.positions[0].marketValue,250000);
  assert.equal(result.accounts[1].balance,250000);
});
