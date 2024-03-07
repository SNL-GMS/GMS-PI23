NAME = postgres
SOURCE_IMAGE = $${IRONBANK_REGISTRY}/ironbank/opensource/postgres/postgresql12
SOURCE_TAG = $${POSTGRES_TAG}

BUILD_ARGS = --build-arg 'SOURCE_IMAGE=$(SOURCE_IMAGE)' \
             --build-arg 'SOURCE_TAG=$(SOURCE_TAG)$${UPSTREAM_TAG_SUFFIX}' \
             --build-arg 'UBI_RPM_URL=$${UBI_RPM_URL}' \
             --build-arg 'ALMALINUX_RPM_URL=$${ALMALINUX_RPM_URL}' \
             --build-arg 'EPEL_YUM_URL=$${EPEL_YUM_URL}' \
             --build-arg 'POSTGRESQL_RPM_URL=$${POSTGRESQL_RPM_URL}'

include $(shell CI-MAKE-CONFIG-PATH)/Makefile.docker
