NAME = bitnami-kafka-exporter

BUILD_ARGS = --build-arg 'KAFKA_EXPORTER_IMAGE=$${CI_THIRD_PARTY_DOCKER_REGISTRY}/bitnami/kafka-exporter' \
             --build-arg 'KAFKA_EXPORTER_TAG=$${BITNAMI_KAFKA_EXPORTER_TAG}'

include $(shell CI-MAKE-CONFIG-PATH)/Makefile.docker
