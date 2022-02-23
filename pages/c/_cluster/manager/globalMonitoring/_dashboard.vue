<script>
import { MANAGEMENT } from '@/config/types';
import LazyImage from '@/components/LazyImage';
import { SETTING } from '@/config/settings';

export default {
  components: { LazyImage },

  data() {
    const globalMonitoringSrc = require('~/assets/images/providers/global-monitoring.svg');
    const grafanaSrc = require('~/assets/images/providers/grafana.svg');
    const thanosSrc = require('~/assets/images/providers/thanos.svg');
    const clusterId = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.GLOBAL_MONITORING_CLUSTER_ID)?.value || '';
    const enabled = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.GLOBAL_MONITORING_ENABLED)?.value === 'true';
    const serverUrlSetting = this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.SERVER_URL) || {};

    return {
      availableLinks: {
        alertmanager: false,
        grafana:      false,
        prometheus:   false,
      },
      externalLinks: [
        {
          enabled:     clusterId && enabled,
          group:       'globalMonitoring',
          iconSrc:     globalMonitoringSrc,
          label:       'globalMonitoringDashboard.globalMonitoring.label',
          description: 'globalMonitoringDashboard.globalMonitoring.description',
          link:        `${ serverUrlSetting.value }/k8s/clusters/${ clusterId }/api/v1/namespaces/cattle-global-monitoring/services/http:access-dashboard:80/proxy/`,
        },
        {
          enabled:     clusterId && enabled,
          group:       'grafana',
          iconSrc:     grafanaSrc,
          label:       'globalMonitoringDashboard.grafana.label',
          description: 'globalMonitoringDashboard.grafana.description',
          link:        `${ serverUrlSetting.value }/k8s/clusters/${ clusterId }/api/v1/namespaces/cattle-global-monitoring/services/http:access-grafana:80/proxy/`,
        },
        {
          enabled:     clusterId && enabled,
          group:       'thanos',
          iconSrc:     thanosSrc,
          label:       'globalMonitoringDashboard.thanos.label',
          description: 'globalMonitoringDashboard.thanos.description',
          link:        `${ serverUrlSetting.value }/k8s/clusters/${ clusterId }/api/v1/namespaces/cattle-global-monitoring/services/http:access-thanos:80/proxy/`,
        },
      ]
    };
  },
};
</script>

<template>
  <section>
    <header class="row">
      <div class="col span-12">
        <h1>
          <t k="monitoring.overview.title" />
        </h1>
        <div>
          <t k="monitoring.overview.subtitle" :raw="true" />
        </div>
      </div>
    </header>
    <div>
      <div class="create-resource-container">
        <div class="subtypes-container">
          <a
            v-for="fel in externalLinks"
            :key="fel.label"
            v-tooltip="
              !fel.enabled ? t('monitoring.overview.linkedList.na') : undefined
            "
            :href="fel.enabled ? fel.link : void 0"
            :disabled="!fel.enabled"
            target="_blank"
            rel="noopener noreferrer"
            :class="{ 'subtype-banner': true, disabled: !fel.enabled }"
          >
            <div class="subtype-content">
              <div class="title">
                <div class="subtype-logo logo-image">
                  <LazyImage :src="fel.iconSrc" />
                </div>
                <h5>
                  <span>
                    <t :k="fel.label" />
                  </span>
                </h5>
                <div class="flex-right">
                  <i class="icon icon-external-link" />
                </div>
              </div>
              <hr />
              <div class="description">
                <span>
                  <t :k="fel.description" />
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .create-resource-container{
    .logo-image{
      width: 50px;
      height: 50px;
      margin-right: 10px;

      img{
        width: 50px;
      }
    }
  }
</style>
