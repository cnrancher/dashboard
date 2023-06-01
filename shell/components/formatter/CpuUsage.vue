<script>
import { formatPercent } from '@shell/utils/string';

export default {
  props: {
    value: {
      type:     String,
      default: ''
    },
    row: {
      type:     Object,
      required: true
    },
    col: {
      type:     Object,
      default: () => {}
    },
  },
  computed: {
    cpuUsage() {
      const cpuCapacity = this.row.cpuCapacity;
      const cpuUsage = this.row.cpuUsage;

      return {
        total: this.numberFormatter(cpuCapacity),
        used:  this.numberFormatter(cpuUsage),
        unit:  ''
      };
    },
    cpuReserved() {
      const cpuCapacity = this.row.cpuCapacity;
      const cpuReservationUsage = this.row.cpuReservationUsage;

      return {
        total: this.numberFormatter(cpuCapacity),
        used:  this.numberFormatter(cpuReservationUsage),
        unit:  ''
      };
    },
    usagePercentage() {
      const cpuCapacity = this.row.cpuCapacity;
      const cpuUsage = this.row.cpuUsage;

      return formatPercent((cpuUsage * 100) / cpuCapacity);
    },
    reservedPercentage() {
      const cpuCapacity = this.row.cpuCapacity;
      const cpuReservationUsage = this.row.cpuReservationUsage;

      return formatPercent((cpuReservationUsage * 100) / cpuCapacity);
    }
  },
  methods: {
    numberFormatter(value) {
      return Number.isInteger(value) ? value : value.toFixed(2);
    }
  }
};
</script>

<template>
  <div>
    <div v-if="value === '0'">
      {{ t('node.detail.glance.consumptionGauge.used') }}: N/A
    </div>
    <div v-else>
      {{ t('node.detail.glance.consumptionGauge.used') }}: {{ t('node.detail.glance.consumptionGauge.amount', cpuUsage) }} &nbsp; ({{ usagePercentage }})
    </div>
    <div v-if="row.podRequests.cpu">
      {{ t('node.detail.glance.consumptionGauge.reserved') }}: {{ t('node.detail.glance.consumptionGauge.consumption', cpuReserved) }} &nbsp; ({{ reservedPercentage }})
    </div>
  </div>
</template>
