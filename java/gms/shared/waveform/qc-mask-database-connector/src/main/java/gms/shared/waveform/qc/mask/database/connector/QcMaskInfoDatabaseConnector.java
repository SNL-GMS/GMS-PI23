package gms.shared.waveform.qc.mask.database.connector;

import gms.shared.stationdefinition.dao.css.SiteChanKey;
import gms.shared.utilities.bridge.database.connector.DatabaseConnector;
import gms.shared.utilities.bridge.database.connector.EntityResultListFunction;
import gms.shared.waveform.qc.mask.dao.QcMaskInfoDao;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.EntityManagerFactory;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.Validate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component
@Scope(BeanDefinition.SCOPE_PROTOTYPE)
public class QcMaskInfoDatabaseConnector extends DatabaseConnector {

  private static final Logger logger = LoggerFactory.getLogger(QcMaskInfoDatabaseConnector.class);

  private static final String STATION = "station";
  private static final String CHANNEL = "channel";
  private static final String TIME = "time";
  private static final String END_TIME = "endTime";

  static final String MISSING_START_TIME_ERROR = "Request for qcMaskInfo by time range must be given a start time";
  static final String MISSING_END_TIME_ERROR = "Request for qcMaskInfo by time range must be given a end time";
  static final String START_NOT_BEFORE_END_TIME_ERROR = "Start time has to be before end time";
  static final String EMPTY_SITECHANKEY_LIST_ERROR = "Request for qcMaskInfos must be given a list of station and channel names";
  static final String QCMASKINFO_ERROR = "QcMaskInfo exception";

  static final String TIME_RANGE_MESSAGE = "time range = %s - %s";

  @Autowired
  public QcMaskInfoDatabaseConnector(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<QcMaskInfoDao> findMaskInfoDaos(Collection<SiteChanKey> siteChanKeys,
    Instant startTime, Instant endTime) {

    Validate.notNull(siteChanKeys, EMPTY_SITECHANKEY_LIST_ERROR);
    Validate.notNull(startTime, MISSING_START_TIME_ERROR);
    Validate.notNull(endTime, MISSING_END_TIME_ERROR);
    Validate.isTrue(startTime.isBefore(endTime), START_NOT_BEFORE_END_TIME_ERROR);

    var errorMessage = String.format(TIME_RANGE_MESSAGE, startTime, endTime);

    if (siteChanKeys.isEmpty()) {
      logger.debug("Request for QCMASKINFO by siteChanKeys names was given an empty list of keys");
      return new ArrayList<>();
    } else {

      return runPartitionedQuery(siteChanKeys, 250, partitionedSiteChanKeys -> {
        EntityResultListFunction<QcMaskInfoDao> delegateFunction = entityManager -> {
          var cb = entityManager.getCriteriaBuilder();
          CriteriaQuery<QcMaskInfoDao> query = cb.createQuery(QcMaskInfoDao.class);
          Root<QcMaskInfoDao> fromQcMaskInfo = query.from(QcMaskInfoDao.class);

          List<String> partitionedStations = partitionedSiteChanKeys.stream()
            .map(SiteChanKey::getStationCode)
            .collect(Collectors.toList());
          
          List<String> partitionedChannels = partitionedSiteChanKeys.stream()
            .map(SiteChanKey::getChannelCode)
            .collect(Collectors.toList());

          query.select(fromQcMaskInfo);
          query.distinct(true);
          query.where(
            cb.and(
              fromQcMaskInfo.get(STATION).in(partitionedStations),
              fromQcMaskInfo.get(CHANNEL).in(partitionedChannels),
              cb.lessThanOrEqualTo(fromQcMaskInfo.get(TIME), startTime),
              cb.greaterThanOrEqualTo(fromQcMaskInfo.get(END_TIME), endTime)
            ));

          return entityManager.createQuery(query).getResultList();
        };

        return runWithEntityManagerResultListFunction(delegateFunction,
          QCMASKINFO_ERROR, errorMessage);
      });
    }
  }
}
