<template>
  <div class="row mt-20">
    <div class="col span-12">
      <div class="mb-10">
        <p class="helper-text">
          <t k="hamiResourceReservation.title" />
        </p>
      </div>
      <div
        v-for="(item, idx) in limits"
        :key="item[idKey]"
        class="row mb-20"
      >
        <div class="col span-5">
          <LabeledSelect
            v-model:value="item.name"
            :label="t('hamiResourceReservation.label.name')"
            :mode="mode"
            :options="remainingResources(item.name)"
            :tooltip="item.name === 'nvidia.com/gpu' ? t('hamiResourceReservation.keyConflictTips') : null"
            @change="updateHamiResources()"
          />
        </div>
        <div class="col span-5">
          <LabeledInput
            :value="item.value"
            :placeholder="t('hamiResourceReservation.placeholder')"
            :label="t('hamiResourceReservation.label.value')"
            :mode="mode"
            type="number"
            min="0"
            step="1"
            @input="(v) => item.value = v.target.value.replace(/[^0-9]/g, '')"
            @change="updateHamiResources()"
          />
        </div>
        <div class="col span-2">
          <button
            type="button"
            :disabled="isView"
            class="btn role-link"
            @click="remove(item, idx)"
          >
            {{ t('generic.remove') }}
          </button>
        </div>
      </div>
      <button
        v-if="!isView"
        type="button"
        class="btn role-tertiary add"
        :disabled="isView || addDisabled"
        @click="add()"
      >
        {{ t('generic.add') }}
      </button>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { _VIEW } from '@shell/config/query-params';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { LabeledInput } from '@components/Form/LabeledInput';
import { parseSi } from '@shell/utils/units';

const ID_KEY = Symbol('id');
const serialMaker = function() {
  let prefix = '';
  let seq = 0;

  return {
    setPrefix(p) {
      prefix = p;
    },
    setSeq(s) {
      seq = s;
    },
    genSym() {
      const result = prefix + seq;

      seq += 1;

      return result;
    }
  };
}();

export default {
  emits: ['update:value', 'add', 'remove'],
  props: {
    mode: {
      type:     String,
      required: true,
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },
    options: {
      type: Array,
      default() {
        return [];
      }
    }
  },
  data() {
    serialMaker.setPrefix('item_');
    serialMaker.setSeq(0);
    const limits = Object.entries(this.value).map(([k, v]) => ({
      name: k, value: parseSi(`${ v }`), [ID_KEY]: serialMaker.genSym()
    }));

    return { limits, idKey: ID_KEY };
  },
  computed: {
    ...mapGetters(['currentCluster']),
    isView() {
      return this.mode === _VIEW;
    },
    addDisabled() {
      return this.limits.length === this.options.length;
    },

  },
  watch: {
    value(v) {
      const k = 'nvidia.com/gpu';
      const limitValue = v[k];

      if (limitValue) {
        const limit = this.limits.find((item) => item.name === k);

        if (limit) {
          limit.value = limitValue;
        }
      }
    }
  },
  methods: {
    remainingResources(current) {
      let resources = this.limits.map((item) => item.name).filter((item) => item);

      if (current) {
        resources = resources.filter((item) => item !== current);
      }

      return this.options.filter((o) => !resources.includes(o.value));
    },
    updateHamiResources() {
      this.$emit('update:value', this.limits.reduce((t, c) => {
        t[c.name] = c.value;

        return t;
      }, {}));
    },
    remove(row, index) {
      this.$emit('remove', { row, index });
      this.limits.splice(index, 1);
      this.updateHamiResources();
    },
    add() {
      const item = this.remainingResources()?.[0];

      if (item) {
        let value = null;
        const k = 'nvidia.com/gpu';

        if (item.value === k && this.value[k]) {
          value = parseSi(`${ this.value[k] }`);
        }
        this.limits.push({ name: item.value, value });
        this.$emit('add');
      }
    },
    update() {
      this.updateHamiResources();
    }
  },
  components: {
    LabeledSelect,
    LabeledInput
  }
};
</script>
