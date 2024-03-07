#
#  Dockerfile to make a configured ironbank postgres image for GMS.
#
ARG SOURCE_IMAGE
ARG SOURCE_TAG
FROM ${SOURCE_IMAGE}:${SOURCE_TAG}

ARG UBI_RPM_URL
ARG ALMALINUX_RPM_URL
ARG EPEL_YUM_URL
ARG POSTGRESQL_RPM_URL

ENV CONFIGDIR=/etc/postgresql
ENV POSTGRES_HOST_AUTH_METHOD="scram-sha-256"
ENV POSTGRES_INITDB_ARGS="--data-checksums -A --auth=scram-sha-256 --auth-host=scram-sha-256 --auth-local=scram-sha-256"
# set PGDATA to a subdir per the documentation regarding chmod issues
ENV PGDATA=/var/lib/postgresql/data/pgdata

USER 0

#Copy in our init scripts
COPY src/db-scripts/* /docker-entrypoint-initdb.d/
COPY src/gms-docker-entrypoint.sh /usr/local/bin/gms-docker-entrypoint.sh
COPY src/config-scripts/* /config-scripts/

# copy the configuration files
COPY src/postgresql.conf $CONFIGDIR/
COPY src/pg_hba.conf $CONFIGDIR/

COPY src/*.repo /etc/yum.repos.d/

RUN set -ex && \
    # remove the ironbank repo and replace with a gms version
    rm -f /etc/yum.repos.d/ironbank.repo && \
    # setup repos
    sed -i -e "s~#UBI_RPM_URL#~$UBI_RPM_URL~" /etc/yum.repos.d/ubi.repo && \
    sed -i -e "s~#ALMALINUX_RPM_URL#~$ALMALINUX_RPM_URL~" /etc/yum.repos.d/almalinux.repo && \
    sed -i -e "s~#EPEL_YUM_URL#~$EPEL_YUM_URL~" /etc/yum.repos.d/epel.repo && \
    sed -i -e "s~#POSTGRESQL_RPM_URL#~$POSTGRESQL_RPM_URL~" /etc/yum.repos.d/postgresql.repo && \
    # configure yum
    echo "skip_missing_names_on_install=0" >> /etc/yum.conf && \
    # disable docs, file digest
    echo "tsflags=nodocs,nocrypto" >> /etc/yum.conf && \
    echo "tsflags=nodocs,nocrypto" >> /etc/dnf.conf && \
    # disable package digest check
    echo "%_pkgverify_level none" > /etc/rpm/macros.verify && \
    #Add write permission for the custom entrypoint to perform sed
    chmod -R a+w /docker-entrypoint-initdb.d && \
    chmod -R a+w /config-scripts && \
    # install packages
    dnf install -y pg_cron_12 && \
    # clean up
    dnf clean all && \
    rm -rf /var/cache/dnf

# postgres uid
USER 26

ENTRYPOINT ["gms-docker-entrypoint.sh"]

# note: the config_file argument is set in gms-docker-entrypoint.sh
CMD ["postgres"]
