<script>
import K8sAuditLog from '@pkg/components/K8sAuditLog.vue';
import InstallView from '@pkg/components/InstallView.vue';
import { MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';
import Loading from '@shell/components/Loading';
import { SKIP_APP_INSTALL_SETTING } from '@pkg/config/constants.js';

export default {
  name: 'K8sAuditLogPage',
  async fetch() {
    const id = this.$route.query.clusterId ?? this.$route.query.cluster;
    let skipAppInstallSetting = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SKIP_APP_INSTALL_SETTING);
    const auditLogSetting = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.AUDIT_LOG_SERVER_URL);

    this.auditLogSetting = auditLogSetting;
    if (!skipAppInstallSetting) {
      const v = JSON.stringify({ [id]: false });

      skipAppInstallSetting = await this.$store.dispatch('management/create', {
        type: MANAGEMENT.SETTING, value: v, metadata: { name: SKIP_APP_INSTALL_SETTING }
      }, { root: true });
      await skipAppInstallSetting.save();
    }
    this.skipAppInstallSetting = skipAppInstallSetting;

    const { data: apps } = await this.$store.dispatch('management/request', { url: `/k8s/clusters/${ id === '_' ? 'local' : id }/v1/catalog.cattle.io.apps` });

    this.apps = apps;
  },
  data() {
    return {
      auditLogSetting: null, apps: [], skipAppInstallSetting: null
    };
  },
  computed: {
    hideInstallView() {
      if (this.auditLogSetting?.value) {
        if (this.auditLogCollector) {
          return true;
        }

        try {
          const settingValue = JSON.parse(this.skipAppInstallSetting?.value ?? '{}');
          const id = this.$route.query.clusterId ?? this.$route.query.cluster;

          return settingValue[id] === true;
        } catch (err) {
          return false;
        }
      }

      return false;
    },
    auditLogCollector() {
      return this.apps.find((app) => app.spec?.chart?.metadata?.name === 'rancher-k8s-auditlog-collector');
    },
    auditLogServiceAddress() {
      return this.auditLogSetting?.value;
    }
  },
  components: {
    K8sAuditLog, InstallView, Loading
  }
};
</script>
<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <K8sAuditLog
      v-if="hideInstallView"
      :server-address="auditLogServiceAddress"
    />
    <InstallView
      v-else
      :audit-log-setting="auditLogSetting"
      :skip-app-install-setting="skipAppInstallSetting"
      :audit-log-collector="auditLogCollector"
      :k8s-audit-log="true"
      :cluster-id="$route.query.clusterId"
    />
  </div>
</template>
<style scoped>

</style>
