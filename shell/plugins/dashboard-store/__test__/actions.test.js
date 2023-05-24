import actions from '@shell/plugins/dashboard-store/actions';

describe('dashboard-store: actions', () => {
  const growlWarning = jest.fn(t => t);
  const ctx = {
    getters: {
      typeRegistered:  type => type,
      keyFieldForType: type => type,
      byId:            type => type,
    },
    dispatch: growlWarning,
    commit(key, params) {
      const commit = {
        load:         params => params,
        registerType: params => params,
      };

      return commit[key](params);
    },
  };

  it('should not be warning information prompt', () => {
    const data = {
      type:     'pod',
      metadata: { name: 'privileged' },
      pod:      'privileged',
    };

    actions.load(ctx, { data, existing: false });

    expect(growlWarning).toHaveBeenCalledTimes(0);
  });

  it('should be warning information prompt', () => {
    const message = '%5Bpsp-privileged-container%5D+%E6%8F%90%E7%A4%BA%EF%BC%9APrivileged+container+is+not+allowed%3A+pause%2C+securityContext%3A+%7B%22privileged%22%3A+true%7D';
    const data = {
      _headers: { 'x-api-warnings': message },
      type:     'pod',
      metadata: { name: 'privileged' },
      pod:      'privileged',
    };

    actions.load(ctx, { data, existing: false });

    expect(growlWarning).toHaveBeenCalledWith('growl/warning', {
      title:   'Pod: privileged',
      message: decodeURIComponent(message.replace(/\+/g, '%20')),
      timeout: 0
    }, { root: true });
  });
});
