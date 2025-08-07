<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

import { ROWS_PER_PAGE } from '@shell/store/prefs';

const props = defineProps({
  total: {
    type:     Number,
    required: true
  },
  rowsPerPage: {
    type:    Number,
    default: 0
  },
  pagingLabel: {
    type:    String,
    default: 'sortableTable.paging.generic'
  },
  disabled: {
    type:    Boolean,
    default: false
  },
  page: {
    type:    Number,
    default: 1
  }
});
const emits = defineEmits(['update:page']);
const store = useStore();
const perPage = computed(() => {
  let out = props.rowsPerPage || 0;

  if ( out <= 0 ) {
    out = parseInt(store.getters['prefs/get'](ROWS_PER_PAGE), 10) || 0;
  }

  // This should ideally never happen, but the preference value could be invalid, so return something...
  if ( out <= 0 ) {
    out = 10;
  }

  return out;
});

const indexFrom = computed(() => {
  return Math.max(0, 1 + perPage.value * (props.page - 1));
});

const indexTo = computed(() => {
  return Math.min(props.total, indexFrom.value + perPage.value - 1);
});

const totalPages = computed(() => {
  return Math.ceil(props.total / perPage.value );
});

const pagingDisplay = computed(() => {
  const opt = {
    count: props.total,
    pages: totalPages.value,
    from:  indexFrom.value,
    to:    indexTo.value,
  };

  return store.getters['i18n/t'](props.pagingLabel, opt);
});

const setPage = (num) => {
  if (props.page === num) {
    return;
  }

  emits('update:page', num);
};

const goToPage = (which) => {
  let p;

  switch (which) {
  case 'first':
    p = 1;
    break;
  case 'prev':
    p = Math.max(1, props.page - 1 );
    break;
  case 'next':
    p = Math.min(totalPages.value, props.page + 1 );
    break;
  case 'last':
    p = totalPages.value;
    break;
  }

  setPage(p);
};
</script>
<template>
  <div
    v-if="total"
    class="paging"
  >
    <button
      type="button"
      class="btn btn-sm role-multi-action"
      data-testid="pagination-first"
      :disabled="page == 1 || disabled"
      role="button"
      :aria-label="t('sortableTable.ariaLabel.firstPageBtn')"
      @click="goToPage('first')"
    >
      <i
        class="icon icon-chevron-beginning"
        :alt="t('sortableTable.alt.firstPageBtn')"
      />
    </button>
    <button
      type="button"
      class="btn btn-sm role-multi-action"
      data-testid="pagination-prev"
      :disabled="page == 1 || disabled"
      role="button"
      :aria-label="t('sortableTable.ariaLabel.prevPageBtn')"
      @click="goToPage('prev')"
    >
      <i
        class="icon icon-chevron-left"
        :alt="t('sortableTable.alt.prevPageBtn')"
      />
    </button>
    <span>
      {{ pagingDisplay }}
    </span>
    <button
      type="button"
      class="btn btn-sm role-multi-action"
      data-testid="pagination-next"
      :disabled="page == totalPages || disabled"
      role="button"
      :aria-label="t('sortableTable.ariaLabel.nextPageBtn')"
      @click="goToPage('next')"
    >
      <i
        class="icon icon-chevron-right"
        :alt="t('sortableTable.alt.nextPageBtn')"
      />
    </button>
    <button
      type="button"
      class="btn btn-sm role-multi-action"
      data-testid="pagination-last"
      :disabled="page == totalPages || disabled"
      role="button"
      :aria-label="t('sortableTable.ariaLabel.lastPageBtn')"
      @click="goToPage('last')"
    >
      <i
        class="icon icon-chevron-end"
        :alt="t('sortableTable.alt.lastPageBtn')"
      />
    </button>
  </div>
</template>
<style scoped>
.paging {
    margin-top: 10px;
    text-align: center;

    SPAN {
      display: inline-block;
      min-width: 200px;
    }
  }
</style>
