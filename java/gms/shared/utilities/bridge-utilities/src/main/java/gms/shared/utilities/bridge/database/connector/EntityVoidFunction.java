package gms.shared.utilities.bridge.database.connector;

import javax.persistence.EntityManager;
import javax.persistence.RollbackException;

@FunctionalInterface
public interface EntityVoidFunction {
  public void apply(EntityManager entityManager) throws IllegalStateException, RollbackException;
}
