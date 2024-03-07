#!/bin/bash

# This script is run to set up etcd

set -eu

#-- Start etcd temporarily for configuration and loading
etcd &
etcdpid=$!

#-- Wait for etcd to fully initialize
until etcdctl endpoint health; do
    sleep 1
done

#-- Add 'root' user and enable authentication
etcdctl user add "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl auth enable

#-- Setup 'read-everything' and 'readwrite-everything' roles
etcdctl role add read-everything --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl role add readwrite-everything --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl role grant-permission --prefix read-everything read '' --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl role grant-permission --prefix readwrite-everything readwrite '' --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"

#-- Setup 'gmsadmin' user 
etcdctl user add "gmsadmin:19db5b2c5d508cbd4ac184e97c7df5dde0801772" --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl user grant-role gmsadmin readwrite-everything --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"

#-- Load configuration as 'gmsadmin'
gms-sysconfig --username gmsadmin --password "19db5b2c5d508cbd4ac184e97c7df5dde0801772" --endpoints localhost load /setup/config/system/gms-system-configuration.properties

#-- Setup 'gms' user
etcdctl --dial-timeout=6s user add "gms:b9b8715925cd1b6909f1bb1f3fc89c94b75ce13e" --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
etcdctl --dial-timeout=6s user grant-role gms read-everything --user "root:501ab59880e9bf6144bd28adaa93489a6366987f"
sleep 1

#-- Stop the now-configured etcd
kill ${etcdpid}


