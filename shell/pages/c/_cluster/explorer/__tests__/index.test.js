import Dashboard from '@shell/pages/c/_cluster/explorer/index.vue';

describe('page: cluster dashboard', () => {
  it('should render cpu limit', () => {
    const localThis = {
      currentCluster: {
        status: {
          allocatable: { cpu: '1' },
          limits:      { cpu: '500m' }
        }
      },
      t: jest.fn()
    };

    expect(Dashboard.computed.cpuLimit.call(localThis)).toStrictEqual({
      total: 1, useful: 0.5, units: undefined
    });
  });

  it('should render cpu limit to NaN', () => {
    const localThis = {
      currentCluster: {
        status: {
          allocatable: {},
          limits:      {}
        }
      },
      t: jest.fn()
    };

    expect(Dashboard.computed.cpuLimit.call(localThis)).toStrictEqual({
      total: NaN, useful: NaN, units: undefined
    });
  });

  it('should render ram limit', () => {
    const localThis = {
      currentCluster: {
        status: {
          allocatable: { memory: '10Mi' },
          limits:      { memory: '512Ki' }
        }
      },
      t: jest.fn()
    };

    expect(Dashboard.computed.ramLimit.call(localThis)).toStrictEqual({
      total: 10, useful: 0.5, units: 'MiB'
    });
  });

  it('should render ram limit to 0', () => {
    const localThis = {
      currentCluster: {
        status: {
          allocatable: {},
          limits:      {}
        }
      },
      t: jest.fn()
    };

    expect(Dashboard.computed.ramLimit.call(localThis)).toStrictEqual({
      total: 0, useful: 0, units: 'iB'
    });
  });
});
