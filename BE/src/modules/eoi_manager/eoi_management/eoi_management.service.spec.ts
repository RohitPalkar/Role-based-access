import { EoiManagementService } from './eoi_management.service';
import { VoucherFormStatusEnum } from '../../../enums/eoi-form.enums';
import { VoucherForm } from '../../../entities';

describe('EoiManagementService', () => {
  let service: EoiManagementService;

  beforeEach(() => {
    // `updateVoucherFormStatus` is a pure mutator over its argument and does
    // not invoke any `this.<collaborator>`. Direct instantiation with stub
    // constructor args keeps the test isolated and fast (no Nest DI graph).
    const stubs = Array.from(
      { length: EoiManagementService.length },
      () => ({}) as unknown,
    );
    service = new (EoiManagementService as unknown as new (
      ...args: unknown[]
    ) => EoiManagementService)(...stubs);
  });

  describe('updateVoucherFormStatus', () => {
    const makeForm = (status: VoucherFormStatusEnum): VoucherForm =>
      ({
        voucherFormStatus: status,
        submittedAt: undefined,
      }) as unknown as VoucherForm;

    describe('RM flow', () => {
      it('AC1: leaves UNVERIFIED unchanged and does not set submittedAt', () => {
        const voucherForm = makeForm(VoucherFormStatusEnum.UNVERIFIED);

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.UNVERIFIED,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });

      it('AC2: transitions CREATED to IN_PROGRESS and preserves submittedAt', () => {
        const voucherForm = makeForm(VoucherFormStatusEnum.CREATED);

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.IN_PROGRESS,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });

      it('AC3: keeps IN_PROGRESS as IN_PROGRESS (idempotent) and preserves submittedAt', () => {
        const voucherForm = makeForm(VoucherFormStatusEnum.IN_PROGRESS);

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.IN_PROGRESS,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });
    });

    describe('MIS flow (preserved)', () => {
      it('AC4: MIS_REQUESTED_CHANGES becomes MIS_UPDATED and leaves submittedAt untouched', () => {
        const voucherForm = makeForm(
          VoucherFormStatusEnum.MIS_REQUESTED_CHANGES,
        );

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.MIS_UPDATED,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });

      it('AC4: MIS_UPDATED stays MIS_UPDATED and leaves submittedAt untouched', () => {
        const voucherForm = makeForm(VoucherFormStatusEnum.MIS_UPDATED);

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.MIS_UPDATED,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });
    });

    describe('CRM flow (preserved)', () => {
      it('AC5: CRM_REQUESTED_CHANGES becomes CRM_UPDATED and leaves submittedAt untouched', () => {
        const voucherForm = makeForm(
          VoucherFormStatusEnum.CRM_REQUESTED_CHANGES,
        );

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.CRM_UPDATED,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });

      it('AC5: CRM_UPDATED stays CRM_UPDATED and leaves submittedAt untouched', () => {
        const voucherForm = makeForm(VoucherFormStatusEnum.CRM_UPDATED);

        service.updateVoucherFormStatus(voucherForm);

        expect(voucherForm.voucherFormStatus).toBe(
          VoucherFormStatusEnum.CRM_UPDATED,
        );
        expect(voucherForm.submittedAt).toBeUndefined();
      });
    });

    describe('submittedAt invariant', () => {
      it('AC6: preserves submittedAt for all supported status transitions', () => {
        const statuses: VoucherFormStatusEnum[] = [
          VoucherFormStatusEnum.UNVERIFIED,
          VoucherFormStatusEnum.CREATED,
          VoucherFormStatusEnum.IN_PROGRESS,
          VoucherFormStatusEnum.MIS_REQUESTED_CHANGES,
          VoucherFormStatusEnum.MIS_UPDATED,
          VoucherFormStatusEnum.CRM_REQUESTED_CHANGES,
          VoucherFormStatusEnum.CRM_UPDATED,
        ];

        for (const status of statuses) {
          const voucherForm = makeForm(status);
          service.updateVoucherFormStatus(voucherForm);
          expect(voucherForm.submittedAt).toBeUndefined();
        }
      });
    });
  });
});
