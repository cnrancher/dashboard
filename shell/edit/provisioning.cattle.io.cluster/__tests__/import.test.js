import Import from '@shell/edit/provisioning.cattle.io.cluster/import.vue';
import PrivateRegistry from '@shell/edit/provisioning.cattle.io.cluster/PrivateRegistry.vue';
import { shallowMount } from '@vue/test-utils';
import { CAPI } from '@shell/config/types';
import CruResource from '@shell/components/CruResource';

describe('component: provisioning.cattle.io.cluster/import', () => {
  it('should contain PrivateRegistry component', () => {
    const wrapper = shallowMount(Import, {
      propsData: {
        mode:     'create',
        value:    {},
        provider: 'import'
      },
      computed: {
        hideDescriptions() {
          return [];
        }
      },
      mocks: {
        $fetchState: { pending: false },
        $store:      {
          getters: {
            'management/schemaFor': jest.fn(),
            'prefs/get':            jest.fn(),
            'features/get':         jest.fn()
          },
        },
      },
    });

    expect(wrapper.findComponent(PrivateRegistry).exists()).toBe(true);
  });

  it('should contain the correct cancel method', async() => {
    const wrapper = shallowMount(Import, {
      propsData: {
        mode:     'create',
        value:    {},
        provider: 'import'
      },
      computed: {
        hideDescriptions() {
          return [];
        }
      },
      mocks: {
        $fetchState: { pending: false },
        $router:     [],
        $route:      { params: { cluster: 'provisioning.cattle.io.cluster' } },
        $store:      {
          getters: {
            'management/schemaFor': jest.fn(),
            'prefs/get':            jest.fn(),
            'features/get':         jest.fn(),
            productId:              'provisioning.cattle.io.cluster'
          },
        },
      }
    });

    expect(wrapper.vm.cancel).toBeDefined();
    const cru = wrapper.findComponent(CruResource);

    expect(cru.exists()).toBe(true);
    expect(cru.props('cancelEvent')).toBe(true);
    cru.vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    const r = {
      name:   'c-cluster-product-resource',
      params: {
        cluster:  'provisioning.cattle.io.cluster',
        product:  'provisioning.cattle.io.cluster',
        resource: CAPI.RANCHER_CLUSTER,
      },
    };

    expect(wrapper.vm.$router[0]).toStrictEqual(r);
  });
});
