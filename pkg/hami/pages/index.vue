<template>
  <PageSwitch>
    <Loading v-if="$fetchState.pending" />
    <section v-else>
      <header class="row">
        <div class="col span-12">
          <h1>
            <t k="rancherHami.overview.title" />
          </h1>
          <div>
            <t
              k="rancherHami.overview.subtitle"
              :raw="true"
            />
          </div>
        </div>
      </header>
      <div
        v-if="externalLinks && externalLinks.length"
        class="links"
      >
        <div
          v-for="fel in externalLinks"
          :key="fel.label"
          class="link-container"
        >
          <a
            :href="fel.link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="link-logo">
              <LazyImage :src="fel.iconSrc" />
            </div>
            <div class="link-content">
              <t :k="fel.label" />
              <i class="icon icon-external-link pull-right" />
              <hr>
              <div class="description"><t :k="fel.description" /></div>
            </div>
          </a>
        </div>
      </div>

      <IconMessage
        v-else
        class="mt-40 mb-20"
        icon="icon-longhorn"
        :vertical="true"
      >
        <template #message>
          <p>
            {{ t('rancherHami.overview.uiServiceUnavailable') }}
          </p>
        </template>
      </IconMessage>
    </section>
  </PageSwitch>
</template>
<script>
import PageSwitch from '../components/PageSwitch.vue';
import { mapGetters } from 'vuex';
import LazyImage from '@shell/components/LazyImage';
import { SERVICE } from '@shell/config/types';
import IconMessage from '@shell/components/IconMessage';

export default {
  components: {
    PageSwitch, LazyImage, IconMessage
  },
  async fetch() {
    if ( this.$store.getters['cluster/schemaFor'](SERVICE) ) {
      this.uiServices = await this.$store.dispatch('cluster/findMatching', {
        type:     SERVICE,
        selector: 'app.kubernetes.io\/name=hami-webui'
      });
    }
  },

  data() {
    return {
      externalLinks: [],
      harmiImgSrc:   require('../assets/hami-logo.png'),
      uiServices:    []
    };
  },

  computed: { ...mapGetters(['currentCluster']) },

  mounted() {
    this.externalLinks = [
      {
        enabled:     true,
        iconSrc:     this.harmiImgSrc,
        label:       'rancherHami.overview.linkedList.hami.label',
        description: 'rancherHami.overview.linkedList.hami.description',
        link:        `/k8s/clusters/${ this.currentCluster.id }/api/v1/namespaces/${ this.uiServices?.[0]?.metadata?.namespace ?? 'hami' }/services/http:rancher-hami-hami-webui:3000/proxy/`
      },
    ];
  },
};

</script>
