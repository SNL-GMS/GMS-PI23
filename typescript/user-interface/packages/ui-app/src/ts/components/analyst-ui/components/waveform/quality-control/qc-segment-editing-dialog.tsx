import type { IconName } from '@blueprintjs/core';
import { Button, Classes, Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { WorkflowTypes } from '@gms/common-model';
import type {
  QcSegment,
  QcSegmentCategory,
  QCSegmentVersion
} from '@gms/common-model/lib/qc-segment';
import { QcSegmentType } from '@gms/common-model/lib/qc-segment';
import type { UITheme } from '@gms/common-model/lib/ui-configuration/types';
import {
  DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  humanReadable,
  secondsToString
} from '@gms/common-util';
import { closeImperativeContextMenu, DropDown, Table, TextArea } from '@gms/ui-core-components';
import { useUiTheme } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import classNames from 'classnames';
import React from 'react';

import { MASK_HISTORY_COLUMN_DEFINITIONS } from './constants';
import { getQCSegmentCategoryString, getQCSegmentSwatchColor } from './qc-segment-utils';
import { QcMaskDialogBoxType } from './types';

const logger = UILogger.create('GMS_LOG_EDIT_QC_SEGMENT', process.env.GMS_LOG_EDIT_QC_SEGMENT);

enum VersionView {
  CURRENT = 'Current Version',
  ALL = 'All Versions'
}

export interface QCSegmentEditingDialogProps {
  qcSegment: QcSegment;
  dialogType: QcMaskDialogBoxType;
}

interface QCSegmentCurrentVersionProps {
  category: QcSegmentCategory;
  channelNames: string[];
  effectiveAt: number;
  endDate: number;
  isRejected: boolean;
  qcSegmentType: QcSegmentType | 'Unknown';
  rationale: string;
  stage: WorkflowTypes.WorkflowDefinitionId | string;
  startDate: number;
  username: string;
  isEditable: boolean;
}

interface QCSegmentAllVersionsProps {
  versions: QCSegmentVersion[];
}

interface QCSegmentEditingFormArgs {
  title: string;
  submitButtonText?: string;
  submitButtonIcon?: IconName;
  submitButtonIntent: Intent;
  isEditable: boolean;
}

interface QCSegmentEditingDialogArgs {
  category: QcSegmentCategory;
  channelNames: string[];
  color: string;
  effectiveAt: number;
  endDate: number;
  formArgs: QCSegmentEditingFormArgs;
  isRejected: boolean;
  qcSegmentType: QcSegmentType | 'Unknown';
  rationale: string;
  stage: WorkflowTypes.WorkflowDefinitionId | string;
  startDate: number;
  username: string;
  versions: QCSegmentVersion[];
}

const QCSegmentCreateFormArgs: QCSegmentEditingFormArgs = {
  title: 'Create QC Segment',
  submitButtonText: 'Save',
  submitButtonIcon: IconNames.FloppyDisk,
  submitButtonIntent: Intent.PRIMARY,
  isEditable: false
};

const QCSegmentModifyFormArgs: QCSegmentEditingFormArgs = {
  ...QCSegmentCreateFormArgs,
  title: 'Modify QC Segment',
  isEditable: true
};

const QCSegmentViewFormArgs: QCSegmentEditingFormArgs = {
  title: 'View QC Segment',
  submitButtonText: 'Modify',
  submitButtonIcon: IconNames.EDIT,
  submitButtonIntent: Intent.NONE,
  isEditable: false
};

const QCSegmentRejectFormArgs: QCSegmentEditingFormArgs = {
  title: 'Reject QC Segment',
  submitButtonText: 'Reject',
  submitButtonIcon: IconNames.Trash,
  submitButtonIntent: Intent.DANGER,
  isEditable: false
};

const QCSegmentRejectedFormArgs: QCSegmentEditingFormArgs = {
  ...QCSegmentCreateFormArgs,
  title: 'Rejected QC Segment',
  submitButtonIntent: Intent.DANGER,
  isEditable: false
};

export const getDialogFormArgs = (dialogType: QcMaskDialogBoxType): QCSegmentEditingFormArgs => {
  switch (dialogType) {
    case QcMaskDialogBoxType.Create:
      return QCSegmentCreateFormArgs;
    case QcMaskDialogBoxType.Modify:
      return QCSegmentModifyFormArgs;
    case QcMaskDialogBoxType.Reject:
      return QCSegmentRejectFormArgs;
    case QcMaskDialogBoxType.Rejected:
      return QCSegmentRejectedFormArgs;
    case QcMaskDialogBoxType.View:
    default:
      return QCSegmentViewFormArgs;
  }
};

const useDialogArgs = (
  qcSegment: QcSegment,
  dialogType: QcMaskDialogBoxType,
  uiTheme: UITheme
): QCSegmentEditingDialogArgs => {
  return React.useMemo(() => {
    const dialogSegment = { ...qcSegment };
    const { versionHistory } = dialogSegment;
    const {
      category,
      channels,
      startTime,
      endTime,
      createdBy,
      id,
      rationale,
      type = 'Unknown',
      rejected,
      stageId = 'Unknown'
    } = versionHistory[0];
    const channelNames = channels.map(channel => channel.name);
    const color = getQCSegmentSwatchColor(dialogSegment.versionHistory[0].category, uiTheme);
    const formArgs = getDialogFormArgs(dialogType);
    return {
      category,
      channelNames,
      color,
      effectiveAt: id.effectiveAt,
      endDate: endTime,
      formArgs,
      isRejected: rejected,
      qcSegmentType: type,
      rationale,
      stage: stageId,
      startDate: startTime,
      username: createdBy,
      versions: versionHistory
    };
  }, [dialogType, qcSegment, uiTheme]);
};

const generateSegmentHistoryTableRows = (versionHistory: QCSegmentVersion[]) => {
  const rows = versionHistory.map(version => ({
    category: getQCSegmentCategoryString(version.category),
    type: version.type,
    channelName: version.channels.map(channel => channel.name),
    startTime: version.startTime,
    endTime: version.endTime,
    stage: version.stageId,
    author: version.createdBy,
    effectiveAt: version.id.effectiveAt,
    rationale: version.rationale
  }));
  rows[0]['first-in-table'] = true;
  return rows;
};

const rowClassRules: {
  'qc-segment-versions-table__row--first-in-table': (params: { data }) => boolean;
} = {
  'qc-segment-versions-table__row--first-in-table': (params: { data }) =>
    params.data['first-in-table']
};

function CurrentVersion(props: QCSegmentCurrentVersionProps): JSX.Element {
  const {
    category,
    channelNames,
    effectiveAt,
    endDate,
    isRejected,
    qcSegmentType,
    rationale,
    stage,
    startDate,
    username,
    isEditable
  } = props;
  const textAreaChangeCallback = React.useCallback(
    () => logger.info('QC segment text area change'),
    []
  );
  const typeChangeCallback = React.useCallback(() => logger.info('QC segment type change'), []);
  return (
    <div className="form-body">
      <div className="form-label">Category</div>
      <div className="form-value form-value--uneditable monospace" title="">
        {getQCSegmentCategoryString(category)}
      </div>
      <div className={`form-label ${isEditable && 'form-label--required'}`}>Type</div>
      <div
        className={`form-value ${(isEditable && '') || 'form-value--uneditable'} monospace`}
        title=""
      >
        {(isEditable && (
          <DropDown
            disabled={!isEditable}
            className="full-width"
            dropDownItems={[
              'Select a QC Segment type',
              ...Object.values(QcSegmentType).map(humanReadable)
            ]}
            value={qcSegmentType}
            onMaybeValue={typeChangeCallback}
          />
        )) ||
        qcSegmentType === 'Unknown'
          ? qcSegmentType
          : humanReadable(QcSegmentType[qcSegmentType])}
      </div>
      <div className="form-label">Channel name</div>
      <div className="form-value form-value--uneditable monospace" title="">
        <div className="form__text--wrap">
          {channelNames.reduce((str, cn, i) => {
            return `${str}${i > 0 ? ', ' : ''}${cn}`;
          }, '')}
        </div>
      </div>
      <div className="form-label">Start time</div>
      <div className="form-value form-value--uneditable monospace" title="">
        {(isEditable && <div>timepicker</div>) ||
          secondsToString(startDate, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)}
      </div>
      <div className="form-label">End time</div>
      <div className="form-value form-value form-value--time monospace" title="">
        {(isEditable && <div>timepicker</div>) ||
          secondsToString(endDate, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)}
      </div>
      <div className="form-label">Stage</div>
      <div className="form-value form-value--uneditable monospace" title="">
        {String(stage)}
      </div>
      <div className="form-label">Author</div>
      <div className="form-value form-value--uneditable monospace" title="">
        {username}
      </div>
      {effectiveAt != null && (
        <>
          <div className="form-label">Effective at</div>
          <div className="form-value form-value--uneditable monospace" title="">
            {secondsToString(effectiveAt, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)}
          </div>
        </>
      )}
      <div className="form-label">Rationale</div>
      <div className="form-value form-value--uneditable" title="">
        {(isRejected && <div className="form__text--wrap">{rationale}</div>) || (
          <TextArea
            defaultValue={rationale}
            title="Rationale"
            onMaybeValue={textAreaChangeCallback}
          />
        )}
      </div>
    </div>
  );
}

function AllVersions(props: QCSegmentAllVersionsProps): JSX.Element {
  const { versions } = props;
  return (
    <div className={classNames('ag-theme-dark', 'qc-segment-form-details-versions-table')}>
      <div className="max">
        <Table
          columnDefs={MASK_HISTORY_COLUMN_DEFINITIONS}
          getRowId={node => node.data.id}
          rowSelection="single"
          rowData={generateSegmentHistoryTableRows(versions)}
          rowClassRules={rowClassRules}
        />
      </div>
    </div>
  );
}

/**
 * A dialog for exiting a QC Segment. Supports five states
 * - Create: If the user chooses to create a new QC Segment using a button from the toolbar, or by holding a hotkey and dragging on a raw channel
 * - Modify: Modifying an existing QC Segment (shown when the user chooses to edit a qc segment, or alt+clicks)
 * - View: Details about a QC Segment (shown when the user chooses to "view" a rejected segment from the context menu)
 * - Reject: Rejecting an existing QC Segment (shown when the user chooses the "reject" option from the context menu, or presses backspace)
 * - Rejected: Details about a rejected QC Segment (shown when the user chooses to "view" a rejected segment from the context menu)
 */
export function QCSegmentEditingDialog({
  qcSegment,
  dialogType
}: QCSegmentEditingDialogProps): JSX.Element {
  const [uiTheme] = useUiTheme();
  const [versionView, setVersionView] = React.useState<VersionView>(VersionView.CURRENT);
  const dialogArgs = useDialogArgs(qcSegment, dialogType, uiTheme);
  const {
    category,
    channelNames,
    color,
    effectiveAt,
    endDate,
    formArgs,
    isRejected,
    qcSegmentType,
    rationale,
    stage,
    startDate,
    username,
    versions
  } = dialogArgs;
  const { title, submitButtonText, submitButtonIcon, submitButtonIntent, isEditable } = formArgs;

  return (
    <div className={classNames('form', 'qc-segment-form')}>
      <div className="form__header">
        <div>{title}</div>
        <div className="form__header-decoration">
          <div>
            <div className="qc-segment-swatch" style={{ backgroundColor: color }} />
            <span className="qc-segment-swatch-label">{getQCSegmentCategoryString(category)}</span>
          </div>
        </div>
      </div>
      <div className="form">
        {versions?.length && (
          <div className="form__panel-selector">
            <div className={Classes.BUTTON_GROUP}>
              <Button
                type="button"
                value={VersionView.CURRENT}
                className={classNames({
                  [`${Classes.ACTIVE}`]: versionView === VersionView.CURRENT
                })}
                onClick={() => setVersionView(VersionView.CURRENT)}
              >
                <span className={Classes.BUTTON_TEXT}>{VersionView.CURRENT}</span>
              </Button>
              <Button
                value={VersionView.ALL}
                className={classNames({
                  [`${Classes.ACTIVE}`]: versionView === VersionView.ALL
                })}
                onClick={() => setVersionView(VersionView.ALL)}
              >
                <span className={Classes.BUTTON_TEXT}>{VersionView.ALL}</span>
              </Button>
            </div>
          </div>
        )}
        {(versionView === VersionView.CURRENT && (
          <CurrentVersion
            category={category}
            channelNames={channelNames}
            effectiveAt={effectiveAt}
            endDate={endDate}
            isRejected={isRejected}
            qcSegmentType={qcSegmentType}
            rationale={rationale}
            stage={stage}
            startDate={startDate}
            username={username}
            isEditable={isEditable}
          />
        )) || <AllVersions versions={versions} />}

        <div className="form__buttons">
          <div className="form__buttons--right">
            {!isRejected && (
              <Button icon={submitButtonIcon} intent={submitButtonIntent}>
                {submitButtonText}
              </Button>
            )}
            <Button
              type="submit"
              className={`${Classes.BUTTON} form__button`}
              onClick={() => closeImperativeContextMenu()}
            >
              <span className={Classes.BUTTON_TEXT}>Cancel</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
