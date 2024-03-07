package gms.shared.fk.pluginregistry.fixtures;

import com.google.auto.service.AutoService;
import gms.shared.fk.pluginregistry.Plugin;

public interface IBar extends Plugin {
  
  long getBarValue();
  
}
