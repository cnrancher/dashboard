import { shallowMount } from '@vue/test-utils';
import KeyToPath from '@shell/edit/workload/storage/KeyToPath.vue';
describe('index.vue', () => {
  it('should render correctly with pod volume tips', () => {
    const t = jest.fn();

    shallowMount(KeyToPath, {
      propsData: {
        value: {
          secret: {
            items: [
              {
                key:  '',
                path: '',
                mode: null,
              }]
          }
        },
        savePvcHookName: 'test',
      },
      stubs: {
        LabeledInput: true, LabeledSelect: true, RadioGroup: { template: '<div><slot /></div>' }
      },
      mocks: { $store: { getters: { 'i18n/t': t } } },
    });

    expect(t).toHaveBeenCalledWith('workload.storage.keyToPath.path.tips', undefined);
  });
});
