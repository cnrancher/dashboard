<script>
import { mapGetters } from 'vuex';
import { SCHEMA } from '@shell/config/types';
import ResourceTable from '@shell/components/ResourceTable';
import SubnetView from '../components/subnetView.vue';
import { MACVLAN_IP_PRODUCT_NAME_V2, MACVLAN_PRODUCT_NAME_V2 } from '../config/macvlan-types';
import MacvlanBadgeState from '../formatters/MacvlanBadgeState';
import Loading from '@shell/components/Loading';
import { BLANK_CLUSTER } from '@shell/store/store-types.js';
import { MODE, _EDIT } from '@shell/config/query-params';

const schema = {
  id:         'flatnetworkIp',
  type:       SCHEMA,
  attributes: {
    kind:       'FlatNetworkIP',
    namespaced: false
  },
  metadata: { name: 'flatnetworkIp' },
};

export default {
  name:       'ListFlatnetworkipIp',
  components: {
    ResourceTable,
    MacvlanBadgeState,
    Loading,
    SubnetView,
  },
  inheritAttrs: false,
  data() {
    return {
      config:   {},
      resource: MACVLAN_IP_PRODUCT_NAME_V2,
      schema,
    };
  },
  async fetch() {
    const { currentCluster } = this;
    let config = {};

    if (this.$route.params?.id) {
      try {
        await this.$store.dispatch('flatnetwork/loadFlatnetworkIps', {
          cluster: currentCluster?.id,
          query:   { labelSelector: { subnet: this.$route.params?.id } }
        });
      } catch (e) {
        this.$store.commit('flatnetwork/setFlatnetworkIpList', []);
      }

      try {
        config = await this.$store.dispatch('flatnetwork/loadFlatnetwork', {
          cluster: currentCluster?.id,
          query:   this.$route.params?.id
        });
      } catch (e) {
        config = {};
      }

      this.config = config;
    }
  },

  computed: {
    ...mapGetters(['currentCluster']),
    loading() {
      return !this.currentCluster;
    },
    rows() {
      return this.$store.getters['flatnetwork/flatnetworkIpList'].map((item) => {
        return Object.assign(item, {
          ipType:       item.metadata.labels['flatnetwork.pandaria.io/flatNetworkIPType'],
          workloadName: this.getWorkloadName(item.metadata.name, item.metadata.labels['workload.user.cattle.io/workloadselector']),
          projectId:    item.metadata.labels['field.cattle.io/projectId'],
          nameDisplay:  item.metadata.name,
        });
      });
    },
    headers() {
      return [
        {
          name:     'status',
          labelKey: 'macvlan.tableHeaders.status',
          value:    'status.phase',
          sort:     'status.phase',
        },
        {
          name:          'name',
          labelKey:      'tableHeaders.name',
          value:         'metadata.name',
          sort:          'metadata.name',
          formatterOpts: { currentCluster: this.currentCluster },
          formatter:     'MacvlanPodName',
          width:         260,
        },
        {
          name:     'subnet',
          labelKey: 'macvlan.macvlanIp.tableHeaders.subnet',
          value:    'spec.subnet',
          sort:     'spec.subnet',
          width:    150,
        },
        {
          name:     'address',
          labelKey: 'macvlan.macvlanIp.tableHeaders.address',
          value:    'status.addr',
          sort:     'status.addr',
        },
        {
          name:     'ipType',
          labelKey: 'macvlan.macvlanIp.tableHeaders.ipType',
          value:    'ipType',
          sort:     'ipType',
          width:    120,
        },
        {
          name:     'mac',
          labelKey: 'macvlan.macvlanIp.tableHeaders.mac',
          value:    'status.mac',
          sort:     'status.mac',
          width:    200,
        },
        {
          name:     'workload',
          labelKey: 'macvlan.macvlanIp.tableHeaders.workload',
          value:    'workloadName',
          sort:     'workloadName',
        },
      ];
    },
    groupBy() {
      return 'metadata.namespace';
    },
    canEdit() {
      return !!this.config?.links?.update;
    }
  },
  methods: {
    getWorkloadName(name, workloadselector) {
      const nameArr = name.split('-');
      const workloadselectorArr = workloadselector.split('-');
      let workloadArr = [];
      const workloadArrName = [];
      const workloadArrSelect = [];

      for (let i = 0; i < workloadselectorArr.length; i++) {
        if (nameArr[i] === undefined) {
          return workloadArr.length ? workloadArr.join('-') : '';
        }
        workloadArrName.push(nameArr[i]);
        workloadArrSelect.unshift(workloadselectorArr[workloadselectorArr.length - i - 1]);

        if (workloadArrName.join('-') === workloadArrSelect.join('-')) {
          workloadArr = JSON.parse(JSON.stringify(workloadArrName));
        }
      }

      return workloadArr.length ? workloadArr.join('-') : '';
    },
    editView() {
      window.location.hash = '#general';
      this.$router.push({
        name:   'c-cluster-product-resource-namespace-id',
        params: {
          cluster:   this.currentCluster?.id === BLANK_CLUSTER ? 'local' : this.currentCluster?.id,
          namespace: this.config?.metadata?.namespace || 'cattle-flat-network',
          resource:  MACVLAN_PRODUCT_NAME_V2,
          id:        this.$route.params?.id,
        },
        query: { [MODE]: _EDIT }
      });
    }
  },
};
</script>
<template>
  <div>
    <Loading
      v-if="$fetchState.pending"
      :delayed="true"
    />
    <div class="container">
      <button
        v-if="canEdit"
        type="button"
        class="btn role-primary mr-10 edit-button"
        @click.prevent.stop="editView"
      >
        {{ t(`resourceDetail.masthead.config`) }}
      </button>
      <SubnetView
        class="mb-25"
        :config="config"
      />
      <ResourceTable
        v-bind="$attrs"
        :headers="headers"
        :group-by="groupBy"
        :rows="rows"
        :groupable="false"
        :schema="schema"
        key-field="_key"
        :loading="loading"
        :table-actions="false"
        :row-actions="false"
      >
        <template #cell:status="{row}">
          <MacvlanBadgeState
            :row="row"
          />
        </template>
        <template #cell:ipType="{row}">
          <span>{{ t(`macvlan.macvlanIp.ipType.${row.ipType}`) }}</span>
        </template>
        <template #group-by="{group}">
          <div class="group-bar">
            <div class="group-tab">
              {{ t('nameNsDescription.namespace.label') }}: {{ group.key }}
            </div>
          </div>
        </template>
      </ResourceTable>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.container {
  position: relative;
  .edit-button {
    position: absolute;
    top : 32px;
    right: 10px;
  }
}
</style>
