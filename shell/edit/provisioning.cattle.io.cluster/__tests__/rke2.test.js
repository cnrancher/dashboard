import { mount } from '@vue/test-utils';
import rke2 from '@shell/edit/provisioning.cattle.io.cluster/rke2.vue';
import CustomContainerdConfig from '@shell/edit/provisioning.cattle.io.cluster/CustomContainerdConfig.vue';

describe('component: rke2, computed: generateName', () => {
  it('should return default generate name when empty registry hostname', () => {
    const localThis = { registryHost: '' };

    expect(rke2.computed.generateName.call(localThis)).toBe('');
  });

  it('should return registry hostname generate name', () => {
    const localThis = { registryHost: 'a.a.a' };

    expect(rke2.computed.generateName.call(localThis)).toBe(localThis.registryHost);
  });

  describe('component: rke2, CustomContainerCongig', () => {
    it('should contain component CustomContainerdConfig', () => {
      const mockAgentArgs = { 'cloud-provider-name': { options: [], profile: { options: [{ anything: 'yes' }] } } };
      const value = {
        spec: {
          rkeConfig:         { etcd: { disableSnapshots: false } },
          chartValues:       {},
          kubernetesVersion: 'v1.25.0+rke2r1'
        },
        agentConfig: { 'cloud-provider-name': 'any' }
      };
      const wrapper = mount(rke2, {

        propsData: {
          mode:            'create',
          value,
          provider:        'custom',
          selectedVersion: { agentArgs: mockAgentArgs },
        },
        data:     () => ({ credentialId: 'I am authenticated' }),
        computed: {
          showForm() {
            return true;
          },
          versionOptions() {
            return [
              {
                id: 'v1.25.0+rke2r1', value: 'v1.25.0+rke2r1', serverArgs: {}, agentArgs: mockAgentArgs, charts: {}
              },
              {
                id: 'v1.24.0+rke2r1', value: 'v1.24.0+rke2r1', serverArgs: {}, agentArgs: mockAgentArgs, charts: {}
              },
              {
                id: 'v1.23.0+rke2r1', value: 'v1.23.0+rke2r1', serverArgs: {}, agentArgs: mockAgentArgs, charts: {}
              },
              {
                id: 'v1.25.0+k3s1', value: 'v1.25.0+k3s1', serverArgs: {}, agentArgs: mockAgentArgs, charts: {}
              },
              {
                id: 'v1.24.0+k3s1', value: 'v1.24.0+k3s1', serverArgs: {}, agentArgs: mockAgentArgs, charts: {}
              }
            ];
          },
          showk8s21LegacyWarning() {
            return false;
          }
        },
        stubs: {
          CruResource:              { template: '<div><slot></slot></div>' },
          Banner:                   true,
          LabeledSelect:            true,
          ACE:                      true,
          AgentEnv:                 true,
          AgentConfiguration:       true,
          ArrayList:                true,
          ArrayListGrouped:         true,
          BadgeState:               true,
          Checkbox:                 true,
          ClusterMembershipEditor:  true,
          DrainOptions:             true,
          LabeledInput:             true,
          Labels:                   true,
          Loading:                  true,
          MachinePool:              true,
          MatchExpressions:         true,
          NameNsDescription:        true,
          Questions:                true,
          RadioGroup:               true,
          RegistryConfigs:          true,
          RegistryMirrors:          true,
          S3Config:                 true,
          SelectCredential:         true,
          SelectOrCreateAuthSecret: true,
          Tab:                      { template: '<div><slot></slot></div>' },
          Tabbed:                   { template: '<div><slot></slot></div>' },
          UnitInput:                true,
          YamlEditor:               true,
          MemberRoles:              true,
          Basics:                   true
        },
        mocks: {
          $fetchState: { pending: false },
          $route:      {
            name:  'anything',
            query: { AS: 'yaml' },
          },
          $store: {
            getters: {
              currentStore:                     () => 'current_store',
              'management/schemaFor':           jest.fn(),
              'current_store/all':              jest.fn(),
              'i18n/t':                         jest.fn(),
              'i18n/withFallback':              jest.fn(),
              'plugins/cloudProviderForDriver': jest.fn()
            }
          }
        }

      });
      const c = wrapper.findComponent(CustomContainerdConfig);

      expect(c.exists()).toBe(true);
      expect(c.props('value')).toBe(value);
      expect(c.props('mode')).toBe('create');
    });
  });
});
