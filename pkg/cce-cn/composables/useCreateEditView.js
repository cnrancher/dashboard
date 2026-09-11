// useCreateEditView.js
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { base64Encode } from '@shell/utils/crypto';
import { sortBy } from '@shell/utils/sort';
import { cleanupNormanClusterAgentConfiguration } from '../util/agentConfigurationCleanup.js';

const BEFORE_SAVE_HOOKS = '_beforeSaveHooks';
const AFTER_SAVE_HOOKS = '_afterSaveHooks';

export function useCreateEditView(props, context) {
  const {
    normanCluster, cceConfig, nodePools, state
  } = context;

  const $router = useRouter();
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

  async function save(buttonDone, url) {
    try {
      await applyHooks(BEFORE_SAVE_HOOKS, normanCluster.value);
      await actuallySave(url);
      await applyHooks(AFTER_SAVE_HOOKS, normanCluster.value);
      buttonDone && buttonDone(true);
      done();
    } catch (err) {
      state.value.errors = exceptionToErrorsArray(err);
      buttonDone && buttonDone(false);
    }
  }

  async function actuallySave() {
    cleanupNormanClusterAgentConfiguration(normanCluster.value);

    if (cceConfig.value.imported && cceConfig.value.clusterID) {
      normanCluster.value.cceConfig = cceConfig.value;
      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    normanCluster.value.cceConfig = formatCceConfig();

    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function formatCceConfig() {
    const nodePoolList = [];
    const {
      regionID,
      huaweiCredentialSecret,
      category,
      containerNetworkCidr,
      kubernetesSvcIPRange,
      containerNetworkMode,
      version,
      clusterFlavor,
      vpcId,
      subnetId,
      description,
      tags,
      authentiactionMode,
      eipType,
      eipChargeMode,
      eipBandwidthSize,
      securityGroup,
      clusterExternalIP,
      kubeProxyMode
    } = cceConfig.value;
    const eniNetwork = { subnets: state.value.eniNetworks };
    const eipSelection = state.value.eipSelection;

    nodePools.value.forEach((nodePool) => {
      const out = {
        name:             nodePool.name,
        type:             'vm',
        initialNodeCount: nodePool.initialNodeCount,
        nodeTemplate:     {
          flavor:          nodePool.flavor,
          availableZone:   nodePool.availableZone,
          operatingSystem: nodePool.operatingSystem,
          sshKey:          nodePool.sshKey,
          rootVolume:      {
            size: nodePool.rootVolumeSize,
            type: nodePool.rootVolumeType,
          },
          dataVolumes: [{
            size: nodePool.dataVolumeSize,
            type: nodePool.dataVolumeType,
          }],
          count:       1,
          billingMode: nodePool.billingMode,
          runtime:     nodePool.runtime,
        },
        customSecurityGroups: [],
      };

      if (nodePool.nodePoolID) {
        out.nodePoolID = nodePool.nodePoolID;
      }

      if (nodePool.billingMode === 1) {
        const validityPeriod = nodePool?.validityPeriod.split(' ');

        out.nodeTemplate.extendParam = {
          periodType:  validityPeriod[1],
          periodNum:   validityPeriod[0],
          isAutoRenew: nodePool.bmsIsAutoRenew
        };
      }

      nodePoolList.push(out);
    });

    const config = {
      name:             normanCluster.value.name,
      type:             'VirtualMachine',
      category,
      huaweiCredentialSecret,
      regionID,
      imported:         false,
      containerNetwork: {
        cidr: containerNetworkCidr,
        mode: containerNetworkMode
      },
      version,
      flavor:      clusterFlavor,
      hostNetwork: {
        vpcID:    vpcId === 'default' ? '' : vpcId,
        subnetID: subnetId === 'default' ? '' : subnetId,
        securityGroup,
      },
      kubernetesSvcIPRange,
      description,
      authentication: { mode: authentiactionMode },
      tags,
      publicAccess:   eipSelection !== 'none',
      nodePools:      nodePoolList,
      extendParam:    {},
      kubeProxyMode,
      eniNetwork,
    };

    // eip config
    if (config.publicAccess) {
      if (eipSelection === 'new') {
        config.publicIP = {
          createEIP: true,
          eip:       {
            ipType:    eipType,
            bandwidth: {
              chargeMode: eipChargeMode,
              size:       eipBandwidthSize,
              shareType:  'PER'
            }
          }
        };
      } else if (eipSelection === 'exist') {
        config.extendParam.clusterExternalIP = clusterExternalIP;
      }
    }

    // ca config
    if (authentiactionMode === 'authenticating_proxy') {
      const { authenticatingProxyCa, authenticatingProxyCert, authenticatingProxyPrivateKey } = cceConfig.value;

      config.authentication.authenticatingProxy = {
        ca:         base64Encode(authenticatingProxyCa),
        cert:       base64Encode(authenticatingProxyCert),
        privateKey: base64Encode(authenticatingProxyPrivateKey),
      };
    }

    return config;
  }

  return {
    doneRoute,
    save,
    registerBeforeHook,
    registerAfterHook,
  };
}
