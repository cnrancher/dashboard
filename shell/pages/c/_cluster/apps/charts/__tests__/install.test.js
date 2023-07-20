import Install from '@shell/pages/c/_cluster/apps/charts/install.vue';
jest.mock('@shell/plugins/steve/web-worker.steve-sub-worker.js', () => {
  return () => {};
});

describe('page: apps/charts/install.vue', () => {
  it('should contain debug option in data options', () => {
    const localThis = { t: jest.fn(), $route: { query: '' } };

    expect(Install.data.call(localThis)).toHaveProperty('customCmdOpts.debug', false);
  });
});
