import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';
import styles from './login.module.css';

/** Vizione brand panel + form column shared by the sign-in and password recovery pages. */
export default function AuthLayout({ formLabel, children }: { formLabel: string; children: React.ReactNode }) {
  return (
    <main className={styles.page} lang="en">
      <section className={styles.brandPanel} aria-label="Bvlgari Vizione">
        <div className={styles.brand}><Image src="/brand/vizione-logotype-white.png" alt="Bvlgari Vizione" width={995} height={240} priority className={styles.wordmark} /><span className={styles.brandSubtitle}><b>V</b>isualizing <b>I</b>ndividual <b>Z</b>one <b>O</b>utcomes &amp; <b>N</b>umbers <b>E</b>valuation</span></div>
        <div className={styles.art} aria-hidden="true"><div className={styles.arch} /><div className={styles.markWrap}><Image src="/brand/vizione-bv.png" alt="" width={555} height={520} priority className={styles.mark} /><span className={styles.shine} style={{ maskImage: 'url(/brand/vizione-bv.png)', WebkitMaskImage: 'url(/brand/vizione-bv.png)' }} /></div><span className={styles.artCaption}>A DISTINCTIVE POINT OF VIEW</span></div>
        <div className={styles.brandMessage}><span className={styles.eyebrow}>PRECISION MEETS POSSIBILITY</span><h1>Every detail.<br /><em>A clearer vision.</em></h1><p>One perspective on performance, client relationships,<br /> and every opportunity that matters.</p></div>
        <div className={styles.brandFooter}><span>MRA GROUP</span><span>INDONESIA</span></div>
      </section>
      <section className={styles.formPanel} aria-label={formLabel}>
        <header className={styles.formHeader}><span>VIZIONE | MRA GROUP</span><span className={styles.internalBadge}><LockKeyhole size={12} aria-hidden="true" /> INTERNAL ACCESS</span></header>
        {children}
        <footer className={styles.formFooter}><span>&copy; 2026 Vizione | MRA Group</span><span>Developed by Aris Setiyono</span></footer>
      </section>
    </main>
  );
}
