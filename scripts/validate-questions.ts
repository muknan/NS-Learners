import rawQuestions from '../src/data/questions.json' with { type: 'json' };
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

console.log(`Question bank OK: ${result.data.length} total (${rules} rules, ${signs} signs).`);
