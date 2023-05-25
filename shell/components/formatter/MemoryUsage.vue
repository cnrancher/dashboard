<script>
import { createMemoryValues } from '@shell/utils/units';
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
    memoryUsage() {
      const ramAllocatable = this.row.ramAllocatable;
      const ramUsage = this.row.ramUsage;

      const usage = createMemoryValues(ramAllocatable, ramUsage);

      return {
        ...usage,
        used: usage.useful,
        unit: usage.units
      };
    },
    memoryReserved() {
      const ramAllocatable = this.row.ramAllocatable;
      const ramReservationUsage = this.row.ramReservationUsage;
      const usage = createMemoryValues(ramAllocatable, ramReservationUsage);

      return {
        ...usage,
        used: usage.useful,
        unit: usage.units
      };
    },
    usagePercentage() {
      const ramAllocatable = this.row.ramAllocatable;
      const ramUsage = this.row.ramUsage;

      if (!ramUsage || !ramAllocatable) {
        return '0';
      }

      return formatPercent((ramUsage * 100) / ramAllocatable);
    },
    reservedPercentage() {
      const ramAllocatable = this.row.ramAllocatable;
      const ramReservationUsage = this.row.ramReservationUsage;

      if (!ramReservationUsage || !ramAllocatable) {
        return '0';
      }

      return formatPercent((ramReservationUsage * 100) / ramAllocatable);
    },
  }
};
</script>

<template>
  <div>
    <div v-if="usagePercentage === '0'">
      {{ t('node.detail.glance.consumptionGauge.used') }}: N/A
    </div>
    <div v-else>
      {{ t('node.detail.glance.consumptionGauge.used') }}: {{ t('node.detail.glance.consumptionGauge.amount', memoryUsage) }} &nbsp; ({{ usagePercentage }})
    </div>
    <div v-if="row.podRequests.memory">
      {{ t('node.detail.glance.consumptionGauge.reserved') }}: {{ t('node.detail.glance.consumptionGauge.amount', memoryReserved) }} &nbsp; ({{ reservedPercentage }})
    </div>
    <div></div>
  </div>
</template>
