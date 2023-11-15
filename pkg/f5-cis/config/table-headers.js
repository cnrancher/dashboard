export const HOST = {
  name:     'host',
  labelKey: 'tableHeaders.host',
  value:    '$.spec.host',
  sort:     ['.spec.host']
};

export const TLS_PROFILE_NAME = {
  name:     'tlsProfileName',
  labelKey: 'f5cis.tableHeaders.tlsProfileName',
  value:    '$.spec.host',
  sort:     ['.spec.host']
};

export const HTTP_TRAFFIC = {
  name:     'httpTraffic',
  labelKey: 'f5cis.tableHeaders.httpTraffic',
  value:    '$.spec.httpTraffic',
  sort:     ['.spec.httpTraffic']
};

export const IP_ADDRESS = {
  name:     'ipAddress',
  labelKey: 'tableHeaders.ipAddress',
  value:    '$.spec.ipAddress',
  sort:     ['.spec.ipAddress']
};

export const IPAM_LABEL = {
  name:     'ipamLabel',
  labelKey: 'f5cis.tableHeaders.ipamLabel',
  value:    '$.spec.ipamLabel',
  sort:     ['.spec.ipamLabel']
};

export const IPAMVS_LABEL = {
  name:     'IPAMVSAddress',
  labelKey: 'f5cis.tableHeaders.IPAMVSAddress',
  value:    '$.status.vsAddress',
  sort:     ['.status.vsAddress']
};

export const VIRTUAL_SERVER_ADDRESS = {
  name:     'virtualServerAddress',
  labelKey: 'f5cis.tableHeaders.virtualServerAddress',
  value:    '$.spec.virtualServerAddress',
  sort:     ['.spec.virtualServerAddress']
};
export const VIRTUAL_SERVER_PORT = {
  name:     'virtualServerPort',
  labelKey: 'f5cis.tableHeaders.virtualServerPort',
  value:    '$.spec.virtualServerPort',
  sort:     ['.spec.virtualServerPort']
};
export const POOL = {
  name:     'pool',
  labelKey: 'f5cis.tableHeaders.pool',
  value:    '$.spec.pool.service',
  sort:     ['.spec.pool.service']
};
export const POOL_PORT = {
  name:     'poolPort',
  labelKey: 'f5cis.tableHeaders.poolPort',
  value:    '$.spec.pool.servicePort',
  sort:     ['.spec.pool.servicePort']
};
export const DOMAIN_NAME = {
  name:     'domainName',
  labelKey: 'f5cis.tableHeaders.domainName',
  value:    '$.spec.domainName',
  sort:     ['.spec.domainName']
};

export const CREATED_ON = {
  name:     'createdOn',
  labelKey: 'f5cis.tableHeaders.createdOn',
  value:    '$.metadata.creationTimestamp',
  sort:     ['.metadata.creationTimestamp']
};

export const STATUS = {
  name:     'status',
  labelKey: 'tableHeaders.status',
  value:    '$.status.status',
  sort:     ['.status.status'],
  width:    175
};
