import { getDialogFormArgs } from '~analyst-ui/components/waveform/quality-control/qc-segment-editing-dialog';
import { QcMaskDialogBoxType } from '~analyst-ui/components/waveform/quality-control/types';

describe('QC Context Menus', () => {
  it('exists', () => {
    expect(getDialogFormArgs).toBeDefined();
  });

  it('can get dialog from args', () => {
    expect(getDialogFormArgs(QcMaskDialogBoxType.Create)).toMatchInlineSnapshot(`
      {
        "isEditable": false,
        "submitButtonIcon": "floppy-disk",
        "submitButtonIntent": "primary",
        "submitButtonText": "Save",
        "title": "Create QC Segment",
      }
    `);
    expect(getDialogFormArgs(QcMaskDialogBoxType.Modify)).toMatchInlineSnapshot(`
      {
        "isEditable": true,
        "submitButtonIcon": "floppy-disk",
        "submitButtonIntent": "primary",
        "submitButtonText": "Save",
        "title": "Modify QC Segment",
      }
    `);
    expect(getDialogFormArgs(QcMaskDialogBoxType.Reject)).toMatchInlineSnapshot(`
      {
        "isEditable": false,
        "submitButtonIcon": "trash",
        "submitButtonIntent": "danger",
        "submitButtonText": "Reject",
        "title": "Reject QC Segment",
      }
    `);
    expect(getDialogFormArgs(QcMaskDialogBoxType.Rejected)).toMatchInlineSnapshot(`
      {
        "isEditable": false,
        "submitButtonIcon": "floppy-disk",
        "submitButtonIntent": "danger",
        "submitButtonText": "Save",
        "title": "Rejected QC Segment",
      }
    `);
    expect(getDialogFormArgs(QcMaskDialogBoxType.View)).toMatchInlineSnapshot(`
      {
        "isEditable": false,
        "submitButtonIcon": "edit",
        "submitButtonIntent": "none",
        "submitButtonText": "Modify",
        "title": "View QC Segment",
      }
    `);
  });
});
