import { PageWrapper } from '@/components/layout/PageWrapper';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <PageWrapper>
      <section className="error-state">
        <h1>Page not found.</h1>
        <p>The practice page you requested does not exist.</p>
        <ButtonLink href="/">Go home</ButtonLink>
      </section>
    </PageWrapper>
  );
}
