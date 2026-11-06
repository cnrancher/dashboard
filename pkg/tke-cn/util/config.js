const CONTAINER = [{
  label: 'containerd',
  value: 'containerd',
}];

const CLUSTER_TYPES = [
  {
    label: 'tkeCn.clusterType.independent',
    value: 'INDEPENDENT_CLUSTER'
  },
  {
    label: 'tkeCn.clusterType.managed',
    value: 'MANAGED_CLUSTER'
  },
];

const DEFAULTTKECONFIG = {
  clusterCidr:             '',
  serviceCidr:             '',
  clusterVersion:          null,
  networkType:             'GR',
  internetMaxBandwidthOut: 10,
  description:             null,
  name:                    null,
  region:                  'ap-guangzhou',
  vpcId:                   null,
  zoneId:                  null,
  subnetId:                null,
  domain:                  null,
  securityGroup:           null,
  instanceType:            null,
  bandwidthType:           'TRAFFIC_POSTPAID_BY_HOUR',
  bandwidth:               10,
  keyId:                   null,
  keyPair:                 '',
  clusterType:             'MANAGED_CLUSTER',
  clusterLevel:            'L5',
  systemDiskSize:          20,
  dataDiskSize:            0,
  ecsCount:                3,
  maxNodePodNum:           64,
  maxClusterServiceNum:    1024,
  container:               'containerd',
  ipvs:                    false,
  component:               JSON.stringify([{
    addonName:  'CBS',
    addonParam: '{"kind":"App","spec":{"chart":{"chartName":"cbs","chartVersion":"1.0.9"},"values":{"values":[],"rawValues":"e30=","rawValuesType":"json"}}}'
  }]),
  clusterEndpoint:    true,
  deletionProtection: true
};

const DEFAULT_NODE_GROUP_CONFIG = {
  nodePoolName:   'default-nodepool',
  systemDiskSize: 60,
  instanceNum:    3,
  bandwidth:      50,
  bandwidthType:  'TRAFFIC_POSTPAID_BY_HOUR',
  systemDiskType: '',
  dataDisks:      [
    {
      diskType: '',
      diskSize: 0,
    }
  ],
  osName:             '',
  subnetId:           [],
  keyPair:            '',
  instanceType:       '',
  securityGroup:      '',
  publicIpAssigned:   true,
  type:               'nodePool',
  nodePoolType:       'super',
  userScript:         '',
  deletionProtection: true,
  isNew:              true,
  virtualNodePool:    {
    securityGroupIds: [],
    subnetIds:        [],
    labels:           [],
    taints:           [],
    virtualNodes:     [
      {
        displayName: '',
        subnetId:    '',
        tags:        [],
      }
    ],
    deletionProtection: true,
    os:                 'linux',
  }
};

const OS_IMAGE = [
  {
    Alias:           'TencentOS Server 2.4 (TK4) HCC',
    ImageId:         'img-nannz3uj',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4(tkernel4)x86_64_HCC',
    SeriesName:      'TencentOS Server 2.4 (TK4) HCC',
    Status:          'online'
  },
  {
    Alias:           'TencentOS Server 3.1 (TK4)',
    ImageId:         'img-eb30mz89',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux3.1x86_64',
    SeriesName:      'TencentOS Server 3.1 (TK4)',
    Status:          'online'
  },
  {
    Alias:           'TencentOS Server 4 for x86_64',
    ImageId:         'img-6n21msk1',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux4_x86_64_public',
    SeriesName:      'TencentOS Server 4 for x86_64',
    Status:          'online'
  },
  {
    Alias:           'Ubuntu Server 22.04 LTS 64位',
    ImageId:         'img-487zeit5',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu22.04x86_64',
    SeriesName:      'ubuntu22.04x86_64',
    Status:          'online'
  },
  {
    Alias:           'CentOS 7.2 64bit',
    ImageId:         'img-rkiynh11',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.2x86_64',
    SeriesName:      'centos7.2x86_64',
    Status:          'online'
  },
  {
    Alias:           'CentOS 7.6 64bit',
    ImageId:         'img-9qabwvbn',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.6.0_x64',
    SeriesName:      'centos7.6.0_x64',
    Status:          'online'
  },
  {
    Alias:           'CentOS 7.6 64bit Optimized',
    ImageId:         'img-cgndmknl',
    OsCustomizeType: 'DOCKER_CUSTOMIZE',
    OsName:          'centos7.6.0_x64',
    SeriesName:      'centos7.6.0_x64_tkernel',
    Status:          'offline'
  },
  {
    Alias:           'TencentOS Server 2.4',
    ImageId:         'img-hdt9xxkt',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4x86_64',
    SeriesName:      'TencentOS Server 2.4',
    Status:          'online'
  },
  {
    Alias:           'TencentOS Server 2.4 for arm64（TK4）',
    ImageId:         'img-ieb3k16j',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4(tkernel4)arm_64',
    SeriesName:      'TencentOS Server 2.4 for arm64（TK4）',
    Status:          'online'
  },
  {
    Alias:           'Ubuntu Server 16.04.1 LTS 64bit',
    ImageId:         'img-4wpaazux',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu16.04.1 LTSx86_64',
    SeriesName:      'ubuntu16.04.1 LTSx86_64',
    Status:          'online'
  },
  {
    Alias:           'Ubuntu Server 18.04.1 LTS 64bit',
    ImageId:         'img-pi0ii46r',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu18.04.1x86_64',
    SeriesName:      'ubuntu18.04.1x86_64',
    Status:          'online'
  },
  {
    Alias:           'Ubuntu Server 18.04.1 LTS 64bit Optimized',
    ImageId:         'img-8f4a3ri5',
    OsCustomizeType: 'DOCKER_CUSTOMIZE',
    OsName:          'ubuntu18.04.1x86_64',
    SeriesName:      'ubuntu18.04.1x86_64_tkernel',
    Status:          'offline'
  },
  {
    Alias:           'CentOS 7.8 64bit',
    ImageId:         'img-3la7wgnt',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos7.8.0_x64',
    SeriesName:      'centos7.8.0_x64',
    Status:          'online'
  },
  {
    Alias:           'CentOS 8.0 64bit',
    ImageId:         'img-25szkc8t',
    OsCustomizeType: 'GENERAL',
    OsName:          'centos8.0x86_64',
    SeriesName:      'centos8.0x86_64',
    Status:          'online'
  },
  {
    Alias:           'Ubuntu Server 20.04.1 LTS 64bit',
    ImageId:         'img-22trbn9x',
    OsCustomizeType: 'GENERAL',
    OsName:          'ubuntu20.04x86_64',
    SeriesName:      'ubuntu20.04x86_64',
    Status:          'online'
  },
  {
    Alias:           'TencentOS Server 2.4 (TK4)',
    ImageId:         'img-9axl1k53',
    OsCustomizeType: 'GENERAL',
    OsName:          'tlinux2.4(tkernel4)x86_64',
    SeriesName:      'TencentOS Server 2.4 (TK4)',
    Status:          'online'
  },
  {
    Alias:           'RedHat Enterprise Linux 7.9 64位',
    ImageId:         'img-0qhxz7dl',
    OsCustomizeType: 'GENERAL',
    OsName:          'redhat7.9x86_64',
    SeriesName:      'RedHat Enterprise Linux 7.9 64位',
    Status:          'online'
  },
  {
    Alias:           'RedHat Enterprise Linux 8.6 64位',
    ImageId:         'img-kp3mv36j',
    OsCustomizeType: 'GENERAL',
    OsName:          'redhat8.6x86_64',
    SeriesName:      'RedHat Enterprise Linux 8.6 64位',
    Status:          'online'
  }
];

const CURRENTDISK = [
  {
    DiskType:    'CLOUD_BASIC',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_PREMIUM',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_SSD',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_HSSD',
    DiskUsage:   'DATA_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_BASIC',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_PREMIUM',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_SSD',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
  {
    DiskType:    'CLOUD_HSSD',
    DiskUsage:   'SYSTEM_DISK',
    MaxDiskSize: 32000,
    MinDiskSize: 20
  },
];

const BAND_WIDTH = [
  {
    label: 'tkeCn.bandwidthType.bandwidth',
    value: 'BANDWIDTH_POSTPAID_BY_HOUR'
  },
  {
    label: 'tkeCn.bandwidthType.traffic',
    value: 'TRAFFIC_POSTPAID_BY_HOUR'
  }
];

const CSI_ADDON_MAP = {
  CBS: {
    addonName:    'CBS',
    chartName:    'cbs',
    chartVersion: '1.1.12',
  },
  COS: {
    addonName:    'COS',
    chartName:    'cos',
    chartVersion: '1.0.11',
  },
  CFSTurbo: {
    addonName:    'CFSTurbo',
    chartName:    'cfsturbo',
    chartVersion: '1.0.4',
  },
  CFS: {
    addonName:    'CFS',
    chartName:    'cfs',
    chartVersion: '1.1.9',
  },
};

export const INSTANCE_FAMILY_CATEGORY_MAP = {
  // 标准型
  S1:    'standard',
  S2:    'standard',
  S2ne:  'standard',
  S3:    'standard',
  S3ne:  'standard',
  S4:    'standard',
  S4m:   'standard',
  S5:    'standard',
  S5se:  'standard',
  S5t:   'standard',
  S6:    'standard',
  S6t:   'standard',
  SA1:   'standard',
  SA2:   'standard',
  SA2a:  'standard',
  SA3:   'standard',
  SK1:   'standard',
  SN3ne: 'standard',
  SR1:   'standard',
  SW3a:  'standard',
  SW3b:  'standard',
  SW3ne: 'standard',
  SA4:   'standard',
  SA5:   'standard',
  S8:    'standard',
  SA9:   'standard',
  S9:    'standard',
  SA9e:  'standard',
  S9e:   'standard',
  S9pro: 'standard',

  // 尊享型
  RS2t: 'premium',
  RS3t: 'premium',
  RS4t: 'premium',
  RS5t: 'premium',

  // 计算型
  C2:  'compute',
  C3:  'compute',
  C4:  'compute',
  C5:  'compute',
  C6:  'compute',
  TC3: 'compute',
  CN3: 'compute',

  // 高I/O型
  I1:   'highio',
  I2:   'highio',
  I3:   'highio',
  I6t:  'highio',
  IT2:  'highio',
  IT3:  'highio',
  IT3a: 'highio',
  IT3b: 'highio',
  IT3c: 'highio',
  IT5:  'highio',
  ITA5: 'highio',

  // 内存型
  M1:   'memory',
  M2:   'memory',
  M3:   'memory',
  M4:   'memory',
  M5:   'memory',
  M6:   'memory',
  M8:   'memory',
  M6ce: 'memory',
  M6mp: 'memory',
  M6p:  'memory',
  MA2:  'memory',
  MA3:  'memory',
  MA4:  'memory',
  MA5:  'memory',
  MA9:  'memory',
  M9:   'memory',
  MA9e: 'memory',

  // 高性能型
  HCCG5v:     'highPerformance',
  HCCIC5:     'highPerformance',
  HCCPNV4h:   'highPerformance',
  HCCTG5v:    'highPerformance',
  HCCPNV4sne: 'highPerformance',
  HCCPNV4sn:  'highPerformance',
  HCCPNV5v:   'highPerformance',
  HCCPNV5vp:  'highPerformance',
  HCCPNV5:    'highPerformance',
  HCCPNV5x:   'highPerformance',
  HCCPNV6:    'highPerformance',

  // GPU 机型
  GI1:    'gpu',
  GI3X:   'gpu',
  GN10S:  'gpu',
  GN10X:  'gpu',
  GN10Xp: 'gpu',
  GN6:    'gpu',
  GN6S:   'gpu',
  GN7:    'gpu',
  GN8:    'gpu',
  GNV4:   'gpu',
  GT4:    'gpu',
  PNV4:   'gpu',
  PNV4ne: 'gpu',
  PNV5:   'gpu',
  GC49:   'gpu',
  PNV5b:  'gpu',
  PNV5i:  'gpu',
  PNV6:   'gpu',

  // 大数据型
  D1: 'bigData',
  D2: 'bigData',
  D3: 'bigData',

  // 裸金属
  BMD2:      'bareMetal',
  BMD3:      'bareMetal',
  BMD3c:     'bareMetal',
  BMD3s:     'bareMetal',
  BMDA2:     'bareMetal',
  BMI5:      'bareMetal',
  BMIA2:     'bareMetal',
  BMIA2m:    'bareMetal',
  BMM5r:     'bareMetal',
  BMS4:      'bareMetal',
  BMSA2:     'bareMetal',
  BMSC4:     'bareMetal',
  BMM6i:     'bareMetal',
  BMTGC39me: 'bareMetal',
  BMGC39me:  'bareMetal',
  BMG5e:     'bareMetal',
  BMG5n:     'bareMetal',
  BMG5i:     'bareMetal',
  BMG5t:     'bareMetal',
  BMGY5:     'bareMetal',
  BMGNV4:    'bareMetal',
  BMSA3:     'bareMetal',
  BMIA3:     'bareMetal',
  BMS5:      'bareMetal',

  // 蜂驰型
  BF1: 'beeFast',

  // 其他
  CHC:   'other',
  CN10X: 'other',
  BC1:   'other',
  BF:    'other',
  CH2:   'other',
};

const CLUSTER_CIDR_CANDIDATES = [
  '10.42.0.0/16',
  '10.43.0.0/16',
  '10.44.0.0/16',
  '10.45.0.0/16',
  '10.46.0.0/16',
  '10.47.0.0/16',
  '10.48.0.0/16',
  '10.49.0.0/16',
  '172.16.0.0/16',
  '172.17.0.0/16',
  '172.18.0.0/16',
  '172.19.0.0/16',
  '172.20.0.0/16',
  '172.21.0.0/16',
  '172.22.0.0/16',
  '172.23.0.0/16',
  '192.168.0.0/16',
];

const SERVICE_CIDR_CANDIDATES = [
  '10.96.0.0/24',
  '10.97.0.0/24',
  '10.98.0.0/24',
  '10.99.0.0/24',
  '10.100.0.0/24',
  '10.101.0.0/24',
  '10.102.0.0/24',
  '10.103.0.0/24',
  '10.104.0.0/24',
  '10.105.0.0/24',
  '10.106.0.0/24',
  '10.107.0.0/24',
  '10.108.0.0/24',
  '10.109.0.0/24',
  '10.110.0.0/24',
  '10.111.0.0/24',
];

export default {
  CONTAINER,
  DEFAULTTKECONFIG,
  CLUSTER_TYPES,
  OS_IMAGE,
  DEFAULT_NODE_GROUP_CONFIG,
  CURRENTDISK,
  BAND_WIDTH,
  CSI_ADDON_MAP,
  CLUSTER_CIDR_CANDIDATES,
  SERVICE_CIDR_CANDIDATES,
};
