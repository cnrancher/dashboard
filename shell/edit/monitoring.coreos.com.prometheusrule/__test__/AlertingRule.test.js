import AlertingRule from '@shell/edit/monitoring.coreos.com.prometheusrule/AlertingRule.vue';
import { mount } from '@vue/test-utils';
import { _CREATE } from '@shell/config/query-params';
import ClientOnly from 'vue-client-only';

const labelPrefix = 'prometheusRule.alertingRules.labels.severity.choices';
const options = ['critical', 'warning', 'none'];

describe('prometheusrule severity options translation', () => {
  it('should support Chinese translation', () => {
    const wrapper = mount(AlertingRule, {
      propsData: {
        mode:  _CREATE,
        value: { labels: { severity: null }, expr: 'seteste' }
      },
      stubs: { ClientOnly },
      mocks: {
        $router: { currentRoute: {} },
        $route:  { query: {}, hash: '#labels' },
        $store:  {
          getters: {
            'cluster/all':         () => [],
            'i18n/exists':         key => key,
            currentStore:          () => 'cluster',
            'cluster/schemaFor':   () => ({ id: 'ui.cattle.io.navlink', name: 'navlink' }),
            'type-map/labelFor':   () => 'navlink',
            'type-map/optionsFor': () => {},
            'i18n/t':              t => t,
            currentProduct:        { name: 'explorer' }
          }
        }
      }
    });

    expect(wrapper.vm.severityOptions).toStrictEqual(options.map((item) => {
      return {
        value: item,
        label: `${ labelPrefix }.${ item }`
      };
    }));
  });
});
