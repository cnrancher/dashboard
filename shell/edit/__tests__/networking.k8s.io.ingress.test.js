import { shallowMount } from '@vue/test-utils';
import RulePath from '@shell/edit/networking.k8s.io.ingress/RulePath.vue';

describe('edit: networking.k8s.io.ingress', () => {
  it('should set rule path to "/" if path not provided', () => {
    const wrapper = shallowMount(RulePath, {
      propsData: { value: {}, ingress: { serviceNamePath: 'service.name', servicePortPath: 'service.port.number' } },
      mocks:     { t: jest.fn(), $store: { getters: { 'i18n/t': jest.fn() } } }
    });

    expect(wrapper.props('value').path).toBe('/');
  });
  it('should set rule path to "/" if path is empty', () => {
    const wrapper = shallowMount(RulePath, {
      propsData: { value: { path: '' }, ingress: { serviceNamePath: 'service.name', servicePortPath: 'service.port.number' } },
      mocks:     { t: jest.fn(), $store: { getters: { 'i18n/t': jest.fn() } } }
    });

    expect(wrapper.props('value').path).toBe('/');
  });
  it('should return the correct rule path', () => {
    const wrapper = shallowMount(RulePath, {
      propsData: { value: { path: '/test' }, ingress: { serviceNamePath: 'service.name', servicePortPath: 'service.port.number' } },
      mocks:     { t: jest.fn(), $store: { getters: { 'i18n/t': jest.fn() } } }
    });

    expect(wrapper.props('value').path).toBe('/test');
  });
});
