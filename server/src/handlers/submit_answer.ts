
import { db } from '../db';
import { answersTable, questionsTable } from '../db/schema';
import { type SubmitAnswerInput, type Answer } from '../schema';
import { eq } from 'drizzle-orm';

export async function submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
  try {
    // First, get the question to determine how to evaluate the answer
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, input.question_id))
      .execute();

    if (questions.length === 0) {
      throw new Error(`Question with id ${input.question_id} not found`);
    }

    const question = questions[0];
    
    // Evaluate the answer based on question type
    let isCorrect: boolean | null = null;
    let pointsEarned: number | null = null;

    if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'short_answer') {
      // For objective questions, check if answer matches correct_answer
      if (question.correct_answer !== null) {
        isCorrect = input.answer_text.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
        pointsEarned = isCorrect ? parseFloat(question.points) : 0;
      }
    }
    // For essay questions, leave is_correct and points_earned as null (manual grading required)

    // Insert the answer
    const result = await db.insert(answersTable)
      .values({
        attempt_id: input.attempt_id,
        question_id: input.question_id,
        answer_text: input.answer_text,
        is_correct: isCorrect,
        points_earned: pointsEarned !== null ? pointsEarned.toString() : null
      })
      .returning()
      .execute();

    const answer = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...answer,
      points_earned: answer.points_earned !== null ? parseFloat(answer.points_earned) : null
    };
  } catch (error) {
    console.error('Answer submission failed:', error);
    throw error;
  }
}
