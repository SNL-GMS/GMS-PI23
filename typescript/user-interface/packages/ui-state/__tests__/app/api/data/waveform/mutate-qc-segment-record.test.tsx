import { qcSegment } from '@gms/common-model/__tests__/__data__';
import produce from 'immer';

import { createRecipeToMutateQcSegmentsRecord } from '../../../../../src/ts/app/api/data/waveform/mutate-qc-segment-record';

describe('Waveform Data Cache', () => {
  it('can exercise immer produce method to add channel segment', () => {
    const qcSegmentRecord = produce(
      {},
      createRecipeToMutateQcSegmentsRecord('PDAR.PD01.SHZ', [qcSegment])
    );
    expect(qcSegmentRecord['PDAR.PD01.SHZ']).toEqual({ [qcSegment.id]: qcSegment });
  });

  it('can exercise immer produce method with undefined channel segment', () => {
    const qcSegmentRecord = produce(
      {},
      createRecipeToMutateQcSegmentsRecord('PDAR.PD01.SHZ', undefined)
    );
    expect(qcSegmentRecord).toEqual({});
  });
});
