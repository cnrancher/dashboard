import { mount } from '@vue/test-utils';
import SelectIconGrid from '@shell/components/SelectIconGrid.vue';

const row = {
  isIframe:  true,
  iframeSrc: 'https://www.baidu.com',
  linkField: 'https://www.baidu.com',
};
const CLUSTER = 'local';

describe('component: SelectIconGrid.vue', () => {
  it('is iframe', () => {
    const routerPush = jest.fn((t) => t);
    const wrapper = mount(SelectIconGrid, {
      props:  { rows: [row] },
      global: {
        mocks: {
          $router: { push: routerPush },
          $route:  { params: { cluster: CLUSTER } },
          $store:  { getters: { 'prefs/get': () => 10 } }
        }
      }

    });

    const grid = wrapper.find('[data-testid="select-icon-grid-0"]');

    expect(grid.exists()).toBe(true);

    grid.trigger('click');

    expect(routerPush).toHaveBeenCalledWith({
      page:   'iframe',
      name:   'c-cluster-explorer-navLinks-page',
      params: { cluster: CLUSTER },
      query:  { link: row.iframeSrc }
    });
  });
});
