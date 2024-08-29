<script>
import { copyTextToClipboard } from '@shell/utils/clipboard';
import { exceptionToErrorsArray } from '@shell/utils/error';
export default {
  props: {
    text: {
      type:     String,
      required: true,
    },
  },

  data() {
    return { copied: false };
  },

  methods: {
    clicked(event) {
      if (!this.copied) {
        event.preventDefault();
        copyTextToClipboard(this.text).then(() => {
          this.copied = true;

          let t = event.target;

          if (t.tagName === 'I') {
            t = t.parentElement || t;
          }
          setTimeout(() => {
            this.copied = false;
          }, 500);
        }).catch((e) => {
          this.$emit('error', exceptionToErrorsArray(e));
        });
      }
    },
  }
};
</script>

<template>
  <a
    class="copy-to-clipboard-icon"
    :class="{ 'copied': copied }"
    href="#"
    @click="clicked"
  >
    <i
      class="icon"
      :class="{ 'icon-copy': !copied, 'icon-checkmark': copied}"
    />
  </a>
</template>
<style lang="scss" scoped>
  .copy-to-clipboard-icon {
    &.copied {
      pointer-events: none;
      color: var(--success);
    }
  }
</style>
