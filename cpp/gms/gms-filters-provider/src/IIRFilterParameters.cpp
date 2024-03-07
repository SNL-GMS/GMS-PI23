#include "IIRFilterParameters.hh"

IIRFilterParameters::IIRFilterParameters(std::vector<double> sosNumerator,
                                         std::vector<double> sosDenominator,
                                         std::vector<double> sosCoefficients,
                                         bool isDesigned,
                                         int numberOfSos,
                                         double groupDelay) : sosNumerator(sosNumerator),
                                                              sosDenominator(sosDenominator),
                                                              sosCoefficients(sosCoefficients),
                                                              isDesigned(isDesigned),
                                                              numberOfSos(numberOfSos),
                                                              groupDelay(groupDelay){};

IIRFilterParameters IIRFilterParameters::build(std::vector<double> sosNumerator,
                                               std::vector<double> sosDenominator,
                                               std::vector<double> sosCoefficients,
                                               bool isDesigned,
                                               int numberOfSos,
                                               double groupDelay)
{
  return IIRFilterParameters(sosNumerator, sosDenominator, sosCoefficients, isDesigned, numberOfSos, groupDelay);
};

#if (__EMSCRIPTEN__)
IIRFilterParameters IIRFilterParameters::build(emscripten::val sosNumerator,
                                               emscripten::val sosDenominator,
                                               emscripten::val sosCoefficients,
                                               bool isDesigned,
                                               int numberOfSos,
                                               double groupDelay)
{
  std::vector<double> sosNumeratorVector = emscripten::vecFromJSArray<double>(sosNumerator);
  std::vector<double> sosDenominatorVector = emscripten::vecFromJSArray<double>(sosDenominator);
  std::vector<double> sosCoefficientsVector = emscripten::vecFromJSArray<double>(sosCoefficients);

  const auto size{numberOfSos * 3};
  if (size != sosNumeratorVector.size() || size != sosDenominatorVector.size() && size != sosCoefficientsVector.size())
  {
    const auto errMsg{"Invalid size (length) for sosNumerator or sosDenominator or sosCoefficients " + std::to_string(size)};
    throw std::invalid_argument(errMsg);
  }

  return IIRFilterParameters(sosNumeratorVector, sosDenominatorVector, sosCoefficientsVector, isDesigned, numberOfSos, groupDelay);
};

emscripten::val IIRFilterParameters::getSosNumeratorAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosNumerator.size(), sosNumerator.data()));
}

emscripten::val IIRFilterParameters::getSosDenominatorAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosDenominator.size(), sosDenominator.data()));
}

emscripten::val IIRFilterParameters::getSosCoefficientsAsTypedArray()
{
  return emscripten::val(emscripten::typed_memory_view(sosCoefficients.size(), sosCoefficients.data()));
}

#endif

IIR_FILTER_PARAMETERS IIRFilterParameters::to_cstruct(IIRFilterParameters *ifp)
{
  IIR_FILTER_PARAMETERS defStruct;
  defStruct.group_delay = ifp->groupDelay;
  defStruct.is_designed = ifp->isDesigned;
  defStruct.num_sos = ifp->numberOfSos;

  // must copy due to fixed width C array lengths
  const auto size{ifp->numberOfSos * 3};
  for (int i{0}; i < size; i++)
  {
    defStruct.sos_numerator[i] = ifp->sosNumerator[i];
    defStruct.sos_denominator[i] = ifp->sosDenominator[i];
    defStruct.sos_coefficients[i] = ifp->sosCoefficients[i];
  }

  return defStruct;
};

IIRFilterParameters IIRFilterParameters::from_cstruct(IIR_FILTER_PARAMETERS *ifp)
{
  // can fit up to 2 filter "order" amounts into each SOS parameters.
  // if you divide order by 2 (round up), that is how many SOS sets you need.
  const auto size{ifp->num_sos * 3};
  std::vector<double> sosNumerator(ifp->sos_numerator, ifp->sos_numerator + size);
  std::vector<double> sosDenominator(ifp->sos_denominator, ifp->sos_denominator + size);
  std::vector<double> sosCoefficients(ifp->sos_coefficients, ifp->sos_coefficients + size);

  return IIRFilterParameters(sosNumerator, sosDenominator, sosCoefficients, ifp->is_designed, ifp->num_sos, ifp->group_delay);
};
