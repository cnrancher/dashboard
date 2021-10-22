<script>
import EmbeddedPageView from '@/components/EmberPageView';
import { mapGetters } from 'vuex';
import { PROJECT_ID } from '@/config/query-params';

export default {
  components: { EmbeddedPageView },

  computed: {
    ...mapGetters(['currentCluster']),
    pages() {
      return {
        'cluster-audit-log': `/c/${ this.currentCluster.id }/audit-log`,
        'project-audit-log': `/p/${ this.currentCluster.id }:${ this.$route.query[PROJECT_ID] }/audit-log`
      };
    }
  },

};
</script>

<template>
  <EmbeddedPageView :pages="pages" />
</template>
