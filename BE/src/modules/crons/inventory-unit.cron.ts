import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import {
  ProjectInventoryUnit,
  VoucherUnitBlocking,
  VoucherUnitMapping,
  VoucherPayment,
  VoucherForm,
} from 'src/entities';
import { logger } from 'src/logger/logger';
import {
  BlockingStatus,
  InventoryUnitStatusEnum,
} from 'src/enums/eoi-form.enums';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class InventoryUnitCron {
  private readonly enabled: boolean;

  constructor(
    private readonly config: CustomConfigService,
    @InjectRepository(VoucherUnitBlocking)
    private readonly blockingRepo: Repository<VoucherUnitBlocking>,
  ) {
    this.enabled =
      this.config.get<string>('INVENTORY_CRONS_ENABLED') === 'true';
  }

  /**
   * CRON JOB: Handle expired approvals (approval window closed)
   * Run: Every 5 minutes
   *
   * Releases units when approver doesn't act in time
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async handleExpiredApprovals(): Promise<void> {
    logger.info('Checking for expired approvals...');
    if (!this.enabled) {
      logger.info('Expire Unit approval cron disabled.');
      return;
    }

    try {
      const now = new Date();
      const expiredBlockings = await this.blockingRepo.find({
        where: {
          status: BlockingStatus.PENDING,
          approvalExpiry: LessThan(now),
          approvalRequired: true,
        },
        relations: ['inventoryUnit', 'mapping'],
      });

      logger.info(`Found ${expiredBlockings.length} expired approvals`);

      for (const blocking of expiredBlockings) {
        try {
          await this.blockingRepo.manager.transaction(async (manager) => {
            // Mark blocking as expired
            blocking.status = BlockingStatus.EXPIRED;
            blocking.approvalSource = 'APPROVAL_EXPIRED';
            await manager.save(VoucherUnitBlocking, blocking);

            // Delete mapping - release unit
            if (blocking.mapping) {
              await manager.remove(VoucherUnitMapping, blocking.mapping);
            }

            // Set is_unit_mapped = false for all payments of this voucher
            await manager.update(
              VoucherPayment,
              { voucherId: blocking.voucherId },
              { isUnitMapped: false },
            );
            // Reset inventory
            if (blocking.inventoryUnit) {
              blocking.inventoryUnit.isMapped = false;
              blocking.inventoryUnit.status = InventoryUnitStatusEnum.AVAILABLE;
              await manager.save(ProjectInventoryUnit, blocking.inventoryUnit);
            }

            // Soft delete the blocking record
            await manager.softDelete(VoucherUnitBlocking, {
              id: blocking.id,
            });

            logger.info(`Expired approval for blocking ${blocking.id}`);
          });
        } catch (error) {
          logger.error(
            `Error handling expired approval for blocking ${blocking.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      logger.error('Error in handleExpiredApprovals cron:', error);
    }
  }

  /**
   * CRON JOB: Hard release for unit blocks that exceed block duration
   * Run: Every minutes
   *
   * Separate from approval expiry - this is absolute timeout
   * If voucher payments have is_unit_mapped = true, extends release by campaign timerExtension minutes
   */
  @Cron('* * * * *') // Every minute
  async handleExpiredBlocks(): Promise<void> {
    logger.info('Checking for hard-expired blocks...');
    if (!this.enabled) {
      logger.info('Expire Unit block cron disabled.');
      return;
    }
    try {
      const now = new Date();

      const expiredBlockings = await this.blockingRepo.find({
        where: {
          status: In([BlockingStatus.BLOCKED]),
          unitBlockExpiry: LessThan(now),
        },
        relations: ['inventoryUnit', 'mapping', 'voucher', 'voucher.campaign'],
      });

      logger.info(`Found ${expiredBlockings.length} hard-expired blocks`);

      for (const blocking of expiredBlockings) {
        try {
          await this.blockingRepo.manager.transaction(async (manager) => {
            // Only auto-expire PENDING - QUALIFIED should stay (customer approved)
            if (blocking.status === BlockingStatus.BLOCKED) {
              // Get timer extension from campaign (default 5 minutes)
              const timerExtensionMinutes =
                blocking.voucher?.campaign?.timerExtension || 5;

              // Check if voucher has any payments with is_unit_mapped = true
              const voucherWithMappedPayments = await manager.findOne(
                VoucherForm,
                {
                  where: { id: blocking.voucher.id },
                  relations: ['payments'],
                },
              );

              const hasMappedPayments =
                voucherWithMappedPayments?.payments?.some(
                  (payment) => payment.isUnitMapped,
                );

              // If payments have is_unit_mapped = true, extend the expiry check
              if (hasMappedPayments) {
                const extendedExpiry = new Date(blocking.unitBlockExpiry);
                extendedExpiry.setMinutes(
                  extendedExpiry.getMinutes() + timerExtensionMinutes,
                );

                // If current time hasn't exceeded extended expiry, skip this blocking
                if (now < extendedExpiry) {
                  logger.info(
                    `Blocking ${blocking.id} has mapped unit payments. Extended expiry: ${extendedExpiry}. Skipping for now.`,
                  );
                  return;
                }

                logger.info(
                  `Blocking ${blocking.id} extended timer expired. Proceeding with release.`,
                );

                // Set is_unit_mapped = false for all payments of this voucher
                await manager.update(
                  VoucherPayment,
                  { voucherId: blocking.voucher.id },
                  { isUnitMapped: false },
                );
              }

              blocking.status = BlockingStatus.RELEASED;
              blocking.approvalSource = 'Block Duration Expired';
              await manager.save(VoucherUnitBlocking, blocking);

              // Delete mapping
              if (blocking.mapping) {
                await manager.remove(VoucherUnitMapping, blocking.mapping);
              }

              // Reset inventory
              if (blocking.inventoryUnit) {
                blocking.inventoryUnit.isMapped = false;
                blocking.inventoryUnit.status =
                  InventoryUnitStatusEnum.AVAILABLE;
                await manager.save(
                  ProjectInventoryUnit,
                  blocking.inventoryUnit,
                );
              }
              // Soft delete the blocking record
              await manager.softDelete(VoucherUnitBlocking, {
                id: blocking.id,
              });
              logger.info(`Hard-released block ${blocking.id}`);
            }
          });
        } catch (error) {
          logger.error(`Error hard-releasing block ${blocking.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in handleExpiredBlocks cron:', error);
    }
  }
}
