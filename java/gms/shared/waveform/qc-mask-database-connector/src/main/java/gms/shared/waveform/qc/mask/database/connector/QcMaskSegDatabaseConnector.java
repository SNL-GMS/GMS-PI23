package gms.shared.waveform.qc.mask.database.connector;

import gms.shared.utilities.bridge.database.connector.DatabaseConnector;
import gms.shared.utilities.bridge.database.connector.EntityResultListFunction;
import gms.shared.waveform.qc.mask.dao.QcMaskSegDao;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.EntityManagerFactory;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Path;
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
public class QcMaskSegDatabaseConnector extends DatabaseConnector {

  private static final Logger logger = LoggerFactory.getLogger(QcMaskSegDatabaseConnector.class);

  private static final String QC_MASK_ID = "qcMaskId";
  private static final String QC_MASK_SEG_KEY = "qcMaskSegKey";

  static final String EMPTY_QC_MASK_ID = "Request for qcMaskSegDao must be given a list of qcMaskId's";
  static final String QCMASKSEG_ERROR = "QcMaskSeg by qcMaskIds exception";

  static final String QCMASKID_SIZE_MESSAGE = "qcMaskIds size = %s";

  @Autowired
  public QcMaskSegDatabaseConnector(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<QcMaskSegDao> findQcMaskSegDaos(Collection<Long> qcMaskIds) {
    Validate.notNull(qcMaskIds, EMPTY_QC_MASK_ID);

    var errorMessage = String.format(QCMASKID_SIZE_MESSAGE, qcMaskIds.size());

    if (qcMaskIds.isEmpty()) {
      logger.debug("Request for QcMaskDaos by qcMaskIds was given an empty list of ids");
      return new ArrayList<>();
    } else {
      return runPartitionedQuery(qcMaskIds, 250, partitionedQcMaskIds -> {
        EntityResultListFunction<QcMaskSegDao> delegateFunction = entityManager -> {

          var cb = entityManager.getCriteriaBuilder();
          CriteriaQuery<QcMaskSegDao> query = cb.createQuery(QcMaskSegDao.class);
          Root<QcMaskSegDao> fromQcMaskSeg = query.from(QcMaskSegDao.class);

          final Path<Object> idPath = fromQcMaskSeg.get(QC_MASK_SEG_KEY);
          query.select(fromQcMaskSeg);
          query.where(idPath.get(QC_MASK_ID).in(partitionedQcMaskIds));

          return entityManager
            .createQuery(query)
            .getResultList().stream()
            .distinct()
            .collect(Collectors.toList());
        };

        return runWithEntityManagerResultListFunction(delegateFunction,
          QCMASKSEG_ERROR, errorMessage);
      });
    }
  }
}
