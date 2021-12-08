import { DEFAULT_PROJECT, SYSTEM_PROJECT } from '@/config/labels-annotations';
import { MANAGEMENT, NAMESPACE, NORMAN } from '@/config/types';
import { insertAt } from '@/utils/array';
import { PROJECT_ID } from '@/config/query-params';
import { SETTING } from '@/config/settings';

export default {
  _availableActions() {
    const out = this._standardActions;

    const auditLog = {
      action:     'auditLog',
      enabled:    !!this.$rootGetters['management/byId'](MANAGEMENT.SETTING, SETTING.AUDIT_LOG_SERVER_URL)?.value,
      icon:       'icon icon-fw icon-globe',
      label:      this.t('nav.auditLog'),
    };

    const resourceQuota = {
      action:     'resourceQuota',
      enabled:    true,
      icon:       'icon icon-fw icon-globe',
      label:      this.t('nav.quotas'),
    };

    insertAt(out, 0, { divider: true });
    insertAt(out, 0, auditLog);
    insertAt(out, 0, resourceQuota);

    return out;
  },
  isSystem() {
    return this.metadata?.labels?.[SYSTEM_PROJECT] === 'true';
  },

  isDefault() {
    return this.metadata?.labels?.[DEFAULT_PROJECT] === 'true';
  },

  namespaces() {
    // I don't know how you'd end up with a project outside of rancher, but just in case...
    if ( !this.$rootGetters['isRancher'] ) {
      return [];
    }

    const inStore = this.$rootGetters['currentProduct'].inStore;

    const all = this.$rootGetters[`${ inStore }/all`](NAMESPACE);

    return all.filter((ns) => {
      return ns.projectId === this.metadata.name;
    });
  },

  listLocation() {
    return { name: 'c-cluster-product-projectsnamespaces' };
  },

  parentLocationOverride() {
    return this.listLocation;
  },

  save() {
    return async() => {
      const norman = await this.norman;

      const newValue = await norman.save();

      newValue.doAction('setpodsecuritypolicytemplate', { podSecurityPolicyTemplateId: this.spec.podSecurityPolicyTemplateId || null });

      await this.$dispatch('management/findAll', { type: MANAGEMENT.PROJECT, opt: { force: true } }, { root: true });

      return newValue;
    };
  },

  remove() {
    return async() => {
      const norman = await this.norman;

      await norman.remove(...arguments);
      this.$commit('management/remove', this, { root: true });
    };
  },

  norman() {
    return this.id ? this.normanEditProject : this.normanNewProject;
  },

  async normanNewProject() {
    const normanProject = await this.$dispatch('rancher/create', {
      type:                          NORMAN.PROJECT,
      name:                          this.spec.displayName,
      description:                   this.spec.description,
      annotations:                   this.metadata.annotations,
      labels:                        this.metadata.labels,
      clusterId:                     this.$rootGetters['currentCluster'].id,
      creatorId:                     this.$rootGetters['auth/principalId'],
      containerDefaultResourceLimit: this.spec.containerDefaultResourceLimit,
      namespaceDefaultResourceQuota: this.spec.namespaceDefaultResourceQuota,
      resourceQuota:                 this.spec.resourceQuota,
    }, { root: true });

    // The backend seemingly required both labels/annotation and metadata.labels/annotations or it doesn't save the labels and annotations
    normanProject.setAnnotations(this.metadata.annotations);
    normanProject.setLabels(this.metadata.labels);

    return normanProject;
  },

  async normanEditProject() {
    const normanProject = await this.$dispatch('rancher/find', {
      type:       NORMAN.PROJECT,
      id:         this.id.replace('/', ':'),
    }, { root: true });

    normanProject.setAnnotations(this.metadata.annotations);
    normanProject.setLabels(this.metadata.labels);
    normanProject.description = this.spec.description;
    normanProject.containerDefaultResourceLimit = this.spec.containerDefaultResourceLimit;
    normanProject.namespaceDefaultResourceQuota = this.spec.namespaceDefaultResourceQuota;
    normanProject.resourceQuota = this.spec.resourceQuota;

    return normanProject;
  },

  auditLog() {
    return () => {
      this.currentRouter().push({
        name:   'c-cluster-product-auditlog',
        params: {
          cluster:  this.$rootGetters['currentCluster'].id,
          page:    'project-audit-log'
        },
        query: { [PROJECT_ID]: `${ this.$rootGetters['currentCluster'].id }:${ this.metadata.name }` }
      });
    };
  },
  resourceQuota() {
    return () => {
      this.currentRouter().push({
        name:   'c-cluster-product-resourcequota',
        params: {
          cluster:  this.$rootGetters['currentCluster'].id,
          page:    'project-resource-quota'
        },
        query: { [PROJECT_ID]: `${ this.$rootGetters['currentCluster'].id }:${ this.metadata.name }` }
      });
    };
  },
};
