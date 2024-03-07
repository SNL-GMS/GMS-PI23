package gms.shared.utilities.bridge.database.connector;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;

/**
 * Entity manager function that returns a single result
 * @param <T> output object type
 */
@FunctionalInterface
public interface EntitySingleResultFunction<T> {
  public T apply(EntityManager entityManager) throws PersistenceException, 
    IllegalStateException, DatabaseConnectorException;
}