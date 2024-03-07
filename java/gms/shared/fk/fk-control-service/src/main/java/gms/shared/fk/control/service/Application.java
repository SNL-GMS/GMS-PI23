package gms.shared.fk.control.service;

import gms.shared.fk.control.FkControl;
import gms.shared.frameworks.control.ControlFactory;

public class Application {
  
  public static void main(String[] args) {
    ControlFactory.runService(FkControl.class);  
  }
  
}
