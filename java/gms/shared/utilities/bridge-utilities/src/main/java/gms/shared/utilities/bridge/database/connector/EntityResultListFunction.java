package gms.shared.utilities.bridge.database.connector;

import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;

/**
 * Entity manager function that returns a list of results
 * @param <T> output object type
 */
@FunctionalInterface
public interface EntityResultListFunction<T> {
  public List<T> apply(EntityManager entityManager) throws PersistenceException, 
    IllegalStateException, DatabaseConnectorException;
}
