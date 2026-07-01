import { PineLabsApiName } from '../enums/pine-labs-api-name.enum';
import { PineLabsApiDefinition } from '../interfaces/pine-labs.interface';

/**
 * Per-API routing and payload mappings.
 * TODO(PN-51): confirm paths, methods, and field names with Pine Labs API doc.
 */
export const PINE_LABS_API_DEFINITIONS: Record<
  PineLabsApiName,
  PineLabsApiDefinition
> = {
  [PineLabsApiName.CUSTOMER_CREATE_OR_UPDATE]: {
    // TODO(PN-51): confirm with Pine Labs API doc
    path: '/customer/createOrUpdate',
    method: 'POST',
    payloadMapping: {
      customerId: 'customer_id',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      mobile: 'mobile',
    },
    requiredFields: ['customerId'],
  },
  [PineLabsApiName.CUSTOMER_FETCH]: {
    // TODO(PN-51): confirm with Pine Labs API doc
    path: '/customer/fetch',
    method: 'POST',
    payloadMapping: {
      customerId: 'customer_id',
      mobileNumber: 'mobile',
    },
    requiredOneOf: ['customerId', 'mobileNumber'],
  },
  [PineLabsApiName.REDEEM_POINTS]: {
    // TODO(PN-51): confirm with Pine Labs API doc
    path: '/points/redeem',
    method: 'POST',
    payloadMapping: {
      customerId: 'customer_id',
      points: 'points',
      referenceId: 'reference_id',
    },
    requiredFields: ['customerId', 'points'],
  },
  [PineLabsApiName.MARK_ELIGIBLE]: {
    // TODO(PN-51): confirm with Pine Labs API doc
    path: '/customer/markEligible',
    method: 'POST',
    payloadMapping: {
      customerId: 'customer_id',
      programId: 'program_id',
    },
    requiredFields: ['customerId'],
  },
  [PineLabsApiName.GET_USER_POOL_BALANCE]: {
    // TODO(PN-51): confirm with Pine Labs API doc
    path: '/balance/userPool',
    method: 'POST',
    payloadMapping: {
      customerId: 'customer_id',
      poolId: 'pool_id',
    },
    requiredFields: ['customerId'],
  },
};
