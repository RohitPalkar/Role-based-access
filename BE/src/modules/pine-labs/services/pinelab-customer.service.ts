import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PinelabCustomer } from '../entities/pinelab-customer.entity';
import { normalizeMobileForLookup } from '../utils/normalize-mobile.util';

@Injectable()
export class PinelabCustomerService {
  constructor(
    @InjectRepository(PinelabCustomer)
    private readonly repo: Repository<PinelabCustomer>,
  ) {}

  async findByBrandAndMobile(
    brandId: number,
    mobile: string | null | undefined,
  ): Promise<PinelabCustomer | null> {
    const mobileNo = normalizeMobileForLookup(mobile);
    if (!mobileNo) {
      return null;
    }
    return this.repo.findOne({ where: { brandId, mobileNo } });
  }

  async upsertCustomerId(
    brandId: number,
    mobile: string | null | undefined,
    pinelabCustomerId: string | null | undefined,
  ): Promise<void> {
    const id = pinelabCustomerId?.trim();
    if (!id) {
      return;
    }

    const mobileNo = normalizeMobileForLookup(mobile);
    if (!mobileNo) {
      return;
    }

    const existing = await this.repo.findOne({ where: { brandId, mobileNo } });
    if (existing) {
      if (existing.pinelabCustomerId !== id) {
        existing.pinelabCustomerId = id;
        await this.repo.save(existing);
      }
      return;
    }

    await this.repo.save({ brandId, mobileNo, pinelabCustomerId: id });
  }
}
