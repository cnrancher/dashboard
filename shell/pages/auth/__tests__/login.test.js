import login from '@shell/pages/auth/login.vue';
import AESEncrypt from '@shell/utils/aes-encrypt';

jest.mock('@shell/utils/aes-encrypt', () => {
  return {
    __esModule: true,
    default:    jest.fn()
  };
});
jest.mock('@shell/utils/clipboard', () => {
  return { copyTextToClipboard: jest.fn(() => Promise.resolve({})) };
});
describe('page: auth/login', () => {
  it('shold not encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'true' })) } } };

    login.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledTimes(0);
  });
  it('shold encrypt password', () => {
    const localThis = { $store: { getters: { 'management/byId': jest.fn(() => ({ value: 'false' })) } } };

    login.methods.encryptPassword.call(localThis, 'test');
    expect(AESEncrypt).toHaveBeenCalledWith('test');
  });

  it('should call encryptPassword method', async() => {
    const encryptPasswordMock = jest.fn();

    const localThis = {
      disabledEncryption: { value: 'false' },
      $store:             { dispatch: jest.fn() },
      $router:            {
        push:    jest.fn(),
        replace: jest.fn()
      },
      $cookies: {
        set:    jest.fn(),
        remove: jest.fn()
      },
      encryptPassword: encryptPasswordMock
    };

    const btnCbMock = jest.fn();

    await login.methods.loginLocal.call(localThis, btnCbMock);

    expect(encryptPasswordMock).toHaveBeenCalledTimes(1);
  });
});
