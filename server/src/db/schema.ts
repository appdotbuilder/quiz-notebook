
import { serial, text, pgTable, timestamp, integer, boolean, json, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['teacher', 'student']);
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'true_false', 'short_answer', 'essay']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Quizzes table
export const quizzesTable = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  teacher_id: integer('teacher_id').notNull().references(() => usersTable.id),
  is_published: boolean('is_published').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Questions table
export const questionsTable = pgTable('questions', {
  id: serial('id').primaryKey(),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  type: questionTypeEnum('type').notNull(),
  question_text: text('question_text').notNull(),
  options: json('options'), // For multiple choice options
  correct_answer: text('correct_answer'), // For objective questions
  points: numeric('points', { precision: 5, scale: 2 }).notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Quiz attempts table
export const quizAttemptsTable = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  quiz_id: integer('quiz_id').notNull().references(() => quizzesTable.id),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  total_score: numeric('total_score', { precision: 5, scale: 2 }),
  max_score: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
});

// Answers table
export const answersTable = pgTable('answers', {
  id: serial('id').primaryKey(),
  attempt_id: integer('attempt_id').notNull().references(() => quizAttemptsTable.id),
  question_id: integer('question_id').notNull().references(() => questionsTable.id),
  answer_text: text('answer_text').notNull(),
  is_correct: boolean('is_correct'),
  points_earned: numeric('points_earned', { precision: 5, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  quizzes: many(quizzesTable),
  attempts: many(quizAttemptsTable),
}));

export const quizzesRelations = relations(quizzesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [quizzesTable.teacher_id],
    references: [usersTable.id],
  }),
  questions: many(questionsTable),
  attempts: many(quizAttemptsTable),
}));

export const questionsRelations = relations(questionsTable, ({ one, many }) => ({
  quiz: one(quizzesTable, {
    fields: [questionsTable.quiz_id],
    references: [quizzesTable.id],
  }),
  answers: many(answersTable),
}));

export const quizAttemptsRelations = relations(quizAttemptsTable, ({ one, many }) => ({
  quiz: one(quizzesTable, {
    fields: [quizAttemptsTable.quiz_id],
    references: [quizzesTable.id],
  }),
  student: one(usersTable, {
    fields: [quizAttemptsTable.student_id],
    references: [usersTable.id],
  }),
  answers: many(answersTable),
}));

export const answersRelations = relations(answersTable, ({ one }) => ({
  attempt: one(quizAttemptsTable, {
    fields: [answersTable.attempt_id],
    references: [quizAttemptsTable.id],
  }),
  question: one(questionsTable, {
    fields: [answersTable.question_id],
    references: [questionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Quiz = typeof quizzesTable.$inferSelect;
export type NewQuiz = typeof quizzesTable.$inferInsert;
export type Question = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
export type NewQuizAttempt = typeof quizAttemptsTable.$inferInsert;
export type Answer = typeof answersTable.$inferSelect;
export type NewAnswer = typeof answersTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  quizzes: quizzesTable,
  questions: questionsTable,
  quizAttempts: quizAttemptsTable,
  answers: answersTable,
};
