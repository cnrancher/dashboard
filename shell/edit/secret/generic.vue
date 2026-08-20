<script>
import KeyValue from '@shell/components/form/KeyValue';
import FileSelector from '@shell/components/form/FileSelector';
import { _VIEW } from '@shell/config/query-params';
import { base64Encode } from '@shell/utils/crypto';
import { set } from '@shell/utils/object';

const VALID_DATA_KEY = /^[-._a-zA-Z0-9]*$/;

// pandaria
export const BINARY_FILE_BYTE_LIMIT = 750 * 1024;

export default {
  components: { KeyValue, FileSelector },

  props: {
    value: {
      type:     Object,
      required: true,
    },

    mode: {
      type:     String,
      required: true,
    },

    hideSensitiveData: {
      type:    Boolean,
      default: true,
    }
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },

    // pandaria
    binaryFileByteLimit() {
      return BINARY_FILE_BYTE_LIMIT;
    },
  },

  methods: {
    fileModifier(name, value) {
      if (!VALID_DATA_KEY.test(name)) {
        name = name
          .split('')
          .map((c) => VALID_DATA_KEY.test(c) ? c : '_')
          .join('');
      }

      return { name, value };
    },

    onBinaryFileSelected(file) {
      if (!(file.value instanceof ArrayBuffer)) {
        return;
      }

      const { name: key } = this.fileModifier(file.name, file.value);
      const encoded = base64Encode(new Uint8Array(file.value));

      const data = {
        ...(this.value.data || {}),
        [key]: encoded,
      };

      set(this.value, 'data', data);
    },

    onReadBinaryError() {
      this.$store.dispatch('growl/error', {
        title:   this.t('generic.notification.title.error'),
        message: this.t('secret.readBinaryFileTooLarge'),
      });
    },
  }
};
</script>

<template>
  <div class="secret-generic-cn">
    <KeyValue
      key="data"
      v-model:value="value.data"
      :mode="mode"
      :initial-empty-row="true"
      :handle-base64="true"
      :value-trim="false"
      :add-allowed="true"
      :read-allowed="true"
      :value-concealed="isView && hideSensitiveData"
      :file-modifier="fileModifier"
      :parse-lines-from-file="true"
      read-icon=""
      add-icon=""
    />
    <div
      v-if="!isView"
      class="secret-generic-binary-upload footer mt-10"
    >
      <FileSelector
        :aria-label="t('generic.ariaLabel.readBinaryKeyValue')"
        class="role-tertiary"
        :label="t('secret.readBinaryFromFile')"
        :include-file-name="true"
        :read-as-array-buffer="true"
        :byte-limit="binaryFileByteLimit"
        :show-growl-error="false"
        data-testid="read_binary_secret_file_button"
        @selected="onBinaryFileSelected"
        @error="onReadBinaryError"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.secret-generic-cn {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;

  // Flatten KeyValue footer so Add / Read / Binary sit on one row after the grid.
  :deep(.key-value) {
    display: contents;
  }

  :deep(.key-value > .footer) {
    display: contents;
  }

  .secret-generic-binary-upload {
    display: contents;

    :deep(.file-selector) {
      text-transform: initial;
    }
  }

  :deep(.key-value > .clearfix),
  :deep(.key-value > .kv-container) {
    flex: 0 0 100%;
    width: 100%;
  }

  :deep(.btn),
  :deep(.file-selector) {
    flex: 0 0 auto;
    width: auto;
  }
}
</style>
