# build bitnami kafka-exporter on ubi
ARG KAFKA_EXPORTER_IMAGE
ARG KAFKA_EXPORTER_TAG
ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
ARG PROJECT_NAME
FROM ${KAFKA_EXPORTER_IMAGE}:${KAFKA_EXPORTER_TAG} as kafkaexporter
FROM ${DOCKER_REGISTRY}/${PROJECT_NAME}/ubi:${DOCKER_IMAGE_TAG}

ARG BITNAMI_HOME=/opt/bitnami
ENV PATH="${BITNAMI_HOME}/kafka-exporter/bin:$PATH"

USER 0

# copy files out of kafka-exporter image into our ubi image
COPY --from=kafkaexporter ${BITNAMI_HOME} ${BITNAMI_HOME}

EXPOSE 9308
WORKDIR ${BITNAMI_HOME}/kafka-exporter/bin

# gms uid
USER 1001

ENTRYPOINT [ "kafka_exporter" ]