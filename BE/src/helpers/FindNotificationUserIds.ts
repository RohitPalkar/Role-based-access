import { In, Repository } from 'typeorm';
import { Users, Role } from '../entities/index';
import { logger } from '../logger/logger';
import { RolesEnum as role } from 'src/enums/roles.enum';

/**
 * Helper function to find all userIds with ADMIN, FINANCE_ADMIN, or RM roles.
 */
export async function findAdminUserIds(
  userRepository: Repository<Users>,
  roleRepository: Repository<Role>,
): Promise<number[]> {
  try {
    // Fetch all relevant roles
    const adminRoles = await roleRepository.findBy({
      name: In([role.ADMIN]),
    });

    // Ensure roles exist
    if (adminRoles.length === 0) {
      logger.warn('No roles found.');
      return [];
    }

    // Extract role IDs
    const adminRoleIds = adminRoles.map((role) => role.id);

    // Fetch users with those roles
    const adminUsers = await userRepository.findBy({
      role: { id: In(adminRoleIds) }, // Use In() for multiple role IDs
    });

    return adminUsers.map((user) => user.id);
  } catch (error) {
    logger.error('Error fetching ADMIN users:', error.message);
    return [];
  }
}
