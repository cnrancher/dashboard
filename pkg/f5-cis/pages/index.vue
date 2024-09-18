<template>
  <PageSwitch>
    <div>
      <Banner
        color="info"
        label-key="f5cis.noPermission"
      />
    </div>
  </PageSwitch>
</template>
<script>
import PageSwitch from '../components/PageSwitch.vue';
import Banner from '@components/Banner/Banner.vue';
export default { components: { PageSwitch, Banner } };
</script>
