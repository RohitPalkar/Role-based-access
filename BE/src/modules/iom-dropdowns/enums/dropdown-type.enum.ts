/**
 * Supported `type` discriminators for the IOM dropdown endpoint.
 *
 * Values intentionally match the casing the FE / spec uses on the
 * wire (`IomStatus`, `adjustmentType`, `InvoiceStatus`) so the
 * payload can be forwarded verbatim from the UI without translation.
 *
 * Adding a new dropdown is a two-step change:
 *   1. Add the enum member here.
 *   2. Add the corresponding branch in `IomDropdownService.resolve`.
 * The `@IsEnum` validator on the DTO will then reject anything else
 * with a 400 before the service is called.
 */
export enum DropdownTypeEnum {
  IOM_STATUS = 'IomStatus',
  ADJUSTMENT_TYPE = 'adjustmentType',
  INVOICE_STATUS = 'InvoiceStatus',
  PROJECTS = 'projects',
}
