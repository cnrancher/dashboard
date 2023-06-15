import { WORKLOAD_TYPES } from '@shell/config/types';
import Workload from './workload';

const IGNORED_ANNOTATIONS = [
  'kubectl.kubernetes.io/last-applied-configuration',
  'deployment.kubernetes.io/revision',
  'deployment.kubernetes.io/revision-history',
  'deployment.kubernetes.io/desired-replicas',
  'deployment.kubernetes.io/max-replicas',
  'deprecated.deployment.rollback.to',
];

export default class Deployment extends Workload {
  get replicaSetId() {
    const set = this.metadata?.relationships?.filter((relationship) => {
      return relationship.rel === 'owner' &&
            relationship.toType === WORKLOAD_TYPES.REPLICA_SET;
    });

    if (set?.length === 1) {
      return set[0]?.toId?.replace(`${ this.namespace }/`, '');
    }

    if (this.pods.length) {
      return this.pods?.[0]?.ownersByType?.ReplicaSet?.[0]?.name;
    } else {
      const condition = this.status?.conditions?.find(condition => condition.type === 'Progressing' && condition.message);

      return condition ? condition.message?.match(/"(\S*)"/)[1] : set?.[0]?.toId?.replace(`${ this.namespace }/`, '');
    }
  }

  async rollBack(cluster, deployment, revision) {
    const body = [
      {
        op:    'replace',
        path:  '/spec/template',
        value: {
          metadata: {
            creationTimestamp: null,
            labels:            Object.keys(revision.spec.template.metadata?.labels || {}).reduce((prev, key) => {
              if (key !== 'pod-template-hash') {
                prev[key] = revision.spec.template.metadata.labels[key];
              }

              return prev;
            }, {}),
            annotations: Object.keys(revision.spec.template.metadata?.annotations || {}).reduce((prev, key) => {
              if (!IGNORED_ANNOTATIONS.includes(key)) {
                prev[key] = revision.spec.template.metadata.annotations[key];
              }

              return prev;
            }, {}),
          },
          spec: revision.spec.template.spec
        }
      }, {
        op:    'replace',
        path:  '/metadata/annotations',
        value: { 'deployment.kubernetes.io/revision': revision.metadata.annotations['deployment.kubernetes.io/revision'] }
      }
    ];

    await this.rollBackWorkload(cluster, deployment, 'deployments', body);
  }
}
