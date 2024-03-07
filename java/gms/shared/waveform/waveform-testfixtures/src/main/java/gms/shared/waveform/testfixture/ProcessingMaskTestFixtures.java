package gms.shared.waveform.testfixture;

import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import gms.shared.waveform.qc.coi.QcSegmentVersion;
import gms.shared.waveform.qc.coi.QcSegmentVersionId;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 *
 */
public class ProcessingMaskTestFixtures {
  
  private ProcessingMaskTestFixtures() {
    // private default constructor to hide implicit public one.
  }

  public static ProcessingMask getProcessingMask(ProcessingOperation processingOperation, List<Channel> channels, List<ChannelSegment<?>> channelSegments) {
    var currTime = Instant.now();

    var qcSegmentVersionId = QcSegmentVersionId.instanceBuilder()
      .setEffectiveAt(Instant.MIN)
      .setParentQcSegmentId(UUID.randomUUID())
      .build();

    var qcSegmentVersionOne = QcSegmentVersion.instanceBuilder()
      .setId(qcSegmentVersionId)
      .setData(QcSegmentVersion.Data.instanceBuilder()
        .setStageId(WorkflowDefinitionId.from("My Workflow"))
        .setChannels(channels)
        .setDiscoveredOn(channelSegments)
        .setCreatedBy("The Creator")
        .setRationale("Seemed like a good idea")
        .setStartTime(Instant.MIN)
        .setEndTime(Instant.MIN.plusSeconds(1))
        .setRejected(false)
        .setCategory(QcSegmentCategory.WAVEFORM)
        .setType(QcSegmentType.FLAT)
        .build()
      )
      .build();

    var pmData = ProcessingMask.Data.instanceBuilder()
      .setEffectiveAt(currTime)
      .setStartTime(currTime)
      .setEndTime(currTime) 
      .setProcessingOperation(processingOperation)
      .setAppliedToRawChannel(channels.get(0).toEntityReference())
      .setMaskedQcSegmentVersions(List.of(qcSegmentVersionOne));

    var idArray
      = Arrays.toString(Long.toString(404).getBytes())
      + Arrays.toString(Long.toString(0).getBytes())
      + processingOperation + channels.get(0).getName();
    var uuid = UUID.nameUUIDFromBytes(idArray.getBytes());

    return ProcessingMask.instanceBuilder()
      .setId(uuid)
      .setData(pmData.build())
      .build();

  }
}
