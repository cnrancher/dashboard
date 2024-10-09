import { actions } from '../catalog';

describe('catalog actions', () => {
  it('should cantain loadChartIndex action', () => {
    expect(actions.loadChartIndex).toBeDefined();
  });
  it('should cantain loadRepos action', () => {
    expect(actions.loadRepos).toBeDefined();
  });
});
