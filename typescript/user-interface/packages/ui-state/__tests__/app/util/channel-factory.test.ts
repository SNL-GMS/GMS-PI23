/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { ChannelTypes, TypeUtil } from '@gms/common-model';
import {
  filterDefinitionsData,
  PD01Channel,
  responseData
} from '@gms/common-model/__tests__/__data__';
import { toOSDTime } from '@gms/common-util';
import cloneDeep from 'lodash/cloneDeep';

import { ChannelFactory } from '../../../src/ts/app/util';
import {
  buildSortedArrayFromRecord,
  createFilterAttributesForChannelName,
  generateChannelDataForHash,
  generateChannelHash,
  generateChannelJsonString
} from '../../../src/ts/app/util/channel-factory-util';

describe('ChannelFactory', () => {
  describe('createFilterAttributesForChannelName', () => {
    it('Creates filter attributes correctly', () => {
      const filterAttr0 = createFilterAttributesForChannelName(filterDefinitionsData[0]);
      expect(filterAttr0).toBe('filter,filter def name-1');
    });
    it('Creates filter attributes correctly when they have / in the name', () => {
      const filterAttr0 = createFilterAttributesForChannelName(filterDefinitionsData[1]);
      expect(filterAttr0).toBe('filter,filter def name-2 | with slash');
    });
    it('returns an empty string if given an undefined filter', () => {
      const filterAttrEmpty = createFilterAttributesForChannelName(undefined);
      expect(filterAttrEmpty).toBe('');
    });
    it('returns an empty string if given a filter without a name', () => {
      const filterAttrEmpty = createFilterAttributesForChannelName({} as any);
      expect(filterAttrEmpty).toBe('');
    });
  });
  describe('generateChannelHash', () => {
    it('creates the expected JSON for a basic channel', () => {
      expect(generateChannelDataForHash(PD01Channel)).toMatchObject({
        channelBandType: PD01Channel.channelBandType,
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: null,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('creates the expected JSON for a channel with a response', () => {
      const PD01ChannelWithResponse: TypeUtil.Writeable<ChannelTypes.Channel> = cloneDeep(
        PD01Channel
      );
      PD01ChannelWithResponse.response = responseData;
      expect(generateChannelDataForHash(PD01ChannelWithResponse)).toMatchObject({
        channelBandType: PD01Channel.channelBandType,
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: responseData.id,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('creates the expected JSON for a channel with multiple configuredInputs', () => {
      const PD01ChannelWithConfiguredInputs: TypeUtil.Writeable<ChannelTypes.Channel> = cloneDeep(
        PD01Channel
      );
      PD01ChannelWithConfiguredInputs.configuredInputs = [
        {
          name: 'ASAR',
          effectiveAt: 0
        },
        {
          name: 'AAK',
          effectiveAt: 1
        }
      ];
      expect(generateChannelDataForHash(PD01ChannelWithConfiguredInputs)).toMatchObject({
        configuredInputs: [
          {
            effectiveAt: toOSDTime(PD01Channel.effectiveAt),
            name: PD01Channel.name
          }
        ],
        channelBandType: PD01Channel.channelBandType,
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelDataType: PD01Channel.channelDataType,
        description: PD01Channel.description,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        location: PD01Channel.location,
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        channelOrientationType: PD01Channel.channelOrientationType,
        processingDefinition: [],
        processingMetadata: [PD01Channel.processingMetadata],
        response: null,
        station: PD01Channel.station.name,
        units: PD01Channel.units
      });
    });
    it('gives the expected hash for the correct input', async () => {
      expect(await generateChannelHash(PD01Channel)).toBe(
        '0501421b22b559405b02a551b38508334a9c51af6ea3c20b524f93a7501eb9f4'
      );
    });
  });
  describe('buildSortedArrayFromRecord', () => {
    it('builds a sorted array containing objects with a key/value pair matching the record', () => {
      expect(buildSortedArrayFromRecord({ a: 1, y: 25, b: 2, z: 26, c: 3, x: 24 })).toMatchObject([
        { a: 1 },
        { b: 2 },
        { c: 3 },
        { x: 24 },
        { y: 25 },
        { z: 26 }
      ]);
    });
    it('handles empty records gracefully', () => {
      expect(buildSortedArrayFromRecord({})).toMatchObject([]);
    });
  });
  describe('createFiltered', () => {
    it('throws with expected error if given nullish channel', async () => {
      await expect(async () =>
        ChannelFactory.createFiltered(undefined, filterDefinitionsData[0])
      ).rejects.toThrow(`inputChannel may not be null`);
      await expect(async () =>
        ChannelFactory.createFiltered(null, filterDefinitionsData[0])
      ).rejects.toThrow(`inputChannel may not be null`);
    });
    it('throws with expected error if given nullish filter', async () => {
      await expect(async () =>
        ChannelFactory.createFiltered(PD01Channel, undefined)
      ).rejects.toThrow(`filterDefinition may not be null`);
      await expect(async () => ChannelFactory.createFiltered(PD01Channel, null)).rejects.toThrow(
        `filterDefinition may not be null`
      );
    });
    it('creates a filtered channel with the expected name', async () => {
      const filteredChan = await ChannelFactory.createFiltered(
        PD01Channel,
        filterDefinitionsData[0]
      );
      expect(filteredChan.name).toBe(
        'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6'
      );
    });
    it('creates a filtered channel as expected', async () => {
      const filteredChan = await ChannelFactory.createFiltered(
        PD01Channel,
        filterDefinitionsData[0]
      );
      expect(generateChannelJsonString({ ...filteredChan, name: filteredChan.name })).toBe(
        '{"channelBandType":"SHORT_PERIOD","channelDataType":"SEISMIC","channelInstrumentType":"HIGH_GAIN_SEISMOMETER","channelOrientationCode":"Z","channelOrientationType":"VERTICAL","configuredInputs":[{"effectiveAt":"2021-11-10T00:16:44.000Z","name":"PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6"}],"description":"Raw Channel created from ReferenceChannel 2fabc2d3-858b-3e85-9f47-e2ee72060f0b with version d767395c-850e-36f8-a6f2-a1c7398440e4 Filtered using a filter def name-1 filter.","location":{"latitudeDegrees":42.7765,"longitudeDegrees":-109.58314,"depthKm":0.0381,"elevationKm":2.192},"nominalSampleRateHz":20,"orientationAngles":{"horizontalAngleDeg":-1,"verticalAngleDeg":0},"processingDefinition":[{"comments":"the comments 1"},{"filterDescription":{"causal":false,"comments":"the description comments 1","filterType":"IIR_BUTTERWORTH","highFrequency":1,"lowFrequency":0.5,"order":1,"parameters":{"aCoefficients":[0.1,1],"bCoefficients":[1.1,1.2],"groupDelaySec":"PT3S","sampleRateHz":40,"sampleRateToleranceHz":2},"passBandType":"BAND_PASS","zeroPhase":false}},{"name":"filter def name-1"}],"processingMetadata":[{"CHANNEL_GROUP":"PD01"},{"FILTER_CAUSALITY":false},{"FILTER_TYPE":"IIR_BUTTERWORTH"}],"response":null,"station":"PDAR","units":"NANOMETERS_PER_COUNT"}'
      );
      expect(filteredChan).toMatchObject({
        canonicalName:
          'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6',
        channelBandType: PD01Channel.channelBandType,
        channelDataType: PD01Channel.channelDataType,
        channelInstrumentType: PD01Channel.channelInstrumentType,
        channelOrientationCode: PD01Channel.channelOrientationCode,
        channelOrientationType: PD01Channel.channelOrientationType,
        configuredInputs: [{ effectiveAt: PD01Channel.effectiveAt, name: PD01Channel.name }],
        description: `${PD01Channel.description} Filtered using a filter def name-1 filter.`,
        effectiveAt: PD01Channel.effectiveAt,
        effectiveForRequestTime: PD01Channel.effectiveForRequestTime,
        effectiveUntil: PD01Channel.effectiveUntil,
        location: PD01Channel.location,
        name:
          'PDAR.PD01.SHZ/filter,filter def name-1/b9c734ca3d1fb89f3e830ef5d59d9c10e97c14bf75663b187150ee5cb3f4c5f6',
        nominalSampleRateHz: PD01Channel.nominalSampleRateHz,
        orientationAngles: PD01Channel.orientationAngles,
        processingDefinition: {
          comments: 'the comments 1',
          filterDescription: {
            causal: false,
            comments: 'the description comments 1',
            filterType: 'IIR_BUTTERWORTH',
            highFrequency: 1,
            lowFrequency: 0.5,
            order: 1,
            parameters: {
              aCoefficients: [0.1, 1],
              bCoefficients: [1.1, 1.2],
              groupDelaySec: 'PT3S',
              sampleRateHz: 40,
              sampleRateToleranceHz: 2
            },
            passBandType: 'BAND_PASS',
            zeroPhase: false
          },
          name: 'filter def name-1'
        },
        processingMetadata: {
          CHANNEL_GROUP: 'PD01',
          FILTER_CAUSALITY: false,
          FILTER_TYPE: 'IIR_BUTTERWORTH'
        },
        response: undefined,
        station: PD01Channel.station,
        units: PD01Channel.units
      });
    });
  });
});
