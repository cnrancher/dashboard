export const CCE_CLUSTER_TYPES = {
  STANDARD_VPC:         'standard-vpc',
  STANDARD_OVERLAY:     'standard-overlay',
  TURBO_CLOUD_NATIVE_2: 'turbo-cloud-native-2',
};

export const CCE_OS_RULES = [
  {
    osName:                       'Huawei Cloud EulerOS 2.0',
    architectures:                ['x86', 'arm'],
    versions:                     ['v1.34', 'v1.35', 'v1.36'],
    supportedAboveListedVersions: true,
    supportedClusterTypes:        [
      CCE_CLUSTER_TYPES.STANDARD_VPC,
      CCE_CLUSTER_TYPES.STANDARD_OVERLAY,
      CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2,
    ],
  },
  {
    osName:                       'Ubuntu 22.04',
    architectures:                ['x86'],
    versions:                     ['v1.34', 'v1.35', 'v1.36'],
    supportedAboveListedVersions: true,
    supportedClusterTypes:        [
      CCE_CLUSTER_TYPES.STANDARD_VPC,
      CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2,
    ],
  },
  {
    osName:                       'Ubuntu 22.04.cgroup2',
    architectures:                ['x86'],
    versions:                     ['v1.35', 'v1.36'],
    supportedAboveListedVersions: true,
    supportedClusterTypes:        [
      CCE_CLUSTER_TYPES.STANDARD_VPC,
      CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2,
    ],
  },
  {
    osName:                 'EulerOS 2.9',
    architectures:          ['x86', 'arm'],
    versions:               ['v1.34'],
    unsupportedFromVersion: 'v1.35',
    supportedClusterTypes:  [
      CCE_CLUSTER_TYPES.STANDARD_VPC,
      CCE_CLUSTER_TYPES.STANDARD_OVERLAY,
      CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2,
    ],
  },
  {
    osName:                 'CentOS 7.6',
    architectures:          ['x86'],
    versions:               ['v1.34'],
    unsupportedFromVersion: 'v1.35',
    supportedClusterTypes:  [
      CCE_CLUSTER_TYPES.STANDARD_VPC,
      CCE_CLUSTER_TYPES.STANDARD_OVERLAY,
      CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2,
    ],
  },
];

function parseMinorVersion(version) {
  const match = String(version || '').match(/v?(\d+\.\d+)/);

  return match ? match[1] : null;
}

function compareVersion(a, b) {
  const pa = parseMinorVersion(a);
  const pb = parseMinorVersion(b);

  if (!pa || !pb) {
    return null;
  }

  const [majorA, minorA] = pa.split('.').map(Number);
  const [majorB, minorB] = pb.split('.').map(Number);

  if (majorA !== majorB) {
    return majorA - majorB;
  }

  return minorA - minorB;
}

export function getCceClusterType(cceConfig = {}) {
  if (cceConfig.category === 'Turbo') {
    return CCE_CLUSTER_TYPES.TURBO_CLOUD_NATIVE_2;
  }

  if (cceConfig.containerNetworkMode === 'overlay_l2') {
    return CCE_CLUSTER_TYPES.STANDARD_OVERLAY;
  }

  return CCE_CLUSTER_TYPES.STANDARD_VPC;
}

export function getFlavorArchitecture(flavorOption) {
  const raw = flavorOption?.raw || {};
  const specs = raw.os_extra_specs || {};
  const resourceType = String(specs['ecs:instance_architecture'] || '').toLowerCase();

  if (resourceType.includes('arm')) {
    return 'arm';
  }

  return 'x86';
}

function isVersionSupported(rule, clusterVersion) {
  if (rule.unsupportedFromVersion) {
    const cmp = compareVersion(clusterVersion, rule.unsupportedFromVersion);

    if (cmp !== null && cmp >= 0) {
      return false;
    }
  }

  const minor = parseMinorVersion(clusterVersion);

  if (!minor) {
    return false;
  }

  if (rule.versions.some((version) => parseMinorVersion(version) === minor)) {
    return true;
  }

  if (!rule.supportedAboveListedVersions || !rule.versions.length) {
    return false;
  }

  const maxListedVersion = rule.versions.reduce((max, version) => {
    const cmp = compareVersion(version, max);

    return cmp !== null && cmp > 0 ? version : max;
  }, rule.versions[0]);

  const cmpMax = compareVersion(clusterVersion, maxListedVersion);

  return cmpMax !== null && cmpMax > 0;
}

export function filterOperatingSystemOptions({
  osRules = CCE_OS_RULES,
  clusterVersion,
  architecture = 'x86',
  clusterType,
  currentOs,
}) {
  const options = osRules.filter((rule) => {
    return rule.architectures.includes(architecture) &&
      isVersionSupported(rule, clusterVersion) &&
      rule.supportedClusterTypes.includes(clusterType);
  }).map((rule) => ({
    label: rule.osName,
    value: rule.osName,
  }));

  if (currentOs && !options.some((item) => item.value === currentOs)) {
    options.push({
      label: currentOs,
      value: currentOs,
    });
  }

  return options;
}

export function getDefaultOperatingSystemValue({
  clusterVersion,
  flavorOption,
  cceConfig,
}) {
  const options = filterOperatingSystemOptions({
    clusterVersion,
    architecture: getFlavorArchitecture(flavorOption),
    clusterType:  getCceClusterType(cceConfig),
  });

  return options[0]?.value || '';
}

const CGROUP_V1_OS = new Set([
  'Huawei Cloud EulerOS 2.0',
  'Ubuntu 22.04',
  'EulerOS 2.9',
  'CentOS 7.6',
]);

export function getOperatingSystemWarningKey(clusterVersion, operatingSystem) {
  if (!clusterVersion || !operatingSystem) {
    return null;
  }

  const cmp135 = compareVersion(clusterVersion, 'v1.35');

  if (cmp135 !== null && cmp135 >= 0) {
    if (operatingSystem === 'Ubuntu 22.04.cgroup2') {
      return 'cceCn.operatingSystem.warning.cgroupV2Compatibility';
    }

    if (CGROUP_V1_OS.has(operatingSystem)) {
      return 'cceCn.operatingSystem.warning.cgroupV1SuggestCgroupV2';
    }

    return null;
  }

  if (cmp135 !== null && cmp135 < 0) {
    if (operatingSystem === 'EulerOS 2.9') {
      return 'cceCn.operatingSystem.warning.eulerOs29Eol';
    }

    if (operatingSystem === 'CentOS 7.6') {
      return 'cceCn.operatingSystem.warning.centOs76Eol';
    }
  }

  return null;
}
