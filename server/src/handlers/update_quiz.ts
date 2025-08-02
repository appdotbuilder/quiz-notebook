
import { db } from '../db';
import { quizzesTable } from '../db/schema';
import { type UpdateQuizInput, type Quiz } from '../schema';
import { eq } from 'drizzle-orm';

export const updateQuiz = async (input: UpdateQuizInput): Promise<Quiz> => {
  try {
    // Check if quiz exists
    const existingQuiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, input.id))
      .execute();

    if (existingQuiz.length === 0) {
      throw new Error(`Quiz with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof quizzesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.is_published !== undefined) {
      updateData.is_published = input.is_published;
    }

    // Update quiz record
    const result = await db.update(quizzesTable)
      .set(updateData)
      .where(eq(quizzesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Quiz update failed:', error);
    throw error;
  }
};
