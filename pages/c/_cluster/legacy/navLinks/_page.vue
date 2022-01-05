<script>
import Banner from '@/components/Banner';

export default {
  components: { Banner },

  data() {
    return {
      loading: false, error: false, interval: null, initialUrl: this.$route.query?.link || ''
    };
  },

  methods: {
    reload(ev) {
      ev.preventDefault();
      this.$refs.frame.contentWindow.location.reload();
    },
  }
};
</script>

<template>
  <div class="navlink-iframe">
    <Banner v-if="error" color="error" style="z-index: 1000">
      <div class="text-center">
        {{ t('navlink.iframe.failedToLoad') }} <a href="#" @click="reload">{{ t('navlink.iframe.reload') }}</a>
      </div>
    </Banner>
    <iframe
      v-show="!error"
      ref="frame"
      :class="{loading, frame: true}"
      :src="initialUrl"
      frameborder="0"
      scrolling="no"
    />
  </div>
</template>

<style lang='scss' scoped>
  .navlink-iframe{
    position: relative;
    min-height: 100%;
    min-width: 100%;

    iframe {
      position: absolute;
      left: 0;
      right: 0;
      top: 20px;
      bottom: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;

      &.loading {
        visibility: hidden;
      }
    }
  }
</style>
