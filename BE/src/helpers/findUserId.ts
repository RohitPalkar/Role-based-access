import { Repository } from 'typeorm';
import { Users } from '../entities/index';
import { logger } from '../logger/logger';

/**
 * Helper function to find userId by email
 *
 * @param userRepository - TypeORM Repository for Users entity
 * @param email - User email to search
 * @returns The userId if found, otherwise null
 */
export async function findUserIdByEmail(
  userRepository: Repository<Users>,
  userName: string,
): Promise<number | null> {
  try {
    const user = await userRepository.findOne({
      where: { userName },
      select: ['id'],
    });

    return user ? user?.id : null;
  } catch (error) {
    logger.error(`Error fetching userId for email ${userName}:`, error.message);
    return null;
  }
}
