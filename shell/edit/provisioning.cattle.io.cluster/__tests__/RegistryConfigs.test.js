import RegistryConfigs from '@shell/edit/provisioning.cattle.io.cluster/tabs/registries/RegistryConfigs.vue';

describe('component: RegistryConfigs, methods: generateName', () => {
  it('should return default generate name when empty hostname & empty registry hostname', () => {
    const row = [];
    const localThis = { registryHost: '' };

    expect(RegistryConfigs.methods.generateName.call(localThis, row)).toBe('');
  });

  it('should return row hostname1 generate name', () => {
    const row = { value: { hostname: 'a.a.a' } };
    const localThis = { registryHost: '' };

    expect(RegistryConfigs.methods.generateName.call(localThis, row)).toBe(row.value.hostname);
  });
  it('should return row hostname2 generate name', () => {
    const row = { value: { hostname: 'a.a.a' } };
    const localThis = { registryHost: 'b.b.b' };

    expect(RegistryConfigs.methods.generateName.call(localThis, row)).toBe(row.value.hostname);
  });
  it('should return registry hostname generate name', () => {
    const row = { value: { hostName: '' } };
    const localThis = { registryHost: 'b.b.b' };

    expect(RegistryConfigs.methods.generateName.call(localThis, row)).toBe(localThis.registryHost);
  });
});
