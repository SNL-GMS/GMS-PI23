package gms.shared.stationdefinition.cache;

import gms.shared.frameworks.cache.utils.IgniteConnectionManager;
import gms.shared.frameworks.systemconfig.SystemConfig;
import javax.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import static gms.shared.stationdefinition.cache.util.StationDefinitionCacheFactory.VERSION_ENTITY_TIME_DERIVED_CACHE;
import static gms.shared.stationdefinition.cache.util.StationDefinitionCacheFactory.VERSION_EFFECTIVE_TIME_DERIVED_CACHE;

@Component("derivedVersionCache")
public class DerivedChannelVersionCache extends VersionCache {

  public DerivedChannelVersionCache(SystemConfig systemConfig) {

    super(systemConfig, IgniteConnectionManager.getOrCreateCache(VERSION_EFFECTIVE_TIME_DERIVED_CACHE), IgniteConnectionManager.getOrCreateCache(VERSION_ENTITY_TIME_DERIVED_CACHE));
  }

  @Override
  @PostConstruct
  public void init() {
    super.init();
  }

}
