'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Layers, ShieldCheck, Search, Lock, Unlock, Save, RotateCcw, RefreshCw, ArrowUpRight, Calculator, Info, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useUserAccess } from '@/lib/user-access-context';
import Amt from '@/components/Amt';
import { cn } from '@/lib/utils';
import { ACTIVE_CARD_OVERRIDES, canManageMdr, parseMdrPercent, validateMdrConfiguration, type MdrConfiguration } from '@/lib/mdr-config';
import { BANK_MDR_RULES, DEFAULT_CREDIT_CONFIG, DEFAULT_DEBIT_CONFIG, INSTALLMENT_OPTIONS, BANK_OPTIONS, EDC_OPTIONS, CARD_TYPES, getMergedBankMdrRules, saveCustomBankMdrRules, resetCustomBankMdrRules, computePaymentMdr, type BankMdrRule, type InstallmentOption, type BankOption, type EdcOption, type CardTypeOption } from '@/services/dashboard/paymentEngine';
import styles from './mdr-setup.module.css';

const sections = [
  { id: 'installments', label: 'Installments', caption: 'Bank & tenor', Icon: Layers },
  { id: 'credit', label: 'Credit EDC', caption: 'Regular card payments', Icon: CreditCard },
  { id: 'networks', label: 'Card networks', caption: 'Special rate priority', Icon: ShieldCheck },
  { id: 'debit', label: 'Debit cards', caption: 'By issuing bank', Icon: Building2 },
] as const;
type Section = typeof sections[number]['id'];
const baseline = (): MdrConfiguration => structuredClone({ rules: BANK_MDR_RULES, creditConfig: DEFAULT_CREDIT_CONFIG, debitConfig: DEFAULT_DEBIT_CONFIG });
const percent = (value: number) => Number.isFinite(value) ? `${Number((value * 100).toFixed(4))}%` : 'Invalid rate';
function RateField({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const [raw, setRaw] = useState<string | null>(null);
  return <div className={styles.rateField}><input aria-label={label} aria-invalid={!Number.isFinite(value) || value < 0 || value > 1} inputMode="decimal" value={raw ?? (Number.isFinite(value) ? String(Number((value * 100).toFixed(4))) : '')} onChange={e => { setRaw(e.target.value); onChange(parseMdrPercent(e.target.value) ?? NaN); }} onBlur={() => { if (Number.isFinite(value)) setRaw(null); }} /><span>%</span></div>;
}
export default function FinanceMdrSetupPage() {
  const { role, userEmail } = useUserAccess();
  const allowed = canManageMdr(role);
  const [draft, setDraft] = useState<MdrConfiguration>(baseline);
  const [saved, setSaved] = useState<MdrConfiguration>(baseline);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saveLock = useRef(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(true);
  const [custom, setCustom] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [updatedBy, setUpdatedBy] = useState<string>();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [section, setSection] = useState<Section>('installments');
  const [query, setQuery] = useState('');
  const [bankKey, setBankKey] = useState('BCA');
  const [revision, setRevision] = useState(0);
  const [batchOn, setBatchOn] = useState('');
  const [batchOff, setBatchOff] = useState('');
  const [simType, setSimType] = useState<'Credit Card' | 'Debit Card'>('Credit Card');
  const [simBank, setSimBank] = useState<BankOption>('BCA');
  const [simEdc, setSimEdc] = useState<EdcOption>('BCA');
  const [simCard, setSimCard] = useState<CardTypeOption>('VISA');
  const [simTenor, setSimTenor] = useState<InstallmentOption>('--');
  const [simAmount, setSimAmount] = useState(10000000);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const disabled = locked || !allowed || busy || !ready;
  let validation = '';
  try { validateMdrConfiguration(draft); } catch (error) { validation = error instanceof Error ? error.message : 'Review the configuration.'; }
  function accept(data: Awaited<ReturnType<typeof getMergedBankMdrRules>>) {
    const config = structuredClone({ rules: data.rules, creditConfig: data.creditConfig, debitConfig: data.debitConfig });
    setDraft(config); setSaved(structuredClone(config)); setCustom(data.isCustom); setUpdatedAt(data.updatedAt); setUpdatedBy(data.updatedBy);
    setReady(true); setLocked(true); setRevision(value => value + 1);
  }
  useEffect(() => {
    let active = true;
    getMergedBankMdrRules({ strict: true }).then(data => { if (active) accept(data); }).catch(() => { if (active) setMessage({ text: 'Unable to load saved MDR settings. Reload before editing.', error: true }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function reload() {
    if (dirty && !confirm('Discard unsaved changes and reload the saved configuration?')) return;
    setLoading(true); setMessage(null); setReady(false);
    try { accept(await getMergedBankMdrRules({ strict: true })); }
    catch { setMessage({ text: 'Unable to load saved settings. Editing is unavailable until reload succeeds.', error: true }); }
    finally { setLoading(false); }
  }
  async function save(reset = false) {
    if (disabled || saveLock.current || (!reset && (!dirty || validation))) return;
    if (reset && !confirm('Restore all credit, debit, network and installment settings to the application baseline? This replaces the saved configuration.')) return;
    saveLock.current = true; setBusy(true); setMessage(null);
    const snapshot = structuredClone(draft);
    try {
      const result = reset ? await resetCustomBankMdrRules(userEmail || '', updatedAt) : await saveCustomBankMdrRules(snapshot.rules, userEmail || '', snapshot.debitConfig, snapshot.creditConfig, updatedAt);
      if (!result.success) throw new Error(result.error || 'Unable to save settings.');
      setReady(false);
      accept(await getMergedBankMdrRules({ strict: true }));
      setMessage({ text: reset ? 'Baseline restored. Editing is locked again.' : 'Settings saved. Editing is locked again.' });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to refresh settings. Reload before editing.', error: true }); }
    finally { saveLock.current = false; setBusy(false); }
  }
  function discard() { setDraft(structuredClone(saved)); setRevision(v => v + 1); setBatchOn(''); setBatchOff(''); setMessage({ text: 'All unsaved changes discarded.' }); }
  function editRule(update: Partial<BankMdrRule>) { setDraft(prev => ({ ...prev, rules: { ...prev.rules, [bankKey]: { ...prev.rules[bankKey], ...update } } })); }
  function updatePair(key: string, side: 'onUs' | 'offUs', value: number) {
    setDraft(prev => section === 'credit' ? { ...prev, creditConfig: { ...prev.creditConfig, edcRates: { ...prev.creditConfig.edcRates, [key]: { ...prev.creditConfig.edcRates[key], [side]: value } } } } : { ...prev, debitConfig: { ...prev.debitConfig, ...(key === 'BCA' ? { [side === 'onUs' ? 'bcaOnUsRate' : 'bcaOffUsRate']: value } : {}), bankRates: { ...prev.debitConfig.bankRates, [key]: { ...prev.debitConfig.bankRates[key], [side]: value } } } });
  }
  function applyBatch() {
    if (disabled) return;
    const on = batchOn.trim() ? parseMdrPercent(batchOn) : undefined;
    const off = batchOff.trim() ? parseMdrPercent(batchOff) : undefined;
    if (on === null || off === null || (on === undefined && off === undefined)) { setMessage({ text: 'Enter at least one valid batch rate between 0% and 100%. Blank fields keep existing rates.', error: true }); return; }
    const transform = (pairs: Record<string, { onUs: number; offUs: number }>) => Object.fromEntries(Object.entries(pairs).map(([key, value]) => [key, { onUs: on ?? value.onUs, offUs: off ?? value.offUs }]));
    setDraft(prev => section === 'credit' ? { ...prev, creditConfig: { ...prev.creditConfig, edcRates: transform(prev.creditConfig.edcRates) } } : { ...prev, debitConfig: { ...prev.debitConfig, bankRates: transform(prev.debitConfig.bankRates), bcaOnUsRate: on ?? prev.debitConfig.bcaOnUsRate, bcaOffUsRate: off ?? prev.debitConfig.bcaOffUsRate } });
    setRevision(v => v + 1); setMessage({ text: 'Batch applied to every row in this section, including hidden rows. Review and save to publish.' });
  }
  const active = draft.rules[bankKey];
  const pairs = section === 'credit' ? draft.creditConfig.edcRates : draft.debitConfig.bankRates;
  const search = query.trim().toLowerCase();
  const filteredBanks = Object.keys(draft.rules).filter(key => `${key} ${draft.rules[key].bank}`.toLowerCase().includes(search));
  const simulation = !validation && ready && Number.isFinite(simAmount) && simAmount >= 0 ? computePaymentMdr({ paymentType: simType, bank: simBank, edc: simEdc, cardType: simCard, installment: simType === 'Debit Card' ? '--' : simTenor, amount: simAmount }, draft.rules, draft.debitConfig, draft.creditConfig) : null;
  const simRuleBank = simCard === 'AMEX' ? 'AMEX' : simBank;
  const missingTenor = simType === 'Credit Card' && simTenor !== '--' && draft.rules[simRuleBank]?.rates[simTenor] === undefined;
  const matchedRule = simType === 'Credit Card' && simTenor !== '--' ? draft.rules[simRuleBank] : undefined;
  return <div className={styles.page}>
    <header className={styles.hero}><div className={styles.heroTop}><div><p className={styles.eyebrow}><ShieldCheck size={15} /> FINANCE / PAYMENT CONTROLS</p><h1>Bank MDR Configuration</h1><p>Clear rules. Accurate commissions. One source for boutique payment rates.</p></div><Link href="/installment-guide">Installment guide <ArrowUpRight size={16} /></Link></div><div className={styles.heroBottom}><span>{loading ? 'Loading configuration...' : !ready ? 'Configuration unavailable' : custom ? 'Custom configuration' : 'Application baseline'}<i />{locked ? 'Read-only mode' : 'Editing enabled'}</span><span>{updatedAt ? `Saved ${new Date(updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB` : 'No custom save recorded'}{updatedBy && <small>{updatedBy}</small>}</span></div></header>
    <section className={styles.metrics}>{[{ label: 'Installment partners', value: Object.keys(draft.rules).length, Icon: Building2, detail: 'Bank-specific tenor rules' }, { label: 'Credit terminals', value: Object.keys(draft.creditConfig.edcRates).length, Icon: CreditCard, detail: 'On-Us and Off-Us pricing' }, { label: 'Debit issuing banks', value: Object.keys(draft.debitConfig.bankRates).length, Icon: Layers, detail: 'Rates follow the card issuer' }, { label: 'Special card networks', value: ACTIVE_CARD_OVERRIDES.length, Icon: ShieldCheck, detail: 'Priority over regular credit rates' }].map(({ label, value, Icon, detail }) => <article key={label}><span><Icon size={17} />{label}</span><strong>{ready ? value : '—'}</strong><small>{detail}</small></article>)}</section>
    <section className={styles.explainer} aria-label="How MDR works"><div><strong>On-Us</strong><p>Card issuer and settlement EDC are the same bank.</p></div><div><strong>Off-Us</strong><p>Card issuer and settlement EDC are different banks.</p></div><div><strong>MDR is the merchant fee</strong><p>0% installments can still have MDR. Commission = payment amount × MDR.</p></div></section>
    {message && <div role={message.error ? 'alert' : 'status'} className={cn(styles.notice, message.error && styles.error)}>{message.error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<span>{message.text}</span></div>}
    <div className={styles.toolbar}><div><strong>{dirty ? 'Unsaved changes' : 'Saved configuration'}</strong><span>{!allowed ? 'Finance and administrator accounts can edit.' : locked ? 'Enable editing to change rates.' : 'Review the preview before saving all sections.'}</span></div><div className={styles.actions}><button disabled={loading || busy} onClick={reload}><RefreshCw size={15} />Reload</button><button disabled={!allowed || !ready || busy} onClick={() => setLocked(v => !v)}>{locked ? <Unlock size={15} /> : <Lock size={15} />}{locked ? 'Enable editing' : 'Lock editing'}</button></div></div>
    <nav className={styles.tabs} aria-label="MDR sections">{sections.map(({ id, label, caption, Icon }) => <button key={id} aria-current={section === id ? 'page' : undefined} className={section === id ? styles.activeTab : ''} onClick={() => { setSection(id); setQuery(''); setBatchOn(''); setBatchOff(''); }}><Icon size={19} /><span><strong>{label}</strong><small>{caption}</small></span></button>)}</nav>
    {loading ? <div className={styles.loading}><Loader2 className="animate-spin" />Loading saved MDR configuration...</div> : <div className={styles.workspace}><div className={styles.editor}>
      <div className={styles.sectionHeading}><h2>{sections.find(item => item.id === section)?.label}</h2><p>{section === 'installments' ? 'Disabled means unavailable. A 0% MDR is an active, zero-fee tenor.' : section === 'credit' ? 'Regular credit payments use the settlement EDC row. Special networks take priority.' : section === 'debit' ? 'Debit payments use the issuing bank row, then On-Us or Off-Us.' : 'Only these five networks override regular credit EDC pricing.'}</p></div>
      {section !== 'networks' && <div className={styles.search}><Search size={16} /><input aria-label="Search banks or terminals" placeholder="Find a bank or terminal..." value={query} onChange={e => setQuery(e.target.value)} /></div>}
      {section === 'installments' && <div className={styles.bankPicker}>{filteredBanks.map(key => <button type="button" key={key} className={bankKey === key ? styles.selectedBank : ''} onClick={() => setBankKey(key)}>{key}<span>{Object.keys(draft.rules[key].rates).filter(t => t !== '--').length} tenors</span></button>)}{!filteredBanks.length && <p className={styles.empty}>No matching banks.</p>}</div>}
      <fieldset key={`${section}-${revision}`} disabled={disabled} className={styles.fields}>
        {section === 'installments' && active && <div className={styles.bankDetails} key={bankKey}><div className={styles.bankTitle}><div><span>INSTALLMENT PARTNER</span><h3>{active.bank}</h3></div><button type="button" onClick={() => { if (BANK_MDR_RULES[bankKey]) { editRule(structuredClone(BANK_MDR_RULES[bankKey])); setRevision(v => v + 1); } }}>Restore bank baseline</button></div>
          <div className={styles.tenors}>{INSTALLMENT_OPTIONS.filter(t => t !== '--').map(tenor => { const enabled = active.rates[tenor] !== undefined; return <div key={tenor} className={enabled ? styles.enabledTenor : ''}><label><input type="checkbox" checked={enabled} onChange={() => { const rates = { ...active.rates }; if (enabled) delete rates[tenor]; else rates[tenor] = BANK_MDR_RULES[bankKey]?.rates[tenor] ?? NaN; editRule({ rates }); }} />{tenor.replace('mth', 'months')}</label>{enabled ? <RateField label={`${active.bank} ${tenor} MDR`} value={active.rates[tenor]!} onChange={value => editRule({ rates: { ...active.rates, [tenor]: value } })} /> : <span className={styles.inactive}>Disabled</span>}</div>; })}</div>
          <div className={styles.formGrid}><label>Minimum payment / IDR<input type="number" min="0" value={active.minAmount} onChange={e => editRule({ minAmount: Number(e.target.value) })} /></label><label>Customer admin fee / IDR<input type="number" min="0" value={active.adminFee ?? 0} onChange={e => editRule({ adminFee: Number(e.target.value) })} /></label><label>Processing method<select value={active.processMethod} onChange={e => editRule({ processMethod: e.target.value as BankMdrRule['processMethod'] })}><option value="EDC">EDC terminal</option><option value="MANUAL_FORM">Manual bank form</option></select></label><label>Store guidance<input value={active.validStores || ''} placeholder="All boutiques" onChange={e => editRule({ validStores: e.target.value })} /></label></div>
          {bankKey === 'BCA' && <p className={styles.inlineNote}><Info size={14} />BCA 3-month installments use a fixed IDR 10,000,000 minimum in POS. The minimum above applies to other tenors.</p>}
          <label className={styles.notes}>Operating notes<textarea rows={3} value={active.notes || ''} onChange={e => editRule({ notes: e.target.value })} /></label><p className={styles.caption}>Store guidance and admin fees are reference information. POS does not enforce store restrictions or add admin fees to merchant commission.</p>
        </div>}
        {(section === 'credit' || section === 'debit') && <><div className={styles.batch}><div><strong>Batch edit all {section === 'credit' ? 'terminals' : 'issuers'}</strong><small>Includes hidden rows. Blank = keep rate.</small></div><input aria-label="Batch On-Us percent" inputMode="decimal" placeholder="On-Us %" value={batchOn} onChange={e => setBatchOn(e.target.value)} /><input aria-label="Batch Off-Us percent" inputMode="decimal" placeholder="Off-Us %" value={batchOff} onChange={e => setBatchOff(e.target.value)} /><button type="button" onClick={applyBatch}>Apply to draft</button></div>
          <div className={styles.tableScroll}><table><thead><tr><th>{section === 'credit' ? 'Settlement EDC' : 'Card issuing bank'}</th><th>On-Us / %</th><th>Off-Us / %</th><th>Baseline</th></tr></thead><tbody>{Object.entries(pairs).filter(([key]) => key.toLowerCase().includes(search)).map(([key, pair]) => <tr key={key}><td><strong>{key}</strong>{key === 'Other' && <small>Fallback for unmatched banks</small>}</td><td><RateField label={`${key} On-Us`} value={pair.onUs} onChange={value => updatePair(key, 'onUs', value)} /></td><td><RateField label={`${key} Off-Us`} value={pair.offUs} onChange={value => updatePair(key, 'offUs', value)} /></td><td><button type="button" aria-label={`Restore ${key} baseline`} onClick={() => { const pair = section === 'credit' ? DEFAULT_CREDIT_CONFIG.edcRates[key] : DEFAULT_DEBIT_CONFIG.bankRates[key]; if (pair) { updatePair(key, 'onUs', pair.onUs); updatePair(key, 'offUs', pair.offUs); setRevision(v => v + 1); } }}><RotateCcw size={14} /></button></td></tr>)}</tbody></table>{!Object.keys(pairs).some(key => key.toLowerCase().includes(search)) && <p className={styles.empty}>No matching rows.</p>}</div>
          <details className={styles.fallback}><summary>Advanced fallback rates</summary><p>Used only when neither a matching row nor an Other row exists.</p><div className={styles.formGrid}><label>On-Us<RateField label="Fallback On-Us" value={section === 'credit' ? draft.creditConfig.defaultOnUsRate : draft.debitConfig.onUsRate} onChange={value => setDraft(prev => section === 'credit' ? { ...prev, creditConfig: { ...prev.creditConfig, defaultOnUsRate: value } } : { ...prev, debitConfig: { ...prev.debitConfig, onUsRate: value } })} /></label><label>Off-Us<RateField label="Fallback Off-Us" value={section === 'credit' ? draft.creditConfig.defaultOffUsRate : draft.debitConfig.offUsRate} onChange={value => setDraft(prev => section === 'credit' ? { ...prev, creditConfig: { ...prev.creditConfig, defaultOffUsRate: value } } : { ...prev, debitConfig: { ...prev.debitConfig, offUsRate: value, defaultRate: value } })} /></label></div></details>
        </>}
        {section === 'networks' && <div className={styles.networks}>{ACTIVE_CARD_OVERRIDES.map(key => <article key={key}><div><strong>{key}</strong><p>Priority over regular credit On-Us / Off-Us pricing.</p></div><RateField label={`${key} special MDR`} value={draft.creditConfig.cardTypeRates?.[key] ?? DEFAULT_CREDIT_CONFIG.cardTypeRates![key]} onChange={value => setDraft(prev => ({ ...prev, creditConfig: { ...prev.creditConfig, cardTypeRates: { ...prev.creditConfig.cardTypeRates, [key]: value } } }))} /><button type="button" aria-label={`Restore ${key} baseline`} onClick={() => { setDraft(prev => ({ ...prev, creditConfig: { ...prev.creditConfig, cardTypeRates: { ...prev.creditConfig.cardTypeRates, [key]: DEFAULT_CREDIT_CONFIG.cardTypeRates![key] } } })); setRevision(v => v + 1); }}><RotateCcw size={14} /></button></article>)}<p className={styles.inlineNote}><Info size={15} />VISA, Mastercard, BCA CARD and Other follow Credit EDC rates. Their legacy card-type entries do not override POS. Installments follow bank-and-tenor rules.</p></div>}
      </fieldset>
    </div><aside className={styles.simulator}><div className={styles.simHeading}><Calculator size={19} /><strong>Payment preview</strong><span>{dirty ? 'Draft' : 'Saved'}</span></div><p>Uses the same calculation engine as POS.</p><div className={styles.simFields}>
      <label>Payment type<select value={simType} onChange={e => setSimType(e.target.value as typeof simType)}><option>Credit Card</option><option>Debit Card</option></select></label><label>Payment amount / IDR<input type="number" min="0" value={Number.isFinite(simAmount) ? simAmount : ''} onChange={e => setSimAmount(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
      <label>Card issuing bank<select value={simBank} onChange={e => setSimBank(e.target.value as BankOption)}>{BANK_OPTIONS.filter(v => v !== '--').map(v => <option key={v}>{v}</option>)}</select></label><label>Settlement EDC<select value={simEdc} onChange={e => setSimEdc(e.target.value as EdcOption)}>{EDC_OPTIONS.filter(v => v !== '--').map(v => <option key={v}>{v}</option>)}</select></label>
      {simType === 'Credit Card' && <><label>Card network<select value={simCard} onChange={e => setSimCard(e.target.value as CardTypeOption)}>{CARD_TYPES.filter(v => v !== '--').map(v => <option key={v}>{v}</option>)}</select></label><label>Payment term<select value={simTenor} onChange={e => setSimTenor(e.target.value as InstallmentOption)}>{INSTALLMENT_OPTIONS.map(v => <option key={v} value={v}>{v === '--' ? 'Full payment' : v}</option>)}</select></label></>}
    </div>{simulation ? <><div className={styles.result}><span>CALCULATED MDR</span><strong>{percent(simulation.mdrPct)}</strong><small>{simType === 'Credit Card' && simTenor !== '--' ? missingTenor ? 'Regular-rate fallback / unsupported tenor' : 'Installment rule' : simType === 'Credit Card' && (ACTIVE_CARD_OVERRIDES.includes(simCard) || simBank === 'AMEX') ? 'Special network rate' : simBank.toLowerCase() === simEdc.toLowerCase() ? 'On-Us' : 'Off-Us'}</small></div><dl><div><dt>Merchant commission</dt><dd><Amt value={simulation.cardComm} /></dd></div><div><dt>After MDR / IDR</dt><dd><Amt value={simAmount - simulation.cardComm} /></dd></div><div><dt>Processing</dt><dd>{simulation.processMethod === 'EDC' ? 'EDC terminal' : 'Manual bank form'}</dd></div>{!!matchedRule?.adminFee && <div><dt>Customer admin fee</dt><dd><Amt value={matchedRule.adminFee} /></dd></div>}</dl>{missingTenor && <p className={styles.warning}>This tenor is unavailable. POS returns a regular-rate estimate; this is not installment approval.</p>}{simulation.warningNote && <p className={styles.warning}>{simulation.warningNote}</p>}<p className={styles.caption}>Payment amount less MDR only. Customer admin fees and other deductions are excluded.</p></> : <p className={styles.warning}>Enter a valid amount and resolve configuration errors to preview.</p>}</aside></div>}
    {validation && ready && <div role="alert" className={cn(styles.notice, styles.error)}><AlertTriangle size={18} />{validation}</div>}
    <div className={styles.saveBar}><div><strong>{dirty ? 'Review your changes' : ready ? 'All changes saved' : 'Load settings to continue'}</strong><small>Saving applies all four sections. Existing invoices are not recalculated.</small></div><div className={styles.actions}><button disabled={disabled} onClick={() => save(true)}><RotateCcw size={14} />Restore all baseline</button><button disabled={!dirty || busy || !ready} onClick={discard}>Discard changes</button><button className={styles.primary} disabled={disabled || !dirty || !!validation} onClick={() => save()}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save configuration</button></div></div>
    <footer className={styles.footer}><span>BVLGARI / Finance Operations</span><span>Designed &amp; developed by <strong>Aris Setiyono</strong></span></footer>
  </div>;
}
