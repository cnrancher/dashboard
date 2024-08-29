import Navlink from '@shell/edit/ui.cattle.io.navlink.vue';
import { mount } from '@vue/test-utils';
import { _CREATE } from '@shell/config/query-params';

describe('navlink: support labels and iframe', () => {
  it('should have anno and labels', () => {
    const wrapper = mount(Navlink, {
      propsData: { mode: _CREATE, value: {} },
      mocks:     {
        $router: { currentRoute: {} },
        $route:  { query: {}, hash: '#labels' },
        $store:  {
          getters: {
            'cluster/all':         () => [],
            'i18n/exists':         (key) => key,
            currentStore:          () => 'cluster',
            'cluster/schemaFor':   () => ({ id: 'ui.cattle.io.navlink', name: 'navlink' }),
            'type-map/labelFor':   () => 'navlink',
            'type-map/optionsFor': () => {},
            'i18n/t':              (t) => t,
            currentProduct:        { name: 'explorer' }
          },
          dispatch: jest.fn()
        }
      }
    });

    const element = wrapper.find('[data-testid="Navlink-label-anno"]');

    expect(element.exists()).toBe(true);
  });

  it('support iframe target', () => {
    const wrapper = mount(Navlink, {
      propsData: { mode: _CREATE, value: {} },
      mocks:     {
        $router: { currentRoute: {} },
        $route:  { query: {}, hash: '#labels' },
        $store:  {
          getters: {
            'cluster/all':         () => [],
            'i18n/exists':         (key) => key,
            currentStore:          () => 'cluster',
            'cluster/schemaFor':   () => ({ id: 'ui.cattle.io.navlink', name: 'navlink' }),
            'type-map/labelFor':   () => 'navlink',
            'type-map/optionsFor': () => {},
            'i18n/t':              (t) => t,
            currentProduct:        { name: 'explorer' }
          },
          dispatch: jest.fn()
        }
      }
    });

    const iframe = wrapper.findAll('[value="_iframe"]');

    expect(iframe).toHaveLength(1);
  });
});
