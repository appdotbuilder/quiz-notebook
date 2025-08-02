
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['teacher', 'student']),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Quiz schema
export const quizSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  teacher_id: z.number(),
  is_published: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Quiz = z.infer<typeof quizSchema>;

// Question schema
export const questionSchema = z.object({
  id: z.number(),
  quiz_id: z.number(),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  question_text: z.string(),
  options: z.array(z.string()).nullable(), // JSON array for multiple choice options
  correct_answer: z.string().nullable(), // For objective questions
  points: z.number(),
  order_index: z.number(),
  created_at: z.coerce.date()
});

export type Question = z.infer<typeof questionSchema>;

// Quiz attempt schema
export const quizAttemptSchema = z.object({
  id: z.number(),
  quiz_id: z.number(),
  student_id: z.number(),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  total_score: z.number().nullable(),
  max_score: z.number()
});

export type QuizAttempt = z.infer<typeof quizAttemptSchema>;

// Answer schema
export const answerSchema = z.object({
  id: z.number(),
  attempt_id: z.number(),
  question_id: z.number(),
  answer_text: z.string(),
  is_correct: z.boolean().nullable(),
  points_earned: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Answer = z.infer<typeof answerSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['teacher', 'student'])
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createQuizInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  teacher_id: z.number()
});

export type CreateQuizInput = z.infer<typeof createQuizInputSchema>;

export const updateQuizInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_published: z.boolean().optional()
});

export type UpdateQuizInput = z.infer<typeof updateQuizInputSchema>;

export const createQuestionInputSchema = z.object({
  quiz_id: z.number(),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  question_text: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().nullable().optional(),
  points: z.number().positive(),
  order_index: z.number().int().nonnegative()
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

export const startQuizAttemptInputSchema = z.object({
  quiz_id: z.number(),
  student_id: z.number()
});

export type StartQuizAttemptInput = z.infer<typeof startQuizAttemptInputSchema>;

export const submitAnswerInputSchema = z.object({
  attempt_id: z.number(),
  question_id: z.number(),
  answer_text: z.string()
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

export const completeQuizAttemptInputSchema = z.object({
  attempt_id: z.number()
});

export type CompleteQuizAttemptInput = z.infer<typeof completeQuizAttemptInputSchema>;
