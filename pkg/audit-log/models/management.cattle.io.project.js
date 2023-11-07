import project from '@shell/models/management.cattle.io.project';
import { PROJECT_ID } from '@shell/config/query-params';
import { insertAt } from '@shell/utils/array';

export default class AuditLogProject extends project {
  get _availableActions() {
    const out = super._availableActions;
    const auditLog = {
      action: 'auditLog',
      icon:   'icon icon-fw icon-globe',
      label:  this.t('auditLog.title'),
    };

    insertAt(out, 0, { divider: true });
    insertAt(out, 0, auditLog);

    return out;
  }

  get auditLog() {
    return (() => {
      this.currentRouter().push({
        name:   'c-project-auditLog',
        params: { cluster: this.$rootGetters['currentCluster'].id, product: 'explorer' },
        query:  { [PROJECT_ID]: this.id.replace('/', ':'), projectName: this.metadata.name }
      });
    })();
  }
}
