ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY bin ./fk-control-service/bin
COPY lib ./fk-control-service/lib

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001 

WORKDIR fk-control-service

CMD ["./bin/fk-control-service"]

HEALTHCHECK --interval=30s --start-period=180s --retries=10 \
    CMD curl -f localhost:8080/fk-control-sercice/alive || exit 1