import TopLevelMenu from '@shell/components/nav/TopLevelMenu.vue';
import { mount } from '@vue/test-utils';
import { CAPI, COUNT, MANAGEMENT } from '@shell/config/types';
import { nextTick } from 'vue';
import { PINNED_CLUSTERS } from '@shell/store/prefs';
/**
 * `clusters` doubles up as both mgmt and prov clusters (don't shoot the messenger)
 */
const generateStore = (clusters, settings = [{}]) => {
  return {
    getters: {
      'management/byId':              jest.fn(),
      'management/schemaFor':         () => ({}),
      'management/paginationEnabled': () => false,
      'i18n/t':                       jest.fn(),
      'features/get':                 jest.fn(),
      'prefs/theme':                  jest.fn(),
      defaultClusterId:               jest.fn(),
      clusterId:                      jest.fn(),
      'type-map/activeProducts':      [],
      'management/all':               (type) => {
        switch (type) {
        case CAPI.RANCHER_CLUSTER:
          return clusters;
        case MANAGEMENT.CLUSTER:
          return clusters;
        case COUNT:
          return [{ counts: { [MANAGEMENT.CLUSTER]: { summary: { count: clusters.length } } } }];
        case MANAGEMENT.SETTING:
          return settings;
        }
      },
      'prefs/get': (pref) => {
        if (pref === PINNED_CLUSTERS) {
          return [];
        }
      },
    },
    dispatch: (action, args) => {
      if (action === 'management/findAll' && args.type === CAPI.RANCHER_CLUSTER) {
        return clusters;
      }
    }
  };
};
const waitForIt = async() => {
  jest.advanceTimersByTime(1000); // Wait for debounced call to fetch updated cluster list
  await nextTick(); // Wait for changes to cluster list to trigger changes
};

describe('component: TopLevelMenu', () => {
  it('should contain harvester cluster', async() => {
    const clusters = [{
      isHarvester: true,
      name:        'whatever',
      id:          'harvester',
      mgmt:        { id: 'harvester' }
    }];
    const store = generateStore(clusters);
    const wrapper = mount(TopLevelMenu, {
      global: {
        mocks: {
          $route: {},
          $store: {
            ...store,
            gettters: {
              ...store.getters,
              'features/get': jest.fn(() => true),
            }
          },
        },

        stubs: ['BrandImage', 'router-link'],
      }
    });

    await waitForIt();
    const cluster = wrapper.find('[data-testid="top-level-menu-cluster-0"]');

    expect(cluster.exists()).toBe(true);
  });

  it('should not contain harvester cluster', async() => {
    const clusters = [{
      isHarvester: true,
      name:        'whatever',
      id:          'harvester',
      status:      { provider: 'harvester' }
    }];
    const store = generateStore(clusters);
    const wrapper = mount(TopLevelMenu, {
      global: {
        mocks: {
          $route: {},
          $store: {
            ...store,
            gettters: {
              ...store.getters,
              'features/get': jest.fn(() => false),
            }
          },
        },

        stubs: ['BrandImage', 'router-link'],
      }
    });

    await waitForIt();
    const cluster = wrapper.find('[data-testid="top-level-menu-cluster-0"]');

    expect(cluster.exists()).toBe(false);
  });
});
