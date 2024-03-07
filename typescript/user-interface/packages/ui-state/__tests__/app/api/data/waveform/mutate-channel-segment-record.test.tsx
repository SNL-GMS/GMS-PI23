import type { UiChannelSegment } from 'src/ts/types';

import { mutateUiChannelSegmentsRecord } from '../../../../../src/ts/app/api/data/waveform/mutate-channel-segment-record';
import { uiChannelSegmentRecord, uiChannelSegmentWithDataBySampleRate } from '../../../../__data__';

describe('Waveform Data Cache', () => {
  it('adds a channel segment', () => {
    const waveformCache = {};

    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', [
      uiChannelSegmentWithDataBySampleRate
    ]);
    expect(waveformCache).toEqual(uiChannelSegmentRecord);
  });

  it('can exercise immer produce method with undefined channel segment', () => {
    const waveformCache = {};

    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', undefined);
    expect(waveformCache).toEqual({});
  });

  it('will not add duplicate channel segments', () => {
    const waveformCache = {};
    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', [
      uiChannelSegmentWithDataBySampleRate
    ]);

    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', [
      uiChannelSegmentWithDataBySampleRate
    ]);

    expect(waveformCache).toEqual(uiChannelSegmentRecord);
  });

  it('will not add non duplicate channel segments', () => {
    const a: UiChannelSegment = {
      ...uiChannelSegmentWithDataBySampleRate,
      channelSegmentDescriptor: {
        ...uiChannelSegmentWithDataBySampleRate.channelSegmentDescriptor,
        channel: {
          name: 'A',
          effectiveAt: 0
        }
      }
    };

    const b: UiChannelSegment = {
      ...uiChannelSegmentWithDataBySampleRate,
      channelSegmentDescriptor: {
        ...uiChannelSegmentWithDataBySampleRate.channelSegmentDescriptor,
        channel: {
          name: 'B',
          effectiveAt: 0
        }
      }
    };

    const waveformCache = {};
    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', [a]);

    mutateUiChannelSegmentsRecord(waveformCache, 'PDAR.PD01.SHZ', [b]);

    expect(waveformCache).toEqual({
      'PDAR.PD01.SHZ': {
        Unfiltered: [a, b]
      }
    });
  });

  it('will add channel segments to the correct channel name', () => {
    const waveformCache = {};
    mutateUiChannelSegmentsRecord(waveformCache, 'A', [uiChannelSegmentWithDataBySampleRate]);

    mutateUiChannelSegmentsRecord(waveformCache, 'B', [uiChannelSegmentWithDataBySampleRate]);

    expect(waveformCache).toEqual({
      A: {
        Unfiltered: [uiChannelSegmentWithDataBySampleRate]
      },
      B: {
        Unfiltered: [uiChannelSegmentWithDataBySampleRate]
      }
    });
  });
});
