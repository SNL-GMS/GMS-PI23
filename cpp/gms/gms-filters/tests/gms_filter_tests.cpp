#include "gms_filter_tests.hh"

void GmsFilterTests::SetUp() {}

void GmsFilterTests::TearDown() {}

TEST(GmsFilterTests, Cascade_Filter_Test)
{
  TestParams testParams{};
  printf("RUNNING gms_filter_cascade_test - num_data = %d\n", testParams.num_data);

  /*****************************************
  **
  ** filter_design
  **
  */
  for (int i{0}; i < testParams.filter_definition->num_filter_descriptions; ++i)
  {
    printf("-------------------------\n");
    printf("design_model: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.design_model);
    printf("band_type: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.band_type);
    printf("low_freq: %f\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.cutoff_frequency_low);
    printf("high_freq: %f\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.cutoff_frequency_high);
    printf("filter_order: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.filter_order);
    printf("samp_rate: %f\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.sample_rate);
    printf("zero_phase: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.zero_phase);
    printf("taper: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.taper);
  }
  printf("-------------------------\n");
  printf("CALLING filter_cascade_design\n");

  filter_cascade_design(testParams.filter_definition);

  for (int i{0}; i < testParams.filter_definition->num_filter_descriptions; ++i)
  {
    printf("-------------------------\n");
    printf("is_designed: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.is_designed);
    printf("group_delay: %f\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.group_delay);
    printf("num_coefficients: %d\n", testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.num_sos);
    printf("sos_numerator:   ");
    for (int j{0}; j < testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.num_sos * 3; ++j)
      printf("%f ", testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.sos_numerator[j]);
    printf("\n");
    printf("sos_denominator: ");
    for (int j{0}; j < testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.num_sos * 3; ++j)
      printf("%f ", testParams.filter_definition->filter_description[i].linear_iir_filter_description.iir_filter_parameters.sos_denominator[j]);
    printf("\n");
  }
  printf("-------------------------\n");
  printf("remove_group_delay: %d\n", testParams.filter_definition->remove_group_delay);
  printf("composite group_delay: %f\n", testParams.filter_definition->cascaded_filters_parameters.group_delay);
  printf("composite is_designed: %d\n", testParams.filter_definition->is_designed);

  /*****************************************
  **
  ** filter_apply
  **
  */
  printf("CALLING filter_cascade_apply\n");

  // index_offset=0, index_inc=1
  filter_cascade_apply(testParams.filter_definition, testParams.data, testParams.num_data, 0, 1);

  printf("-------------------------\n");

  return;
}
