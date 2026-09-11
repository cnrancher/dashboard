// useCreateEditView.js
import { ref, computed } from 'vue';
import { _EDIT } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { clear } from '@shell/utils/array';
import { handleConflict } from '@shell/plugins/dashboard-store/normalize';
import { sortBy } from '@shell/utils/sort';
import { cleanupNormanClusterAgentConfiguration } from '../util/agentConfigurationCleanup.js';

const BEFORE_SAVE_HOOKS = '_beforeSaveHooks';
const AFTER_SAVE_HOOKS = '_afterSaveHooks';

export function useCreateEditView(props, context) {
  const {
    normanCluster, ackConfig, nodePools, state
  } = context;

  const errors = ref([]);
  const $router = useRouter();
  const $store = useStore();
  const isEdit = computed(() => props.mode === _EDIT);
  const hookState = { [BEFORE_SAVE_HOOKS]: [], [AFTER_SAVE_HOOKS]: [] };
  let nextHookId = 1;

  function registerHook(key, boundFn, name, priority = 99, boundFnContext) {
    if (!name) {
      name = `hook_${ nextHookId }`;
      nextHookId++;
    }

    const hooks = hookState[key];
    const entry = hooks.find((hook) => hook.name === name);

    if (entry) {
      entry.priority = priority;
      entry.fn = boundFn;
      entry.fnContext = boundFnContext;
    } else {
      hooks.push({
        name, priority, fn: boundFn, fnContext: boundFnContext,
      });
    }
  }

  function registerBeforeHook(boundFn, name, priority = 99, boundFnContext) {
    registerHook(BEFORE_SAVE_HOOKS, boundFn, name, priority, boundFnContext);
  }

  function registerAfterHook(boundFn, name, priority = 99, boundFnContext) {
    registerHook(AFTER_SAVE_HOOKS, boundFn, name, priority, boundFnContext);
  }

  async function applyHooks(key, ...args) {
    const hooks = sortBy(hookState[key] || [], ['priority', 'name']);
    const out = {};

    for (const x of hooks) {
      out[x.name] = await x.fn.apply(x.fnContext || null, args);
    }

    return out;
  }

  const doneRoute = computed(() => {
    return props.value?.listLocation?.name;
  });

  function done() {
    if (!doneRoute.value) {
      return;
    }
    $router.replace({ name: doneRoute.value });
  }

  async function conflict() {
    return await handleConflict(
      props.initialValue?.toJSON(),
      props.value,
      props.liveValue,
      $store.getters,
      $store,
      props.storeOverride || $store.getters['currentStore'](props.value.type)
    );
  }

  async function save(buttonDone, url, depth = 0) {
    if (errors.value) {
      clear(errors.value);
    }

    try {
      await applyHooks(BEFORE_SAVE_HOOKS, normanCluster.value);
      await actuallySave(url);
      await applyHooks(AFTER_SAVE_HOOKS, normanCluster.value);
      buttonDone && buttonDone(true);
      done();
    } catch (err) {
      if (err.status === 409 && depth === 0 && isEdit.value) {
        const conflictErrors = await conflict();

        if (conflictErrors === false) {
          return save(buttonDone, url, depth + 1);
        } else {
          errors.value = conflictErrors;
        }
      } else {
        errors.value = exceptionToErrorsArray(err);
      }
      setErrors(errors.value);
      buttonDone && buttonDone(false);
    }
  }

  async function actuallySave() {
    cleanupNormanClusterAgentConfiguration(normanCluster.value);

    if (ackConfig.value.imported && ackConfig.value.cluster_id) {
      normanCluster.value.ackConfig = ackConfig.value;
      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    // 保存时如果自动创建VPC，则删除VPC ID 以及 nodepool 就不需要传入 v_switch_ids 了。如果手动选择VPC，则清空Zone ID列表。
    const autoCreateVpc = state.value.autoCreateVpc === 'auto';

    if (autoCreateVpc) {
      delete ackConfig.value.vpcId;
    } else {
      ackConfig.value.zoneIds = [];
    }
    // 不同网络插件传值不同
    if (state.value.isFlannel) {
      delete ackConfig.value.podVswitchIds;
    } else {
      delete ackConfig.value.containerCidr;
    }
    ackConfig.value.node_pool_list = nodePools.value;
    ackConfig.value.name = normanCluster.value.name;
    normanCluster.value.ackConfig = formatNodePoolList(ackConfig, autoCreateVpc);
    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function formatNodePoolList(ackConfig, autoCreateVpc) {
    const nodePools = ackConfig.value.node_pool_list;

    ackConfig.value.node_pool_list = nodePools.map((item) => {
      const node = {
        ...item,
        nodepool_id:          item.nodepool_id,
        name:                 item.name,
        instance_types:       item.instance_types,
        instances_num:        item.instances_num,
        key_pair:             item.key_pair,
        platform:             item.platform,
        system_disk_category: item.system_disk_category,
        system_disk_size:     item.system_disk_size,
        runtime:              item.runtime,
        runtime_version:      item.runtime_version,
        data_disk:            (item.data_disk || []).filter((disk) => Number(disk.size) !== 0),
        // All nodepools use the same v_switch_ids
        v_switch_ids:         autoCreateVpc ? [] : state.value.vswitchIds
      };

      delete node.isNew;
      delete node.size;
      delete node.category;

      return node;
    });

    return ackConfig.value;
  }

  function setErrors(newErrors) {
    state.value.errors = newErrors;
  }

  return {
    doneRoute,
    save,
    registerBeforeHook,
    registerAfterHook,
  };
}
