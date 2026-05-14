import { Download, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Badge } from '@/components/ui/Badge';
import { officialMaterials } from '@/lib/questions';

export const metadata = {
  title: 'Official Handbooks & PDFs — NS Learner Test Practice',
  description:
    "Download the official Nova Scotia Driver's Handbook and road test guides used to build this practice exam.",
};

export const dynamic = 'force-static';

export default function HandbooksPage() {
  const groups = [...new Set(officialMaterials.map((material) => material.section))].map(
    (section) => ({
      section,
      materials: officialMaterials.filter((material) => material.section === section),
    }),
  );

  return (
    <PageWrapper>
      <section className="section-block" aria-labelledby="handbooks-title">
        <div>
          <h1 id="handbooks-title">Official Handbooks</h1>
          <p className="page-subtitle">
            The source material behind every question in this practice exam. Download and read these
            before your real test.
          </p>
        </div>

        {groups.map((group) => (
          <div className="pdf-list" key={group.section}>
            <h2>{group.section}</h2>
            {group.materials.map((material) => (
              <a
                aria-label={`${material.label} — opens in a new tab`}
                className="pdf-card"
                href={material.href}
                key={material.id}
                rel="noreferrer noopener"
                target="_blank"
              >
                <span className="pdf-card__icon" aria-hidden="true">
                  <FileText />
                </span>
                <span className="pdf-card__body">
                  <strong>{material.label}</strong>
                  <small>
                    {material.section === "Driver's Handbook PDFs"
                      ? 'Official Nova Scotia Driver Handbook chapter PDF.'
                      : 'Official Nova Scotia reference material.'}
                  </small>
                </span>
                <span className="pdf-card__meta">
                  <Badge tone={material.fileSize === 'Primary source' ? 'brand' : 'neutral'}>
                    {material.fileSize}
                  </Badge>
                  <Download aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        ))}

        <aside className="study-tip">
          <p>
            <strong>Study tip:</strong> The NS Driver&apos;s Handbook Chapters 2–5 cover the
            majority of the learner&apos;s test. The road signs chapter is especially important
            because signs questions appear in every exam.
          </p>
        </aside>
      </section>
    </PageWrapper>
  );
}
