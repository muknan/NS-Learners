import rawQuestions from '../src/data/questions.json' with { type: 'json' };
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { QuestionBankSchema } from '../src/lib/questions.schema';

const result = QuestionBankSchema.safeParse(rawQuestions);

if (!result.success) {
  console.error('Question bank validation failed:\n');
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join('.') || '<root>'}: ${issue.message}`);
  }
  process.exit(1);
}

const rules = result.data.filter((question) => question.category === 'rules').length;
const signs = result.data.filter((question) => question.category === 'signs').length;
const issues: string[] = [];

for (const question of result.data) {
  if (!question.handbookSection) {
    issues.push(`${question.id}: missing handbookSection`);
  }

  if (question.category === 'signs' && !question.image) {
    issues.push(`${question.id}: sign question must reference a sign image`);
  }

  if (question.image) {
    const normalizedImage = question.image.replace(/^\//, '');
    const imagePath = join(process.cwd(), 'public', normalizedImage);

    if (!existsSync(imagePath)) {
      issues.push(`${question.id}: missing image asset ${question.image}`);
    }
  }
}

if (rules < 20 || signs < 20) {
  issues.push(`full-test needs at least 20 rules and 20 signs (${rules} rules, ${signs} signs)`);
}

if (issues.length) {
  console.error('Question bank content checks failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Question bank OK: ${result.data.length} total (${rules} rules, ${signs} signs).`);
