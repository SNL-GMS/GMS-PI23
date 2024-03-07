package gms.shared.waveform.qc.mask.database.connector;

import gms.shared.waveform.qc.mask.dao.QcMaskSegDao;
import java.util.List;
import javax.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QcMaskSegDatabaseConnectorTest extends QcMaskDbTest<QcMaskSegDatabaseConnector> {

  @Override
  protected QcMaskSegDatabaseConnector getRepository(EntityManagerFactory entityManagerFactory) {
    return new QcMaskSegDatabaseConnector(entityManagerFactory);
  }

  @Test
  void missingQcMaskIdErrorTest() {
    assertErrorThrown(NullPointerException.class,
      QcMaskSegDatabaseConnector.EMPTY_QC_MASK_ID,
      () -> repository.findQcMaskSegDaos(null));
  }

  @Test
  void emptyQcMaskIdsTest() {
    List<QcMaskSegDao> qcMaskSegDaos = repository.findQcMaskSegDaos(List.of());

    assertTrue(qcMaskSegDaos.isEmpty());
  }

  @Test
  void retrieveSingleDaoTest() {
    List<QcMaskSegDao> qcMaskSegDaos = repository.findQcMaskSegDaos(List.of(1000000000208L));

    assertEquals(1, qcMaskSegDaos.size());
  }

  @Test
  void retrieveMultipleDaosTest() {
    List<QcMaskSegDao> qcMaskSegDaos = repository.findQcMaskSegDaos(List.of(1000000000209L));

    List<Long> startSampleList = List.of(20016L, 83606L);

    assertEquals(2, qcMaskSegDaos.size());
    qcMaskSegDaos.forEach(dao -> assertTrue(startSampleList.contains(dao.getQcMaskSegKey().getStartSample())));
  }
}
