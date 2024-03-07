package gms.shared.signaldetection.database.connector;

/**
 * Signal Detection Database Connector Types that initializes all individual
 * Signal Detection Database Connector Type classes
 */
public class SignalDetectionDatabaseConnectorTypes {

  private SignalDetectionDatabaseConnectorTypes() {
  }

  public static final AmplitudeDatabaseConnectorType AMPLITUDE_CONNECTOR_TYPE = new AmplitudeDatabaseConnectorType();

  public static final ArrivalDatabaseConnectorType ARRIVAL_CONNECTOR_TYPE = new ArrivalDatabaseConnectorType();

  public static final ArrivalDynParsIntDatabaseConnectorType ARRIVAL_DYN_PARS_INT_CONNECTOR_TYPE = new ArrivalDynParsIntDatabaseConnectorType();

  public static final AssocDatabaseConnectorType ASSOC_CONNECTOR_TYPE = new AssocDatabaseConnectorType();
}
