#ifndef GMSCFILTERS_GMS_FILTER_TESTS_H
#define GMSCFILTERS_GMS_FILTER_TESTS_H

#include <gtest/gtest.h>
#include "TestParams.hh"

extern "C"
{
#include <gms_filter.h>
}

class GmsFilterTests : public testing::TestWithParam<TestParams>
{
private:
    TestParams params;

public:
    void InitializeTestParams(TestParams *params);
    void SetUp() override;
    void TearDown() override;

    TestParams getGmsTestParams();
    void setGmsTestParams(TestParams param_value);
    ~GmsFilterTests()
    {
        delete (this->params.data);
    };
};

#endif // GMSCFILTERS_GMS_FILTER_TESTS_H
