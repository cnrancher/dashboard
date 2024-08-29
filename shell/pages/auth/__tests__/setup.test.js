import setup from '@shell/pages/auth/setup.vue';
import AESEncrypt from '@shell/utils/aes-encrypt';
import PasswordStrength from '@shell/components/PasswordStrength.vue';
import { shallowMount } from '@vue/test-utils';

jest.mock('@shell/utils/aes-encrypt', () => {
  return {
    __esModule: true,
    default:    jest.fn()
  };
});
jest.mock('@shell/store/type-map', () => {
  return { applyProducts: jest.fn() };
});

jest.mock('@shell/utils/clipboard', () => {
  return { copyTextToClipboard: jest.fn(() => Promise.resolve({})) };
});

describe('page: auth/setup', () => {
  it('shold not encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'true' })) } } };

    setup.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledTimes(0);
  });
  it('shold encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'false' })) } } };

    setup.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledWith('test');
  });

  it('should call encryptPassword method', async() => {
    const encryptPasswordMock = jest.fn();

    const localThis = {
      disabledEncryption: { value: 'false' },
      mustChangePassword: true,
      passwordStrength:   3,
      isFirstLogin:       false,
      $store:             { dispatch: jest.fn(), getters: { 'management/byId': jest.fn() } },
      v3User:             {},
      encryptPassword:    encryptPasswordMock,
      done:               jest.fn(),
    };

    const btnCbMock = jest.fn();

    await setup.methods.save.call(localThis, btnCbMock);

    expect(encryptPasswordMock).toHaveBeenCalledTimes(2);
  });

  it('should contian PasswordStrength component', () => {
    const wrapper = shallowMount(setup, {
      data() {
        return {
          mustChangePassword: true,
          isFirstLogin:       true,
          errors:             [],
          eula:               false,
          mcmEnabled:         false,
          password:           '',
          confirm:            '',
          telemetry:          false,
          useRandom:          true,
          username:           'admin',
          haveCurrent:        false,
          current:            '',
          product:            '',
        };
      },
      mocks: { $route: { query: {} }, $fetchState: {} }
    });

    expect(wrapper.findComponent(PasswordStrength).exists()).toBe(true);
  });
});
