<template>
  <PageSwitch>
    <ResourceTable
      :schema="schema"
      :rows="rows"
      :headers="$attrs.headers"
      :group-by="$attrs.groupBy"
      :loading="loading"
      :use-query-params-for-simple-filtering="useQueryParamsForSimpleFiltering"
      :force-update-live-and-delayed="forceUpdateLiveAndDelayed"
    />
  </PageSwitch>
</template>

<script>
import ResourceTable from '@shell/components/ResourceTable';
import ResourceFetch from '@shell/mixins/resource-fetch';

import PageSwitch from '../components/PageSwitch.vue';
export default {
  components: {
    PageSwitch,
    ResourceTable
  },
  mixins: [ResourceFetch],
  props:  {
    resource: {
      type:     String,
      required: true,
    },
    schema: {
      type:     Object,
      required: true,
    },
    useQueryParamsForSimpleFiltering: {
      type:    Boolean,
      default: false
    }
  },
  async fetch() {
    this.$initializeFetchData(this.resource);
    await this.$fetchType(this.resource);
  },
};
</script>
