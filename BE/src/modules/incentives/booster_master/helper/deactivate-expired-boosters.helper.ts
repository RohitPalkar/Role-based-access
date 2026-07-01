import { StatusEnum } from 'src/enums/status.enum';
import { LessThan, In, Repository, MoreThan } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Boosters } from 'src/entities';
import { DATE_FORMAT } from 'src/config/constants';
import { formatDate } from 'src/utils';

const logger = new Logger('BoosterHelper');

export async function updateBoosterStatuses(
  boosterRepo: Repository<Boosters>,
): Promise<void> {
  try {
    const currentDate = new Date();

    const expiredBoosters = await boosterRepo.find({
      where: [
        { endDate: LessThan(currentDate), status: StatusEnum.ACTIVE },
        { startDate: MoreThan(currentDate), status: StatusEnum.ACTIVE },
      ],
    });

    const boostersToRenew = await boosterRepo
      .createQueryBuilder('booster')
      .where(`DATE(booster.startDate) = :currentDate`, {
        currentDate: formatDate(currentDate.toISOString(), DATE_FORMAT), // String like '2025-06-25'
      })
      .andWhere(`booster.status = :status`, { status: StatusEnum.INACTIVE })
      .getMany();

    if (boostersToRenew.length > 0) {
      await boosterRepo.update(
        { id: In(boostersToRenew.map((b) => b.id)) },
        { status: StatusEnum.ACTIVE },
      );
    }

    if (expiredBoosters.length > 0) {
      await boosterRepo.update(
        { id: In(expiredBoosters.map((b) => b.id)) },
        { status: StatusEnum.INACTIVE },
      );
    }
  } catch (error) {
    logger.error('Error updating booster status:', error);
  }
}
