package gms.shared.waveform.qc.coi;

import gms.shared.stationdefinition.coi.channel.Channel;
import java.time.Instant;
import java.util.Collection;

public interface QcSegmentRepositoryInterface {
  
  /**
   * Queries for QcSegments of channels in within the provided time range.
   *
   * @param channels A list of channels to query for {@link QcSegment}s
   * @param startTime Start time of the query
   * @param endTime End Time of the query
   * @return A Collection of {@link QcSegment}s associated with the
   * channels during the requested interval.
   */
    Collection<QcSegment> findQcSegmentsByChannelsandTimeRangeCanned(Collection<Channel> channels,
    Instant startTime, Instant endTime);
  
}
