package gms.shared.stationdefinition.cache;

import gms.shared.frameworks.cache.utils.IgniteConnectionManager;
import gms.shared.frameworks.systemconfig.SystemConfig;
import javax.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import static gms.shared.stationdefinition.cache.util.StationDefinitionCacheFactory.VERSION_EFFECTIVE_TIME_CACHE;
import static gms.shared.stationdefinition.cache.util.StationDefinitionCacheFactory.VERSION_ENTITY_TIME_CACHE;

@Component("standardVersionCache")
public class StandardVersionCache extends VersionCache {

  public StandardVersionCache(SystemConfig systemConfig) {

    super(systemConfig, IgniteConnectionManager.getOrCreateCache(VERSION_EFFECTIVE_TIME_CACHE), IgniteConnectionManager.getOrCreateCache(VERSION_ENTITY_TIME_CACHE));
  }

  @Override
  @PostConstruct
  public void init() {
    super.init();
  }

}
