import RollbackWorkloadDialog from '@shell/dialog/RollbackWorkloadDialog.vue';

const IGNORED_ANNOTATIONS = [
  'kubectl.kubernetes.io/last-applied-configuration',
  'deployment.kubernetes.io/revision',
  'deployment.kubernetes.io/revision-history',
  'deployment.kubernetes.io/desired-replicas',
  'deployment.kubernetes.io/max-replicas',
  'deprecated.deployment.rollback.to',
];

describe('component: RollbackWorkloadDialog, computed: rollbackRequestBody', () => {
  it('should return filtered value', () => {
    const labels = {
      'workload.user.cattle.io/workloadselector': 'apps.deployment-default-busybox',
      'pod-template-hash':                        '123',
      label1:                                     'label1',
    };
    const annotations = {
      anyvalue:                                           '123',
      'cattle.io/timestamp':                              '2023-03-06T06:21:48Z',
      'kubectl.kubernetes.io/last-applied-configuration': {},
      'deployment.kubernetes.io/revision':                '2',
      'deployment.kubernetes.io/revision-history':        '2',
      'deployment.kubernetes.io/desired-replicas':        '2',
      'deployment.kubernetes.io/max-replicas':            '2',
      'deprecated.deployment.rollback.to':                'test',
    };

    const localThis = {
      ignoredAnnotations: IGNORED_ANNOTATIONS,
      selectedRevision:   {
        spec: {
          template: {
            metadata: {
              labels,
              annotations
            }
          }
        },
        metadata: { annotations: { 'deployment.kubernetes.io/revision': '2' } }
      }
    };

    const out = RollbackWorkloadDialog.computed.rollbackRequestBody.call(localThis);
    const outAnnos = out[0].value.metadata.annotations;
    const outLabels = out[0].value.metadata.labels;

    expect(Object.keys(outAnnos)).toHaveLength(2);
    expect(Object.keys(outLabels)).toHaveLength(2);
  });
  it('should timestamp not empty', () => {
    const annotations = { 'cattle.io/timestamp': '2023-03-06T06:21:48Z' };

    const localThis = {
      ignoredAnnotations: IGNORED_ANNOTATIONS,
      selectedRevision:   {
        spec: {
          template: {
            metadata: {
              labels: {},
              annotations
            }
          }
        },
        metadata: { annotations: { 'deployment.kubernetes.io/revision': '2' } }
      }
    };

    const out = RollbackWorkloadDialog.computed.rollbackRequestBody.call(localThis);

    expect(Object.keys(out[0].value.metadata.annotations)).toHaveLength(1);
  });
  it('should ignore some annos', () => {
    const annotations = {
      'kubectl.kubernetes.io/last-applied-configuration': {},
      'deployment.kubernetes.io/revision':                '2',
      'deployment.kubernetes.io/revision-history':        '2',
      'deployment.kubernetes.io/desired-replicas':        '2',
      'deployment.kubernetes.io/max-replicas':            '2',
      'deprecated.deployment.rollback.to':                'test',
    };

    const localThis = {
      ignoredAnnotations: IGNORED_ANNOTATIONS,
      selectedRevision:   {
        spec: {
          template: {
            metadata: {
              labels: {},
              annotations
            }
          }
        },
        metadata: { annotations: { 'deployment.kubernetes.io/revision': '2' } }
      }
    };

    const out = RollbackWorkloadDialog.computed.rollbackRequestBody.call(localThis);

    expect(Object.keys(out[0].value.metadata.annotations)).toHaveLength(0);
  });
  it('should ignore some labels', () => {
    const labels = { 'pod-template-hash': '123' };

    const localThis = {
      ignoredAnnotations: IGNORED_ANNOTATIONS,
      selectedRevision:   {
        spec: {
          template: {
            metadata: {
              labels,
              annotations: {},
            }
          }
        },
        metadata: { annotations: { 'deployment.kubernetes.io/revision': '2' } }
      }
    };

    const out = RollbackWorkloadDialog.computed.rollbackRequestBody.call(localThis);

    expect(Object.keys(out[0].value.metadata.annotations)).toHaveLength(0);
  });
});
