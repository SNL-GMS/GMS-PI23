package gms.shared.stationdefinition.converter;

import gms.shared.stationdefinition.coi.channel.Channel;
import org.apache.commons.lang3.tuple.Pair;

import java.time.Instant;
import java.util.Collection;

public class ConverterUtils {

  public static final String AFFILIATIONS_NOT_NULL = "Cannot build station groups from null affiliations.";
  public static final String BEAM_NOT_NULL = "Beam cannot be null.";
  public static final String CHANNELS_NOT_EMPTY = "Channels cannot be empty.";
  public static final String CHANNELS_BY_STATION_NOT_NULL = "Channels by station cannot be null.";
  public static final String CHANNEL_FUNC_NOT_NULL = "Channel Function must not be null.";
  public static final String CHANNEL_GROUPS_NOT_EMPTY = "ChannelGroups cannot be empty.";
  public static final String INSTRUMENTS_NOT_NULL = "Instruments cannot be null.";
  public static final String INSTRUMENT_WFDISC_MUST_NOT_BE_NULL = "Either instrument or wfdisc must not be null.";
  public static final String NETWORKS_NOT_NULL = "Cannot build station groups from null networks.";
  public static final String SENSORS_NOT_NULL = "Sensors cannot be null.";
  public static final String SITES_MUST_NOT_BE_NULL = "List of SitesDaos must not be null.";
  public static final String SITE_MUST_NOT_BE_NULL = "Site must not be null.";
  public static final String SITES_NOT_EMPTY = "List of SiteDaos cannot be empty.";
  public static final String SITE_CHAN_MUST_NOT_BE_NULL = "Site chan must not be null.";
  public static final String SITE_CHANS_MUST_NOT_BE_NULL = "List of SiteChanDaos must not be null.";
  public static final String SITE_CHANS_NOT_EMPTY = "List of SiteChanDaos cannot be empty.";
  public static final String STATIONS_NOT_NULL = "Cannot build with null stations.";
  public static final String STATION_GROUPS_NOT_NULL = "Cannot build station groups from null effective time.";
  public static final String WFDISC_NOT_NULL = "WfDiscDao cannot be null.";
  public static final String WFDISCS_NOT_NULL = "Wfdiscs cannot be null.";

  public static final String CHANNEL_EFFECTIVE_TIME_NOT_NULL = "Channel effective time not null.";
  public static final String CHANNEL_END_TIME_NOT_NULL = "Channel end time not null.";
  public static final String CHANNEL_START_END_TIME_STR = "Channel effective time %s must be before channel end time %s.";
  public static final String COULD_NOT_PARSE_CHANNEL_TYPES_FOR_SITE_CHAN_DAO = "Could not parse ChannelTypes for site chan dao";
  public static final String EFFECTIVE_AT_UNTIL_TIME_STR = "Effective time %s must be before effective until %s.";
  public static final String EFFECTIVE_TIME_STR = " For effective time %s";
  public static final String EFFECTIVE_TIME_NOT_NULL = "Effective time cannot be null.";
  public static final String EFFECTIVE_UNTIL_NOT_NULL = "Effective until cannot be null.";
  public static final String END_TIME_BEFORE_START_TIME_STR = "End time %s must not be before start time %s";
  public static final String END_TIME_NOT_NULL = "End time cannot null.";
  public static final String START_END_BOOLEANS_NOT_NULL = "Start and end booleans cannot be null.";
  public static final String START_END_TIME_STR = " For start and end times %s - %s";
  public static final String START_TIME_NOT_NULL = "Start time cannot be null.";
  public static final String TIME_RANGE_STR = " For time range %s";
  public static final String VERSION_END_STR = "Version end time cannot be null.";
  public static final String VERSION_START_STR = "Version start time cannot be null.";
  public static final String VERSION_RANGE_STR = " For version range %s";

  private ConverterUtils() {
  }

  /**
   * Called by a converter to determine if a Channel was updated by a response
   * or not. This is used to determine if the start/end times should be set to
   * 12:00:00/11:59:59
   *
   * @param channels
   * @param versionStartTime
   * @param versionEndTime
   *
   * @return
   */
  public static Pair<Boolean, Boolean> getUpdatedByResponse(Collection<Channel> channels, Instant versionStartTime,
    Instant versionEndTime) {
    var effectiveAtUpdatedByResponse = false;
    var effectiveUntilUpdatedByResponse = false;

    for (Channel channel : channels) {
      if (channel.getData().isEmpty()) {
        continue;
      }
      if (channel.getEffectiveAt().orElse(Instant.MIN).equals(versionStartTime)
        && channel.getEffectiveAtUpdatedByResponse().orElse(false)) {
        effectiveAtUpdatedByResponse = true;
      }
      if (channel.getEffectiveUntil().orElse(Instant.MAX).equals(versionEndTime)
        && channel.getEffectiveUntilUpdatedByResponse().orElse(false)) {
        effectiveUntilUpdatedByResponse = true;
      }
    }
    return Pair.of(effectiveAtUpdatedByResponse, effectiveUntilUpdatedByResponse);
  }
}
