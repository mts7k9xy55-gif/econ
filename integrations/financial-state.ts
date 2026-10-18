/**
 * Unified read-only financial state for bank and securities accounts.
 *
 * Snapshots and activity are deliberately distinct: securities positions are
 * details of an account valuation, not additional cashflow or an amount to add
 * again to that account's total. No bank credentials, orders, or transfers.
 */
import type { EconEvent } from "../types";

export type FinancialAccountKind = "bank" | "securities";
export type FinancialAccount = {
  id: string;
  source: string;
  institution: string;
  label: string;
  kind: FinancialAccountKind;
  balance: number | null;
  currency: string;
  asOf: string;
};
export type FinancialPosition = {
  accountId: string;
  securityId: string;
  name: string;
  quantity: number;
  marketValue: number;
  currency: string;
  asOf: string;
};
export type FinancialTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  source: string;
};
export type FinancialSnapshot = {
  accounts: FinancialAccount[];
  positions: FinancialPosition[];
  transactions: FinancialTransaction[];
};
export type FinancialState = FinancialSnapshot & { updatedAt: string | null };

export const MONEYTREE_READ_SCOPES = [
  "accounts_read",
  "transactions_read",
  "investment_accounts_read",
  "investment_transactions_read",
  "request_refresh",
] as const;

export function moneytreeReadPaths(accountId: string): {
  bankAccounts: string;
  securityAccounts: string;
  accountBalances: string;
  securityPositions: string;
} {
  if (!/^\d+$/.test(accountId)) throw new Error("Invalid Moneytree account ID");
  const base = "/link";
  return {
    bankAccounts: base + "/accounts.json",
    securityAccounts: base + "/investments/accounts.json",
    accountBalances: base + "/accounts/" + accountId + "/balances.json",
    securityPositions: base + "/investments/accounts/" + accountId + "/positions.json",
  };
}
export function emptyFinancialState(): FinancialState {
  return { accounts: [], positions: [], transactions: [], updatedAt: null };
}
function validCurrency(value: string) {
  return /^[A-Z]{3}$/.test(value);
}
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
function validTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
function normalized<T extends FinancialAccount | FinancialPosition | FinancialTransaction>(items: T[], label: string): T[] {
  if (!Array.isArray(items) || items.length > 100_000) throw new Error("Invalid " + label + " collection");
  return items;
}
export function validateFinancialSnapshot(snapshot: FinancialSnapshot): FinancialSnapshot {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Invalid snapshot");
  const accounts = normalized(snapshot.accounts, "accounts");
  const positions = normalized(snapshot.positions, "positions");
  const transactions = normalized(snapshot.transactions, "transactions");
  const idSet = new Set<string>();
  for (const a of accounts) {
    if (!a.id || !a.institution || !a.label || !["bank","securities"].includes(a.kind)
      || !validCurrency(a.currency) || !validTimestamp(a.asOf)
      || (a.balance !== null && !Number.isFinite(a.balance))) throw new Error("Invalid financial account");
    if (idSet.has(a.id)) throw new Error("Duplicate account identifier");
    idSet.add(a.id);
  }
  for (const p of positions) {
    if (!idSet.has(p.accountId) || !p.securityId || !p.name
      || !Number.isFinite(p.quantity) || !Number.isFinite(p.marketValue)
      || !validCurrency(p.currency) || !validTimestamp(p.asOf))
      throw new Error("Invalid security position");
    if (accounts.find(a=>a.id===p.accountId)?.kind!=="securities") throw new Error("Position must belong to securities account");
  }
  for (const t of transactions) {
    if (!idSet.has(t.accountId) || !t.id || !validDate(t.date) || !t.description
      || !Number.isFinite(t.amount) || !validCurrency(t.currency) || !t.source)
      throw new Error("Invalid financial transaction");
  }
  return snapshot;
}
/**
 * Incoming snapshot replaces account balance and that account's positions.
 * Transaction IDs are idempotent across imports. Never sum position values
 * on top of an already-provided brokerage account valuation.
 */
export function mergeFinancialState(previous: FinancialState, incoming: FinancialSnapshot, now = new Date().toISOString()): FinancialState {
  validateFinancialSnapshot(incoming);
  const acc = new Map(previous.accounts.map(a=>[a.id,a]));
  for (const account of incoming.accounts) {
    const older=acc.get(account.id);
    if (!older || Date.parse(account.asOf)>=Date.parse(older.asOf)) acc.set(account.id,account);
  }
  // Only replace positions for accounts whose snapshot was accepted.
  const accepted=new Set(incoming.accounts.filter(a=>{
    const old=previous.accounts.find(p=>p.id===a.id);
    return !old||Date.parse(a.asOf)>=Date.parse(old.asOf);
  }).map(a=>a.id));
  const positions = previous.positions.filter(p=>!accepted.has(p.accountId));
  for (const p of incoming.positions) {
    if (accepted.has(p.accountId)) positions.push(p);
  }
  const trans = new Map(previous.transactions.map(t=>[t.id,t]));
  for (const t of incoming.transactions) {
    const old=trans.get(t.id);
    if (old && JSON.stringify(old)!==JSON.stringify(t)) throw new Error("Conflicting transaction ID " + t.id);
    trans.set(t.id,t);
  }
  return {accounts:[...acc.values()],positions,transactions:[...trans.values()],updatedAt:now};
}
export function totalsByCurrency(state: FinancialState): Record<string,{bank:number;securities:number;total:number}> {
  const values:Record<string,{bank:number;securities:number;total:number}>={};
  for (const a of state.accounts) {
    if (a.balance===null) continue;
    const v=values[a.currency]??={bank:0,securities:0,total:0};
    v[a.kind]+=a.balance;
    v.total+=a.balance;
  }
  return values;
}
/**
 * Only true transactions become econ events. Portfolio snapshots are stock,
 * not revenue; never feed balances or market valuation changes into cashflow.
 */
export function toEconEvents(transactions: FinancialTransaction[]): EconEvent[] {
  return transactions.map((tx):EconEvent=>({
    schemaVersion:"2026-03-19",
    eventVersion:1,
    id:"financial:"+tx.source+":"+tx.id,
    source:tx.source,
    type:"manual.recorded",
    eventClass:"financial_transaction",
    timestamp:tx.date+"T12:00:00.000Z",
    amount:tx.amount,
    currency:tx.currency,
    actor:"operator",
    counterparty:tx.accountId,
    description:tx.description,
    tags:["imported","bank-securities","read-only"],
    relatedEventIds:[],
    metadata:{accountId:tx.accountId,readOnly:true,settlementNotAuthorized:true}
  }));
}
