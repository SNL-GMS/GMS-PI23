import { getFilterName } from '../../src/ts/filter/filter-util';
import { UNFILTERED, UNFILTERED_FILTER } from '../../src/ts/filter/types';

describe('Filter Util', () => {
  describe('getFilterName', () => {
    it('returns `unfiltered` if unfiltered filter is provided', () => {
      expect(getFilterName(UNFILTERED_FILTER)).toBe(UNFILTERED);
    });
    it('returns `unfiltered` if undefined filter is provided', () => {
      expect(getFilterName(undefined)).toBe(UNFILTERED);
    });
    it('returns the filter name if the filter has one', () => {
      expect(getFilterName({ filterDefinition: { name: 'filter name' } as any } as any)).toBe(
        'filter name'
      );
    });
    it('returns the named filter filter name if the filter is a named filter', () => {
      expect(getFilterName({ namedFilter: 'named' } as any)).toBe('named');
    });
  });
});
