import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncentiveBooking } from 'src/entities';
import { PaymentStatusEnum } from 'src/enums/booking-list.enums';
import { ListIomListingDto } from '../dto/list-iom-listing.dto';
import { AuthenticatedUser } from './iom-validation.service';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';

/**
 * Booking is "eligible" for IOM creation when:
 *
 *   1. It is not soft-deleted.
 *   2. Its payment milestone has been hit -
 *      `payment_status IN (PAID, PAYABLE)` (anything not INELIGIBLE/HOLD).
 *   3. Its project sits inside `user.crmProjects`.
 *   4. There is no active (i.e. not soft-deleted) IOM already referencing it.
 *
 * The NOT EXISTS clause leans on `ioms.deleted_at` rather than a status
 * check so the rule keeps working when new closed-state codes are added
 * later. Closing an IOM means soft-deleting it.
 */
@Injectable()
export class IomEligibilityService {
  constructor(
    @InjectRepository(IncentiveBooking)
    private readonly bookingRepo: Repository<IncentiveBooking>,
  ) {}

  async findEligible(
    user: AuthenticatedUser,
    query: ListIomListingDto,
  ): Promise<{
    items: IncentiveBooking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const crmProjects = user.crmProjects ?? [];

    // Short-circuit: if the user is mapped to no projects, there is
    // nothing they can ever see. Don't hit the DB.
    if (crmProjects.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const qb = this.bookingRepo
      .createQueryBuilder('ib')
      .innerJoinAndSelect('ib.projectPhase', 'pp')
      .innerJoinAndSelect('pp.project', 'p')
      .where('ib.deletedAt IS NULL')
      .andWhere('ib.paymentStatus IN (:...paymentStatuses)', {
        paymentStatuses: [PaymentStatusEnum.PAID, PaymentStatusEnum.PAYABLE],
      })
      .andWhere('p.id IN (:...crmProjects)', { crmProjects })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM ioms i
          WHERE i.booking_id = ib.id
            AND i.deleted_at IS NULL
        )`,
      );

    if (query.search) {
      const like = `%${query.search}%`;
      qb.andWhere(
        '(ib.customerName LIKE :like OR ib.bookingId LIKE :like OR ib.propertyNumber LIKE :like)',
        { like },
      );
    }

    if (query.sortBy) {
      const [field, direction] = query.sortBy.split(':');
      const dir = (direction || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Whitelist sortable fields to prevent injection of arbitrary
      // column names through `sortBy`.
      const ALLOWED_SORT_FIELDS: Record<string, string> = {
        bookingDate: 'ib.bookingDate',
        customerName: 'ib.customerName',
        grossTotalValue: 'ib.grossTotalValue',
        receivedPercent: 'ib.receivedPercent',
        createdAt: 'ib.createdAt',
      };
      const column = ALLOWED_SORT_FIELDS[field];
      if (column) {
        qb.orderBy(column, dir as 'ASC' | 'DESC');
      }
    } else {
      qb.orderBy('ib.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
