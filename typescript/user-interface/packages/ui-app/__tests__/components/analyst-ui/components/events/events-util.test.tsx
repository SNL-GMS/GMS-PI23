import { EventTypes } from '@gms/common-model';
import { eventData } from '@gms/common-model/__tests__/__data__';
import type { Table } from '@gms/ui-core-components';
import type { EventStatus } from '@gms/ui-state';

import {
  buildEventRow,
  updateRowSelection
} from '../../../../../src/ts/components/analyst-ui/components/events/events-util';
import type { EventRow } from '../../../../../src/ts/components/analyst-ui/components/events/types';

const getTableApi = () => ({
  forEachNode: jest.fn()
});
const tableRef = {
  current: {
    getTableApi
  }
};
const selectedEvents = ['event1', 'event2', 'event3'];

describe('Events util', () => {
  it('builds a row correctly', () => {
    const eventStatuses: Record<string, EventStatus> = {};
    eventStatuses[eventData.id] = {
      stageId: { name: 'sample' },
      eventId: eventData.id,
      eventStatusInfo: {
        eventStatus: EventTypes.EventStatus.IN_PROGRESS,
        activeAnalystIds: ['user1', 'user2']
      }
    };

    expect(
      buildEventRow(
        eventData.id,
        eventData.eventHypotheses[0],
        eventData.eventHypotheses[0].locationSolutions[0].id,
        { startTimeSecs: 0, endTimeSecs: 100 },
        eventStatuses,
        false
      )
    ).toMatchInlineSnapshot(`
      {
        "activeAnalysts": [
          "user1",
          "user2",
        ],
        "confidenceSemiMajorAxis": undefined,
        "confidenceSemiMinorAxis": undefined,
        "conflict": false,
        "coverageSemiMajorAxis": undefined,
        "coverageSemiMinorAxis": undefined,
        "depthKm": 3.3,
        "edgeEventType": "After",
        "id": "eventID",
        "isOpen": false,
        "latitudeDegrees": 1.1,
        "longitudeDegrees": 2.2,
        "magnitudeMb": 1.2,
        "magnitudeMl": undefined,
        "magnitudeMs": undefined,
        "preferred": "TBD",
        "region": "TBD",
        "rejected": "False",
        "status": "IN_PROGRESS",
        "time": 3600,
      }
    `);
  });

  test('updateRowSelection returns tableRef', () => {
    const result = updateRowSelection(tableRef as any, selectedEvents);
    expect(result).toEqual(tableRef);
  });

  test('updateRowSelection returns null', () => {
    const emptyTableRef = {};
    let result = updateRowSelection(
      emptyTableRef as React.MutableRefObject<Table<EventRow, unknown>>,
      selectedEvents
    );
    expect(result).toBeNull();
    result = updateRowSelection(null, selectedEvents);
    expect(result).toBeNull();
  });
});
