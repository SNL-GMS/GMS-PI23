package gms.shared.frameworks.osd.dao.util;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Column;
import javax.persistence.Embeddable;

@Embeddable
public class TimePartitionKey implements Serializable {
	
	@Column(name = "id", nullable = false)
	private UUID id;

	@Column(name = "time", nullable = false)
	private Instant time;

	public TimePartitionKey(UUID id, Instant time) {
		this.id = id;
		this.time = time;
	}

	public TimePartitionKey() {
	}

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public Instant getTime() {
		return time;
	}

	public void setTime(Instant time) {
		this.time = time;
	}

	@Override
	public int hashCode() {
		int hash = 3;
		hash = 97 * hash + Objects.hashCode(this.id);
		hash = 97 * hash + Objects.hashCode(this.time);
		return hash;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj) {
			return true;
		}
		if (obj == null) {
			return false;
		}
		if (getClass() != obj.getClass()) {
			return false;
		}
		final TimePartitionKey other = (TimePartitionKey) obj;
		if (!Objects.equals(this.id, other.id)) {
			return false;
		}
		return Objects.equals(this.time, other.time);
	}


	
}
