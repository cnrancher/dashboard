import { shallowMount } from '@vue/test-utils';
import Logging from '@shell/chart/logging/index.vue';

describe('chart: Logging', () => {
  it('TKE provider set loggingOverlay1', async() => {
    const provider = '';
    const clusterType = 'tke';
    const wrapper = shallowMount(Logging, {
      propsData: { value: {} },
      computed:  {
        currentCluster() {
          return { status: { provider } };
        }
      }
    });

    wrapper.setData({ clusterType });
    await wrapper.vm.$nextTick();

    expect(wrapper.props().value.loggingOverlay.spec.fluentbit.extraVolumeMounts[0].source)
      .toBe('/var/lib/containerd');
  });

  it('TKE provider set loggingOverlay2', async() => {
    const provider = 'tke';
    const clusterType = 'tke';
    const wrapper = shallowMount(Logging, {
      propsData: { value: {} },
      computed:  {
        currentCluster() {
          return { status: { provider } };
        },
      }
    });

    wrapper.setData({ clusterType });
    await wrapper.vm.$nextTick();

    expect(wrapper.props().value.loggingOverlay.spec.fluentbit.extraVolumeMounts[0].source)
      .toBe('/var/lib/containerd');
  });

  it('TKE clusterType should be tke', () => {
    const provider = '';
    const wrapper = shallowMount(Logging, {
      propsData: { value: { loggingOverlay: { spec: { fluentbit: {} } } } },
      computed:  {
        currentCluster() {
          return { status: { provider } };
        },
      }
    });

    expect(wrapper.vm.clusterType)
      .toBe('tke');
  });

  it('TKE provider remove loggingOverlay1', async() => {
    const provider = 'tke';
    const wrapper = shallowMount(Logging, {
      propsData: { value: { loggingOverlay: { spec: { fluentbit: {} } } } },
      computed:  {
        currentCluster() {
          return { status: { provider } };
        },
      }
    });

    wrapper.setData({ clusterType: '' });
    await wrapper.vm.$nextTick();

    expect(JSON.stringify(wrapper.props().value.loggingOverlay))
      .toBe('{}');
  });

  it('TKE provider remove loggingOverlay2', async() => {
    const provider = '';
    const wrapper = shallowMount(Logging, {
      propsData: { value: { loggingOverlay: { spec: { fluentbit: {} } } } },
      computed:  {
        currentCluster() {
          return { status: { provider } };
        },
      }
    });

    wrapper.setData({ clusterType: '' });
    await wrapper.vm.$nextTick();

    expect(JSON.stringify(wrapper.props().value.loggingOverlay))
      .toBe('{}');
  });
});
