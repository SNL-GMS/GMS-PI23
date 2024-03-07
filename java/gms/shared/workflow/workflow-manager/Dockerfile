ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY workflow-manager-bootjar.jar ./workflow-manager/workflow-manager-bootjar.jar
COPY ui-dev-processing-config ./workflow-manager/ui-dev-processing-config

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR workflow-manager

HEALTHCHECK --interval=30s --start-period=180s --retries=10 \
  CMD curl -f localhost:8080/workflow-manager-service/alive || exit 1

# Define default command.
CMD ["java", "-DIGNITE_QUIET=false", "-jar", "/opt/gms/workflow-manager/workflow-manager-bootjar.jar"]
