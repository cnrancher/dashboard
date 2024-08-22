<script>
import LazyImage from '@shell/components/LazyImage';
import { get } from '@shell/utils/object';
import capitalize from 'lodash/capitalize';
import { ROWS_PER_PAGE } from '@shell/store/prefs';

export default {
  components: { LazyImage },

  props: {
    rows: {
      type:     Array,
      required: true,
    },

    keyField: {
      type:    String,
      default: 'key',
    },
    iconField: {
      type:    String,
      default: 'icon',
    },
    nameField: {
      type:    String,
      default: 'name',
    },
    descriptionField: {
      type:    String,
      default: 'description',
    },
    sideLabelField: {
      type:    String,
      default: 'sideLabel',
    },
    disabledField: {
      type:    String,
      default: 'disabled',
    },

    asLink: {
      type:    Boolean,
      default: false,
    },
    linkField: {
      type:    String,
      default: 'link'
    },
    targetField: {
      type:    String,
      default: 'target',
    },
    rel: {
      type:    String,
      default: 'noopener noreferrer nofollow'
    },

    noDataKey: {
      type:    String,
      default: 'sortableTable.noRows',
    },

    colorFor: {
      type:    Function,
      default: (r, idx) => `color${ (idx % 8) + 1 }`,
    },

    /**
     * Inherited global identifier prefix for tests
     * Define a term based on the parent component to avoid conflicts on multiple components
     */
    componentTestid: {
      type:    String,
      default: 'select-icon-grid'
    },

    iframeSrcField: {
      type:    String,
      default: 'iframeSrc'
    },
  },

  data() {
    return { currentPage: 1 };
  },

  computed: {
    pageSize() {
      // return 10;

      return parseInt(this.$store.getters['prefs/get'](ROWS_PER_PAGE), 10) || 50;
    },
    total() {
      return this.rows.length;
    },
    pageCount() {
      if (this.pageSize <= 0 || this.total === 0) {
        return 1;
      }

      return Math.ceil(this.total / this.pageSize);
    },
    indexFrom() {
      return Math.max(0, 1 + this.pageSize * (this.currentPage - 1));
    },

    indexTo() {
      return Math.min(this.total, this.indexFrom + this.pageSize - 1);
    },
    pageData() {
      return this.rows.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    },

    pagingDisplay() {
      const opt = {
        count: this.total,
        pages: this.pageCount,
        from:  this.indexFrom,
        to:    this.indexTo,
      };

      return this.$store.getters['i18n/t']('sortableTable.paging.generic', opt);
    },
  },
  methods: {
    get,

    isDisabled(idx) {
      return get(this.rows[idx], this.disabledField) === true;
    },

    select(row, idx) {
      if ( this.isDisabled(idx) ) {
        return;
      }

      if (row.isIframe) {
        this.$router.push({
          page:   'iframe',
          name:   'c-cluster-explorer-navLinks-page',
          params: { cluster: this.$route.params.cluster },
          query:  { link: row.iframeSrc }
        });
      }

      this.$emit('clicked', row, idx);
    },
    capitalize,
    setPage(num) {
      if (this.currentPage === num) {
        return;
      }

      this.currentPage = num;
    },

    goToPage(which) {
      let page;

      switch (which) {
      case 'first':
        page = 1;
        break;
      case 'prev':
        page = Math.max(1, this.currentPage - 1 );
        break;
      case 'next':
        page = Math.min(this.pageCount, this.currentPage + 1 );
        break;
      case 'last':
        page = this.pageCount;
        break;
      }

      this.setPage(page);
    },
  },
};
</script>

<template>
  <div>
    <div
      v-if="rows.length"
      class="grid"
    >
      <div
        :is="asLink && !r.isIframe ? 'a' : 'div'"
        v-for="(r, idx) in pageData"
        :key="get(r, keyField)"
        :href="asLink ? get(r, !r.isIframe ? linkField : iframeSrcField) : null"
        :target="get(r, targetField)"
        :rel="rel"
        class="item"
        :data-testid="componentTestid + '-' + idx"
        :class="{
          'has-description': !!get(r, descriptionField),
          'has-side-label': !!get(r, sideLabelField), [colorFor(r, idx)]: true, disabled: get(r, disabledField) === true
        }"
        @click="select(r, idx)"
      >
        <div
          class="side-label"
          :class="{'indicator': true }"
        />
        <div v-if="r.deploysOnWindows">
          <label class="deploys-os-label">
            {{ t('catalog.charts.deploysOnWindows') }}
          </label>
        </div>
        <div v-if="r.windowsIncompatible">
          <label class="os-incompatible-label">
            {{ t('catalog.charts.windowsIncompatible') }}
          </label>
        </div>
        <div
          v-if="get(r, sideLabelField)"
          class="side-label"
          :class="{'indicator': false }"
        >
          <label>{{ get(r, sideLabelField) }}</label>
        </div>

        <div class="logo">
          <i
            v-if="r.iconClass"
            :class="r.iconClass"
          />
          <LazyImage
            v-else
            :src="get(r, iconField)"
          />
        </div>
        <h4 class="name">
          {{ get(r, nameField) }}
        </h4>
        <div
          v-if="get(r, descriptionField)"
          class="description"
        >
          {{ get(r, descriptionField) }}
        </div>
      </div>
    </div>
    <div
      v-else
      class="m-50 text-center"
    >
      <h1 v-t="noDataKey" />
    </div>
    <div
      v-if="pageCount > 1"
      class="paging"
    >
      <button
        type="button"
        class="btn btn-sm role-multi-action"
        :disabled="currentPage == 1"
        @click="goToPage('first')"
      >
        <i class="icon icon-chevron-beginning" />
      </button>
      <button
        type="button"
        class="btn btn-sm role-multi-action"
        :disabled="currentPage == 1"
        @click="goToPage('prev')"
      >
        <i class="icon icon-chevron-left" />
      </button>
      <span>
        {{ pagingDisplay }}
      </span>
      <button
        type="button"
        class="btn btn-sm role-multi-action"
        :disabled="currentPage == pageCount"
        @click="goToPage('next')"
      >
        <i class="icon icon-chevron-right" />
      </button>
      <button
        type="button"
        class="btn btn-sm role-multi-action"
        :disabled="currentPage == pageCount"
        @click="goToPage('last')"
      >
        <i class="icon icon-chevron-end" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  $height: 135px;
  $side: 15px;
  $margin: 10px;
  $logo: 60px;
  $hover-border-width: 1px;

  .grid {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin: 0 -1*$margin;

    @media only screen and (min-width: map-get($breakpoints, '--viewport-4')) {
      .item {
        width: 100%;
      }
    }
    @media only screen and (min-width: map-get($breakpoints, '--viewport-7')) {
      .item {
        width: calc(50% - 2 * #{$margin});
      }
    }
    @media only screen and (min-width: map-get($breakpoints, '--viewport-9')) {
      .item {
        width: calc(33.33333% - 2 * #{$margin});
      }
    }
    @media only screen and (min-width: map-get($breakpoints, '--viewport-12')) {
      .item {
        width: calc(25% - 2 * #{$margin});
      }
    }

    $color: var(--body-text) !important;

    .item {
      height: $height;
      margin: $margin;
      padding: $margin;
      position: relative;
      //border-radius: calc( 1.5 * var(--border-radius));
      border: 1px solid var(--border);
      text-decoration: none !important;
      color: $color;

      &:hover:not(.disabled) {
        box-shadow: 0 0 30px var(--shadow);
        transition: box-shadow 0.1s ease-in-out;
        cursor: pointer;
        text-decoration: none !important;
      }

      .side-label {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 2px 5px;

        &.indicator {
          top: 0;
          right: 0;
          left: 0;
        }

      }

      .side-label label, label.deploys-os-label, label.os-incompatible-label{
          font-size: 12px;
          line-height: 12px;
          text-align: center;
          display: block;
          white-space: no-wrap;
          text-overflow: ellipsis;
          // Override default form label properties
          color: var(--card-badge-text);
          margin: 0;
      }

      .deploys-os-label, .os-incompatible-label {
        position: absolute;
        bottom: 10px;
        padding: 2px 5px;
        right: 10px;
      }

      label.os-incompatible-label {
        color: var(--warning);
        background-color: var(--warning-banner-bg)
      }

      .logo {
        text-align: center;
        position: absolute;
        left: $side+$margin;
        top: math.div(($height - $logo), 2);
        width: $logo;
        height: $logo;
        border-radius: calc(2 * var(--border-radius));
        overflow: hidden;
        background-color: white;

        img {
          width: $logo - 4px;
          height: $logo - 4px;
          object-fit: contain;
          position: relative;
          top: 2px;
        }

        i {
          background-position: center;
          background-repeat: no-repeat;
          display: flex;
          height: $logo - 4px;
          margin: 2px;
          width: $logo - 4px;
        }
      }

      &.rancher {
        .side-label, .deploys-os-label {
          background-color: var(--app-rancher-accent);
          label {
            color: var(--app-rancher-accent-text);
          }
        }
        &:hover:not(.disabled) {
          border-color: var(--app-rancher-accent);
        }
      }

      &.partner {
        .side-label, .deploys-os-label {
          background-color: var(--app-partner-accent);
          label {
            color: var(--app-partner-accent-text);
          }
        }
        &:hover:not(.disabled) {
          border-color: var(--app-partner-accent);
        }
      }

      // @TODO figure out how to templatize these
      &.color1 {
        .side-label, .deploys-os-label { background-color: var(--app-color1-accent); label { color: var(--app-color1-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color1-accent); }
      }
      &.color2 {
        .side-label, .deploys-os-label { background-color: var(--app-color2-accent); label { color: var(--app-color2-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color2-accent); }
      }
      &.color3 {
        .side-label, .deploys-os-label { background-color: var(--app-color3-accent); label { color: var(--app-color3-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color3-accent); }
      }
      &.color4 {
        .side-label, .deploys-os-label { background-color: var(--app-color4-accent); label { color: var(--app-color4-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color4-accent); }
      }
      &.color5 {
        .side-label, .deploys-os-label { background-color: var(--app-color5-accent); label { color: var(--app-color5-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color5-accent); }
      }
      &.color6 {
        .side-label, .deploys-os-label { background-color: var(--app-color6-accent); label { color: var(--app-color6-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color6-accent); }
      }
      &.color7 {
        .side-label, .deploys-os-label { background-color: var(--app-color7-accent); label { color: var(--app-color7-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color7-accent); }
      }
      &.color8 {
        .side-label, .deploys-os-label { background-color: var(--app-color8-accent); label { color: var(--app-color8-accent-text); } }
        &:hover:not(.disabled) { border-color: var(--app-color8-accent); }
      }

      &:hover:not(.disabled) {
        background-position: right center;
        border-left-width: $hover-border-width;
        //padding-left: $margin+(-$hover-border-width);
        .logo {
          left: 1px+$side+$margin+(-$hover-border-width);
        }
        .name {
          margin-left: $side+$logo+$margin+1px+(-$hover-border-width);

        }
      }

      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: $height - (2 * $margin);
        margin: 0;
        margin-left: $side+$logo+$margin;
      }

      &.has-description {
        .name {
          margin-top: $margin;
          line-height: initial;
        }

        &.has-side-label {
          .name {
            margin-top: $margin + 5px;
          }
        }
      }

      .description {
        margin-top: $margin;
        margin-left: $side+$logo+$margin;
        margin-right: $margin;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-muted) !important;
      }
    }

    .disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .paging {
    margin-top: 10px;
    text-align: center;

    SPAN {
      display: inline-block;
      min-width: 200px;
    }
  }
</style>
