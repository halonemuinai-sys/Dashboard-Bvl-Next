'use client';

import { ArrowRight, ArrowUpRight, History, Layers, Mail, Merge, Phone, PlusCircle, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from '../crm-workspace.module.css';

export type CrmTab = 'check' | 'traffic' | 'audit' | 'history';
interface Props {
  activeTab: CrmTab;
  onTabChange: (tab: CrmTab) => void;
  onRefresh: () => void;
  profiles: number;
  duplicatePhones: number;
  duplicateEmails: number;
  recentVisits: number;
}
const tabs = [
  { key: 'check', label: 'Customer profiles', description: 'Create & enrich', icon: UserPlus },
  { key: 'traffic', label: 'Visits & interests', description: 'Capture each visit', icon: PlusCircle },
  { key: 'audit', label: 'Duplicate review', description: 'Review & reconcile', icon: Merge },
  { key: 'history', label: 'Customer history', description: 'Visits & profile details', icon: History },
] as const;
const descriptions: Record<CrmTab, { title: string; text: string; step: string }> = {
  check: { title: 'Build a complete customer profile', text: 'Start with identity and contact details, then add the preferences that make every visit personal.', step: 'PROFILE WORKSPACE' },
  traffic: { title: 'Turn every visit into a useful insight', text: 'Select a customer, record their visit and add the items that caught their attention.', step: 'VISIT WORKSPACE' },
  audit: { title: 'Keep customer records connected', text: 'Review matching phone numbers and emails before choosing a primary profile to retain.', step: 'DATA QUALITY' },
  history: { title: 'See the story behind each visit', text: 'Filter by boutique, status or date, then open customer details to review the visit and linked profile.', step: 'CUSTOMER TIMELINE' },
};

export function CrmWorkspaceHeader({ activeTab, onTabChange, onRefresh, profiles, duplicatePhones, duplicateEmails, recentVisits }: Props) {
  const duplicateGroups = duplicatePhones + duplicateEmails;
  const description = descriptions[activeTab];
  return <>
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.titleGroup}><span className={styles.brandIcon}><ShieldCheck size={26} /></span><div>
          <p className={styles.eyebrow}>BVLGARI / CLIENT EXPERIENCE</p>
          <h1>CRM &amp; Traffic</h1><p className={styles.subtitle}>Know your customers. Make every visit count.</p>
        </div></div>
        <button type="button" onClick={onRefresh} className={styles.refresh}><RefreshCw size={15} />Refresh overview</button>
      </div>
      <div className={styles.heroBottom}><p>One workspace for customer profiles, boutique visits and record quality.</p><div className={styles.heroActions}>
        <button type="button" onClick={() => onTabChange('traffic')} className={styles.primaryAction}><PlusCircle size={15} />Record a visit <ArrowRight size={14} /></button>
        <button type="button" onClick={() => onTabChange('history')} className={styles.secondaryAction}>Explore history <ArrowUpRight size={15} /></button>
      </div></div>
    </header>
    <section className={styles.metrics} aria-label="CRM overview">
      {[
        { label: 'Customer profiles', value: profiles, caption: 'Profiles saved in CRM', Icon: Users, tone: styles.blue },
        { label: 'Phone duplicates', value: duplicatePhones, caption: 'Groups sharing a phone number', Icon: Phone, tone: styles.amber },
        { label: 'Email duplicates', value: duplicateEmails, caption: 'Groups sharing an email address', Icon: Mail, tone: styles.rose },
        { label: 'Recent visit records', value: recentVisits, caption: 'Visits returned in the overview', Icon: Layers, tone: styles.emerald },
      ].map(({ label, value, caption, Icon, tone }, index) => <article key={label} className={cn(styles.metric, tone)} style={{ animationDelay: `${index * 60}ms` }}><div><p>{label}</p><strong>{value.toLocaleString('en-US')}</strong><span>{caption}</span></div><span className={styles.metricIcon}><Icon size={19} /></span></article>)}
    </section>
    <nav className={styles.navigation} aria-label="CRM workspaces">
      {tabs.map(({ key, label, description: caption, icon: Icon }) => <button type="button" key={key} aria-current={activeTab === key ? 'page' : undefined} onClick={() => onTabChange(key)} className={cn(styles.navItem, activeTab === key && styles.activeNav)}>
        <span className={styles.navIcon}><Icon size={19} /></span><span><strong>{label}</strong><small>{caption}</small></span>
        {key === 'audit' && duplicateGroups > 0 && <span className={styles.badge}>{duplicateGroups}</span>}
      </button>)}
    </nav>
    {activeTab !== 'history' && <div className={styles.context} aria-live="polite"><p className={styles.eyebrow}>{description.step}</p><h2>{description.title}</h2><p>{description.text}</p></div>}
  </>;
}
