import {
  mapExtendedParticipantFields,
  mapParticipantAddress,
} from './loyalty-participant.mapper';

describe('loyalty-participant.mapper', () => {
  describe('mapParticipantAddress', () => {
    it('maps address fields with camelCase and snake_case aliases', () => {
      const result = mapParticipantAddress({
        addressLine1: 'Line 1',
        address_line2: 'Line 2',
        pinCode: '560001',
        city: 'Bengaluru',
        state: 'Karnataka',
      });

      expect(result).toEqual({
        addressLine1: 'Line 1',
        addressLine2: 'Line 2',
        pincode: '560001',
        location: 'Bengaluru, Karnataka',
      });
    });

    it('uses direct location when present', () => {
      const result = mapParticipantAddress({ location: 'Whitefield' });
      expect(result.location).toBe('Whitefield');
    });

    it('returns nulls when source keys are absent', () => {
      expect(mapParticipantAddress({})).toEqual({
        addressLine1: null,
        addressLine2: null,
        pincode: null,
        location: null,
      });
    });
  });

  describe('mapExtendedParticipantFields', () => {
    it('maps personal fields from details', () => {
      const result = mapExtendedParticipantFields({
        first_name: 'Jane',
        last_name: 'Doe',
        sfdc_id: 'SF-001',
        gender: 'F',
        email_id: 'jane@example.com',
        addressLine1: '123 St',
      });

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
      expect(result.sfdcId).toBe('SF-001');
      expect(result.gender).toBe('F');
      expect(result.email).toBe('jane@example.com');
      expect(result.address.addressLine1).toBe('123 St');
    });

    it('falls back to sfdcIdFallbacks when not in details', () => {
      const result = mapExtendedParticipantFields({}, ['BP-99', null]);
      expect(result.sfdcId).toBe('BP-99');
    });
  });
});
