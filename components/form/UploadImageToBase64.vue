<script>
import Banner from '@/components/Banner';
import { _EDIT, _VIEW } from '@/config/query-params';

export default {
  components: { Banner },

  props: {
    imgSrc: {
      default: '',
      type:    String,
    },

    label: {
      default: 'Upload Icon',
      type:    String,
    },

    accept: {
      default: 'image/*',
      type:    String,
    },

    mode: {
      type:    String,
      default: _EDIT,
    },

    multiple: {
      type:    Boolean,
      default: false
    },

    disabled: {
      type:    Boolean,
      default: false,
    },

    width: {
      type:    Number,
      default: 150,
    },

    height: {
      type:    Number,
      default: 150,
    },

    level: {
      type:    Number,
      default: 0.5,
    },
  },

  data() {
    return { fileTooMax: false };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },
  },

  methods: {
    fileChange() {
      const file = this.$refs.uploader.files[0];

      if (file.size > 1024 * 1024) {
        this.fileTooMax = true;

        return;
      }

      this.fileTooMax = false;
      this.setBase64(file, this.setBase64Icon);
    },

    setBase64Icon(result) {
      this.$emit('selected', result);
    },

    setBase64(file, fn) {
      if (!window.FileReader) {
        throw new Error('Failed to read data.');
      }
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onloadend = () => {
        this.imgCompress(reader, (base64) => {
          typeof fn === 'function' && fn(base64 || reader.result );
        });
      };
    },

    imgCompress(reader, callback) {
      // Picture over size compression
      const img = new Image();
      const maxSize = {
        width:  this.width,
        height: this.height,
        level:  this.level
      };

      img.src = reader.result;
      img.onload = function() {
        const w = this.naturalWidth; const h = this.naturalHeight; let resizeW = 0; let resizeH = 0;

        if (w > maxSize.width || h > maxSize.height) {
          const multiple = Math.max(w / maxSize.width, h / maxSize.height);

          resizeW = w / multiple;
          resizeH = h / multiple;
        } else {
          // If the image size is smaller than the maximum limit, it is uploaded directly without compression
          return callback();
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = resizeW;
        canvas.height = resizeH;
        ctx.drawImage(img, 0, 0, resizeW, resizeH);
        const base64 = canvas.toDataURL('image/jpeg', maxSize.level);

        callback(base64);
      };
    },

    selectFile() {
      // Clear the value so the user can reselect the same file again
      this.$refs.uploader.value = null;
      this.$refs.uploader.click();
    },

    removeFile() {
      this.$refs.uploader.value = null;
      this.setBase64Icon(null);
    }
  },
};
</script>

<template>
  <div>
    <div>
      <img :src="imgSrc" alt="" class="mb-5">
      <Banner v-if="fileTooMax" color="warning">
        {{ t('navlink.group.uploader.tooMaxError') }}
      </Banner>
    </div>

    <button v-show="!imgSrc" :disabled="isView || disabled" type="button" class="role-tertiary btn" @click="selectFile">
      <span>{{ label }}</span>
      <input
        ref="uploader"
        type="file"
        class="hide"
        :multiple="multiple"
        :accept="accept"
        @change="fileChange"
      />
    </button>
    <button
      v-show="imgSrc"
      :disabled="isView || disabled"
      type="button"
      class="role-tertiary btn"
      @click="removeFile"
    >
      {{ t('navlink.group.uploader.removeIcon') }}
    </button>
  </div>
</template>
