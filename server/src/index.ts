
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createQuizInputSchema,
  updateQuizInputSchema,
  createQuestionInputSchema,
  startQuizAttemptInputSchema,
  submitAnswerInputSchema,
  completeQuizAttemptInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createQuiz } from './handlers/create_quiz';
import { getQuizzes } from './handlers/get_quizzes';
import { getQuizById } from './handlers/get_quiz_by_id';
import { updateQuiz } from './handlers/update_quiz';
import { createQuestion } from './handlers/create_question';
import { getQuestionsByQuiz } from './handlers/get_questions_by_quiz';
import { startQuizAttempt } from './handlers/start_quiz_attempt';
import { submitAnswer } from './handlers/submit_answer';
import { completeQuizAttempt } from './handlers/complete_quiz_attempt';
import { getQuizAttempts } from './handlers/get_quiz_attempts';
import { getQuizAttemptWithAnswers } from './handlers/get_quiz_attempt_with_answers';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Quiz management
  createQuiz: publicProcedure
    .input(createQuizInputSchema)
    .mutation(({ input }) => createQuiz(input)),
  
  getQuizzes: publicProcedure
    .query(() => getQuizzes()),
  
  getQuizById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getQuizById(input.id)),
  
  updateQuiz: publicProcedure
    .input(updateQuizInputSchema)
    .mutation(({ input }) => updateQuiz(input)),

  // Question management
  createQuestion: publicProcedure
    .input(createQuestionInputSchema)
    .mutation(({ input }) => createQuestion(input)),
  
  getQuestionsByQuiz: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(({ input }) => getQuestionsByQuiz(input.quizId)),

  // Quiz taking
  startQuizAttempt: publicProcedure
    .input(startQuizAttemptInputSchema)
    .mutation(({ input }) => startQuizAttempt(input)),
  
  submitAnswer: publicProcedure
    .input(submitAnswerInputSchema)
    .mutation(({ input }) => submitAnswer(input)),
  
  completeQuizAttempt: publicProcedure
    .input(completeQuizAttemptInputSchema)
    .mutation(({ input }) => completeQuizAttempt(input)),

  // Results and attempts
  getQuizAttempts: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getQuizAttempts(input.studentId)),
  
  getQuizAttemptWithAnswers: publicProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(({ input }) => getQuizAttemptWithAnswers(input.attemptId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
