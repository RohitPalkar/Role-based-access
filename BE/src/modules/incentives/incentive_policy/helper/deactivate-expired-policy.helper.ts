import { StatusEnum } from 'src/enums/status.enum';
import { Equal, In, LessThan, MoreThan, Repository } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { IncentivePolicy } from 'src/entities';
import { logger } from 'src/logger/logger';

export async function updateIncentivePolicyStatuses(
  policyRepo: Repository<IncentivePolicy>,
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!policyRepo) {
      throw new InternalServerErrorException(
        'IncentivePolicyRepository is unavailable.',
      );
    }

    const expiredPolicies = await policyRepo.find({
      where: [
        { endDate: LessThan(today), status: StatusEnum.ACTIVE },
        { startDate: MoreThan(today), status: StatusEnum.ACTIVE },
      ],
    });

    const policiesToActivate = await policyRepo.find({
      where: {
        startDate: Equal(today),
        status: StatusEnum.INACTIVE,
      },
    });

    if (policiesToActivate.length > 0) {
      await policyRepo.update(
        { id: In(policiesToActivate.map((b) => b.id)) },
        { status: StatusEnum.ACTIVE },
      );
    }

    if (expiredPolicies.length > 0) {
      await policyRepo.update(
        { id: In(expiredPolicies.map((b) => b.id)) },
        { status: StatusEnum.INACTIVE },
      );
    }
  } catch (error) {
    logger.error('Failed to update incentive policy status', error);
    throw new InternalServerErrorException(
      'An error occurred while updating the incentive policy status.',
    );
  }
}
