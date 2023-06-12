import SelectOrCreateAuthSecret from '@shell/components/form/SelectOrCreateAuthSecret.vue';
import { base64Encode } from '@shell/utils/crypto';

describe('component: SelectOrCreateAuthSecret, computed: options', () => {
  it('should return anno display-name options', () => {
    const host = 'a.b.c:8080';
    const item = {
      id:        'id1',
      namespace: 'test',
      metadata:  { namespace: 'test', annotations: { 'display-name': base64Encode(host) } }
    };
    const localThis = {
      t:          t => t,
      allSecrets: [item]
    };

    const options = SelectOrCreateAuthSecret.computed.options.call(localThis);

    expect(options[options.length - 1]).toStrictEqual({
      label: `${ host } (${ item.subTypeDisplay }: ${ item.dataPreview })`,
      group: item.metadata.namespace,
      value: item.id,
    });
  });
});
