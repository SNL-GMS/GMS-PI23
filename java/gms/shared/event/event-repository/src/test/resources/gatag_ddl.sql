CREATE SCHEMA IF NOT EXISTS GMS_GLOBAL AUTHORIZATION GMS_GLOBAL;

CREATE TABLE IF NOT EXISTS GMS_GLOBAL.GA_TAG
(
    OBJTYPE VARCHAR2(1),
    ID NUMBER(9),
    PROCESS_STATE VARCHAR2(20),
    LAT FLOAT(53),
    LON FLOAT(53),
    TIME FLOAT(53),
    EVID_REJECT NUMBER(9),
    AUTH VARCHAR2(15),
    LDDATE DATE,
    CONSTRAINT GA_TAG_PK PRIMARY KEY (ID)
);