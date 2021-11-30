<script>
import EmbeddedPageView from '@/components/EmberPageView';
import { mapGetters } from 'vuex';
import { PROJECT_ID } from '@/config/query-params';

export default {
  components: { EmbeddedPageView },

  computed: {
    ...mapGetters(['currentCluster']),
    pages() {
      return { 'project-resource-quota': `/p/${ this.currentCluster.id }:${ this.$route.query[PROJECT_ID] }/quotas-cn` };
    }
  },

};
</script>

<template>
  <EmbeddedPageView :pages="pages" />
</template>
