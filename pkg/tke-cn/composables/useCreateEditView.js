// useCreateEditView.js
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { base64Encode } from '@shell/utils/crypto';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { sortBy } from '@shell/utils/sort';
import { cleanupNormanClusterAgentConfiguration } from '../util/agentConfigurationCleanup.js';

const BEFORE_SAVE_HOOKS = '_beforeSaveHooks';
const AFTER_SAVE_HOOKS = '_afterSaveHooks';

export function useCreateEditView(props, context) {
  const {
    normanCluster, tkeConfig, nodePools, state
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

  async function save(buttonDone, url, depth = 0) {
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

    if (tkeConfig.value.imported && tkeConfig.value.clusterId) {
      // Use tkeConfig.value.clusterVersion to detect edit mode for imported clusters.
      // If this is an imported cluster and clusterVersion is set, the cluster is in edit mode.
      // Since TKE config changes on imported clusters have no effect, simply return the original value.
      if (!tkeConfig.value.clusterVersion) {
        const importConfig = {
          imported:            true,
          tkeCredentialSecret: tkeConfig.value.tkeCredentialSecret,
          clusterId:           tkeConfig.value.clusterId,
          region:              tkeConfig.value.region,
          clusterEndpoint:     { enable: tkeConfig.value.clusterEndpoint }
        };

        normanCluster.value.tkeConfig = importConfig;
      }

      // Allow change tkeCredentialSecret
      normanCluster.value.tkeConfig.tkeCredentialSecret = tkeConfig.value.tkeCredentialSecret;
      await normanCluster.value.save();

      return await normanCluster.value.waitForCondition('InitialRolesPopulated');
    }
    normanCluster.value.tkeConfig = formatConfig();

    await normanCluster.value.save();

    return await normanCluster.value.waitForCondition('InitialRolesPopulated');
  }

  function mergeTkeConfig(oldConfig = {}, nextConfig = {}) {
    const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

    return {
      ...oldConfig,
      ...nextConfig,

      clusterEndpoint: {
        ...(oldConfig.clusterEndpoint || {}),
        ...(nextConfig.clusterEndpoint || {}),
      },

      clusterBasicSettings: {
        ...(oldConfig.clusterBasicSettings || {}),
        ...(nextConfig.clusterBasicSettings || {}),
      },

      clusterCIDRSettings: {
        ...(oldConfig.clusterCIDRSettings || {}),
        ...(nextConfig.clusterCIDRSettings || {}),
      },

      clusterAdvancedSettings: {
        ...(oldConfig.clusterAdvancedSettings || {}),
        ...(nextConfig.clusterAdvancedSettings || {}),
      },

      runInstancesForNode: hasOwn(nextConfig, 'runInstancesForNode') ? (
        nextConfig.runInstancesForNode ? {
          ...(oldConfig.runInstancesForNode || {}),
          ...nextConfig.runInstancesForNode,
        } : nextConfig.runInstancesForNode
      ) : oldConfig.runInstancesForNode,

      nodePoolList: hasOwn(nextConfig, 'nodePoolList') ? nextConfig.nodePoolList : oldConfig.nodePoolList,

      virtualNodePoolList: hasOwn(nextConfig, 'virtualNodePoolList') ? nextConfig.virtualNodePoolList : oldConfig.virtualNodePoolList,

      extensionAddon: hasOwn(nextConfig, 'extensionAddon') ? nextConfig.extensionAddon : oldConfig.extensionAddon,
    };
  }

  function formatConfig() {
    const config = tkeConfig.value;
    const oldTkeConfig = normanCluster.value?.tkeConfig || {};
    const networkType = config.networkType || 'GR';
    const nodePoolList = [];
    const virtualNodePoolList = [];

    nodePools.value.forEach((node) => {
      delete node.isNew;
      if (node.nodePoolType === 'super') {
        const virtualNode = {
          ...node.virtualNodePool,
          securityGroupIds: (node?.virtualNodePool?.securityGroupIds || []).filter((item) => {
            return typeof item === 'string' ? item.trim() : !!item;
          }),
          labels: (node?.virtualNodePool?.labels || []).filter((item) => {
            return item?.name?.trim() && item?.value?.trim();
          }),
          taints: (node?.virtualNodePool?.taints || []).filter((item) => {
            const key = typeof item?.key === 'string' ? item.key.trim() : '';
            const value = typeof item?.value === 'string' ? item.value.trim() : '';

            return key && value;
          }),
          virtualNodes: (node?.virtualNodePool?.virtualNodes || []).map((item) => {
            return { ...item };
          }),
          name: node.nodePoolName,
        };

        delete virtualNode.nodePoolType;
        virtualNodePoolList.push(virtualNode);

        return;
      }
      const dataDisks = node.dataDisks?.filter((disk) => Number(disk.size) > 0).map((disk) => ({
        diskSize: disk.size,
        diskType: disk.type,
      }));

      const autoScalingGroupPara = {
        autoScalingGroupName: '',
        desiredCapacity:      node.instanceNum,
        maxSize:              node.instanceNum,
        minSize:              0,
        vpcId:                config.vpcId,
        subnetIds:            node.subnetId,
      };
      const publicIpAssigned = node.publicIpAssigned !== false && node.publicIpAssigned !== 'false';
      const launchConfigurePara = {
        launchConfigurationName: '',
        instanceType:            node.instanceType,
        systemDisk:              {
          diskSize: node.systemDiskSize,
          diskType: node.systemDiskType,
        },
        publicIpAssigned,
        dataDisks:          dataDisks?.length ? dataDisks : [],
        keyIds:             node.keyPair ? [node.keyPair] : [],
        securityGroupIds:   [node.securityGroup],
        instanceChargeType: 'POSTPAID_BY_HOUR',
        internetChargeType: node.bandwidthType,
      };

      // CVM rejects bandwidth settings when no public IP is assigned.
      if (publicIpAssigned) {
        launchConfigurePara.internetMaxBandwidthOut = node.bandwidth;
      }

      const out = {
        ...node,
        clusterId:          node.clusterId,
        nodePoolId:         node.nodePoolId,
        autoScalingGroupPara,
        launchConfigurePara,
        enableAutoscale:    true,
        name:               node.nodePoolName,
        labels:             [],
        taints:             [],
        nodePoolOs:         node.osName,
        osCustomizeType:    'GENERAL',
        tags:               [],
        deletionProtection: node.deletionProtection,
        userScript:         base64Encode(node.userScript),
      };

      nodePoolList.push(out);
    });

    const clusterEndpoint = {
      enable:              config.clusterEndpoint,
      domain:              config.clusterEndpoint ? config.domain : '',
      securityGroup:       undefined,
      extensiveParameters: undefined,
      subnetId:            undefined,
    };

    if (config.clusterEndpoint) {
      clusterEndpoint.securityGroup = config.securityGroup;
      let extensiveParameters = {};

      if (Number(config.internetMaxBandwidthOut)) {
        extensiveParameters = {
          InternetAccessible: {
            InternetChargeType:      'TRAFFIC_POSTPAID_BY_HOUR',
            InternetMaxBandwidthOut: Number(config.internetMaxBandwidthOut ?? 10),
          }
        };
        clusterEndpoint.extensiveParameters = JSON.stringify(extensiveParameters);
      }
    } else {
      clusterEndpoint.subnetId = config.subnetId;
    }

    const clusterBasicSettings = {
      clusterDescription: config.description ? config.description : normanCluster.value.description,
      clusterName:        config.name ? config.name : normanCluster.value.name,
      clusterOs:          config.osName,
      clusterType:        config.clusterType,
      clusterVersion:     config.clusterVersion,
      vpcId:              config.vpcId,
      clusterLevel:       config.clusterLevel,
      isAutoUpgrade:      true,
    };

    const clusterCIDRSettings = {
      clusterCIDR:          undefined,
      maxClusterServiceNum: undefined,
      serviceCIDR:          undefined,
      eniSubnetIds:         undefined,
      maxNodePodNum:        config.maxNodePodNum,
    };

    if (networkType === 'VPC-CNI') {
      clusterCIDRSettings.serviceCIDR = config.serviceCidr;
      clusterCIDRSettings.eniSubnetIds = config.eniSubnetIds || [];
    } else {
      clusterCIDRSettings.clusterCIDR = config.clusterCidr;
      clusterCIDRSettings.maxClusterServiceNum = config.maxClusterServiceNum;
    }

    const dataDisks = [{
      diskSize: config.dataDiskSize,
      diskType: config.dataDiskType,
    }];

    let runInstancesForNode = {
      nodeRole:           'MASTER_ETCD',
      instanceChargeType: 'POSTPAID_BY_HOUR',
      zone:               config.zoneId,
      instanceCount:      config.ecsCount,
      projectId:          0,
      instanceType:       config.instanceType,
      imageId:            config.osName,
      systemDisk:         {
        diskSize: config.systemDiskSize,
        diskType: config.systemDiskType,
      },
      dataDisks:               config.dataDiskSize ? dataDisks : [],
      vpcId:                   config.vpcId,
      subnetId:                config.subnetId,
      internetChargeType:      config.bandwidthType,
      internetMaxBandwidthOut: config.bandwidth,
      publicIpAssigned:        true,
      instanceName:            '',
      keyIds:                  [config.keyPair],
      securityService:         false,
      monitorService:          false,
      userData:                '',
    };

    const clusterAdvancedSettings = {
      containerRuntime:   config.container,
      ipvs:               config.ipvs,
      deletionProtection: config.deletionProtection,
      networkType,
    };

    if (config.clusterType !== 'INDEPENDENT_CLUSTER') {
      runInstancesForNode = undefined;
    }

    const extensionAddon = JSON.parse(config.component || []);

    const nextTkeConfig = {
      tkeCredentialSecret: config.tkeCredentialSecret,
      region:              config.region,
      imported:            false,
      nodePoolList,
      clusterEndpoint,
      clusterBasicSettings,
      clusterCIDRSettings,
      runInstancesForNode,
      clusterAdvancedSettings,
      extensionAddon,
      virtualNodePoolList,
    };

    return mergeTkeConfig(oldTkeConfig, nextTkeConfig);
  }

  return {
    doneRoute,
    save,
    registerBeforeHook,
    registerAfterHook,
  };
}
