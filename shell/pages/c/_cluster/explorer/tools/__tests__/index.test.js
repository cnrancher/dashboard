import Index from '@shell/pages/c/_cluster/explorer/tools/index.vue';

describe('page: cluster tools index', () => {
  it('should call loadRepos and loadRepoCharts', async() => {
    const loadReposMock = jest.fn(() => Promise.resolve());
    const loadRepoChartsMock = jest.fn(() => Promise.resolve());

    const localThis = {
      $store:         { dispatch: loadReposMock },
      loadRepoCharts: loadRepoChartsMock,
      $route:         { query: {} }
    };

    await Index.fetch.call(localThis);
    expect(loadReposMock).toHaveBeenCalledWith('catalog/loadRepos');
    expect(loadRepoChartsMock).toHaveBeenCalledWith();
  });
});
