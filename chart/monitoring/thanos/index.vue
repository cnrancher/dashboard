<script>
import { mapGetters } from 'vuex';
import RadioGroup from '@/components/form/RadioGroup';
import { set } from '@/utils/object';

export default {
  components: { RadioGroup },
  props:      {
    accessModes: {
      type:     Array,
      required: true,
    },

    mode: {
      type:    String,
      default: 'create',
    },

    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },
  },
  data() {
    const thanos = {
      image:               'rancher/thanosio-thanos:v0.15.0',
      version:             'v0.15.0',
      grpcServerTlsConfig: {
        caFile:   '/etc/tls/grpc/tls.ca',
        certFile: '/etc/tls/grpc/tls.cert',
        keyFile:  '/etc/tls/grpc/tls.key',
      }
    };
    const containers = '- name: thanos-sidecar\n  volumeMounts:\n  - mountPath: /etc/tls/grpc\n    name: thanos-sidecar-tls\n';
    const volumes = [{
      name:   'thanos-sidecar-tls',
      secret: {
        defaultMode: 420,
        secretName:  'thanos-sidecar-tls'
      }
    }];
    const relabelings = [{
      sourceLabels: ['__meta_kubernetes_pod_host_ip'],
      targetLabel:  'hostip',
      action:       'replace',
      regex:        '(.+)',
      replacement:  '$1',
    }, {
      sourceLabels: ['__meta_kubernetes_pod_node_name'],
      targetLabel:  'node',
      action:       'replace',
      regex:        '(.+)',
      replacement:  '$1',
    }];

    return {
      sidecar: !!this.value.prometheus.prometheusSpec.thanos?.image,
      tls:     (this.mode === 'create' && !this.value.prometheus.prometheusSpec.externalLabels.prometheus_from) ? true : !!this.value.prometheus.prometheusSpec.thanos?.grpcServerTlsConfig,
      relabelings,
      volumes,
      thanos,
      containers,
    };
  },
  computed: {
    ...mapGetters(['currentCluster']),
    metricRelabelings() {
      return [{
        sourceLabels: ['node'],
        targetLabel:  'node_id',
        action:       'replace',
        regex:        '(.+)',
        replacement:  `${ this.currentCluster.spec.displayName }:$1`,
      }];
    },

    tlsYaml() {
      return {
        on:  {
          'prometheus.prometheusSpec.thanos.grpcServerTlsConfig': this.thanos.grpcServerTlsConfig,
          'prometheus.prometheusSpec.containers':                 `${ this.containers }${ this.value.prometheus.prometheusSpec.containers }`,
          'prometheus.prometheusSpec.volumes':                    [
            ...(this.value.prometheus.prometheusSpec.volumes || []),
            ...this.volumes,
          ]
        },
        off: {
          'prometheus.prometheusSpec.thanos.grpcServerTlsConfig': undefined,
          'prometheus.prometheusSpec.containers':                 this.value.prometheus.prometheusSpec.containers.replace(this.containers, ''),
          'prometheus.prometheusSpec.volumes':                    this.value.prometheus.prometheusSpec.volumes.filter(item => item.name !== 'thanos-sidecar-tls'),
        }
      };
    },

    sidecarYaml() {
      return {
        on:  {
          'prometheus.prometheusSpec.thanos': {
            ...this.value.prometheus.prometheusSpec.thanos,
            image:   this.thanos.image,
            version: this.thanos.version,
          },
          'prometheus.thanosService': {
            ...this.value.prometheus.thanosService,
            enabled:   true,
            type:      'NodePort',
            clusterIP: '',
          }
        },
        off: {
          'prometheus.prometheusSpec.thanos': {
            ...this.value.prometheus.prometheusSpec.thanos,
            image:   undefined,
            version: undefined,
          },
          'prometheus.thanosService': {
            ...this.value.prometheus.thanosService,
            enabled:   false,
            type:      'ClusterIP',
            clusterIP: 'None',
          },
        }
      };
    },

    initYaml() {
      return {
        on:  {
          'prometheus.prometheusSpec.externalLabels.prometheus_from': this.currentCluster.spec.displayName,
          'nodeExporter.serviceMonitor.metricRelabelings':              [
            ...this.value.nodeExporter.serviceMonitor.metricRelabelings,
            ...this.metricRelabelings,
          ],
          'nodeExporter.serviceMonitor.relabelings':                    [
            ...this.value.nodeExporter.serviceMonitor.relabelings,
            ...this.relabelings,
          ]
        },
        off: {}
      };
    }
  },
  watch:    {
    sidecar: 'changeSidecar',
    tls:     'changeTls',
  },
  methods: {
    set,
    changeSidecar() {
      this.updateThanos('sidecar');
    },
    changeTls() {
      this.updateThanos('tls');
    },
    initThanos() {
      this.updateThanos('init');
      if (this.tls && !this.value.prometheus.prometheusSpec.thanos.grpcServerTlsConfig) {
        this.updateThanos('tls');
      }
    },
    updateThanos(option) {
      Object.keys(this[`${ option }Yaml`][this[option] === false ? 'off' : 'on']).forEach((item) => {
        set(this.value, item, this[`${ option }Yaml`][this[option] === false ? 'off' : 'on'][item]);
      });
    },
  },
  mounted() {
    this.initThanos();
  }
};
</script>

<template>
  <div>
    <div class="title">
      <h3>{{ t('monitoring.thanos.title') }}</h3>
    </div>
    <div class="grafana-config">
      <div class="row pt-10 pb-10">
        <div class="col span-6">
          <RadioGroup
            v-model="sidecar"
            name="sidecar"
            :label="t('monitoring.thanos.sidecar.label')"
            :labels="[t('generic.yes'), t('generic.no')]"
            :mode="mode"
            :options="[true, false]"
          />
        </div>
        <div class="col span-6">
          <RadioGroup
            v-model="tls"
            name="tls"
            :label="t('monitoring.thanos.tls.label')"
            :labels="[t('generic.yes'), t('generic.no')]"
            :mode="mode"
            :options="[true, false]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
