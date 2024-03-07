import { Units } from '../../../src/ts/common/types';
import { EventTypes } from '../../../src/ts/common-model';
import { facetedSignalDetectionHypothesis } from '../signal-detections';

const eventId = 'eventID';
const hypothesisId = 'hypothesisID';
const locationSolutionId = 'locationSolutionID';
const workflowDefinitionId = { name: 'AL1', effectiveTime: 0 };

export const eventHypothesisId: EventTypes.EventHypothesisId = {
  eventId,
  hypothesisId
};

export const networkMagnitudeSolutionMB: EventTypes.NetworkMagnitudeSolution = {
  magnitude: { value: 1.2, standardDeviation: 0, units: Units.MAGNITUDE },
  magnitudeBehaviors: [],
  type: EventTypes.MagnitudeType.MB
};

export const location: EventTypes.EventLocation = {
  latitudeDegrees: 1.1,
  longitudeDegrees: 2.2,
  depthKm: 3.3,
  time: 3600
};

export const locationSolution: EventTypes.LocationSolution = {
  id: locationSolutionId,
  networkMagnitudeSolutions: [networkMagnitudeSolutionMB],
  featurePredictions: { featurePredictions: [] },
  locationBehaviors: [],
  location,
  locationRestraint: undefined,
  name: ''
};

export const eventHypothesis: EventTypes.EventHypothesis = {
  id: eventHypothesisId,
  rejected: false,
  parentEventHypotheses: [],
  associatedSignalDetectionHypotheses: [facetedSignalDetectionHypothesis],
  preferredLocationSolution: locationSolution,
  locationSolutions: [locationSolution],
  name: 'event hypothesis'
};

export const preferredEventHypothesis: EventTypes.PreferredEventHypothesis = {
  preferredBy: 'preferredAnalyst',
  stage: workflowDefinitionId,
  preferred: eventHypothesis
};

export const rejectedEventHypothesis: EventTypes.EventHypothesis = {
  id: eventHypothesisId,
  rejected: true,
  parentEventHypotheses: [eventHypothesis],
  associatedSignalDetectionHypotheses: [],
  preferredLocationSolution: null,
  locationSolutions: [],
  name: 'rejected event hypothesis'
};

export const preferredEventHypothesisRejected: EventTypes.PreferredEventHypothesis = {
  preferredBy: 'preferredAnalyst',
  stage: workflowDefinitionId,
  preferred: rejectedEventHypothesis
};

export const eventData: EventTypes.Event = {
  id: eventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: eventHypothesis,
  eventHypotheses: [eventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesis],
  finalEventHypothesisHistory: [],
  name: 'test event'
};

export const rejectedEventData: EventTypes.Event = {
  id: eventId,
  rejectedSignalDetectionAssociations: [],
  monitoringOrganization: 'testOrg',
  overallPreferred: rejectedEventHypothesis,
  eventHypotheses: [eventHypothesis, rejectedEventHypothesis],
  preferredEventHypothesisByStage: [preferredEventHypothesisRejected],
  finalEventHypothesisHistory: [],
  name: 'test event'
};
