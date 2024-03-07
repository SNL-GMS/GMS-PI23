package gms.shared.fk.control.api;

import gms.shared.frameworks.common.annotations.Component;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.FkSpectra;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import java.util.List;
import javax.ws.rs.Path;
import javax.ws.rs.POST;

@Component("fk-control")
@Path("/fk-control-service")
public interface FkControlInterface {

  @POST
  @Path("/spectra/interactive")
  @Operation(description = "Compute FK's per the given request and return them")
  List<ChannelSegment<FkSpectra>> handleRequest(
      @RequestBody(description = "The request")
          FkStreamingRequest request);

  
}
