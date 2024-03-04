import { shallowMount } from '@vue/test-utils';
import Index from '@shell/edit/workload/storage/index.vue';
describe('index.vue', () => {
  it('should render correctly with pod volume tips', () => {
    const t = jest.fn();

    shallowMount(Index, {
      propsData: {
        value:           {},
        savePvcHookName: 'test',
      },
      stubs: {
        ArrayListGrouped: true, ButtonDropdown: true, Mount: true, CodeMirror: true, Banner: { template: '<div><slot /></div>' }
      },
      mocks: { $store: { getters: { 'i18n/t': t } } },
    });

    expect(t.mock.calls[0][0]).toBe('workload.storage.podVolumeTips');
  });
});
