package gms.shared.stationdefinition.coi.channel;

import com.fasterxml.jackson.datatype.jsr310.ser.InstantSerializer;
import java.time.format.DateTimeFormatterBuilder;

//this serializer ensures a milisecond precision to match with typescript json
public class InstantSerializerWithMilliSecondPrecision extends InstantSerializer {

    public InstantSerializerWithMilliSecondPrecision() {
        super(InstantSerializer.INSTANCE, false, new DateTimeFormatterBuilder().appendInstant(3).toFormatter());
    }
}