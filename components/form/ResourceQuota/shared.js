export const RANCHER_TYPES = [
  {
    value:           'limitsCpu',
    inputExponent:  -1,
    baseUnitKey:    'suffix.cpus',
    labelKey:       'resourceQuota.limitsCpu',
    placeholderKey: 'resourceQuota.projectLimit.cpuPlaceholder'
  },
  {
    value:           'requestsCpu',
    inputExponent:  -1,
    baseUnitKey:    'suffix.cpus',
    labelKey:       'resourceQuota.requestsCpu',
    placeholderKey: 'resourceQuota.projectLimit.cpuPlaceholder'
  },
  {
    value:           'limitsMemory',
    inputExponent:  2,
    increment:      1024,
    labelKey:       'resourceQuota.limitsMemory',
    placeholderKey: 'resourceQuota.projectLimit.memoryPlaceholder'
  },
  {
    value:           'requestsMemory',
    inputExponent:  2,
    increment:      1024,
    labelKey:       'resourceQuota.requestsMemory',
    placeholderKey: 'resourceQuota.projectLimit.memoryPlaceholder'
  },
  {
    value:           'requestsStorage',
    units:          'storage',
    inputExponent:  3,
    increment:      1024,
    labelKey:       'resourceQuota.requestsStorage',
    placeholderKey: 'resourceQuota.projectLimit.storagePlaceholder'
  },
  {
    value:           'servicesLoadBalancers',
    units:          'unitless',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.servicesLoadBalancers',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'servicesNodePorts',
    units:          'unitless',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.servicesNodePorts',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'pods',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.pods',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'services',
    units:          'unitless',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.services',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:          'configMaps',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.configMaps',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'persistentVolumeClaims',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.persistentVolumeClaims',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'replicationControllers',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.replicationControllers',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'secrets',
    units:          'unitless',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.secrets',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'requestsGpuMemory',
    units:          'unitless',
    inputExponent:  0,
    baseUnit:       '',
    suffix:         'GiB',
    labelKey:       'resourceQuota.requestsGpuMemory',
    placeholderKey: 'resourceQuota.projectLimit.storagePlaceholder'
  },
  {
    value:           'requestsGpuCount',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.requestsGpuCount',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },
  {
    value:           'requestsStorageClassStorage',
    units:          'storage',
    inputExponent:  3,
    increment:      1024,
    labelKey:       'resourceQuota.requestsStorageClassStorage',
    placeholderKey: 'resourceQuota.projectLimit.storagePlaceholder'
  },
  {
    value:           'requestsStorageClassPVC',
    inputExponent:  0,
    baseUnit:       '',
    labelKey:       'resourceQuota.requestsStorageClassPVC',
    placeholderKey: 'resourceQuota.projectLimit.unitlessPlaceholder'
  },

];

export const HARVESTER_TYPES = [
  {
    value:          'limitsCpu',
    inputExponent:  -1,
    baseUnitKey:    'suffix.cpus',
    labelKey:       'resourceQuota.limitsCpu',
    placeholderKey: 'resourceQuota.projectLimit.cpuPlaceholder'
  },
  {
    value:          'limitsMemory',
    inputExponent:  2,
    increment:      1024,
    labelKey:       'resourceQuota.limitsMemory',
    placeholderKey: 'resourceQuota.projectLimit.memoryPlaceholder'
  },
  {
    value:          'requestsCpu',
    inputExponent:  -1,
    baseUnitKey:    'suffix.cpus',
    labelKey:       'resourceQuota.requestsCpu',
    placeholderKey: 'resourceQuota.projectLimit.cpuPlaceholder'
  },
  {
    value:          'requestsMemory',
    inputExponent:  2,
    increment:      1024,
    labelKey:       'resourceQuota.requestsMemory',
    placeholderKey: 'resourceQuota.projectLimit.memoryPlaceholder'
  },
];

export const ROW_COMPUTED = {
  typeOption() {
    return this.types.find(type => type.value === this.type);
  }
};

export const QUOTA_COMPUTED = {
  mappedTypes() {
    return this.types
      .map(type => ({
        label:       this.t(type.labelKey),
        baseUnit:    type.baseUnitKey ? this.t(type.baseUnitKey) : undefined,
        placeholder: this.t(type.placeholderKey),
        ...type,
      }));
  }
};
