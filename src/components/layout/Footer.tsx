import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <p>
        Built for focused Nova Scotia Class 7 practice. No account, no tracking.{' '}
        <Link href="/handbooks" prefetch={false}>
          Read the official handbook →
        </Link>
      </p>
      <p className="site-footer__legal">
        © {year} NS Learner Test Practice. Unofficial study aid — always defer to the official Nova
        Scotia Driver&apos;s Handbook.
      </p>
    </footer>
  );
}
