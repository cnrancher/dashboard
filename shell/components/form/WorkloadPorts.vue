<script>
import { mapGetters } from 'vuex';
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt, findBy } from '@shell/utils/array';
import { clone } from '@shell/utils/object';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { HCI as HCI_LABELS_ANNOTATIONS } from '@shell/config/labels-annotations';
import { isHarvesterSatisfiesVersion } from '@shell/utils/cluster';
import { HARVESTER_NAME as HARVESTER } from '@shell/config/features';
import { CAPI, SERVICE } from '@shell/config/types';

export default {
  emits: ['update:value'],

  components: {
    LabeledInput,
    LabeledSelect,
  },

  props: {
    value: {
      type:    Array,
      default: null,
    },

    mode: {
      type:    String,
      default: _EDIT,
    },

    // array of services auto-created previously (only relevent when mode !== create)
    services: {
      type:    Array,
      default: () => []
    },

    // workload name
    name: {
      type:    String,
      default: ''
    }
  },

  data() {
    return {
      rows:                [],
      showHostPorts:       false,
      workloadPortOptions: ['TCP', 'UDP']
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),

    canNotAccessService() {
      return !this.$store.getters['cluster/schemaFor'](SERVICE);
    },

    serviceTypeTooltip() {
      return this.canNotAccessService ? this.t('workload.container.noServiceAccess') : undefined;
    },

    isView() {
      return this.mode === _VIEW;
    },

    showAdd() {
      return !this.isView;
    },

    showRemove() {
      return !this.isView;
    },

    serviceTypes() {
      return [
        {
          label: this.t('workload.container.ports.noCreateService'),
          value: ''
        },
        {
          label: this.t('serviceTypes.clusterip'),
          value: 'ClusterIP'
        },
        {
          label: this.t('serviceTypes.nodeport'),
          value: 'NodePort'
        },
        {
          label: this.t('serviceTypes.loadbalancer'),
          value: 'LoadBalancer'
        },
      ];
    },

    clusterIPServicePorts() {
      return ((this.services.filter((svc) => svc.spec.type === 'ClusterIP') || [])[0] || {})?.spec?.ports;
    },

    loadBalancerServicePorts() {
      return ((this.services.filter((svc) => svc.spec.type === 'LoadBalancer') || [])[0] || {})?.spec?.ports;
    },

    nodePortServicePorts() {
      return ((this.services.filter((svc) => svc.spec.type === 'NodePort') || [])[0] || {})?.spec?.ports;
    },

    ipamOptions() {
      return [{
        label: 'DHCP',
        value: 'dhcp',
      }, {
        label: 'Pool',
        value: 'pool',
      }];
    },

    ipamIndex() {
      return this.rows.findIndex((row) => row._serviceType === 'LoadBalancer' && row.protocol === 'TCP');
    },

    serviceWithIpam() {
      return this.services.find((s) => s?.metadata?.annotations[HCI_LABELS_ANNOTATIONS.CLOUD_PROVIDER_IPAM]);
    },

    showIpam() {
      let cloudProvider;
      const version = this.provisioningCluster?.kubernetesVersion;

      if (this.provisioningCluster?.isRke2) {
        const machineSelectorConfig = this.provisioningCluster?.spec?.rkeConfig?.machineSelectorConfig || {};
        const agentConfig = (machineSelectorConfig[0] || {}).config;

        cloudProvider = agentConfig?.['cloud-provider-name'];
      } else if (this.provisioningCluster?.isRke1) {
        const currentCluster = this.$store.getters['currentCluster'];

        cloudProvider = currentCluster?.spec?.rancherKubernetesEngineConfig?.cloudProvider?.name;
      }

      return cloudProvider === HARVESTER &&
              isHarvesterSatisfiesVersion(version);
    },

    provisioningCluster() {
      const out = this.$store.getters['management/all'](CAPI.RANCHER_CLUSTER).find((c) => c?.status?.clusterName === this.currentCluster.metadata.name);

      return out;
    },
  },

  created() {
    const rows = clone(this.value || []).map((row) => {
      row._showHost = false;
      row._serviceType = row._serviceType || '';
      row._name = row.name ? `${ row.name }` : `${ row.containerPort }${ row.protocol.toLowerCase() }${ row.hostPort || row._listeningPort || '' }`;
      if (row.hostPort || row.hostIP) {
        row._showHost = true;
      }

      row._ipam = '';

      return row;
    });

    this.rows = rows;
    // show host port column if existing port data has any host ports defined
    this.showHostPorts = !!rows.some((row) => !!row.hostPort);
    this.queueUpdate = debounce(this.update, 500);
    this.rows.map((row) => {
      this.setServiceType(row);
      this.setIpam(row);
    });
  },

  methods: {
    add() {
      this.rows.push({
        name:          '',
        expose:        true,
        protocol:      'TCP',
        containerPort: null,
        hostPort:      null,
        hostIP:        null,
        _showHost:     false,
        _serviceType:  '',
        _ipam:         'dhcp',
      });

      this.queueUpdate();

      this.$nextTick(() => {
        const inputs = this.$refs.name;

        inputs[inputs.length - 1].focus();
      });
    },

    remove(idx) {
      removeAt(this.rows, idx);
      this.queueUpdate();
    },

    update() {
      if ( this.isView ) {
        return;
      }
      const out = [];

      for ( const row of this.rows ) {
        const value = clone(row);

        delete value._showHost;
        out.push(value);
      }
      this.$emit('update:value', out);
    },

    setServiceType(row) {
      const { _name } = row;

      if (this.loadBalancerServicePorts) {
        const portSpec = findBy(this.loadBalancerServicePorts, 'name', _name);

        if (portSpec) {
          row['_listeningPort'] = portSpec.port;

          row._serviceType = 'LoadBalancer';

          return;
        }
      } if (this.nodePortServicePorts) {
        const portSpec = findBy(this.nodePortServicePorts, 'name', _name);

        if (portSpec) {
          row['_listeningPort'] = portSpec.nodePort;

          row._serviceType = 'NodePort';

          return;
        }
      } if (this.clusterIPServicePorts) {
        if (findBy(this.clusterIPServicePorts, 'name', _name)) {
          row._serviceType = 'ClusterIP';

          return;
        }
      }

      return '';
    },

    setIpam(row) {
      if (this.serviceWithIpam && row._serviceType === 'LoadBalancer' && row.protocol === 'TCP') {
        row._ipam = this.serviceWithIpam?.metadata?.annotations[HCI_LABELS_ANNOTATIONS.CLOUD_PROVIDER_IPAM];
      }
    },
  },
};
</script>

<template>
  <div :style="{'width':'100%'}">
    <p
      v-if="rows.length > 0"
      class="padded"
    >
      {{ t('workload.container.ports.detailedDescription') }}
    </p>
    <div
      v-for="(row, idx) in rows"
      :key="idx"
      class="ports-row"
      :class="{
        'show-host': row._showHost,
        'loadBalancer': row._serviceType === 'LoadBalancer',
        'nodePort': row._serviceType === 'NodePort',
        'tcp': row.protocol === 'TCP',
        'show-ipam': showIpam,
      }"
    >
      <div class="service-type">
        <LabeledSelect
          v-model:value="row._serviceType"
          :mode="mode"
          :label="t('workload.container.ports.createService')"
          :options="serviceTypes"
          :disabled="canNotAccessService"
          :tooltip="serviceTypeTooltip"
          @update:value="queueUpdate"
        />
      </div>

      <div class="portName">
        <LabeledInput
          ref="name"
          v-model:value="row.name"
          :mode="mode"
          :label="t('workload.container.ports.name')"
          @update:value="queueUpdate"
        />
      </div>

      <div class="port">
        <LabeledInput
          v-model:value.number="row.containerPort"
          :mode="mode"
          type="number"
          min="1"
          max="65535"
          placeholder="e.g. 8080"
          :label="t('workload.container.ports.containerPort')"
          :required="row._serviceType === 'LoadBalancer' "
          @update:value="queueUpdate"
        />
      </div>

      <div class="protocol col">
        <LabeledSelect
          v-model:value="row.protocol"
          :mode="mode"
          :options="workloadPortOptions"
          :multiple="false"
          :label="t('workload.container.ports.protocol')"
          @update:value="queueUpdate"
        />
      </div>

      <div
        v-if="row._showHost"
        class="targetPort"
      >
        <LabeledInput
          ref="port"
          v-model:value.number="row.hostPort"
          :mode="mode"
          type="number"
          min="1"
          max="65535"
          placeholder="e.g. 80"
          :label="t('workload.container.ports.hostPort')"
          @update:value="queueUpdate"
        />
      </div>

      <div
        v-if="row._showHost"
        class="hostip"
      >
        <LabeledInput
          ref="port"
          v-model:value="row.hostIP"
          :mode="mode"
          placeholder="e.g. 1.1.1.1"
          :label="t('workload.container.ports.hostIP')"
          @update:value="queueUpdate"
        />
      </div>

      <div
        v-if="!row._showHost && row._serviceType !== 'LoadBalancer' && row._serviceType !== 'NodePort'"
        class="add-host"
      >
        <button
          :disabled="mode==='view'"
          type="button"
          class="btn btn-sm role-tertiary"
          @click="row._showHost = true"
        >
          {{ t('workloadPorts.addHost') }}
        </button>
      </div>

      <div v-if="row._serviceType === 'LoadBalancer' || row._serviceType === 'NodePort'">
        <LabeledInput
          ref="port"
          v-model:value.number="row._listeningPort"
          type="number"
          :mode="mode"
          :label="t('workload.container.ports.listeningPort')"
          :required="row._serviceType === 'LoadBalancer' "
          @update:value="queueUpdate"
        />
      </div>

      <div v-if="showIpam && row._serviceType === 'LoadBalancer' && row.protocol === 'TCP'">
        <div v-if="idx === ipamIndex">
          <LabeledSelect
            v-model:value="row._ipam"
            :mode="mode"
            :options="ipamOptions"
            :label="t('servicesPage.harvester.ipam.label')"
            :disabled="mode === 'edit'"
            @update:value="queueUpdate"
          />
        </div>
        <div v-else>
          <LabeledSelect
            v-model:value="rows[ipamIndex]._ipam"
            :mode="mode"
            :options="ipamOptions"
            :label="t('servicesPage.harvester.ipam.label')"
            :disabled="true"
            @update:value="queueUpdate"
          />
        </div>
      </div>

      <div
        v-if="showRemove"
        class="remove"
      >
        <button
          type="button"
          class="btn role-link"
          @click="remove(idx)"
        >
          {{ t('workloadPorts.remove') }}
        </button>
      </div>
    </div>
    <div
      v-if="showAdd"
      class="footer"
    >
      <button
        type="button"
        class="btn role-tertiary add"
        @click="add()"
      >
        {{ t('workloadPorts.addPort') }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$remove-width: 75px;

.title {
  margin-bottom: 10px;

  .read-from-file {
    float: right;
  }
}
.ports-headers, .ports-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(90px, 1fr) minmax(70px, 0.8fr) minmax(100px, 1fr) $remove-width;
  grid-column-gap: $column-gutter;
  margin-bottom: 10px;
  align-items: center;

  > div {
    min-width: 0;
  }

  & .port {
    display: flex;
    justify-content: space-between;
  }

  &.show-host:not(.loadBalancer):not(.nodePort) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(110px, 1fr) minmax(110px, 1fr) $remove-width;
  }

  &.show-host.nodePort,
  &.show-host.loadBalancer {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) $remove-width;
  }

  &.show-ipam.loadBalancer.tcp:not(.show-host) {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(120px, 1fr) $remove-width;
  }

  &.show-ipam.show-host.loadBalancer.tcp {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(95px, 1fr) minmax(95px, 1fr) minmax(95px, 1fr) minmax(110px, 1fr) $remove-width;
  }
}

.add-host {
  justify-self: center;
}

.protocol {
  height: 100%;
}

.ports-headers {
  color: var(--input-label);
}

.toggle-host-ports {
  color: var(--primary);
}

.remove {
  justify-self: start;
  white-space: nowrap;

  BUTTON {
    padding: 0;
  }
}

.ports-row INPUT {
  height: 50px;
}

.footer {
  .protip {
    float: right;
    padding: 5px 0;
  }
}
.ports-row .protocol :deep() .unlabeled-select,
.ports-row .protocol :deep() .unlabeled-select .v-select {
  height: 100%;
}
.ports-row .protocol :deep() .unlabeled-select .vs__dropdown-toggle {
  padding-top: 12px;
}
</style>
