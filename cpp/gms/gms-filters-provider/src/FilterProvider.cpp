#include "FilterProvider.hh"

LinearIIRFilterDescription FilterProvider::filterIIRDesign(LinearIIRFilterDescription linearIIRFilterDescription)
{
    LINEAR_IIR_FILTER_DESCRIPTION defStruct = LinearIIRFilterDescription::to_cstruct(&linearIIRFilterDescription);
    ::gms_filter_design_iir(&defStruct);
    return LinearIIRFilterDescription::from_cstruct(&defStruct);
};

FilterDefinition FilterProvider::filterCascadeDesign(FilterDefinition filterDefinition)
{
    FILTER_DEFINITION defStruct = FilterDefinition::to_cstruct(&filterDefinition);
    ::filter_cascade_design(&defStruct);
    return FilterDefinition::from_cstruct(&defStruct);
};

#if (__EMSCRIPTEN__)
emscripten::val FilterProvider::filterIIRApply(emscripten::val data, int indexOffset, int indexInc, LinearIIRFilterDescription linearIIRFilterDescription)
{
    std::vector<double> dataVector = emscripten::vecFromJSArray<double>(data);
    LINEAR_IIR_FILTER_DESCRIPTION defStruct = LinearIIRFilterDescription::to_cstruct(&linearIIRFilterDescription);
    ::gms_filter_apply(dataVector.data(), dataVector.size(), indexOffset, indexInc, &defStruct);
    return emscripten::val(emscripten::typed_memory_view(dataVector.size(), dataVector.data()));
};

emscripten::val FilterProvider::filterCascadeApply(FilterDefinition filterDefinition, emscripten::val data, int indexOffset, int indexInc)
{
    std::vector<double> dataVector = emscripten::vecFromJSArray<double>(data);
    FILTER_DEFINITION defStruct = FilterDefinition::to_cstruct(&filterDefinition);
    ::filter_cascade_apply(&defStruct, dataVector.data(), dataVector.size(), indexOffset, indexInc);
    return emscripten::val(emscripten::typed_memory_view(dataVector.size(), dataVector.data()));
};
#endif

extern "C"
{
    void cFilterIIRApply(LinearIIRFilterDescription *linearIIRFilterDescription, double *data, int sizeOfData, int indexOffset, int indexInc)
    {
        LINEAR_IIR_FILTER_DESCRIPTION defStruct = LinearIIRFilterDescription::to_cstruct(linearIIRFilterDescription);
        ::gms_filter_apply(data, sizeOfData, indexOffset, indexInc, &defStruct);
    }

    void cFilterCascadeApply(FilterDefinition *filterDefinition, double *data, int sizeOfData, int indexOffset, int indexInc)
    {
        FILTER_DEFINITION defStruct = FilterDefinition::to_cstruct(filterDefinition);
        ::filter_cascade_apply(&defStruct, data, sizeOfData, indexOffset, indexInc);
    }

    void cFilterApply(double *data, int sizeOfData, int indexOffset, int indexInc, int taper, int zeroPhase, double *sosNumerator, double *sosDenominator, int numberOfSos)
    {
        ::filter_apply(data, sizeOfData, indexOffset, indexInc, taper, zeroPhase, sosNumerator, sosDenominator, numberOfSos);
    };
}