import rawMaterials from '@/data/official-materials.json';
import rawQuestions from '@/data/questions.json';
import { QuestionBankSchema, type QuestionTopic } from '@/lib/questions.schema';
import { shuffle } from '@/lib/shuffle';
import type { OfficialMaterial, Question, QuestionFilter } from '@/types/exam';
import { z } from 'zod';

const materialSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  section: z.string().min(1),
  fileSize: z.string().min(1),
  href: z.string().url(),
});

export const questions: Question[] = QuestionBankSchema.parse(rawQuestions);
export const officialMaterials: OfficialMaterial[] = z.array(materialSchema).parse(rawMaterials);

export const questionMap = new Map(questions.map((question) => [question.id, question]));

export function loadAllQuestions(): Question[] {
  return questions;
}

export function getSessionQuestions(filter: QuestionFilter, count: number | null): Question[] {
  const pool =
    filter === 'all' ? questions : questions.filter((question) => question.category === filter);
  const shuffled = shuffle(pool);
  return count ? shuffled.slice(0, count) : shuffled;
}

export function getQuestions(filter: QuestionFilter = 'all'): Question[] {
  return getSessionQuestions(filter, null);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questionMap.get(questionId);
}

export function getTopicLabel(topic: QuestionTopic): string {
  return TOPIC_LABELS[topic];
}

export function getQuestionStats(): { total: number; topics: number; sections: string[] } {
  const topics = new Set(questions.map((question) => question.topic));
  const sections = [...new Set(questions.map((question) => question.category))];

  return {
    total: questions.length,
    topics: topics.size,
    sections,
  };
}

const TOPIC_LABELS: Record<QuestionTopic, string> = {
  'speed-limits': 'Speed Limits',
  'right-of-way': 'Right of Way',
  'traffic-signals': 'Traffic Signals',
  'road-signs': 'Road Signs',
  'pavement-markings': 'Pavement Markings',
  parking: 'Parking',
  passing: 'Passing',
  'following-distance': 'Following Distance',
  'highway-driving': 'Highway Driving',
  intersections: 'Intersections',
  'pedestrians-cyclists': 'Pedestrians and Cyclists',
  'emergency-vehicles': 'Emergency Vehicles',
  'alcohol-drugs': 'Alcohol and Drugs',
  'licence-conditions': 'Licence Conditions',
  'vehicle-safety': 'Vehicle Safety',
  'weather-conditions': 'Weather Conditions',
  'night-driving': 'Night Driving',
  'sharing-road': 'Sharing the Road',
};
