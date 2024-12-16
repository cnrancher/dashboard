import RancherHamiView from '../pages/index.vue';

const PRODUCT_NAME = 'HAMi';

const routes = [
  {
    name:      `c-cluster-${ PRODUCT_NAME }`,
    path:      `/c/:cluster/${ PRODUCT_NAME }`,
    component: RancherHamiView,
    meta:      { product: PRODUCT_NAME },
  },
];

export default routes;
