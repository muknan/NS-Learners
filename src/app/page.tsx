import { HomeClient } from '@/components/home/HomeClient';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getQuestionStats } from '@/lib/questions';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <PageWrapper>
      <HomeClient stats={getQuestionStats()} />
    </PageWrapper>
  );
}
